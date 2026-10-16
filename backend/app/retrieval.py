"""Fan out to every search backend, merge duplicates, score, and pick the sources
the answer will cite."""

import asyncio
import logging
import re
import time
from dataclasses import dataclass
from datetime import date

import httpx

from . import passages
from .config import Settings
from .evidence import classify
from .schemas import Mode, QueryPlan, Source
from .search import europepmc, guidelines, health_canada, pubmed, trials

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class Budget:
    pubmed_per_query: int
    max_pubmed_queries: int
    europepmc: int
    trials: int
    guideline_per_group: int
    guideline_fetch: int
    guideline_timeout: float
    rerank_pool: int
    canadian_guidelines: int


BUDGETS: dict[str, Budget] = {
    # guideline_timeout covers OpenAI web search (~15-20 s) and SerpAPI (0.5-80 s), run in parallel.
    "quick": Budget(15, 2, 10, 4, 6, 0, 24.0, 36, 8),
    "deep": Budget(30, 4, 25, 10, 10, 0, 45.0, 90, 15),
}

# Characters of each chosen source shown to the answer model. Guideline documents get
# more room, filled with their most relevant passages (see enrich and passages.select).
EXCERPT = {"quick": 1800, "deep": 1100}
FULL_TEXT_EXCERPT = {"quick": 3500, "deep": 2500}
GUIDELINE_EXCERPT = {"quick": 5000, "deep": 3500}
ENRICH_TIMEOUT = {"quick": 9.0, "deep": 15.0}
MAX_FULL_TEXT_ARTICLES = {"quick": 4, "deep": 10}

# PubMed journal abbreviations ([ta]) where Canadian societies publish their guidelines
# (Diabetes Canada → Can J Diabetes, CCS → Can J Cardiol, SOGC → J Obstet Gynaecol Can, …).
CANADIAN_GUIDELINE_JOURNALS = [
    "CMAJ", "Can J Diabetes", "Can J Cardiol", "Can Fam Physician", "J Obstet Gynaecol Can", "Paediatr Child Health",
    "Can J Kidney Health Dis", "Curr Oncol", "Can J Psychiatry", "Can J Anaesth", "CJEM", "Can J Gastroenterol Hepatol",
    "Can Respir J", "Can Urol Assoc J", "J Assoc Med Microbiol Infect Dis Can", "Can J Neurol Sci", "Can Geriatr J",
    "Can J Ophthalmol", "Can J Surg", "Can Liver J", "Can J Public Health",
]
GUIDELINE_FILTER = (
    'guideline[pt] OR practice guideline[pt] OR consensus development conference[pt] OR guideline*[ti] '
    'OR recommendation*[ti] OR "position statement"[ti] OR "consensus statement"[ti] OR "clinical practice"[ti] '
    'OR update[ti]'
)


def canadian_guideline_query(topic: str) -> str:
    journals = " OR ".join(f'"{j}"[ta]' for j in CANADIAN_GUIDELINE_JOURNALS)
    return f"({topic}) AND ({journals}) AND ({GUIDELINE_FILTER})"


STOPWORDS = set(
    "a an and are as at be by can could do does for from how i in is it of on or should the to was what when "
    "which who why will with would you your my patient patients please about any there this that than vs versus "
    "per guideline guidelines recommendation recommendations canada canadian first-line established best".split()
)


def seed_guideline_query(question: str, previous_questions: list[str]) -> str:
    """Plain query for the guideline search, built without the LLM so it can start immediately."""
    text = " ".join(previous_questions[-1:] + [question])
    words = [w for w in re.findall(r"[A-Za-z0-9][A-Za-z0-9\-]+", text) if w.lower() not in STOPWORDS]
    seen: list[str] = []
    for w in words:
        if w.lower() not in (s.lower() for s in seen):
            seen.append(w)
    # Short queries match far more guideline pages; the site filters already say "Canadian guideline".
    return " ".join(seen[-8:])


async def _web_search_guidelines(llm, query: str) -> list[Source]:
    try:
        return guidelines.pages_to_sources(await llm.find_pages(query, guidelines.search_domains()))
    except Exception as exc:  # noqa: BLE001
        log.warning("OpenAI guideline web search failed: %r", exc)
        return []


