"""One question → streamed, cited answer. Yields (event, data) pairs that main.py
sends as Server-Sent Events:

  thread     {thread_id}
  status     {stage, message, counts?}
  sources    {sources: [public source dicts, numbered 1..N]}
  delta      {text}
  citations  {text, used, invalid}      final cleaned answer text
  followups  {questions}
  done       {message_id}
  error      {message}
"""

import asyncio
import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass

import httpx

from . import retrieval
from .citations import check_citations
from .config import Settings
from .db import Store
from .llm import LLM
from .schemas import AskRequest, Source

log = logging.getLogger(__name__)

Event = tuple[str, dict]


@dataclass
class Deps:
    settings: Settings
    http: httpx.AsyncClient
    llm: LLM
    store: Store


def _status(stage: str, message: str, **extra) -> Event:
    return "status", {"stage": stage, "message": message, **extra}


def _top_up(chosen: list[Source], ranked: list[Source], least: int, usable=lambda s: True) -> list[Source]:
    """chosen, plus the best of ranked not already in it, until there are `least`."""
    have = {s.id for s in chosen}
    extra = [s for s in ranked if s.id not in have and usable(s)]
    return chosen + extra[: max(0, least - len(chosen))]


async def select_sources(deps: Deps, question: str, candidates: list[Source], mode: str, funnel: dict) -> list[Source]:
    """LLM rerank of the top heuristic candidates, topped up from the heuristic order when it
    returns fewer than the minimum; falls back to the heuristic order if it fails."""
    b = retrieval.BUDGETS[mode]
    k = deps.settings.max_sources_deep if mode == "deep" else deps.settings.max_sources_quick
    least = min(deps.settings.min_sources, k)
    pool = candidates[: b.rerank_pool]
    funnel["pool"] = len(pool)
    if len(pool) <= k:
        return pool
    try:
        digest = retrieval.candidate_digest(pool)
        ids = await deps.llm.rerank(question, digest, k, least)
        by_id = {cid: s for (cid, _), s in zip(digest, pool)}
        chosen = [by_id[cid] for cid in dict.fromkeys(ids) if cid in by_id][:k]
        funnel["reranked"] = len(chosen)
        if chosen:
            return _top_up(chosen, pool, least)
    except Exception as exc:  # noqa: BLE001
        log.warning("Rerank failed, using heuristic order: %r", exc)
    funnel["reranked"] = 0
    return pool[:k]


def _funnel_line(f: dict) -> str:
    found = " ".join(f"{k}={v}" for k, v in f.get("found", {}).items() if isinstance(v, int))
    return (
        f"found {found or 'nothing'}; {f.get('candidates', 0)} candidates; reranker kept {f.get('reranked', '-')} "
        f"of pool {f.get('pool', 0)}, chose {f.get('chosen', 0)}; {f.get('unreadable', 0)} unreadable pages dropped, "
        f"{f.get('backfilled', 0)} backfilled; {f.get('given', 0)} given to the model, {f.get('cited', 0)} cited"
    )


