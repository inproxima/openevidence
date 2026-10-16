# Clinical Evidence CA

Evidence answers for Canadian clinicians, modelled on the OpenEvidence workflow:
ask a clinical question → a streamed answer with numbered citations → source cards
with evidence-strength badges → related follow-up questions, saved as threads.

> Working name only. This project does not use OpenEvidence's name, branding, code,
> prompts or licensed content (e.g. NEJM/JAMA full text). Rename via `APP_NAME`.

## Run locally

Requirements: [uv](https://docs.astral.sh/uv/), Node 20+.

```bash
cp .env.example .env        # then add OPENAI_API_KEY (and ideally SERPAPI_API_KEY, NCBI_API_KEY)
scripts/dev.sh              # FastAPI :8000 + Vite :5173 → open http://localhost:5173
```

Single-server mode (what a deployment runs): `cd frontend && npm run build`, then
`uv run uvicorn app.main:app --app-dir backend --port 8000` serves the app at :8000.

No OpenAI key yet? `LLM_MOCK=true` runs the real searches with a canned answer so you
can exercise the UI.

Tests: `uv run pytest`

## API keys

| Variable | Needed | Where to get it |
|---|---|---|
| `OPENAI_API_KEY` | **Yes** | platform.openai.com → API keys. Must have access to `gpt-6.1-sol`. |
| `SERPAPI_API_KEY` | Recommended | serpapi.com. Second guideline search engine; 5 searches per question. `GUIDELINE_SEARCH` picks engines. |
| `NCBI_API_KEY`, `NCBI_EMAIL` | Optional (free) | ncbi.nlm.nih.gov → Account settings → API Key Management. 10 vs 3 requests/s for PubMed. |
| Europe PMC, ClinicalTrials.gov, Health Canada DPD | — | Public APIs, no key. |
| `AUTH0_*`, `VITE_AUTH0_*` | Deployment only | An Auth0 SPA application + API (audience). Blank = no login. |

## Deploy to Render (testers)

`render.yaml` is a Render Blueprint: one web service that builds the frontend and serves it
with the API, plus a Postgres database for threads and the question log. About US$13.30/month
(Starter web service $7 + Basic-256mb Postgres $6 + 1 GB disk $0.30) plus OpenAI and SerpAPI
usage. It runs in
Oregon because Render has no Canadian region, so ask testers not to enter identifiable
patient information.

### 1. Auth0 (set up in sara's tenant, `honeybeelogic.ca.auth0.com`)

These already exist; the values are in `render.yaml`. To check or recreate them in the
Auth0 dashboard:

1. **API** `Clinical Evidence CA`: identifier (the audience) `https://clinical-evidence-ca/api`,
   RS256, *Allow Skipping User Consent* on. The identifier never has to resolve.
2. **Application** `Clinical Evidence CA`, type *Single Page Application*, client ID
   `ToZIB5peBiy7h8qWEWaM9BP7ucYjwhJ4`, grants Authorization Code + Refresh Token. Allowed
   Callback URLs, Allowed Logout URLs, Allowed Web Origins and Allowed Origins (CORS) all hold
   `https://clinical-evidence-ca.onrender.com, http://localhost:5173`.
3. **Login methods** (the application's Connections tab): **Google** (`google-oauth2`, shared
   with sara and still on Auth0's developer keys) and the database connection
   `clinical-evidence-testers`, which only this app uses and which allows sign-up. sara's
   `Username-Password-Authentication` is off for this app and keeps its sign-ups disabled.

   Before a wider launch, give `google-oauth2` your own Google OAuth client ID and secret. With
   Auth0's developer keys, Auth0 shows a notice and can't silently renew sessions, so Google
   users have to sign in again more often.

If the public URL changes, update the four URL lists in the application and `CORS_ORIGINS`.

### 2. Create the services (once)

Render dashboard → New → Blueprint → repository `inproxima/openevidence` (or open
<https://render.com/deploy?repo=https://github.com/inproxima/openevidence>). Render reads
`render.yaml` and asks only for the secrets:

| Variable | Value |
|---|---|
| `OPENAI_API_KEY`, `SERPAPI_API_KEY` | your keys (as in `.env`) |
| `NCBI_API_KEY`, `NCBI_EMAIL` | optional, may be blank |

The first build takes a few minutes.

`VITE_AUTH0_*` are compiled into the frontend at build time, so changing one needs a rebuild
(push to `main`, or *Save, rebuild, and deploy* in the Environment tab). Login needs both
halves: with `AUTH0_DOMAIN` set but the `VITE_AUTH0_*` missing from the build, every request
fails with "Sign in required".

### 3. Testers

Send people the URL. On the sign-in screen they choose **Create an account** (email and
password, or Continue with Google) or **Sign in**. To remove someone: Auth0 dashboard
(`honeybeelogic.ca.auth0.com`) → User Management → Users → block or delete the user.

To go back to invite-only, turn on *Disable Sign Ups* on `clinical-evidence-testers`, turn
Google off on the application's Connections tab, and create accounts by hand (Users → Create
User with any long random password, then the tester uses **Forgot password?** to set their own).

### Redeploy

Push to `main` and Render rebuilds and restarts the service (`uv sync`, `npm ci`,
`npm run build`, then uvicorn). To redeploy without a push: service → Manual Deploy →
Deploy latest commit. Saving environment changes also redeploys. Threads persist in
Postgres across deploys; logs are under the service's Logs tab.

### Abuse protection

Every `/api/ask` needs a valid Auth0 token. Each tester may ask 5 questions a minute and 50
in any 24 hours, and all testers together 500 in 24 hours. Past a limit the app answers
HTTP 429 with a message saying when to try again. Change these with `ASK_LIMIT_PER_MINUTE`,
`ASK_LIMIT_PER_DAY` and `ASK_LIMIT_GLOBAL_PER_DAY` in the Environment tab (0 = off). Sign-up
is open, so one person can make several accounts: the all-testers cap is what bounds the bill.
As a backstop, set a monthly budget on the OpenAI project and on the SerpAPI plan.

## How an answer is made

1. **Guideline search starts at once,** restricted to Canadian guideline sites (Diabetes Canada,
   CCS, Hypertension Canada, Canadian Task Force, CDA-AMC, PHAC/NACI, CMAJ, CFP, Thrombosis
   Canada, CPS, SOGC, AMMI, BC Guidelines, Ontario Health, Alberta TOP…). OpenAI hosted web
   search and SerpAPI run in parallel within a time budget (24 s Quick, 45 s Deep). Results off
   those sites, home pages and French duplicates are discarded. With an image, this waits for
   the planner so the search reflects what the image shows.
2. **Plan** (`gpt-6.1-sol`, low effort): PubMed MeSH queries, a broad topic and condition query,
   a Europe PMC query, a guideline query, trial terms and drug names.
3. **Search in parallel:** PubMed (E-utilities), **Canadian society guidelines in PubMed**
   (Can J Diabetes, Can J Cardiol, CMAJ, CFP, JOGC… with guideline filters; by topic, and by
   condition newest-first so in-process updates without MeSH or abstracts are found),
   Europe PMC, ClinicalTrials.gov, Health Canada Drug Product Database.
4. **Merge and rank:** duplicates collapse by PMID/DOI/URL/title; each source gets an evidence
   badge (Guideline › Systematic review › RCT › … ) and a heuristic score (topic match,
   evidence level, recency, Canadian origin); the model then reranks the top candidates and
   keeps up to 12 (Quick) or 40 (Deep), preferring readable documents over title-only records.
5. **Read the chosen documents:** guideline pages and PDFs, **Health Canada product monographs**
   (Canadian dosing, renal adjustment, contraindications), and open-access articles (Europe PMC
   full text). Long documents are cut to the passages that match the question; tables of
   contents are skipped. Unreadable web hits are dropped.
6. **Answer** (`gpt-6.1-sol`, medium effort; high in Deep mode) streams over SSE, citing only
   `[n]` from the numbered list. Citations outside the list are removed; the reference list
   is built from metadata, never written by the model.
7. **Follow-ups** (low effort), then the turn is saved to the thread.

Typical timings (live, October 2026): Quick 25–45 s (first words at 15–30 s); Deep about 2 min;
with an image about 55 s.

Images (ECG, skin photo, lab report…) are read first to guide the search and are also sent
with the answer request. They are never stored.

## Layout

```
backend/app/
  main.py         FastAPI: POST /api/ask (SSE), /api/threads CRUD, serves frontend/dist
  pipeline.py     one question → event stream
  retrieval.py    fan-out, merge, scoring, budgets
  search/         pubmed, europepmc, trials, health_canada, guidelines (SerpAPI)
  llm.py          OpenAI Responses API calls;  llm_mock.py for LLM_MOCK
  prompts.py      system instructions
  evidence.py     publication type → evidence badge
  citations.py    [n] checking, Vancouver references
  db.py           threads/messages (SQLite locally, Postgres via DATABASE_URL)
  auth.py         Auth0 RS256 (off when AUTH0_DOMAIN is blank)
  ratelimit.py    per-user and global question limits (ask_log table)
render.yaml       Render Blueprint (web service + Postgres)
frontend/src/     React 19 + Vite + Tailwind (components ported from sara)
docs/             REA findings on openevidence.com (when captured)
```

## Reused from sara

Ported, not imported: SerpAPI site-filtered search and trafilatura page extraction
(`search/guidelines.py`), reference URL helpers (`citations.py`), the Postgres URL
normalisation (`db.py`), the Auth0 check without its hardcoded fallbacks (`auth.py`), and
the search box, sidebar, citation pills, reference cards and design tokens (frontend).

## Known limits

- SerpAPI latency is erratic (0.5–80 s per call); OpenAI web search takes 15–20 s. Quick answers
  use whatever guideline results arrive within 24 s.
- Some guideline text isn't machine-readable through public routes, and the app says so
  rather than guessing: Diabetes Canada's current documents (old PDF links redirect to an index
  page; the Can J Diabetes records have no abstract and aren't in PubMed Central), cfp.ca PDFs
  (bot protection), and paywalled journal guidelines (abstract only).
- Evidence badges are a study-design label, not a GRADE assessment.
- Not a medical device. For licensed health professionals; answers must be checked
  against the cited sources.
