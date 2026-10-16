"""Europe PMC REST search: adds open-access and preprint coverage beyond PubMed. No key."""

import logging
import xml.etree.ElementTree as ET

import httpx

from ..schemas import Source
from . import get_json, strip_tags, to_year

log = logging.getLogger(__name__)

URL = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"


async def search(client: httpx.AsyncClient, query: str, page_size: int = 10) -> list[Source]:
    try:
        data = await get_json(
            client,
            URL,
            {"query": query, "format": "json", "pageSize": page_size, "resultType": "core"},  # relevance order is the default
        )
        return parse(data)
    except Exception as exc:  # noqa: BLE001
        log.warning("Europe PMC search failed for %r: %s", query, exc)
        return []


FULL_TEXT = "https://www.ebi.ac.uk/europepmc/webservices/rest/{pmcid}/fullTextXML"


async def full_text(client: httpx.AsyncClient, pmcid: str, timeout: float = 8.0) -> str:
    """Body text of an open-access article (JATS XML). "" when the article isn't in the
    open-access subset (Europe PMC answers 4xx/5xx) or on any error."""
    try:
        r = await client.get(FULL_TEXT.format(pmcid=pmcid), timeout=timeout)
        if r.status_code != 200:
            return ""
        root = ET.fromstring(r.content)
        body = root.find(".//body")
        if body is None:
            return ""
        blocks = []
        for el in body.iter():
            if el.tag in ("title", "p"):
                text = " ".join("".join(el.itertext()).split())
                if text:
                    blocks.append(text)
        return "\n\n".join(blocks)
    except Exception as exc:  # noqa: BLE001
        log.info("Europe PMC full text failed for %s: %s", pmcid, exc)
        return ""


def parse(data: dict) -> list[Source]:
    out: list[Source] = []
    for i, rec in enumerate(data.get("resultList", {}).get("result", [])):
        title = strip_tags(rec.get("title")).rstrip(".")
        if not title:
            continue
        pmid, doi, pmcid = rec.get("pmid"), rec.get("doi"), rec.get("pmcid")
        src_db, rec_id = rec.get("source", ""), rec.get("id", "")
        pub_types = list(rec.get("pubTypeList", {}).get("pubType", []) or [])
        if src_db == "PPR" and "Preprint" not in pub_types:
            pub_types.append("Preprint")

        journal_info = rec.get("journalInfo", {}) or {}
        journal = (journal_info.get("journal") or {}).get("isoabbreviation") or (journal_info.get("journal") or {}).get(
            "title"
        )
        authors = [a.get("fullName") for a in rec.get("authorList", {}).get("author", []) if a.get("fullName")]
        if pmid:
            key, url = f"pmid:{pmid}", f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
        elif doi:
            key, url = f"doi:{doi.lower()}", f"https://doi.org/{doi}"
        else:
            key, url = f"epmc:{src_db}:{rec_id}", f"https://europepmc.org/article/{src_db}/{rec_id}"
        if pmcid and rec.get("isOpenAccess") == "Y":
            url = f"https://europepmc.org/article/PMC/{pmcid}"

        out.append(
            Source(
                id=key,
                kind="article",
                origin="europepmc",
                title=title,
                url=url,
                journal=journal,
                year=to_year(rec.get("pubYear")),
                authors=authors,
                abstract=strip_tags(rec.get("abstractText")),
                pub_types=pub_types,
                pmid=pmid,
                doi=doi.lower() if doi else None,
                pmcid=pmcid,
                canadian="canada" in (rec.get("affiliation") or "").lower(),
                position=i,
            )
        )
    return out