async def run(req: AskRequest, user_id: str | None, deps: Deps) -> AsyncIterator[Event]:
    mode = req.mode
    store = deps.store

    new_thread = not req.thread_id
    if req.thread_id:
        history = await asyncio.to_thread(store.history, req.thread_id, user_id)
        if not history and not await asyncio.to_thread(store.get_thread, req.thread_id, user_id):
            yield "error", {"message": "Thread not found"}
            return
        thread_id = req.thread_id
    else:
        history = []
        thread_id = await asyncio.to_thread(store.create_thread, user_id, req.question)
    yield "thread", {"thread_id": thread_id}
    saved = False

    previous_questions = [m["content"] for m in history if m["role"] == "user"]
    # Start the slow guideline search right away from the question's own words. With an image,
    # the words alone ("what is this rhythm?") say little, so wait for the planner's query.
    guideline_task: asyncio.Task | None = None
    started: float | None = None
    if not req.image:
        guideline_task, started = retrieval.start_guideline_search(
            deps.http, deps.settings, retrieval.seed_guideline_query(req.question, previous_questions), mode, deps.llm
        )
    try:
        image_note = None
        if req.image:
            yield _status("image", "Reading the attached image…")
            image_note = await deps.llm.describe_image(req.image, req.question)

        yield _status("plan", "Planning the literature search…")
        plan = await deps.llm.plan(req.question, history, mode, image_note)
        if guideline_task is None:
            guideline_task, started = retrieval.start_guideline_search(
                deps.http, deps.settings, plan.guideline_query, mode, deps.llm
            )

        yield _status(
            "search", "Searching PubMed, Europe PMC, Canadian guidelines, Health Canada and ClinicalTrials.gov…"
        )
        context = " ".join(previous_questions[-1:] + [req.question, plan.guideline_query])
        candidates, counts = await retrieval.collect(
            deps.http, deps.settings, plan, mode, guideline_task, started, question=context, llm=deps.llm
        )
        if not candidates:
            yield "error", {"message": "No sources found for this question. Try rephrasing it."}
            return

        yield _status("rank", f"Ranking {len(candidates)} sources…", counts=counts)
        funnel = {"found": counts, "candidates": len(candidates)}
        sources = await select_sources(deps, req.question, candidates, mode, funnel)
        funnel["chosen"] = len(sources)
        targets = retrieval.enrich_targets(sources, mode)
        if targets:
            n = len(targets)
            yield _status("read", f"Reading {n} full document{'s' if n > 1 else ''}…")
            await retrieval.enrich(deps.http, sources, context, mode)
            # Web-search hits that turned out unreadable (dead or moved links) have nothing to cite;
            # replace them with the best remaining candidates that already carry readable text.
            readable = [s for s in sources if s.origin != "guideline_web" or s.abstract.strip()]
            funnel["unreadable"] = len(sources) - len(readable)
            sources = _top_up(
                readable, candidates, min(deps.settings.min_sources, len(sources)),
                usable=lambda s: s.origin != "guideline_web" and bool(s.abstract.strip()),
            )
            funnel["backfilled"] = len(sources) - len(readable)
        funnel["given"] = len(sources)
        public = [s.public(n) for n, s in enumerate(sources, start=1)]
        yield "sources", {"sources": public}

        yield _status("answer", "Writing the answer…")
        parts: list[str] = []
        async for delta in deps.llm.stream_answer(req.question, history, sources, mode, req.image):
            parts.append(delta)
            yield "delta", {"text": delta}

        text, used, invalid = check_citations("".join(parts), len(sources))
        if invalid:
            log.warning("Removed citations outside 1..%d: %s", len(sources), invalid)
        yield "citations", {"text": text, "used": used, "invalid": invalid}
        funnel["cited"] = len(used)
        # One line per answer, so a failing backend or a thin source list shows up in the logs.
        log.info("Source funnel (%s, thread %s): %s", mode, thread_id, _funnel_line(funnel))

        try:
            followups = await deps.llm.followups(req.question, text)
        except Exception as exc:  # noqa: BLE001 - follow-ups are optional
            log.warning("Follow-up generation failed: %r", exc)
            followups = []
        yield "followups", {"questions": followups}

        message_id = await asyncio.to_thread(
            store.add_turn, thread_id, req.question, text, mode, public, followups, bool(req.image)
        )
        saved = True
        yield "done", {"message_id": message_id, "thread_id": thread_id}
    except Exception as exc:  # noqa: BLE001
        log.exception("Answer pipeline failed")
        yield "error", {"message": _friendly(exc)}
    finally:
        if guideline_task is not None and not guideline_task.done():
            guideline_task.cancel()
        if new_thread and not saved:  # failed or abandoned first question: don't leave an empty thread
            await asyncio.to_thread(store.delete_thread, thread_id, user_id)


def _friendly(exc: Exception) -> str:
    name = type(exc).__name__
    if name == "AuthenticationError":
        return "The OpenAI API key was rejected. Check OPENAI_API_KEY in .env."
    if name == "NotFoundError":
        return "The configured model is not available to this API key. Check OPENAI_MODEL in .env."
    if name == "RateLimitError":
        return "The OpenAI rate limit or quota was reached. Try again shortly."
    return f"Something went wrong while answering ({name})."
