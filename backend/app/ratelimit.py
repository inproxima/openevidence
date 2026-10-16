"""Abuse protection for /api/ask on a public URL: a per-user burst limit, a per-user
daily cap and a cap on all users together (the OpenAI and SerpAPI bill).

Every accepted question is a row in ask_log, so the counts survive restarts and
redeploys. Days are rolling 24-hour windows. A limit of 0 turns that check off.
"""

import threading
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import DateTime, Engine, Integer, String, func, select
from sqlalchemy.orm import Mapped, mapped_column, sessionmaker

from .config import Settings
from .db import Base

ANONYMOUS = "anonymous"  # user id when Auth0 is off (local development)
MINUTE = timedelta(minutes=1)
DAY = timedelta(days=1)


class AskLog(Base):
    __tablename__ = "ask_log"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(255), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


def _utc(ts: datetime) -> datetime:
    return ts if ts.tzinfo else ts.replace(tzinfo=UTC)  # SQLite drops tzinfo


def _wait(seconds: float) -> str:
    minutes = max(1, round(seconds / 60))
    if minutes < 90:
        return f"{minutes} minute{'s' if minutes != 1 else ''}"
    return f"{round(minutes / 60)} hours"


class RateLimiter:
    def __init__(self, engine: Engine, settings: Settings):
        AskLog.__table__.create(engine, checkfirst=True)
        self.sessions = sessionmaker(engine)
        self.per_minute = settings.ask_limit_per_minute
        self.per_day = settings.ask_limit_per_day
        self.global_per_day = settings.ask_limit_global_per_day
        self._lock = threading.Lock()  # one process: makes check-then-record atomic

    def _retry_after(self, db, user_id: str | None, window: timedelta, limit: int, now: datetime) -> float | None:
        """Seconds until the count in `window` drops below `limit`, or None if under it."""
        query = select(AskLog.created_at).where(AskLog.created_at > now - window)
        if user_id is not None:
            query = query.where(AskLog.user_id == user_id)
        count = db.scalar(select(func.count()).select_from(query.subquery()))
        if count < limit:
            return None
        # The question that has to age out is the (count - limit + 1)-th oldest.
        oldest = db.scalar(query.order_by(AskLog.created_at).offset(count - limit).limit(1))
        return max(1.0, (_utc(oldest) + window - now).total_seconds())

    def check(self, user_id: str | None) -> None:
        """Record one question for this user, or raise 429 if a limit is reached."""
        user = user_id or ANONYMOUS
        now = datetime.now(UTC)
        checks = [
            (self.per_minute, user, MINUTE, "You're asking questions very quickly. Please wait {wait} and try again."),
            (self.per_day, user, DAY, f"You've reached the tester limit of {self.per_day} questions a day. "
             "You can ask again in about {wait}."),
            (self.global_per_day, None, DAY, "The app has reached its daily question limit for all testers. "
             "Please try again in about {wait}."),
        ]
        with self._lock, self.sessions() as db:
            for limit, who, window, message in checks:
                if limit <= 0:
                    continue
                wait = self._retry_after(db, who, window, limit, now)
                if wait is not None:
                    raise HTTPException(
                        status_code=429, detail=message.format(wait=_wait(wait)), headers={"Retry-After": str(int(wait))}
                    )
            db.add(AskLog(user_id=user, created_at=now))
            db.commit()
