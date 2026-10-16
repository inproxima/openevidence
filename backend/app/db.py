"""Threads and messages. SQLite (data/app.db) by default; Postgres when DATABASE_URL is set.

Each assistant message stores the numbered sources it cited as JSON, so a saved
thread re-renders exactly as it was answered.
"""

import uuid
from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qs, urlparse

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, String, Text, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

from .config import ROOT


def _now() -> datetime:
    return datetime.now(UTC)


def _uuid() -> str:
    return uuid.uuid4().hex


def _iso(dt: datetime) -> str:
    """ISO 8601 with an explicit UTC offset. SQLite returns naive datetimes even for
    timezone-aware columns, and an offset-less string is read as local time by browsers."""
    return (dt if dt.tzinfo else dt.replace(tzinfo=UTC)).isoformat()


class Base(DeclarativeBase):
    pass


class Thread(Base):
    __tablename__ = "threads"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    user_id: Mapped[str | None] = mapped_column(String(255), index=True)
    title: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    messages: Mapped[list["Message"]] = relationship(
        back_populates="thread", cascade="all, delete-orphan", order_by="Message.created_at"
    )

    def summary(self) -> dict:
        return {"id": self.id, "title": self.title, "updated_at": _iso(self.updated_at)}


class Message(Base):
    __tablename__ = "messages"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    thread_id: Mapped[str] = mapped_column(ForeignKey("threads.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(16))  # user | assistant
    content: Mapped[str] = mapped_column(Text)
    mode: Mapped[str] = mapped_column(String(8), default="quick")
    sources: Mapped[list | None] = mapped_column(JSON, default=None)
    followups: Mapped[list | None] = mapped_column(JSON, default=None)
    had_image: Mapped[bool] = mapped_column(Boolean, default=False)  # images themselves are never stored
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    thread: Mapped[Thread] = relationship(back_populates="messages")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "role": self.role,
            "content": self.content,
            "mode": self.mode,
            "sources": self.sources or [],
            "followups": self.followups or [],
            "had_image": self.had_image,
            "created_at": _iso(self.created_at),
        }


def normalize_database_url(url: str) -> str:
    """Ported from sara backend/app.py: accept Render/Heroku-style postgres:// URLs and
    require SSL for Render-hosted Postgres. Blank means local SQLite."""
    if not url:
        (ROOT / "data").mkdir(exist_ok=True)
        return f"sqlite:///{ROOT / 'data' / 'app.db'}"
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            url = "postgresql+psycopg://" + url[len(prefix) :]
    if url.startswith("postgresql") and "render.com" in (urlparse(url).hostname or ""):
        if "sslmode" not in parse_qs(urlparse(url).query):
            url += ("&" if "?" in url else "?") + "sslmode=require"
    return url


class Store:
    def __init__(self, database_url: str):
        url = normalize_database_url(database_url)
        kwargs = {"connect_args": {"check_same_thread": False}} if url.startswith("sqlite") else {"pool_pre_ping": True}
        self.engine = create_engine(url, **kwargs)
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(self.engine, expire_on_commit=False)

    def _thread(self, db: Session, thread_id: str, user_id: str | None) -> Thread | None:
        thread = db.get(Thread, thread_id)
        if thread is None or thread.user_id != user_id:
            return None
        return thread

    def list_threads(self, user_id: str | None, limit: int = 100) -> list[dict]:
        with self.sessions() as db:
            rows = db.scalars(
                select(Thread).where(Thread.user_id == user_id).order_by(Thread.updated_at.desc()).limit(limit)
            )
            return [t.summary() for t in rows]

    def get_thread(self, thread_id: str, user_id: str | None) -> dict | None:
        with self.sessions() as db:
            thread = self._thread(db, thread_id, user_id)
            if thread is None:
                return None
            return {**thread.summary(), "messages": [m.to_dict() for m in thread.messages]}

    def history(self, thread_id: str, user_id: str | None) -> list[dict]:
        thread = self.get_thread(thread_id, user_id)
        return [{"role": m["role"], "content": m["content"]} for m in thread["messages"]] if thread else []

    def create_thread(self, user_id: str | None, title: str) -> str:
        with self.sessions() as db:
            thread = Thread(user_id=user_id, title=title[:200])
            db.add(thread)
            db.commit()
            return thread.id

    def add_turn(
        self,
        thread_id: str,
        question: str,
        answer: str,
        mode: str,
        sources: list[dict],
        followups: list[str],
        had_image: bool,
    ) -> str:
        with self.sessions() as db:
            thread = db.get(Thread, thread_id)
            user = Message(thread_id=thread_id, role="user", content=question, mode=mode, had_image=had_image)
            db.add(user)
            db.flush()
            reply = Message(
                thread_id=thread_id, role="assistant", content=answer, mode=mode, sources=sources, followups=followups
            )
            # Keep the assistant reply strictly after the question even on coarse clocks.
            reply.created_at = max(_now(), user.created_at + timedelta(microseconds=1))
            db.add(reply)
            if thread is not None:
                thread.updated_at = _now()
            db.commit()
            return reply.id

    def rename_thread(self, thread_id: str, user_id: str | None, title: str) -> dict | None:
        with self.sessions() as db:
            thread = self._thread(db, thread_id, user_id)
            if thread is None:
                return None
            thread.title = title[:200]
            db.commit()
            return thread.summary()

    def delete_thread(self, thread_id: str, user_id: str | None) -> bool:
        with self.sessions() as db:
            thread = self._thread(db, thread_id, user_id)
            if thread is None:
                return False
            db.delete(thread)
            db.commit()
            return True
