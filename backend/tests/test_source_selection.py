"""How many sources reach the answer: the reranker floor, replacing unreadable guideline
pages, and the per-answer funnel log line."""

import logging

import pytest
from test_api import ask, client, fake_sources  # noqa: F401  (client is a fixture)

from app import retrieval
from app.evidence import classify
from app.schemas import Source


def sources_given(events) -> list[dict]:
    return dict(events)["sources"]["sources"]


def test_reranker_returning_too_few_is_topped_up_to_the_minimum(client):  # noqa: F811
    llm = client.app.state.deps.llm

    async def stingy(question, digest, k, least):
        assert least == 8 and k == 12
        return [digest[5][0], digest[2][0], digest[9][0]]  # only three picks

    llm.rerank = stingy
    given = sources_given(ask(client))
    assert len(given) == 8
    assert [s["title"] for s in given[:3]] == ["Study 6", "Study 3", "Study 10"]  # reranker's picks lead


def guideline_pages(n: int) -> list[Source]:
    return [
        classify(
            Source(
                id=f"url:https://ccs.ca/g{i}", kind="guideline", origin="guideline_web", title=f"CCS page {i}",
                url=f"https://ccs.ca/g{i}", abstract="", canadian=True,
            )
        )
        for i in range(n)
    ]


@pytest.fixture
def pages_then_articles(client, monkeypatch):  # noqa: F811
    async def collect(http, settings, plan, mode, guideline_task=None, guideline_started=None, question="", llm=None):
        if guideline_task:
            guideline_task.cancel()
        return guideline_pages(4) + fake_sources(20), {"guidelines": 4, "pubmed": 20}

    async def unreadable(*args, **kwargs):
        return ""  # e.g. a certificate error or a moved PDF

    monkeypatch.setattr(retrieval, "collect", collect)
    monkeypatch.setattr(retrieval.guidelines, "fetch_page_text", unreadable)
    return client


def test_unreadable_pages_are_replaced_by_readable_candidates(pages_then_articles):
    llm = pages_then_articles.app.state.deps.llm

    async def pages_first(question, digest, k, least):
        return [cid for cid, _ in digest][:8]  # the four pages, then four articles

    llm.rerank = pages_first
    given = sources_given(ask(pages_then_articles))
    assert all(s["origin"] != "guideline_web" for s in given)  # nothing left to cite in them
    assert len(given) == 8  # 4 dropped, 4 more articles backfilled


def test_each_answer_logs_its_source_funnel(client, caplog):  # noqa: F811
    with caplog.at_level(logging.INFO, logger="app.pipeline"):
        ask(client)
    line = next(r.getMessage() for r in caplog.records if "Source funnel" in r.getMessage())
    assert "found pubmed=20" in line
    assert "20 candidates" in line and "12 given to the model, 2 cited" in line