async def search_guidelines(http: httpx.AsyncClient, settings: Settings, query: str, mode: Mode, llm=None) -> list[Source]:
    """Canadian guideline pages from every configured engine, run in parallel within the
    mode's time budget. OpenAI web search results come first (more relevant), then SerpAPI."""
    b = BUDGETS[mode]
    engines = {e.strip().lower() for e in settings.guideline_search.split(",")}
    tasks: list[asyncio.Task] = []
    if "openai" in engines and llm is not None:
        tasks.append(asyncio.create_task(_web_search_guidelines(llm, query)))
    if "serpapi" in engines:
        tasks.append(
            asyncio.create_task(
                guidelines.search(
                    http, settings, query,
                    per_group=b.guideline_per_group, fetch_top=b.guideline_fetch, time_budget=b.guideline_timeout,
                )
            )
        )
    if not tasks:
        return []
    done, pending = await asyncio.wait(tasks, timeout=b.guideline_timeout)
    for t in pending:
        t.cancel()
    if pending:
        log.info("%d guideline engine(s) missed the %.0fs budget", len(pending), b.guideline_timeout)
    return [s for t in tasks if t in done and not t.exception() for s in t.result()]


def start_guideline_search(
    http: httpx.AsyncClient, settings: Settings, query: str, mode: Mode, llm=None
) -> tuple[asyncio.Task, float]:
    task = asyncio.create_task(search_guidelines(http, settings, query, mode, llm))
    return task, time.monotonic()


def _title_key(title: str) -> str:
    return re.sub(r"[^a-z0-9]", "", title.lower())[:120]


def merge(sources: list[Source]) -> list[Source]:
    """Collapse the same paper seen in several backends (by PMID, DOI, URL or title)."""
    merged: list[Source] = []
    index: dict[str, Source] = {}
    for s in sources:
        keys = [k for k in (f"pmid:{s.pmid}" if s.pmid else "", f"doi:{s.doi}" if s.doi else "", s.id, _title_key(s.title)) if k]
        existing = next((index[k] for k in keys if k in index), None)
        if existing is None:
            merged.append(s)
            target = s
        else:
            target = existing
            if len(s.abstract) > len(target.abstract):
                target.abstract = s.abstract
            target.canadian = target.canadian or s.canadian
            target.position = min(target.position, s.position)
            target.pub_types = list(dict.fromkeys(target.pub_types + s.pub_types))
            target.pmid = target.pmid or s.pmid
            target.doi = target.doi or s.doi
            target.pmcid = target.pmcid or s.pmcid
            target.year = target.year or s.year
            target.journal = target.journal or s.journal
            target.authors = target.authors or s.authors
        for k in keys:
            index.setdefault(k, target)
    return merged


CANADIAN_JOURNALS = {
    "cmaj", "cmaj open", "can fam physician", "can j cardiol", "cjem", "can j diabetes", "j obstet gynaecol can",
    "paediatr child health", "can j psychiatry", "can j anaesth", "can j surg", "can j kidney health dis",
    "curr oncol", "can respir j", "can j gastroenterol hepatol", "can geriatr j", "can j neurol sci",
    "can j public health", "can pharm j (ott)", "can j hosp pharm", "can urol assoc j", "can j ophthalmol",
    "j assoc med microbiol infect dis can", "can liver j", "can j pain", "can j infect dis med microbiol",
}


def is_canadian_journal(journal: str | None) -> bool:
    j = (journal or "").lower().strip().rstrip(".")
    return j in CANADIAN_JOURNALS or j.startswith("can ") or "canadian" in j


def _terms(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-z0-9][a-z0-9\-]{2,}", text.lower()) if w not in STOPWORDS}


def relevance(question_terms: set[str], s: Source) -> float:
    """Share of the question's words found in the title (double weight) and abstract, 0..1."""
    if not question_terms:
        return 0.0
    title, body = _terms(s.title), _terms(s.abstract[:3000])
    hits = sum(2 if t in title else 1 if t in body else 0 for t in question_terms)
    return hits / (2 * len(question_terms))


