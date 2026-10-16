import json

from app.search import europepmc, pubmed, trials


def test_pubmed_efetch_parses_articles(fixture_text):
    sources = pubmed.parse_efetch(fixture_text("pubmed_efetch.xml"))
    assert [s.pmid for s in sources] == ["35363499", "38367642"]
    first = sources[0]
    assert first.id == "pmid:35363499"
    assert first.url == "https://pubmed.ncbi.nlm.nih.gov/35363499/"
    assert first.title and not first.title.endswith(".")
    assert first.journal and first.year and 2000 < first.year < 2100
    assert first.authors and " " in first.authors[0]
    assert len(first.abstract) > 200
    assert "Practice Guideline" in first.pub_types
    assert first.doi and first.doi.startswith("10.")


def test_europepmc_parse(fixture_text):
    sources = europepmc.parse(json.loads(fixture_text("europepmc_search.json")))
    assert len(sources) == 2
    for s in sources:
        assert s.origin == "europepmc"
        assert s.title and s.url.startswith("https://")
        assert s.id.split(":")[0] in {"pmid", "doi", "epmc"}
        assert "<" not in s.abstract  # HTML stripped


def test_europepmc_marks_preprints():
    data = {"resultList": {"result": [{"id": "PPR1", "source": "PPR", "title": "A preprint", "pubTypeList": {"pubType": []}}]}}
    (s,) = europepmc.parse(data)
    assert "Preprint" in s.pub_types
    assert s.url == "https://europepmc.org/article/PPR/PPR1"


def test_trials_parse(fixture_text):
    sources = trials.parse(json.loads(fixture_text("ctgov_studies.json")))
    assert sources and all(s.kind == "trial" for s in sources)
    s = sources[0]
    assert s.nct_id and s.url == f"https://clinicaltrials.gov/study/{s.nct_id}"
    assert "Status:" in s.abstract
