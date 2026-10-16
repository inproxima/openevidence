"""A failed PubMed call must not put NCBI credentials into the logs."""

import logging

import httpx
import respx

from app.config import Settings
from app.search import pubmed

KEY = "f" * 35  # one short of a real 36-character key, like the one that broke the deployment
EMAIL = "someone@example.ca"


@respx.mock
async def test_invalid_api_key_is_logged_without_credentials(caplog):
    respx.get(f"{pubmed.EUTILS}/esearch.fcgi").mock(
        return_value=httpx.Response(400, json={"error": "API key invalid", "api-key": KEY})
    )
    settings = Settings(_env_file=None, ncbi_api_key=KEY, ncbi_email=EMAIL)
    with caplog.at_level(logging.WARNING, logger=pubmed.__name__):
        async with httpx.AsyncClient() as client:
            assert await pubmed.search(client, settings, "metformin") == []
    message = caplog.text
    assert "HTTP 400" in message and "NCBI_API_KEY" in message
    assert KEY not in message and EMAIL not in message
