"""Map a source's publication types to an evidence-strength badge.

Lower rank = stronger evidence. The badge is a coarse study-design label, not a
formal GRADE assessment; the answer prompt tells the model to say so when
evidence is weak or conflicting.
"""

import re

from .schemas import Source

# (label, rank, publication-type substrings matched case-insensitively)
LEVELS: list[tuple[str, int, tuple[str, ...]]] = [
    ("Guideline", 1, ("practice guideline", "guideline", "consensus development conference")),
    ("Systematic review", 2, ("systematic review", "meta-analysis", "meta analysis")),
    ("RCT", 3, ("randomized controlled trial", "clinical trial, phase iii", "clinical trial, phase iv")),
    ("Clinical trial", 4, ("clinical trial", "controlled clinical trial", "pragmatic clinical trial")),
    ("Observational", 5, ("observational study", "cohort", "case-control", "comparative study", "multicenter study")),
    ("Case report", 7, ("case reports", "case report")),
    ("Review", 6, ("review",)),
    ("Preprint", 9, ("preprint",)),
]

# Title cues for records whose publication types are only "Journal Article".
TITLE_CUES: list[tuple[str, int, re.Pattern]] = [
    ("Guideline", 1, re.compile(r"\b(guideline|recommendation|position statement|consensus statement)s?\b", re.I)),
    ("Systematic review", 2, re.compile(r"\b(systematic review|meta-analys[ie]s|network meta)\b", re.I)),
    ("RCT", 3, re.compile(r"\brandomi[sz]ed\b", re.I)),
    ("Observational", 5, re.compile(r"\b(cohort|case-control|registry|retrospective|population-based)\b", re.I)),
]


def classify(source: Source) -> Source:
    """Set evidence_level and evidence_rank on the source and return it."""
    if source.kind == "drug":
        source.evidence_level, source.evidence_rank = "Health Canada", 2
        return source
    if source.kind == "trial":
        source.evidence_level, source.evidence_rank = "Registered trial", 8
        return source

    types = " | ".join(t.lower() for t in source.pub_types)
    level, rank = ("Guideline", 1) if source.kind == "guideline" else ("Other", 8)
    for label, r, needles in LEVELS:
        if any(n in types for n in needles):
            level, rank = label, r
            break
    # Generic types ("Review", "research-article", "Journal Article") can hide a
    # stronger design that only the title reveals, e.g. Europe PMC tags
    # meta-analyses as "review-article".
    if rank >= 6:
        for label, r, pattern in TITLE_CUES:
            if r < rank and pattern.search(source.title):
                level, rank = label, r
                break
    source.evidence_level, source.evidence_rank = level, rank

    # A page from a guideline body that the title calls a review stays a guideline.
    if source.kind == "guideline" and source.evidence_rank > 2:
        source.evidence_level, source.evidence_rank = "Guideline", 1
    return source
