"""Health Canada Drug Product Database (DPD) API: which products are approved and
marketed in Canada, with strengths, DINs and manufacturers. No key.

The API doesn't expose product monographs; the DPD product page links to the
monograph PDF (pdf.hres.ca), which monograph_url() finds. retrieval.enrich reads it
for the Canadian dosing, renal adjustment and contraindication text.
"""

import asyncio
import logging
import re
from collections import defaultdict

import httpx

from ..schemas import Source

log = logging.getLogger(__name__)

API = "https://health-products.canada.ca/api/drug"
PAGE = "https://health-products.canada.ca/dpd-bdpp/info?lang=eng&code={code}"
MAX_PRODUCTS = 8


async def _get(client: httpx.AsyncClient, path: str, **params) -> list[dict]:
    r = await client.get(f"{API}/{path}/", params={"lang": "en", "type": "json", **params})
    r.raise_for_status()
    data = r.json()
    return data if isinstance(data, list) else [data]


async def lookup(client: httpx.AsyncClient, drug_name: str) -> Source | None:
    """Summarise Canadian products containing one active ingredient."""
    try:
        ingredients = await _get(client, "activeingredient", ingredientname=drug_name)
        if not ingredients:
            return None
        by_code: dict[int, list[str]] = defaultdict(list)
        for row in ingredients:
            strength = f"{row.get('strength', '')} {row.get('strength_unit', '')}".strip()
            by_code[row["drug_code"]].append(f"{row.get('ingredient_name', '').title()} {strength}".strip())
        codes = list(by_code)[: MAX_PRODUCTS * 2]

        async def product(code: int):
            prod, status = await asyncio.gather(
                _get(client, "drugproduct", id=code), _get(client, "status", id=code), return_exceptions=True
            )
            if isinstance(prod, Exception) or not prod:
                return None
            st = "" if isinstance(status, Exception) or not status else status[0].get("status", "")
            return code, prod[0], st

        rows = [r for r in await asyncio.gather(*(product(c) for c in codes)) if r]
        rows.sort(key=lambda r: str(r[1].get("number_of_ais", "1")) != "1")  # single-ingredient products first
        marketed = [r for r in rows if r[2].lower() == "marketed"] or rows
        marketed = marketed[:MAX_PRODUCTS]
        if not marketed:
            return None

        lines = [
            f"- {p.get('brand_name')} (DIN {p.get('drug_identification_number')}), "
            f"{'; '.join(by_code[code])}, {p.get('company_name', '').title()}, status: {st or 'unknown'}"
            for code, p, st in marketed
        ]
        first_code = marketed[0][0]
        return Source(
            id=f"dpd:{drug_name.lower()}",
            kind="drug",
            origin="health_canada",
            title=f"Health Canada Drug Product Database: {drug_name.lower()} products in Canada",
            url=PAGE.format(code=first_code),
            journal="Health Canada DPD",
            abstract=(
                f"Products containing {drug_name.lower()} listed in Health Canada's Drug Product Database "
                f"({len(rows)} found, {len([r for r in rows if r[2].lower() == 'marketed'])} marketed):\n"
                + "\n".join(lines)
            ),
            pub_types=["Regulatory record"],
            canadian=True,
        )
    except Exception as exc:  # noqa: BLE001
        log.warning("Health Canada DPD lookup failed for %r: %s", drug_name, exc)
        return None


MONOGRAPH_RE = re.compile(r'href="(https://pdf\.hres\.ca/dpd_pm/[^"]+\.PDF)"', re.I)


async def monograph_url(client: httpx.AsyncClient, product_page: str) -> str | None:
    """The product monograph PDF linked from a DPD product page, if any."""
    try:
        r = await client.get(product_page, timeout=8.0)
        if r.status_code != 200:
            return None
        m = MONOGRAPH_RE.search(r.text)
        return m.group(1) if m else None
    except Exception as exc:  # noqa: BLE001
        log.info("DPD product page failed for %s: %s", product_page, exc)
        return None


async def search(client: httpx.AsyncClient, drug_names: list[str]) -> list[Source]:
    names = list(dict.fromkeys(n.strip().lower() for n in drug_names if n.strip()))[:4]
    results = await asyncio.gather(*(lookup(client, n) for n in names))
    return [s for s in results if s]