def heuristic_score(s: Source, canada_focus: bool, question_terms: set[str] | None = None) -> float:
    """Pre-ranking before the LLM rerank: topical relevance, evidence level, recency,
    backend relevance, Canada. Also the fallback order when the rerank fails."""
    score = 6.0 * relevance(question_terms or set(), s)
    score += 10.0 - s.evidence_rank
    if s.year:
        age = date.today().year - s.year
        score += 2.0 if age <= 5 else 1.0 if age <= 10 else -1.0 if age > 15 else 0.0
    score += 3.0 / (1 + s.position)
    if canada_focus and s.canadian:
        score += 2.0
    if not s.abstract:
        # Many society guidelines are indexed without an abstract; the title still identifies them.
        score -= 1.0 if (s.evidence_rank == 1 and s.canadian) else 3.0
    return score


async def collect(
    http: httpx.AsyncClient,
    settings: Settings,
    plan: QueryPlan,
    mode: Mode,
    guideline_task: asyncio.Task | None = None,
    guideline_started: float | None = None,
    question: str = "",
    llm=None,
) -> tuple[list[Source], dict[str, int | str]]:
    """Run all backends; returns merged, classified, heuristically sorted candidates and per-backend counts.

    `question` should be self-contained; for follow-ups pass the previous question too."""
    b = BUDGETS[mode]
    queries = [q for q in plan.pubmed_queries if q.strip()][: b.max_pubmed_queries]

    jobs = {
        "pubmed": asyncio.gather(*(pubmed.search(http, settings, q, b.pubmed_per_query) for q in queries)),
        # Canadian society guidelines published in Canadian journals: fast and reliable, unlike web search.
        # Two angles: the topic by relevance, and the condition alone newest-first, because the latest
        # guideline updates are often in-process records with no MeSH terms or abstract yet.
        "pubmed_canada": (
            asyncio.gather(
                pubmed.search(http, settings, canadian_guideline_query(plan.pubmed_topic), b.canadian_guidelines),
                pubmed.search(
                    http, settings, canadian_guideline_query(plan.pubmed_condition), b.canadian_guidelines,
                    sort="pub_date",
                ),
            )
            if settings.canada_focus and plan.pubmed_topic.strip() and plan.pubmed_condition.strip()
            else _empty_groups()
        ),
        "europepmc": europepmc.search(http, plan.europepmc_query, b.europepmc),
        "trials": trials.search(http, plan.trial_query, b.trials) if plan.trial_query else _empty(),
        "health_canada": health_canada.search(http, plan.drug_names),
    }
    # Deep mode also searches guidelines with the planner's wording.
    if mode == "deep" and plan.guideline_query:
        jobs["guidelines_planned"] = search_guidelines(http, settings, plan.guideline_query, mode, llm)
    results = dict(zip(jobs, await asyncio.gather(*jobs.values(), return_exceptions=True)))

    counts: dict[str, int | str] = {}
    pool: list[Source] = []
    for name, value in results.items():
        if isinstance(value, Exception):
            log.warning("%s failed: %r", name, value)
            counts[name] = "error"
            continue
        items = [s for group in value for s in group] if name in ("pubmed", "pubmed_canada") else value
        if name == "pubmed_canada":
            for s in items:
                s.canadian = True
        counts[name] = len(items)
        pool.extend(items)

    if guideline_task is not None:
        # The search keeps to its own budget and returns partial results; this is only a backstop.
        remaining = b.guideline_timeout + 3 - (time.monotonic() - (guideline_started or time.monotonic()))
        try:
            found = await asyncio.wait_for(asyncio.shield(guideline_task), timeout=max(remaining, 0.1))
            counts["guidelines"] = len(found)
            pool.extend(found)
        except asyncio.TimeoutError:
            guideline_task.cancel()
            counts["guidelines"] = "timeout"
            log.info("Guideline search exceeded %.0fs; continuing without it", b.guideline_timeout)
        except Exception as exc:  # noqa: BLE001
            counts["guidelines"] = "error"
            log.warning("Guideline search failed: %r", exc)

    candidates = [classify(s) for s in merge(pool)]
    question_terms = _terms(question)
    for s in candidates:
        s.canadian = s.canadian or is_canadian_journal(s.journal)
        s.score = heuristic_score(s, settings.canada_focus, question_terms)
    candidates.sort(key=lambda s: s.score, reverse=True)
    return candidates, counts


