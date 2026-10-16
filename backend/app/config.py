"""Settings loaded from the project-root .env (see .env.example)."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")

    app_name: str = "Clinical Evidence CA"
    region_focus: str = "CA"

    openai_api_key: str = ""
    openai_model: str = "gpt-6.1-sol"
    openai_reasoning_effort: str = "medium"  # answer in Quick mode
    openai_fast_effort: str = "low"  # planning, reranking, follow-ups, image reading
    openai_deep_effort: str = "high"  # answer in Deep mode

    serpapi_api_key: str = ""
    # Guideline web search engines, run in parallel: "openai" (hosted web search) and/or "serpapi".
    guideline_search: str = "openai,serpapi"

    ncbi_api_key: str = ""
    ncbi_email: str = ""
    ncbi_tool: str = "clinical-evidence-ca"

    max_sources_quick: int = 12
    max_sources_deep: int = 40

    database_url: str = ""

    auth0_domain: str = ""
    auth0_audience: str = ""

    cors_origins: str = "http://localhost:5173"

    # /api/ask abuse protection (see ratelimit.py); 0 turns a limit off.
    ask_limit_per_minute: int = 5  # per user
    ask_limit_per_day: int = 50  # per user, rolling 24 h
    ask_limit_global_per_day: int = 500  # all users together, rolling 24 h

    llm_mock: bool = False  # true = canned model output for UI testing without an OpenAI key

    @property
    def auth_enabled(self) -> bool:
        return bool(self.auth0_domain)

    @property
    def canada_focus(self) -> bool:
        return self.region_focus.upper() == "CA"


@lru_cache
def get_settings() -> Settings:
    return Settings()
