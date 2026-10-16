"""Stand-in for llm.LLM when LLM_MOCK=true: real searches, canned model output.

For exercising the UI and retrieval without an OpenAI key. Answers are templated
from the retrieved sources and are NOT clinical content.
"""

import asyncio
from collections.abc import AsyncIterator

from . import retrieval
from .schemas import Mode, QueryPlan, Source


class MockLLM:
    async def find_pages(self, query: str, domains: list[str]) -> list[tuple[str, str]]:
        return []

    async def describe_image(self, image: str, question: str) -> str:
        return "Image attached (mock mode: not analysed)."

    async def plan(self, question: str, history: list[dict], mode: Mode, image_note: str | None) -> QueryPlan:
        terms = retrieval.seed_guideline_query(question, [m["content"] for m in history if m["role"] == "user"])
        return QueryPlan(
            pubmed_queries=[terms],
            pubmed_topic=terms,
            pubmed_condition=terms,
            europepmc_query=terms,
            guideline_query=terms,
            trial_query=None,
            drug_names=[],
        )

    async def rerank(self, question: str, digest: list[tuple[str, str]], k: int) -> list[str]:
        return [cid for cid, _ in digest][:k]

    async def stream_answer(
        self, question: str, history: list[dict], sources: list[Source], mode: Mode, image: str | None
    ) -> AsyncIterator[str]:
        lines = [
            "**Mock mode — this is not a real answer.** Set a valid `OPENAI_API_KEY` and remove `LLM_MOCK` "
            "to get model-written answers. The sources below were retrieved live [1][2].\n\n",
            "### Retrieved evidence\n\n",
        ]
        for n, s in enumerate(sources[:6], start=1):
            lines.append(f"- {s.evidence_level}: *{s.title}* ({s.journal or s.origin}, {s.year or 'n.d.'}) [{n}]\n")
        lines.append("\nCitation outside the list for testing removal [99].")
        for line in lines:
            for word in line.split(" "):
                await asyncio.sleep(0.01)
                yield word + " "

    async def followups(self, question: str, answer: str) -> list[str]:
        return [
            "What do Canadian guidelines recommend for this?",
            "How strong is the evidence?",
            "Are there important contraindications?",
        ]