async def _empty() -> list[Source]:
    return []


async def _empty_groups() -> list[list[Source]]:
    return []


def excerpt_limit(s: Source, mode: Mode) -> int:
    if s.kind == "guideline" or (s.full_text and (s.evidence_rank == 1 or s.kind == "drug")):
        return GUIDELINE_EXCERPT[mode]
    return FULL_TEXT_EXCERPT[mode] if s.full_text else EXCERPT[mode]


def enrich_targets(sources: list[Source], mode: Mode) -> list[Source]:
    """What to read in full: guideline web pages that only carry a search snippet,
    Health Canada records (their product monograph), and the strongest chosen articles
    that have a PubMed Central copy (open-access ones yield full text)."""
    pages = [s for s in sources if s.origin == "guideline_web" and len(s.abstract) < 1500]
    drugs = [s for s in sources if s.kind == "drug" and not s.full_text][:3]
    articles = [s for s in sources if s.kind == "article" and s.pmcid and s.evidence_rank <= 3]
    return pages + drugs + articles[: MAX_FULL_TEXT_ARTICLES[mode]]


async def _monograph(http: httpx.AsyncClient, s: Source) -> str:
    url = await health_canada.monograph_url(http, s.url)
    if not url:
        return ""
    text = await guidelines.fetch_page_text(http, url, timeout=12.0)
    if text:
        s.url = url  # the source card now opens the monograph itself
    return text


async def enrich(http: httpx.AsyncClient, sources: list[Source], question: str, mode: Mode) -> int:
    """Read full documents for the chosen sources and keep their most relevant passages:
    guideline pages (HTML or PDF; search gives only a snippet), product monographs
    (Canadian dosing), and open-access articles (Europe PMC full text; PubMed gives only
    the abstract). Returns documents read."""
    targets = enrich_targets(sources, mode)
    if not targets:
        return 0
    terms = _terms(question)
    tasks = []
    for s in targets:
        if s.origin == "guideline_web":
            coro = guidelines.fetch_page_text(http, s.url)
        elif s.kind == "drug":
            coro = _monograph(http, s)
        else:
            coro = europepmc.full_text(http, s.pmcid)
        tasks.append(asyncio.create_task(coro))
    done, pending = await asyncio.wait(tasks, timeout=ENRICH_TIMEOUT[mode])
    for t in pending:
        t.cancel()
    read = 0
    for s, t in zip(targets, tasks):
        if t in done and not t.exception() and t.result():
            s.full_text = True
            if s.kind == "article":
                # Keep the abstract first, then the most relevant passages of the body.
                room = excerpt_limit(s, mode) - len(s.abstract) - 4
                if room > 300:
                    s.abstract = f"{s.abstract}\n\n{passages.select(t.result(), terms, room, lead=0)}"
            elif s.kind == "drug":
                # Product list stays (Canadian availability); monograph passages follow.
                listing = s.abstract[:1200]
                body = passages.select(t.result(), terms, excerpt_limit(s, mode) - len(listing) - 40)
                s.abstract = f"{listing}\n\nProduct monograph excerpts:\n{body}"
            else:
                body = passages.select(t.result(), terms, excerpt_limit(s, mode) - len(s.abstract) - 4)
                s.abstract = f"{s.abstract}\n\n{body}" if s.abstract else body
            read += 1
    return read


def candidate_digest(sources: list[Source]) -> list[tuple[str, str]]:
    """Short text per candidate for the LLM reranker: (short id, one-line description)."""
    out = []
    for i, s in enumerate(sources):
        access = "full document readable" if s.origin == "guideline_web" else "" if s.abstract else "TITLE ONLY"
        flags = ", ".join(
            x for x in (s.evidence_level, str(s.year or ""), "Canada" if s.canadian else "", access) if x
        )
        snippet = re.sub(r"\s+", " ", s.abstract)[:220]
        out.append((f"c{i}", f"{s.title} [{flags}] ({s.journal or s.origin}) {snippet}"))
    return out
