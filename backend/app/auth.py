"""Auth0 login for testers. Ported from sara backend/auth.py (RS256 JWTs checked
against the tenant's JWKS), without sara's hardcoded fallback secret and shared
password, and with the signing keys cached instead of fetched per request.

When AUTH0_DOMAIN is blank, auth is off and every request belongs to the
anonymous user (None) — the local-development default.
"""

import asyncio
from functools import lru_cache

import jwt
from fastapi import HTTPException, Request

from .config import get_settings


@lru_cache
def _jwks(domain: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(f"https://{domain}/.well-known/jwks.json", cache_keys=True, lifespan=3600)


async def current_user(request: Request) -> str | None:
    settings = get_settings()
    if not settings.auth_enabled:
        return None
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sign in required")
    token = header.split(" ", 1)[1].strip()
    try:
        signing_key = await asyncio.to_thread(_jwks(settings.auth0_domain).get_signing_key_from_jwt, token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.auth0_audience,
            issuer=f"https://{settings.auth0_domain}/",
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}") from exc
    return claims["sub"]
