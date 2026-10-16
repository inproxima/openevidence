"""OpenAI Responses API calls. One model (OPENAI_MODEL, default gpt-6.1-sol) at
different reasoning efforts: medium for Quick answers, high for Deep answers,
low for planning, reranking, follow-ups and image reading."""

import logging
from collections.abc import AsyncIterator

from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from . import prompts
from .config import Settings
from .retrieval import excerpt_limit
from .schemas import Mode, QueryPlan, Source

log = logging.getLogger(__name__)

HISTORY_TURNS = 3  # previous question/answer pairs sent with a follow-up


class _Ranked(BaseModel):
    ids: list[str] = Field(description="Chosen candidate ids, best first")


class _Followups(BaseModel):
    questions: list[str]


def history_input(history: list[dict]) -> list[dict]:
    """Prior turns as Responses input messages. Assistant text keeps its [n] markers but
    those refer to that turn's sources, so the model is told not to reuse them."""
    items: list[dict] = []
    for msg in history[-HISTORY_TURNS * 2 :]:
        content = msg["content"]
        if msg["role"] == "assistant":
            content = "(Earlier answer; its [n] citations refer to an earlier source list.)\n" + content[:4000]
        items.append({"role": msg["role"], "content": content})
    return items


def sources_block(sources: list[Source], mode: Mode) -> str:
    lines = []
    for n, s in enumerate(sources, start=1):
        meta = " · ".join(
            x for x in (s.evidence_level, "Canada" if s.canadian else "", s.journal or "", str(s.year or "")) if x
        )
        body = s.abstract[: excerpt_limit(s, mode)].strip() or "(no abstract available)"
        lines.append(f"[{n}] {s.title} ({meta}) {s.url}\n{body}")
    return "\n\n".join(lines)


def user_message(text: str, image: str | None) -> dict:
    if not image:
        return {"role": "user", "content": text}
    return {
        "role": "user",
        "content": [{"type": "input_text", "text": text}, {"type": "input_image", "image_url": image}],
    }


class LLM:
    def __init__(self, settings: Settings):
        self.s = settings
        self.client = AsyncOpenAI(api_key=settings.openai_api_key or None, timeout=600, max_retries=2)

    async def plan(self, question: str, history: list[dict], mode: Mode, image_note: str | None) -> QueryPlan:
        text = f"Mode: {mode}\nQuestion: {question}"
        if image_note:
            text += f"\nAttached image (described): {image_note}"
        resp = await self.client.responses.parse(
            model=self.s.openai_model,
            instructions=prompts.PLAN,
            input=history_input(history) + [{"role": "user", "content": text}],
            reasoning={"effort": self.s.openai_fast_effort},
            text_format=QueryPlan,
        )
        return resp.output_parsed

    async def find_pages(self, query: str, domains: list[str]) -> list[tuple[str, str]]:
        """OpenAI hosted web search restricted to `domains`: (url, title) pairs for pages the
        search returned or cited. More reliable than SerpAPI for guideline documents (finds
        PDFs such as Diabetes Canada's 2024 update) at ~15-20 s per call."""
        resp = await self.client.responses.create(
            model=self.s.openai_model,
            tools=[{"type": "web_search", "filters": {"allowed_domains": domains}}],
            tool_choice="required",
            reasoning={"effort": self.s.openai_fast_effort},
            include=["web_search_call.action.sources"],
            instructions=prompts.FIND_GUIDELINES,
            input=query,
        )
        found: dict[str, str] = {}
        for item in resp.output:
            if item.type == "message":
                for part in item.content:
                    for a in getattr(part, "annotations", None) or []:
                        if getattr(a, "type", "") == "url_citation" and a.url:
                            found.setdefault(a.url, getattr(a, "title", "") or "")
            elif item.type == "web_search_call":
                for src in getattr(getattr(item, "action", None), "sources", None) or []:
                    url = getattr(src, "url", None)
                    if url:
                        found.setdefault(url, "")
        return list(found.items())

    async def describe_image(self, image: str, question: str) -> str:
        resp = await self.client.responses.create(
            model=self.s.openai_model,
            instructions=prompts.IMAGE,
            input=[user_message(f"Clinician's question: {question}", image)],
            reasoning={"effort": self.s.openai_fast_effort},
            max_output_tokens=2000,
        )
        return resp.output_text.strip()

    async def rerank(self, question: str, digest: list[tuple[str, str]], k: int) -> list[str]:
        listing = "\n".join(f"{cid}: {line}" for cid, line in digest)
        resp = await self.client.responses.parse(
            model=self.s.openai_model,
            instructions=prompts.RERANK,
            input=f"Question: {question}\nReturn up to {k} ids.\n\nCandidates:\n{listing}",
            reasoning={"effort": self.s.openai_fast_effort},
            text_format=_Ranked,
        )
        return resp.output_parsed.ids

    async def stream_answer(
        self, question: str, history: list[dict], sources: list[Source], mode: Mode, image: str | None
    ) -> AsyncIterator[str]:
        instructions = prompts.ANSWER_RULES + (prompts.DEEP_FORMAT if mode == "deep" else prompts.QUICK_FORMAT)
        effort = self.s.openai_deep_effort if mode == "deep" else self.s.openai_reasoning_effort
        text = f"Question: {question}\n\nSources:\n{sources_block(sources, mode)}"
        async with self.client.responses.stream(
            model=self.s.openai_model,
            instructions=instructions,
            input=history_input(history) + [user_message(text, image)],
            reasoning={"effort": effort},
            max_output_tokens=32000 if mode == "deep" else 12000,
        ) as stream:
            async for event in stream:
                if event.type == "response.output_text.delta":
                    yield event.delta
                elif event.type in ("response.failed", "error"):
                    raise RuntimeError(f"Model stream failed: {getattr(event, 'error', event)}")

    async def followups(self, question: str, answer: str) -> list[str]:
        resp = await self.client.responses.parse(
            model=self.s.openai_model,
            instructions=prompts.FOLLOWUPS,
            input=f"Question: {question}\n\nAnswer:\n{answer[:6000]}",
            reasoning={"effort": self.s.openai_fast_effort},
            text_format=_Followups,
        )
        return [q.strip() for q in resp.output_parsed.questions if q.strip()][:3]
