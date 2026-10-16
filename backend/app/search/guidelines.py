"""Canadian clinical practice guidelines via SerpAPI Google search, then page text.

Ported from sara: the site:-filtered query building in backend/app.py
get_google_results, and the trafilatura extraction in backend/utils.py
get_url_content (made async here). Guideline bodies have no common API, so a
domain-restricted web search is the practical route.

SerpAPI latency is erratic (0.5 s to 80 s per call), and Google silently ignores
long site: lists. So the sites are split into small groups searched in parallel,
and whatever returns inside the time budget is used. Callers start this search
early, while the planner runs (see retrieval.py). Costs one SerpAPI search per group.
"""

import asyncio
import io
import logging
import re
import time
from urllib.parse import urlparse

import httpx
import trafilatura

from ..config import Settings
from ..schemas import Source
from . import to_year

log = logging.getLogger(__name__)

SERPAPI = "https://serpapi.com/search.json"

# Entries may carry a path prefix (canada.ca is far too broad on its own).
CANADIAN_DOMAINS: list[list[str]] = [
    # diabetes.ca, not guidelines.diabetes.ca: Google doesn't index the latter; the CPG now lives on diabetes.ca.
    ["diabetes.ca", "ccs.ca", "onlinecjc.ca", "hypertension.ca"],  # cardiometabolic
    ["canadiantaskforce.ca", "cda-amc.ca", "canada.ca/en/public-health", "choosingwiselycanada.org"],  # national
    ["cmaj.ca", "cfp.ca", "thrombosiscanada.ca"],  # journals, thrombosis
    ["cps.ca", "jogc.com", "ammi.ca"],  # paediatrics, obstetrics, infectious disease
    ["gov.bc.ca", "hqontario.ca", "cancercareontario.ca", "actt.albertadoctors.org"],  # provincial
]


def search_domains() -> list[str]:
    """Bare domains for OpenAI's web-search filter (no paths); allowed() re-checks paths."""
    return sorted({entry.split("/")[0] for group in CANADIAN_DOMAINS for entry in group})


def _title_from_url(url: str) -> str:
    stem = urlparse(url).path.rstrip("/").rsplit("/", 1)[-1]
    stem = re.sub(r"\.(pdf|html?|aspx)$", "", stem, flags=re.I)
    words = re.sub(r"(?:%20|[-_])+", " ", stem).strip()
    return words[:1].upper() + words[1:] if words else url


def pages_to_sources(pages: list[tuple[str, str]]) -> list[Source]:
    """(url, title) pairs from a web search → guideline Sources on the allowed sites."""
    out: list[Source] = []
    seen: set[str] = set()
    for url, title in pages:
        if url in seen or not allowed(url):
            continue
        seen.add(url)
        year = re.search(r"(?<!\d)(?:19|20)\d{2}(?!\d)", url)
        out.append(
            Source(
                id=f"url:{url}",
                kind="guideline",
                origin="guideline_web",
                title=title or _title_from_url(url),
                url=url,
                journal=urlparse(url).netloc.removeprefix("www."),
                year=int(year.group(0)) if year else None,
                pub_types=["Guideline web page"],
                canadian=True,
                position=len(out),
            )
        )
    return out


def build_query(query: str, domains: list[str]) -> str:
    sites = " OR ".join(f"site:{d}" for d in domains)
    return f"{query} ({sites})"


def allowed(url: str) -> bool:
    """True when the URL is on one of the listed guideline sites.

    Google silently drops site: filters when nothing matches and returns
    unrelated pages, so every result is checked again here.
    """
    parsed = urlparse(url)
    host = parsed.netloc.lower().removeprefix("www.")
    target = host + parsed.path
    if parsed.path.strip("/").lower() in ("", "en", "fr", "home", "index.html"):
        return False  # site home pages carry no guidance
    if "/fr/" in parsed.path.lower() or parsed.path.lower().startswith("/fr"):
        return False  # English pages only for now
    for group in CANADIAN_DOMAINS:
        for entry in group:
            domain, _, path = entry.partition("/")
            if host == domain or host.endswith("." + domain):
                if not path or target.startswith(entry) or target.startswith(f"{host}/{path}"):
                    return True
    return False


