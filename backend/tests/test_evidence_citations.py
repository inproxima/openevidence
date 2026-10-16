import pytest

from app.citations import check_citations, format_reference
from app.evidence import classify
from app.schemas import Source


def make(**kw) -> Source:
    base = {"id": "x", "kind": "article", "origin": "pubmed", "title": "A study", "url": "https://example.org"}
    return Source(**{**base, **kw})


@pytest.mark.parametrize(
    ("kw", "level"),
    [
        ({"pub_types": ["Journal Article", "Practice Guideline"]}, "Guideline"),
        ({"pub_types": ["Meta-Analysis", "Review"]}, "Systematic review"),
        ({"pub_types": ["Randomized Controlled Trial", "Multicenter Study"]}, "RCT"),
        ({"pub_types": ["Observational Study"]}, "Observational"),
        ({"pub_types": ["Case Reports"]}, "Case report"),
        ({"pub_types": ["Review"]}, "Review"),
        ({"pub_types": ["review-article"], "title": "SGLT2 inhibitors: a Bayesian network meta-analysis"}, "Systematic review"),
        ({"pub_types": ["Journal Article"], "title": "A randomized trial of X"}, "RCT"),
        ({"pub_types": ["Journal Article"]}, "Other"),
        ({"kind": "guideline", "pub_types": ["Guideline web page"], "title": "Diabetes care"}, "Guideline"),
        ({"kind": "drug"}, "Health Canada"),
        ({"kind": "trial"}, "Registered trial"),
    ],
)
def test_classify(kw, level):
    assert classify(make(**kw)).evidence_level == level


def test_stronger_evidence_ranks_lower():
    g = classify(make(pub_types=["Practice Guideline"]))
    r = classify(make(pub_types=["Randomized Controlled Trial"]))
    c = classify(make(pub_types=["Case Reports"]))
    assert g.evidence_rank < r.evidence_rank < c.evidence_rank


def test_check_citations_keeps_valid_and_removes_invalid():
    text, used, invalid = check_citations("Statins reduce events [1][7]. Benefit is smaller after 75 [2, 9] .", 3)
    assert text == "Statins reduce events [1]. Benefit is smaller after 75 [2]."
    assert used == [1, 2]
    assert invalid == [7, 9]


def test_check_citations_expands_ranges_and_dedupes():
    text, used, invalid = check_citations("See [2-4] and [3,3].", 5)
    assert text == "See [2][3][4] and [3]."
    assert used == [2, 3, 4]
    assert invalid == []


def test_check_citations_ignores_markdown_links_and_years():
    text, used, _ = check_citations("[Diabetes Canada](https://x.ca) 2024 recommends [1].", 1)
    assert text == "[Diabetes Canada](https://x.ca) 2024 recommends [1]."
    assert used == [1]


def test_finding_line_prefers_conclusions():
    from app.citations import finding_line

    s = make(abstract="BACKGROUND: Old drugs. METHODS: We pooled 19 trials.\nCONCLUSIONS: Apixaban caused less bleeding than warfarin. More trials needed.")
    assert finding_line(s) == "Apixaban caused less bleeding than warfarin."
    s2 = make(abstract="BACKGROUND: Atrial fibrillation is common in CKD. Dosing is uncertain.")
    assert finding_line(s2) == "Atrial fibrillation is common in CKD."
    bare = make(abstract="Background The lifetime risk of stroke in untreated AF approximates 1 in 3. Methods We searched.")
    assert finding_line(bare) == "The lifetime risk of stroke in untreated AF approximates 1 in 3."
    s3 = make(abstract="word " * 80)
    assert finding_line(s3).endswith("…") and len(finding_line(s3)) <= 170
    assert finding_line(make(abstract="")) == ""


def test_finding_line_for_drug_records_and_web_pages():
    from app.citations import finding_line

    drug = make(kind="drug", abstract="Products containing apixaban listed in Health Canada's Drug Product Database (16 found, 14 marketed):\n- APO-APIXABAN")
    assert finding_line(drug) == "14 of 16 listed products marketed in Canada"
    page = make(
        kind="guideline",
        abstract="HEALTH STATUS SINCE LAST REFILL ACTUAL OR POTENTIAL DTP? Any new problems? "
        "Calculate creatinine clearance with the Cockcroft-Gault equation when eGFR is below 50 mL/min.",
    )
    assert finding_line(page).startswith("Calculate creatinine clearance")
    assert finding_line(make(kind="guideline", abstract="MENU HOME CONTACT")) == ""
    form = make(kind="guideline", abstract="(If yes, describe in margin) Y N Any planned medical procedures and/or surgeries?")
    assert finding_line(form) == ""


def test_format_reference_vancouver():
    s = make(
        title="Empagliflozin in heart failure",
        authors=[f"Author{i} A" for i in range(8)],
        journal="N Engl J Med",
        year=2021,
        doi="10.1056/nejmoa2107038",
    )
    ref = format_reference(s)
    assert ref.startswith("Author0 A, Author1 A, Author2 A, Author3 A, Author4 A, Author5 A, et al.")
    assert "Empagliflozin in heart failure. N Engl J Med 2021." in ref
    assert ref.endswith("https://doi.org/10.1056/nejmoa2107038")
