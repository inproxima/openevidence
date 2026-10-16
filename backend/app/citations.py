"""Inline citation checking and reference formatting.

The model may cite only the numbered sources it was given. Each [n] maps
straight to sources[n-1]; numbers outside 1..N are removed rather than looked
up again (sara's re-search approach in ai_agents.parse_references_in_flask could
attach unrelated papers). Reference strings are built from source metadata,
never written by the model.
"""

import re
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .schemas import Source

# [3]  [1, 4]  [2-5]  [2–5]  [1,3-4]
CITATION_RE = re.compile(r"\[(\d+(?:\s*[-–,]\s*\d+)*)\]")
_MAX_LISTED_AUTHORS = 6


def _expand(group: str) -> list[int]:
    numbers: list[int] = []
    for part in group.split(","):
        part = part.strip()
        if not part:
            continue
        bounds = re.split(r"\s*[-–]\s*", part)
        if len(bounds) == 2 and bounds[0].isdigit() and bounds[1].isdigit():
            lo, hi = int(bounds[0]), int(bounds[1])
            if lo <= hi and hi - lo <= 20:
                numbers.extend(range(lo, hi + 1))
                continue
        if part.isdigit():
            numbers.append(int(part))
    return numbers


def check_citations(text: str, source_count: int) -> tuple[str, list[int], list[int]]:
    """Return (cleaned text, cited numbers in first-use order, removed invalid numbers)."""
    used: list[int] = []
    invalid: list[int] = []

    def replace(match: re.Match) -> str:
        numbers = _expand(match.group(1))
        valid = [n for n in numbers if 1 <= n <= source_count]
        for n in numbers:
            if n in valid:
                if n not in used:
                    used.append(n)
            elif n not in invalid:
                invalid.append(n)
        if not valid:
            return ""
        return "".join(f"[{n}]" for n in dict.fromkeys(valid))

    cleaned = CITATION_RE.sub(replace, text)
    cleaned = re.sub(r"[ \t]+([.,;:])", r"\1", cleaned)  # space left before punctuation
    return cleaned, used, invalid


# Ported from sara backend/apa.py.
def _format_url(link: str | None) -> str:
    if not link:
        return ""
    link = str(link).strip()
    if re.match(r"^10\.\d{4,9}/\S+$", link):
        return f"https://doi.org/{link}"
    m = re.search(r"doi\.org/(10\.\d{4,9}/\S+)", link)
    if m:
        return f"https://doi.org/{m.group(1)}"
    return link


def _ensure_period(text: str) -> str:
    text = text.strip()
    if not text:
        return ""
    return text if text.endswith((".", "?", "!")) else text + "."


_CONCLUSION = re.compile(r"(?:^|\n)\s*(?:CONCLUSIONS?|INTERPRETATION|CONCLUSIONS AND RELEVANCE)\s*:\s*(.+)", re.I)
# Section labels at the start of an abstract, with a colon ("BACKGROUND:") or, as Europe PMC
# often leaves them, bare before the next sentence ("Background The lifetime risk…").
_LABEL = re.compile(
    r"^\s*(?:BACKGROUND|INTRODUCTION|OBJECTIVES?|PURPOSE|AIMS?|CONTEXT|IMPORTANCE)(?:\s*:\s*|\s+(?=[A-Z]))", re.I
)


_MARKETED = re.compile(r"\((\d+) found, (\d+) marketed\)")


def _readable(sentence: str) -> bool:
    """A real sentence, not form fields, headers or navigation debris."""
    letters = [c for c in sentence if c.isalpha()]
    if len(sentence) < 40 or len(sentence.split()) < 6 or not letters:
        return False
    if sentence.rstrip().endswith("?") or re.search(r"\bY\s*/?\s*N\b|\(if yes", sentence, re.I):
        return False  # questionnaire and checklist fields
    return sum(c.isupper() for c in letters) / len(letters) < 0.35


def _clip(sentence: str, limit: int) -> str:
    if len(sentence) <= limit:
        return sentence
    return sentence[: limit - 1].rsplit(" ", 1)[0].rstrip(",;:") + "…"


def finding_line(source: "Source", limit: int = 170) -> str:
    """One line for the source card: the stated conclusion when the abstract has one,
    else its first readable sentence (labels such as "BACKGROUND:" removed). Health
    Canada records summarise what is marketed; pages with no readable sentence get none."""
    text = source.abstract or ""
    if source.kind == "drug":
        m = _MARKETED.search(text)
        return f"{m.group(2)} of {m.group(1)} listed products marketed in Canada" if m else ""
    m = _CONCLUSION.search(text)
    body = m.group(1) if m else _LABEL.sub("", text)
    body = re.sub(r"\s+", " ", body).strip()
    if not body:
        return ""
    sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z(])", body)
    if m or source.kind == "article":
        return _clip(sentences[0], limit)
    for sentence in sentences[:12]:  # web pages and PDFs open with headers and form text
        if _readable(sentence):
            return _clip(sentence, limit)
    return ""


def format_reference(source: "Source") -> str:
    """Vancouver/AMA-style reference: Authors. Title. Journal. Year. doi/URL."""
    parts: list[str] = []
    if source.authors:
        names = source.authors[:_MAX_LISTED_AUTHORS]
        authors = ", ".join(names)
        if len(source.authors) > _MAX_LISTED_AUTHORS:
            authors += ", et al"
        parts.append(_ensure_period(authors))
    parts.append(_ensure_period(source.title))
    venue = source.journal or ""
    if source.year:
        venue = f"{venue} {source.year}" if venue else str(source.year)
    if venue:
        parts.append(_ensure_period(venue))
    link = _format_url(source.doi) if source.doi else source.url
    if link:
        parts.append(link)
    return " ".join(p for p in parts if p)
