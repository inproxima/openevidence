"""Shared data shapes: retrieved sources, query plans and API requests."""

from typing import Literal

from pydantic import BaseModel, Field

SourceKind = Literal["article", "guideline", "trial", "drug"]
Mode = Literal["quick", "deep"]


class Source(BaseModel):
    """One retrievable piece of evidence, normalised across all search backends."""

    id: str  # dedupe key, e.g. "pmid:123", "doi:10.1/x", "nct:NCT0..", "url:..."
    kind: SourceKind
    origin: str  # pubmed | europepmc | clinicaltrials | health_canada | guideline_web
    title: str
    url: str
    journal: str | None = None
    year: int | None = None
    authors: list[str] = Field(default_factory=list)
    abstract: str = ""  # text the model reads: abstract, page excerpt, trial or product summary
    pub_types: list[str] = Field(default_factory=list)
    pmid: str | None = None
    doi: str | None = None
    pmcid: str | None = None
    nct_id: str | None = None
    canadian: bool = False
    position: int = 0  # rank within its backend's own result list (0 = best)
    full_text: bool = False  # abstract holds passages from the full document (retrieval.enrich)

    # Filled in by evidence.classify and retrieval scoring.
    evidence_level: str = ""
    evidence_rank: int = 99
    score: float = 0.0

    def public(self, number: int) -> dict:
        """Fields sent to the browser for source cards and citation popovers."""
        from .citations import finding_line, format_reference

        return {
            "finding": finding_line(self),
            "full_text": self.full_text,
            "n": number,
            "id": self.id,
            "kind": self.kind,
            "origin": self.origin,
            "title": self.title,
            "url": self.url,
            "journal": self.journal,
            "year": self.year,
            "authors": self.authors[:6],
            "evidence_level": self.evidence_level,
            "canadian": self.canadian,
            "pmid": self.pmid,
            "doi": self.doi,
            "nct_id": self.nct_id,
            "reference": format_reference(self),
            "snippet": self.abstract[:400],
        }


class QueryPlan(BaseModel):
    """What the planner model asks each backend for."""

    pubmed_queries: list[str] = Field(description="1-4 PubMed queries using MeSH terms and field tags")
    pubmed_topic: str = Field(
        description="The core clinical topic as a short PubMed boolean (MeSH/tiab), with no publication-type, "
        "journal or date filters"
    )
    pubmed_condition: str = Field(
        description="The main condition alone as a PubMed boolean: MeSH OR a [tiab] phrase, nothing else"
    )
    europepmc_query: str = Field(description="One Europe PMC keyword query")
    guideline_query: str = Field(description="Short plain-language web query for clinical practice guidelines")
    trial_query: str | None = Field(description="ClinicalTrials.gov condition/intervention terms, or null")
    drug_names: list[str] = Field(description="Generic drug names mentioned or implied (lowercase), may be empty")


class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=4000)
    thread_id: str | None = None
    mode: Mode = "quick"
    image: str | None = Field(default=None, description="data:image/...;base64,... URL")


class ThreadPatch(BaseModel):
    title: str = Field(min_length=1, max_length=200)
