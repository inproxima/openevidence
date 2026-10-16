"""Search backends. Each returns a list of schemas.Source and never raises on
network or parse errors: failures are logged and yield an empty list so one
slow or broken backend can't sink the whole answer."""

import asyncio
import re

import httpx

USER_AGENT = "clinical-evidence-ca/0.1 (+local development)"


async def get_json(client: httpx.AsyncClient, url: str, params: dict, retries: int = 2) -> dict | list:
    """GET JSON, retrying transient 5xx/timeouts with a short backoff (Europe PMC returns sporadic 503s)."""
    for attempt in range(retries + 1):
        try:
            r = await client.get(url, params=params)
            if r.status_code >= 500 and attempt < retries:
                await asyncio.sleep(0.6 * (attempt + 1))
                continue
            r.raise_for_status()
            return r.json()
        except (httpx.TimeoutException, httpx.TransportError):
            if attempt == retries:
                raise
            await asyncio.sleep(0.6 * (attempt + 1))
    raise RuntimeError("unreachable")


def strip_tags(text: str | None) -> str:
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def to_year(value) -> int | None:
    if value is None:
        return None
    m = re.search(r"(19|20)\d{2}", str(value))
    return int(m.group(0)) if m else None
