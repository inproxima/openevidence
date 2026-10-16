"""Abuse protection on /api/ask: per-user burst limit, per-user daily cap, global daily cap."""

from datetime import UTC, datetime, timedelta

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from test_api import ask, client  # noqa: F401  (client is a fixture)

from app.config import Settings
from app.ratelimit import AskLog, RateLimiter


def make_limiter(tmp_path, **limits) -> RateLimiter:
    off = {"ask_limit_per_minute": 0, "ask_limit_per_day": 0, "ask_limit_global_per_day": 0}
    settings = Settings(_env_file=None, **{**off, **limits})
    return RateLimiter(create_engine(f"sqlite:///{tmp_path / 'limits.db'}"), settings)


def backdate(limiter: RateLimiter, user: str, *ages: timedelta) -> None:
    now = datetime.now(UTC)
    with Session(limiter.sessions.kw["bind"]) as db:
        db.add_all(AskLog(user_id=user, created_at=now - age) for age in ages)
        db.commit()


def rejected(limiter: RateLimiter, user: str | None) -> HTTPException:
    with pytest.raises(HTTPException) as exc:
        limiter.check(user)
    assert exc.value.status_code == 429
    return exc.value


def test_burst_limit_is_per_user(tmp_path):
    limiter = make_limiter(tmp_path, ask_limit_per_minute=2)
    limiter.check("auth0|a")
    limiter.check("auth0|a")
    err = rejected(limiter, "auth0|a")
    assert "wait 1 minute" in err.detail
    assert 1 <= int(err.headers["Retry-After"]) <= 60
    limiter.check("auth0|b")  # another tester is unaffected


def test_daily_cap_counts_a_rolling_day(tmp_path):
    limiter = make_limiter(tmp_path, ask_limit_per_day=3)
    backdate(limiter, "auth0|a", timedelta(hours=25), timedelta(hours=2), timedelta(hours=1))
    limiter.check("auth0|a")  # the 25-hour-old question no longer counts
    err = rejected(limiter, "auth0|a")
    assert "limit of 3 questions a day" in err.detail
    assert "22 hours" in err.detail  # when the 2-hour-old question ages out
    assert 22 * 3600 - 60 < int(err.headers["Retry-After"]) <= 22 * 3600


def test_global_cap_covers_all_users(tmp_path):
    limiter = make_limiter(tmp_path, ask_limit_global_per_day=2)
    limiter.check("auth0|a")
    limiter.check("auth0|b")
    assert "all testers" in rejected(limiter, "auth0|c").detail


def test_rejected_questions_are_not_counted(tmp_path):
    limiter = make_limiter(tmp_path, ask_limit_per_minute=1, ask_limit_per_day=2)
    limiter.check(None)
    rejected(limiter, None)
    rejected(limiter, None)
    limiter.per_minute = 0
    limiter.check(None)  # only one question was recorded, so the daily cap of 2 isn't reached yet
    rejected(limiter, None)


def test_zero_turns_limits_off(tmp_path):
    limiter = make_limiter(tmp_path)
    for _ in range(20):
        limiter.check("auth0|a")


def test_ask_returns_429_with_retry_after(client):  # noqa: F811
    client.app.state.limiter.per_minute = 1
    ask(client)
    r = client.post("/api/ask", json={"question": "Second question too soon"})
    assert r.status_code == 429
    assert int(r.headers["retry-after"]) > 0
    assert "very quickly" in r.json()["detail"]