async def _serp(client: httpx.AsyncClient, settings: Settings, q: str, num: int) -> list[dict]:
    r = await client.get(
        SERPAPI,
        params={"engine": "google", "q": q, "gl": "ca", "hl": "en", "num": num, "api_key": settings.serpapi_api_key},
        timeout=90,
    )
    r.raise_for_status()
    data = r.json()
    if "error" in data:
        if "hasn't returned any results" not in data["error"]:
            log.warning("SerpAPI error: %s", data["error"])
        return []
    return [item for item in data.get("organic_results", []) if item.get("link") and allowed(item["link"])]


MAX_PDF_BYTES = 20 * 1024 * 1024
MAX_PDF_PAGES = 120


def _pdf_text(data: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    pages = []
    for page in reader.pages[:MAX_PDF_PAGES]:
        try:
            pages.append(page.extract_text() or "")
        except Exception:  # noqa: BLE001 - one bad page shouldn't lose the document
            continue
    return "\n\n".join(pages)


async def fetch_page_text(client: httpx.AsyncClient, url: str, timeout: float = 8.0, limit: int = 300_000) -> str:
    """Main text of an HTML page or PDF; "" on errors and timeouts."""
    try:
        r = await client.get(url, timeout=timeout, follow_redirects=True)
        if r.status_code != 200:
            return ""
        ctype = r.headers.get("content-type", "")
        if "pdf" in ctype or (url.lower().endswith(".pdf") and r.content[:4] == b"%PDF"):
            if len(r.content) > MAX_PDF_BYTES:
                return ""
            text = await asyncio.to_thread(_pdf_text, r.content)
        elif url.lower().split("?")[0].endswith(".pdf"):
            # A PDF link answered with an HTML page is a moved document redirected to a
            # landing/index page (e.g. old guidelines.diabetes.ca links), not the guideline.
            log.info("PDF link %s returned HTML (%s); treating as unavailable", url, r.url)
            return ""
        elif "html" in ctype:
            text = await asyncio.to_thread(trafilatura.extract, r.text, include_comments=False, include_tables=True)
        else:
            return ""
        return (text or "")[:limit]
    except Exception as exc:  # noqa: BLE001
        log.info("Page fetch failed for %s: %s", url, exc)
        return ""


async def search(
    client: httpx.AsyncClient,
    settings: Settings,
    query: str,
    per_group: int = 6,
    fetch_top: int = 3,
    time_budget: float = 20.0,
) -> list[Source]:
    """Search every site group in parallel; groups that miss ~75% of the budget are dropped,
    and page text is fetched in the remaining time."""
    if not settings.serpapi_api_key:
        log.info("SERPAPI_API_KEY not set; skipping guideline search")
        return []
    started = time.monotonic()
    tasks = [
        asyncio.create_task(_serp(client, settings, build_query(query, g), per_group)) for g in CANADIAN_DOMAINS
    ]
    done, pending = await asyncio.wait(tasks, timeout=time_budget * 0.75)
    for t in pending:
        t.cancel()
    if pending:
        log.info("%d of %d guideline groups missed the %.0fs budget", len(pending), len(tasks), time_budget * 0.75)

    lists: list[list[dict]] = []
    for t in tasks:  # keep group order
        if t in done:
            if t.exception():
                log.warning("Guideline search group failed: %r", t.exception())
            else:
                lists.append(t.result())

    # Interleave the groups so every specialty area appears near the top.
    results: list[dict] = []
    seen: set[str] = set()
    for i in range(max((len(g) for g in lists), default=0)):
        for g in lists:
            if i < len(g) and g[i]["link"] not in seen:
                seen.add(g[i]["link"])
                results.append(g[i])

    sources = [
        Source(
            id=f"url:{item['link']}",
            kind="guideline",
            origin="guideline_web",
            title=item.get("title", item["link"]),
            url=item["link"],
            journal=urlparse(item["link"]).netloc.removeprefix("www."),
            year=to_year(item.get("date")),
            abstract=item.get("snippet", ""),
            pub_types=["Guideline web page"],
            canadian=True,
            position=i,
        )
        for i, item in enumerate(results)
    ]

    # Pages are read later, after the rerank picks them (retrieval.enrich); fetch_top
    # pre-reads a few here only when a caller asks for it.
    if fetch_top:
        page_timeout = max(1.0, min(6.0, time_budget - (time.monotonic() - started) - 0.5))
        texts = await asyncio.gather(*(fetch_page_text(client, s.url, timeout=page_timeout) for s in sources[:fetch_top]))
        for s, text in zip(sources, texts):
            if text:
                s.abstract = f"{s.abstract}\n\n{text[:6000]}" if s.abstract else text[:6000]
    return sources
