from app import retrieval
from app.schemas import Source
from app.search import guidelines


def src(**kw) -> Source:
    base = {"id": "x", "kind": "article", "origin": "pubmed", "title": "Title", "url": "https://e.org"}
    return Source(**{**base, **kw})


def test_merge_collapses_same_paper_from_two_backends():
    a = src(id="pmid:1", pmid="1", doi="10.1/a", abstract="short", position=3)
    b = src(id="doi:10.1/a", origin="europepmc", doi="10.1/a", abstract="a much longer abstract", canadian=True, position=0)
    c = src(id="pmid:2", pmid="2", title="Other")
    merged = retrieval.merge([a, b, c])
    assert len(merged) == 2
    assert merged[0].abstract == "a much longer abstract"
    assert merged[0].canadian and merged[0].position == 0


def test_merge_by_title_when_ids_differ():
    a = src(id="pmid:1", pmid="1", title="Same Title: A Trial")
    b = src(id="url:https://x", title="Same title - a trial")
    assert len(retrieval.merge([a, b])) == 1


def test_seed_query_drops_stopwords_and_uses_previous_question():
    q = retrieval.seed_guideline_query("What about in pregnancy?", ["Is aspirin recommended for preeclampsia prevention?"])
    assert "aspirin" in q and "pregnancy" in q
    assert "What" not in q.split() and len(q.split()) <= 8


def test_guideline_domain_filter():
    assert guidelines.allowed("https://guidelines.diabetes.ca/cpg/chapter-13")  # subdomain of diabetes.ca
    assert guidelines.allowed("https://www.diabetes.ca/for-professionals/reduce-complications/pharmacology-t2-2")
    assert guidelines.allowed("https://www.canada.ca/en/public-health/services/immunization.html")
    assert not guidelines.allowed("https://www.canada.ca/en/revenue-agency/services/tax.html")
    assert not guidelines.allowed("https://diabetestimes.co.uk/esc-guidelines")
    assert not guidelines.allowed("https://ccs.ca/")  # home page
    assert not guidelines.allowed("https://ccs.ca/fr/lignes-directrices")  # French duplicate
    assert guidelines.allowed("https://www2.gov.bc.ca/gov/content/health/practitioner-professional-resources/bc-guidelines")


def test_relevance_beats_an_off_topic_guideline():
    from app.evidence import classify

    terms = retrieval._terms("statins primary prevention older adults over 75")
    on_topic = classify(src(title="Statins for primary prevention in older adults", pub_types=["Meta-Analysis"], year=2022, abstract="statin"))
    off_topic = classify(src(kind="guideline", title="Chronic kidney disease management", year=2025, canadian=True, abstract="eGFR"))
    assert retrieval.heuristic_score(on_topic, True, terms) > retrieval.heuristic_score(off_topic, True, terms)


def test_canadian_guideline_query_wraps_topic():
    q = retrieval.canadian_guideline_query('"Diabetes Mellitus, Type 2"[MeSH]')
    assert q.startswith('("Diabetes Mellitus, Type 2"[MeSH]) AND (')
    assert '"Can J Diabetes"[ta]' in q and "practice guideline[pt]" in q


def test_enrich_targets_pick_snippets_monographs_and_pmc_articles():
    page = src(id="url:a", origin="guideline_web", kind="guideline", abstract="snippet")
    drug = src(id="dpd:x", origin="health_canada", kind="drug", abstract="products")
    oa = src(id="pmid:1", pmcid="PMC1", evidence_rank=2)
    weak = src(id="pmid:2", pmcid="PMC2", evidence_rank=8)
    no_pmc = src(id="pmid:3", evidence_rank=1)
    assert retrieval.enrich_targets([page, drug, oa, weak, no_pmc], "quick") == [page, drug, oa]


def test_web_search_pages_become_filtered_guideline_sources():
    pages = [
        ("https://guidelines.diabetes.ca/GuideLines/media/Docs/cpg/DC-Guidelines-2024-Pharm2-Update.pdf", ""),
        ("https://ccs.ca/guideline/2020-atrial-fibrillation/chapter-8-stroke-prevention/", "Chapter 8: Stroke prevention"),
        ("https://www.canada.ca/en/revenue-agency/tax.html", "Tax"),  # off-path canada.ca
        ("https://ccs.ca/", "Home"),  # home page
        ("https://ccs.ca/guideline/2020-atrial-fibrillation/chapter-8-stroke-prevention/", "dup"),
    ]
    out = guidelines.pages_to_sources(pages)
    assert [s.url for s in out] == [pages[0][0], pages[1][0]]
    assert out[0].title == "DC Guidelines 2024 Pharm2 Update" and out[0].year == 2024
    assert out[1].title == "Chapter 8: Stroke prevention" and out[1].year == 2020
    assert all(s.canadian and s.kind == "guideline" for s in out)


async def test_search_guidelines_runs_engines_in_parallel_and_keeps_openai_first(monkeypatch):
    from app.config import get_settings

    class LLM:
        async def find_pages(self, query, domains):
            assert "diabetes.ca" in domains
            return [("https://ccs.ca/guideline/2020-atrial-fibrillation/chapter-8/", "CCS AF")]

    async def serp(*a, **k):
        return [src(id="url:https://cmaj.ca/x", origin="guideline_web", kind="guideline", url="https://cmaj.ca/x")]

    monkeypatch.setattr(guidelines, "search", serp)
    found = await retrieval.search_guidelines(None, get_settings(), "af", "quick", LLM())
    assert [s.url for s in found] == ["https://ccs.ca/guideline/2020-atrial-fibrillation/chapter-8/", "https://cmaj.ca/x"]


def test_monograph_link_pattern():
    from app.search import health_canada

    html = '<a href="https://pdf.hres.ca/dpd_pm/00078262.PDF">Product Monograph</a>'
    assert health_canada.MONOGRAPH_RE.search(html).group(1) == "https://pdf.hres.ca/dpd_pm/00078262.PDF"


def test_canadian_journals():
    assert retrieval.is_canadian_journal("Can Fam Physician")
    assert retrieval.is_canadian_journal("CMAJ")
    assert retrieval.is_canadian_journal("Canadian Journal of Cardiology")
    assert not retrieval.is_canadian_journal("N Engl J Med")
    assert not retrieval.is_canadian_journal(None)


def test_heuristic_prefers_recent_canadian_guideline():
    from app.evidence import classify

    guideline = classify(src(kind="guideline", year=2024, canadian=True, abstract="x"))
    case = classify(src(pub_types=["Case Reports"], year=2009, abstract="x"))
    assert retrieval.heuristic_score(guideline, True) > retrieval.heuristic_score(case, True)
