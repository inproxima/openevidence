"""Pick the parts of a long document that matter for the question.

Guideline pages and PDFs run to tens of thousands of words; the recommendation the
clinician needs is rarely in the first few paragraphs. Documents are split into
~700-character chunks, scored by overlap with the question's terms, and the best
chunks are returned in document order.
"""

import re

CHUNK = 700


def chunks(text: str, size: int = CHUNK) -> list[str]:
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n|\n(?=[A-Z•\-–\d])", text) if p.strip()]
    out: list[str] = []
    buf = ""
    for p in paragraphs:
        p = re.sub(r"[ \t]+", " ", p)
        if len(buf) + len(p) + 1 <= size:
            buf = f"{buf}\n{p}" if buf else p
            continue
        if buf:
            out.append(buf)
        while len(p) > size * 1.5:  # hard-wrap very long paragraphs (PDF text often has no breaks)
            cut = p.rfind(". ", 0, size) + 1 or size
            out.append(p[:cut].strip())
            p = p[cut:].strip()
        buf = p
    if buf:
        out.append(buf)
    return out


def looks_like_contents(chunk: str) -> bool:
    """Tables of contents and navigation lists: dense with topic words, empty of content."""
    if len(re.findall(r"\.{4,}|…{2,}", chunk)) >= 2:
        return True
    sentences = len(re.findall(r"[a-z)][.;:] +[A-Z(]", chunk))
    numbered = len(re.findall(r"(?:^|\s)\d{1,3}(?:\.\d+)*\s+[A-Z]", chunk))
    return numbered >= 6 and sentences <= 1


def select(text: str, terms: set[str], limit: int, lead: int = 400) -> str:
    """Up to `limit` characters: the document's opening plus its best-matching chunks, in order."""
    text = text.strip()
    if len(text) <= limit or not terms:
        return text[:limit]
    parts = chunks(text)
    scored = []
    for i, c in enumerate(parts):
        if looks_like_contents(c):
            continue
        words = set(re.findall(r"[a-z0-9][a-z0-9\-]{2,}", c.lower()))
        hits = len(terms & words)
        if hits:
            # Recommendation language is what clinicians ask for.
            bonus = 1 if re.search(r"\b(recommend|should|first-line|grade [abcd]|level [1-4]|strong|weak)\b", c, re.I) else 0
            scored.append((hits + bonus, i))
    keep = {0} if lead else set()  # lead=0: no document opening (e.g. the abstract is already shown)
    used = min(len(parts[0]), lead)
    for _, i in sorted(scored, reverse=True):
        if used + len(parts[i]) > limit:
            continue
        keep.add(i)
        used += len(parts[i])
    out = []
    last = -1
    for i in sorted(keep):
        if last >= 0 and i != last + 1:
            out.append("[…]")
        out.append(parts[i][:lead] if i == 0 and 0 not in {j for _, j in scored} else parts[i])
        last = i
    return "\n".join(out)
