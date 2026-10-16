"""TLS for outbound requests: certifi's roots (shipped with httpx) plus the intermediate
certificates in certs/intermediates.pem.

Some guideline sites send only their own certificate, not the intermediate that links it
to a root. Browsers fetch the missing intermediate themselves; Python does not, so without
these every page on such a site fails with CERTIFICATE_VERIFY_FAILED (ccs.ca: all of the
Canadian Cardiovascular Society's guidelines).
"""

import ssl
from functools import lru_cache
from pathlib import Path

import certifi

INTERMEDIATES = Path(__file__).parent / "certs" / "intermediates.pem"


@lru_cache
def ssl_context() -> ssl.SSLContext:
    ctx = ssl.create_default_context(cafile=certifi.where())
    ctx.load_verify_locations(cafile=INTERMEDIATES)
    return ctx
