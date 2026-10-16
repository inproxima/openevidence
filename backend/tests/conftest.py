import os
from pathlib import Path

import pytest

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def fixture_text():
    return lambda name: (FIXTURES / name).read_text()


@pytest.fixture(autouse=True)
def isolated_settings(tmp_path, monkeypatch):
    """Point every test at a throwaway SQLite file with auth off and no real keys."""
    from app.config import get_settings

    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'test.db'}")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("SERPAPI_API_KEY", "")
    monkeypatch.setenv("AUTH0_DOMAIN", "")
    os.environ.pop("NCBI_API_KEY", None)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
