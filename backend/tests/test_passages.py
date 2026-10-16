from app import passages


def test_select_keeps_relevant_passage_from_long_document():
    filler = "\n\n".join(f"Section {i}. Administrative text about committee membership and funding." for i in range(200))
    target = "We recommend an SGLT2 inhibitor or GLP-1 receptor agonist for adults with type 2 diabetes and ASCVD."
    doc = "Pharmacologic Glycemic Management of Type 2 Diabetes in Adults\n\n" + filler + "\n\n" + target + "\n\n" + filler
    out = passages.select(doc, {"sglt2", "glp-1", "ascvd", "diabetes"}, limit=1500)
    assert target in out
    assert out.startswith("Pharmacologic Glycemic Management")
    assert len(out) <= 1500 + 50  # small allowance for "[…]" markers
    assert "[…]" in out


def test_select_skips_table_of_contents():
    toc = " ".join(f"{i} Chapter about diabetes topic number {i}" for i in range(1, 40))
    body = "\n\n".join(["Unrelated committee text. It has sentences."] * 30)
    target = "In adults with type 2 diabetes and ASCVD, we recommend a GLP-1 receptor agonist or SGLT2 inhibitor. Grade A."
    out = passages.select(toc + "\n\n" + body + "\n\n" + target, {"diabetes", "ascvd", "glp-1", "sglt2"}, 900, lead=0)
    assert target in out
    assert "Chapter about diabetes topic number 12" not in out


def test_looks_like_contents():
    assert passages.looks_like_contents("1 Introduction 2 Methods 3 Definition 4 Screening 5 Reducing 6 Organization 7 Self")
    assert passages.looks_like_contents("Introduction.......3\nMethods.........7\n")
    assert not passages.looks_like_contents("We recommend metformin. It lowers A1C by 1%. Use caution in CKD.")


def test_select_returns_short_text_unchanged():
    assert passages.select("short text", {"x"}, limit=100) == "short text"


def test_chunks_wrap_unbroken_pdf_text():
    text = ("Sentence about dosing. " * 200).strip()
    parts = passages.chunks(text)
    assert len(parts) > 3
    assert all(len(p) <= passages.CHUNK * 1.6 for p in parts)
