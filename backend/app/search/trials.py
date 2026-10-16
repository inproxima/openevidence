"""ClinicalTrials.gov API v2: registered (often ongoing) trials. No key."""

import logging

import httpx

from ..schemas import Source
from . import to_year

log = logging.getLogger(__name__)

URL = "https://clinicaltrials.gov/api/v2/studies"
FIELDS = ",".join(
    [
        "NCTId", "BriefTitle", "OverallStatus", "Phase", "StudyType", "StartDate", "CompletionDate",
        "LeadSponsorName", "BriefSummary", "Condition", "InterventionName", "EnrollmentCount", "LocationCountry",
    ]
)


async def search(client: httpx.AsyncClient, query: str, page_size: int = 5) -> list[Source]:
    try:
        r = await client.get(
            URL, params={"query.term": query, "pageSize": page_size, "format": "json", "fields": FIELDS}
        )
        r.raise_for_status()
        return parse(r.json())
    except Exception as exc:  # noqa: BLE001
        log.warning("ClinicalTrials.gov search failed for %r: %s", query, exc)
        return []


def parse(data: dict) -> list[Source]:
    out: list[Source] = []
    for i, study in enumerate(data.get("studies", [])):
        p = study.get("protocolSection", {})
        ident, status = p.get("identificationModule", {}), p.get("statusModule", {})
        design, desc = p.get("designModule", {}), p.get("descriptionModule", {})
        nct = ident.get("nctId")
        if not nct:
            continue
        conditions = p.get("conditionsModule", {}).get("conditions", [])
        interventions = [x.get("name") for x in p.get("armsInterventionsModule", {}).get("interventions", []) or []]
        countries = {
            loc.get("country") for loc in p.get("contactsLocationsModule", {}).get("locations", []) or []
        }
        phases = design.get("phases", []) or []
        enrollment = (design.get("enrollmentInfo") or {}).get("count")
        sponsor = p.get("sponsorCollaboratorsModule", {}).get("leadSponsor", {}).get("name")
        start = (status.get("startDateStruct") or {}).get("date")
        end = (status.get("completionDateStruct") or {}).get("date")

        facts = [
            f"Status: {status.get('overallStatus', 'unknown')}",
            f"Phase: {', '.join(phases)}" if phases else "",
            f"Enrollment: {enrollment}" if enrollment else "",
            f"Conditions: {', '.join(conditions)}" if conditions else "",
            f"Interventions: {', '.join(x for x in interventions if x)}" if interventions else "",
            f"Sponsor: {sponsor}" if sponsor else "",
            f"Dates: {start or '?'} to {end or '?'}",
        ]
        summary = desc.get("briefSummary", "")
        out.append(
            Source(
                id=f"nct:{nct}",
                kind="trial",
                origin="clinicaltrials",
                title=ident.get("briefTitle") or nct,
                url=f"https://clinicaltrials.gov/study/{nct}",
                journal="ClinicalTrials.gov",
                year=to_year(start),
                abstract="\n".join([f for f in facts if f] + ([summary] if summary else [])),
                pub_types=["Clinical Trial Registration"],
                nct_id=nct,
                canadian="Canada" in countries,
                position=i,
            )
        )
    return out
