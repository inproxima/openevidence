"""End-to-end API test with the model and search backends faked."""

import json

import pytest
from fastapi.testclient import TestClient

from app import retrieval
from app.evidence import classify
from app.schemas import QueryPlan, Source

PLAN = QueryPlan(
    pubmed_queries=["statins[MeSH] AND aged, 80 and over[MeSH]"],
    pubmed_topic="statins[MeSH] AND primary prevention[MeSH]",
    pubmed_condition='"Cardiovascular Diseases"[MeSH] OR "cardiovascular disease"[tiab]',
    europepmc_query="statin primary prevention elderly",
    guideline_query="statin primary prevention older adults",
    trial_query=None,
    drug_names=["atorvastatin"],
)


def fake_sources(n: int) -> list[Source]:
    return [
        classify(
            Source(
                id=f"pmid:{i}", kind="article", origin="pubmed", title=f"Study {i}", url=f"https://pubmed/{i}",
                pmid=str(i), year=2020, abstract=f"Abstract {i}", pub_types=["Randomized Controlled Trial"],
            )
        )
        for i in range(1, n + 1)
    ]


class FakeLLM:
    def __init__(self):
        self.calls: list[str] = []
        self.history_seen: list[list[dict]] = []

    async def find_pages(self, query, domains):
        return []

    async def describe_image(self, image, question):
        self.calls.append("image")
        return "ECG showing atrial fibrillation"

    async def plan(self, question, history, mode, image_note):
        self.calls.append("plan")
        self.history_seen.append(history)
        return PLAN

    async def rerank(self, question, digest, k):
        self.calls.append("rerank")
        return [cid for cid, _ in reversed(digest)][:k]

    async def stream_answer(self, question, history, sources, mode, image):
        self.calls.append(f"answer:{mode}")
        for chunk in ["**Bottom line:** benefit is uncertain ", "[1][2]. Avoid ", "claims [99]."]:
            yield chunk

    async def followups(self, question, answer):
        self.calls.append("followups")
        return ["What about deprescribing?", "Which statin dose?", "Any Canadian guidance?"]


@pytest.fixture
def client(monkeypatch):
    async def fake_collect(http, settings, plan, mode, guideline_task=None, guideline_started=None, question="", llm=None):
        if guideline_task:
            guideline_task.cancel()
        return fake_sources(20), {"pubmed": 20}

    async def no_guidelines(*args, **kwargs):
        return []

    monkeypatch.setattr(retrieval, "collect", fake_collect)
    monkeypatch.setattr(retrieval.guidelines, "search", no_guidelines)

    from app.main import app

    with TestClient(app) as c:
        app.state.deps.llm = FakeLLM()
        yield c


def read_events(response) -> list[tuple[str, dict]]:
    events, name = [], None
    for line in response.iter_lines():
        if line.startswith("event:"):
            name = line.split(":", 1)[1].strip()
        elif line.startswith("data:") and name:
            events.append((name, json.loads(line.split(":", 1)[1])))
            name = None
    return events


def ask(client, **body):
    with client.stream("POST", "/api/ask", json={"question": "Statins for primary prevention over 75?", **body}) as r:
        assert r.status_code == 200
        return read_events(r)


def test_ask_streams_events_in_order_and_saves_thread(client):
    events = ask(client)
    names = [e for e, _ in events]
    assert names[0] == "thread"
    assert names[-1] == "done"
    order = [n for n in names if n != "status" and n != "delta"]
    assert order == ["thread", "sources", "citations", "followups", "done"]
    assert "delta" in names

    data = dict(events)
    assert len(data["sources"]["sources"]) == 12  # MAX_SOURCES_QUICK
    assert data["sources"]["sources"][0]["n"] == 1
    assert data["sources"]["sources"][0]["title"] == "Study 20"  # rerank order respected
    assert data["citations"]["invalid"] == [99]
    assert "[99]" not in data["citations"]["text"]
    assert data["citations"]["used"] == [1, 2]

    thread_id = data["thread"]["thread_id"]
    threads = client.get("/api/threads").json()["threads"]
    assert [t["id"] for t in threads] == [thread_id]
    thread = client.get(f"/api/threads/{thread_id}").json()
    roles = [m["role"] for m in thread["messages"]]
    assert roles == ["user", "assistant"]
    assert thread["messages"][1]["followups"][0] == "What about deprescribing?"
    # SQLite drops tzinfo; timestamps must still carry an explicit UTC offset for browsers.
    assert thread["messages"][1]["created_at"].endswith("+00:00")
    assert threads[0]["updated_at"].endswith("+00:00")
    assert len(thread["messages"][1]["sources"]) == 12


def test_follow_up_uses_thread_history(client):
    first = dict(ask(client))
    thread_id = first["thread"]["thread_id"]
    ask(client, question="What about in frail patients?", thread_id=thread_id)
    llm = client.app.state.deps.llm
    assert llm.history_seen[-1][0]["role"] == "user"
    assert llm.history_seen[-1][1]["role"] == "assistant"
    messages = client.get(f"/api/threads/{thread_id}").json()["messages"]
    assert len(messages) == 4


def test_deep_mode_and_image(client):
    tiny_png = (
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    )
    events = ask(client, mode="deep", image=tiny_png)
    llm = client.app.state.deps.llm
    assert llm.calls[:2] == ["image", "plan"]
    assert "answer:deep" in llm.calls
    assert len(dict(events)["sources"]["sources"]) == 20  # all 20 fit under MAX_SOURCES_DEEP


def test_rejects_non_image_data(client):
    r = client.post("/api/ask", json={"question": "Look at this", "image": "data:text/html;base64,PGgxPg=="})
    assert r.status_code == 400


def test_unknown_thread_is_an_error_event(client):
    events = ask(client, thread_id="does-not-exist")
    assert events == [("error", {"message": "Thread not found"})]


def test_failed_first_answer_leaves_no_empty_thread(client):
    llm = client.app.state.deps.llm

    async def broken(*a, **k):
        raise RuntimeError("model down")

    llm.plan = broken
    events = ask(client)
    assert events[-1][0] == "error"
    assert client.get("/api/threads").json()["threads"] == []


def test_rename_and_delete_thread(client):
    thread_id = dict(ask(client))["thread"]["thread_id"]
    assert client.patch(f"/api/threads/{thread_id}", json={"title": "Statins >75"}).json()["title"] == "Statins >75"
    assert client.delete(f"/api/threads/{thread_id}").status_code == 204
    assert client.get(f"/api/threads/{thread_id}").status_code == 404
