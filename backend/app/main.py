"""FastAPI app: SSE answer endpoint, thread CRUD, and the built frontend.

Run locally:  uv run uvicorn app.main:app --app-dir backend --reload --port 8000
"""

import asyncio
import base64
import json
import logging
import re
from contextlib import asynccontextmanager

import httpx
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sse_starlette.sse import EventSourceResponse

from . import pipeline
from .auth import current_user
from .config import ROOT, get_settings
from .db import Store
from .llm import LLM
from .ratelimit import RateLimiter
from .schemas import AskRequest, ThreadPatch
from .search import USER_AGENT
from .tls import ssl_context

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("app")

MAX_IMAGE_BYTES = 8 * 1024 * 1024
IMAGE_RE = re.compile(r"^data:image/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=]+)$")
DIST = ROOT / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    async with httpx.AsyncClient(
        headers={"User-Agent": USER_AGENT},
        timeout=httpx.Timeout(20.0, connect=10.0),
        follow_redirects=True,
        verify=ssl_context(),  # certifi + intermediates some guideline sites omit (tls.py)
    ) as http:
        if settings.llm_mock:
            from .llm_mock import MockLLM

            llm = MockLLM()
            log.warning("LLM_MOCK is on: answers are canned placeholders, not model output")
        else:
            llm = LLM(settings)
            if not settings.openai_api_key:
                log.warning("OPENAI_API_KEY is not set; answers will fail until it is added to .env")
        store = Store(settings.database_url)
        app.state.deps = pipeline.Deps(settings=settings, http=http, llm=llm, store=store)
        app.state.limiter = RateLimiter(store.engine, settings)
        yield


app = FastAPI(title="Clinical Evidence CA", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in get_settings().cors_origins.split(",") if o.strip()],
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


def deps() -> pipeline.Deps:
    return app.state.deps


@app.get("/api/config")
async def config():
    s = get_settings()
    return {
        "app_name": s.app_name,
        "auth_enabled": s.auth_enabled,
        "region": s.region_focus,
        "model": "mock" if s.llm_mock else s.openai_model,
    }


@app.get("/api/health")
async def health():
    return {"ok": True}


def _check_image(image: str | None) -> None:
    if image is None:
        return
    m = IMAGE_RE.match(image)
    if not m:
        raise HTTPException(status_code=400, detail="Image must be a PNG, JPEG, WebP or GIF data URL")
    if len(m.group(2)) * 3 // 4 > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image is larger than 8 MB")
    try:
        base64.b64decode(m.group(2)[:64], validate=True)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Image data is not valid base64") from exc


@app.post("/api/ask")
async def ask(req: AskRequest, user_id: str | None = Depends(current_user), d: pipeline.Deps = Depends(deps)):
    _check_image(req.image)
    await asyncio.to_thread(app.state.limiter.check, user_id)  # 429 when over a limit

    async def events():
        async for event, data in pipeline.run(req, user_id, d):
            yield {"event": event, "data": json.dumps(data, ensure_ascii=False)}

    return EventSourceResponse(events(), ping=15)


@app.get("/api/threads")
def list_threads(user_id: str | None = Depends(current_user), d: pipeline.Deps = Depends(deps)):
    return {"threads": d.store.list_threads(user_id)}


@app.get("/api/threads/{thread_id}")
def get_thread(thread_id: str, user_id: str | None = Depends(current_user), d: pipeline.Deps = Depends(deps)):
    thread = d.store.get_thread(thread_id, user_id)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    return thread


@app.patch("/api/threads/{thread_id}")
def rename_thread(
    thread_id: str, body: ThreadPatch, user_id: str | None = Depends(current_user), d: pipeline.Deps = Depends(deps)
):
    thread = d.store.rename_thread(thread_id, user_id, body.title)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    return thread


@app.delete("/api/threads/{thread_id}", status_code=204)
def delete_thread(thread_id: str, user_id: str | None = Depends(current_user), d: pipeline.Deps = Depends(deps)):
    if not d.store.delete_thread(thread_id, user_id):
        raise HTTPException(status_code=404, detail="Thread not found")


# Built frontend (npm run build → frontend/dist), with SPA fallback to index.html.
if (DIST / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")


@app.get("/{path:path}", include_in_schema=False)
async def spa(path: str):
    if path.startswith("api/"):
        raise HTTPException(status_code=404)
    file = (DIST / path).resolve()
    if path and file.is_file() and DIST.resolve() in file.parents:
        return FileResponse(file)
    index = DIST / "index.html"
    if index.is_file():
        return FileResponse(index)
    return {"message": "Frontend not built. Run `npm run dev` in frontend/ (dev) or `npm run build` (served here)."}
