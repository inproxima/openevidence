"""PubMed via NCBI E-utilities: esearch for PMIDs, efetch XML for abstracts.

Rate limit: 3 requests/s without NCBI_API_KEY, 10/s with one.
"""

import asyncio
import logging
import time
import xml.etree.ElementTree as ET

import httpx

from ..config import Settings
from ..schemas import Source
from . import to_year

log = logging.getLogger(__name__)

EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

_rate_lock = asyncio.Lock()
_last_call = 0.0


async def _throttle(settings: Settings) -> None:
    global _last_call
    interval = 0.11 if settings.ncbi_api_key else 0.4
    async with _rate_lock:
        wait = _last_call + interval - time.monotonic()
        if wait > 0:
            await asyncio.sleep(wait)
        _last_call = time.monotonic()


def _params(settings: Settings, **extra) -> dict:
    params = {"db": "pubmed", "tool": settings.ncbi_tool, **extra}
    if settings.ncbi_email:
        params["email"] = settings.ncbi_email
    if settings.ncbi_api_key:
        params["api_key"] = settings.ncbi_api_key
    return params


async def _get(client: httpx.AsyncClient, settings: Settings, path: str, params: dict) -> httpx.Response:
    """Throttled GET that backs off and retries when NCBI answers 429 or 5xx."""
    for attempt in range(3):
        await _throttle(settings)
        r = await client.get(f"{EUTILS}/{path}", params=params)
        if (r.status_code == 429 or r.status_code >= 500) and attempt < 2:
            await asyncio.sleep(1.0 * (attempt + 1))
            continue
        r.raise_for_status()
        return r
    raise RuntimeError("unreachable")


async def esearch(
    client: httpx.AsyncClient, settings: Settings, query: str, retmax: int, sort: str = "relevance"
) -> list[str]:
    r = await _get(
        client, settings, "esearch.fcgi", _params(settings, term=query, retmode="json", retmax=retmax, sort=sort)
    )
    return r.json().get("esearchresult", {}).get("idlist", [])


async def efetch(client: httpx.AsyncClient, settings: Settings, pmids: list[str]) -> list[Source]:
    if not pmids:
        return []
    r = await _get(client, settings, "efetch.fcgi", _params(settings, id=",".join(pmids), retmode="xml"))
    sources = parse_efetch(r.text)
    order = {pmid: i for i, pmid in enumerate(pmids)}
    for s in sources:
        s.position = order.get(s.pmid or "", len(order))
    return sorted(sources, key=lambda s: s.position)


async def search(
    client: httpx.AsyncClient, settings: Settings, query: str, retmax: int = 15, sort: str = "relevance"
) -> list[Source]:
    """sort: "relevance" or "pub_date" (newest first)."""
    try:
        return await efetch(client, settings, await esearch(client, settings, query, retmax, sort))
    except Exception as exc:  # noqa: BLE001 - a failed backend must not fail the answer
        log.warning("PubMed search failed for %r: %s", query, exc)
        return []


def _text(el: ET.Element | None) -> str:
    return " ".join("".join(el.itertext()).split()) if el is not None else ""


def parse_efetch(xml_text: str) -> list[Source]:
    root = ET.fromstring(xml_text)
    out: list[Source] = []
    for art in root.iter("PubmedArticle"):
        cit = art.find("MedlineCitation")
        if cit is None:
            continue
        pmid = _text(cit.find("PMID"))
        article = cit.find("Article")
        if article is None or not pmid:
            continue

        title = _text(article.find("ArticleTitle")).rstrip(".")
        parts = []
        for ab in article.findall("Abstract/AbstractText"):
            label = ab.get("Label")
            body = _text(ab)
            parts.append(f"{label}: {body}" if label else body)
        abstract = "\n".join(p for p in parts if p)

        journal = _text(article.find("Journal/ISOAbbreviation")) or _text(article.find("Journal/Title"))
        pubdate = article.find("Journal/JournalIssue/PubDate")
        year = to_year(_text(pubdate.find("Year")) or _text(pubdate.find("MedlineDate"))) if pubdate is not None else None
        if year is None:
            year = to_year(_text(article.find("ArticleDate/Year")))

        authors = []
        for a in article.findall("AuthorList/Author"):
            collective = _text(a.find("CollectiveName"))
            if collective:
                authors.append(collective)
                continue
            last, initials = _text(a.find("LastName")), _text(a.find("Initials"))
            if last:
                authors.append(f"{last} {initials}".strip())

        pub_types = [_text(p) for p in article.findall("PublicationTypeList/PublicationType")]

        doi = None
        for loc in article.findall("ELocationID"):
            if loc.get("EIdType") == "doi":
                doi = _text(loc)
        pmcid = None
        for aid in art.findall("PubmedData/ArticleIdList/ArticleId"):
            if aid.get("IdType") == "doi" and not doi:
                doi = _text(aid)
            elif aid.get("IdType") == "pmc":
                pmcid = _text(aid)

        country = _text(cit.find("MedlineJournalInfo/Country"))
        out.append(
            Source(
                id=f"pmid:{pmid}",
                kind="article",
                origin="pubmed",
                title=title or f"PubMed {pmid}",
                url=f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                journal=journal or None,
                year=year,
                authors=authors,
                abstract=abstract,
                pub_types=pub_types,
                pmid=pmid,
                doi=doi.lower() if doi else None,
                pmcid=pmcid,
                canadian=country.lower() == "canada",
            )
        )
    return out
