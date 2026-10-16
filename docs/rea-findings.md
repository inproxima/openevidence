# OpenEvidence: passive runtime observation findings

Date: 2026-10-16 (UTC) · Tool: REA (rea-agents 6.5.0) over CDP, `http://127.0.0.1:9222` · Browser: Chrome 155, separate profile `~/.rea-chrome-oe`.

**Scope and method.** The user drove every action in a Chrome profile they controlled. They cleared any bot check, typed the questions and stayed logged out. REA only attached passively. It did not click, type, navigate, run page JavaScript or touch the CAPTCHA. Captures keep network metadata and *value-free* JSON shapes (field names and types, never values), accessibility text, DOM attribute *names* and screenshots. No response bodies, header values, cookies or storage values were retained. This document records behaviour and data formats only. It reproduces no OpenEvidence code, prompts or answer content.

**Labels.** **[Observed]** means directly in a capture. **[Inferred]** means a reasoned conclusion from observed facts. **[Unknown]** means not determinable from what was captured. Evidence keys such as `EV-QA` are expanded in the [Evidence index](#evidence-index).

**What was captured**

| Run | Model tier | Thread | Outcome |
|---|---|---|---|
| (a) guideline question (T2DM + HF add-on therapy; the user asked an ADA-framed variant, not Diabetes Canada) | Osler | new | complete: `EV-QA` |
| (c) follow-up in the same thread | Osler | follow-up | complete: `EV-QC` |
| (b′) SGLT2 HFrEF/HFpEF comparison (the drug-dosing question was not submitted; a previous question was re-sent) | Sackett | new | complete: `EV-QB` |
| (b) drug dosing/interaction question | Osler | new | **not captured.** The tab was replaced mid-attempt and the user stopped the session |
| (d) deep consult | Snow | — | **not captured** |

---

## 1. UI layout

- **[Observed]** Home page: a centred logo, then one multiline input labelled "Ask a medical question", a **model selector button** ("Model: Osler", `hasPopup=menu`) and a submit arrow. Under the input are three quick-action chips (task templates such as "write instructions", "research a topic", "calculate a risk score") and an "Explore More Capabilities" disclosure. The top bar has a promo banner, "New Visit" (scribe), Log In, Sign Up and a hamburger menu. A persistent bottom "sign up" bar is shown to logged-out users. `EV-HOME`, `EV-SHOT-02`, `EV-SHOT-01`
- **[Observed]** Logged-out users can ask questions. The header still shows Log In / Sign Up during answers. `EV-QA`, `EV-SHOT-03`
- **[Observed]** Answer page at `/ask/{articleId}`, in a single centred column of about 800 px on a dark theme, from top to bottom:
  1. The question in a rounded "bubble" card.
  2. A collapsed progress line ("Analyzed query, searched for evidence ⌄") that can expand.
  3. The answer body in a **serif** font: a bold lead sentence (bottom line first), then bold run-in subheadings, bullet lists and paragraphs, with **inline citation pills** after sentences.
  4. Optionally a **suggested next action** at the end (a "Would you like to …?" prompt with a "Yes" button).
  5. An answer toolbar: Copy answer text, Copy answer as image, Helpful, Not helpful.
  6. A collapsible **References** section (expanded by default).
  7. A **Follow-Up Questions** card (3 rows with chevrons).
  8. A sticky bottom composer: "Ask a follow-up question…", the model selector, submit, and a "Start voice mode" button.

  `EV-QA`, `EV-SHOT-03`, `EV-SHOT-04`
- **[Observed]** Rich blocks inside answers:
  - A **publisher-branded licensed-source card**: a coloured header with the journal name and logo, a summary paragraph with that journal's pills, a full citation with DOI, and a "Used under license from …" footer. `EV-QC`, `EV-SHOT-05`, `EV-QB`, `EV-SHOT-07`
  - A **comparison table** with an "Export" button and a per-row "References" column of pills. `EV-QC`
- **[Observed]** The thread view stacks turns. After the follow-up, the page contains two `article` elements (earlier turn above, newer below), each with its own toolbar and References list. `EV-QC`
- **[Observed]** Static route candidates include `/ask`, `/articles/`, `/bookmarks`, `/shares/`, `/conversation-history`, `/conversations/`, `/topic_history`, `/collections/collections`, `/dot-flows`, `/attachments/upload/`, `/transcription-token` and `/batch-speech-to-text`. These are candidates, not observed calls. `EV-BUNDLE`
- **[Observed]** Framework: Next.js App Router (React) with RSC payloads (`text/x-component` for `/ask?query=…&_rsc=`). The 119 scripts parsed with no failures. `EV-BUNDLE`, `EV-QA`

## 2. Answer structure and citation format

**Data model.** **[Observed]** An answer is a *structured article*, not markdown text. Value-free shape of `output.structured_article` (`EV-QA`, `EV-QC`, `EV-QB`):

```
structured_article
  title, slug, byline, dt_published, page_type, placeholder, raw_text,
  image_url, lead_image_url, medically_reviewed_by, what_is_this_page_html, ui_flags
  generation_steps[]        { kind, label, done }
  articlesection_set[]      { identifier, section_title, placeholder,
                              metadata { question?, submit?, journal_name? },
                              articlefigureparagraph_set[],
                              articleparagraph_set[] { identifier, paragraph_title, link_name,
                                                       order_in_section, placeholder,
                                                       articlespan_set[] { text, hidden, is_block_quote,
                                                                           is_highlighted, placeholder,
                                                                           articlespanentry_set[],
                                                                           citations[] } } }
  follow_up_questions[]     string
  metadata                  { follow_up_questions_are_topics }
  external_search_results[]
  annotations               { question_specialties[], evidence_grade, suggested_action,
                              sponsored_trial_match }   (null until the final poll)
output.text                 string (a flat text rendition next to the structure)
```

- **[Observed]** Citations attach to **spans**, so each sentence or clause fragment carries its own `citations[]`. Article-level citation lists don't exist; the reference list is derived. `EV-QA`
- **[Observed]** The inline marker is **a pill, not `[n]`**. It shows the source favicon and the journal *short name* (for example a journal abbreviation or an agency acronym), plus "+ N" when the span cites more than one source. Each pill is a `<span>` carrying a `data-citation-numbers` attribute (the value wasn't retained). `EV-QA`, `EV-SHOT-04`
- **[Inferred]** `data-citation-numbers` holds the reference-list numbers for that span, so pill to reference is numbered underneath even though the pill shows a name.
- **[Observed]** Hovering a pill opens a popover. It shows a "Reference" label, a "See All (N)" link to the full list, then the numbered entry: title link, favicon, journal, year, authors and a badge. `EV-SHOT-04`
- **[Observed]** Answer (a) had 21 span-level citation objects that render as an 11-item reference list, and the popover said "See All (11)". `EV-QA`, `EV-SHOT-04`
- **[Inferred]** The reference list is de-duplicated across spans and numbered by first appearance.
- **[Observed]** Reference numbering **restarts at 1 for each turn** in a thread (turn 1 had 1–11, turn 2 had 1–10). `EV-QC`
- **[Observed]** Licensed-source card: a section whose `metadata.journal_name` is set. This field appeared only in answers that rendered the publisher card. `EV-QC`, `EV-QB`
- **[Inferred]** `journal_name` on a section switches its rendering to the branded card.
- **[Observed]** Suggested next action: a trailing section with `metadata.question` and `metadata.submit`. It arrived on the poll just before follow-ups appeared and renders as the "Would you like to …? / Yes" button. `EV-QA`
- **[Inferred]** That section → button mapping.
- **[Unknown]** How tables are encoded. No table-specific fields appeared in the shapes, so they are probably markup inside span `text` or `raw_text`.
- **[Unknown]** What `articlespanentry_set`, `articlefigureparagraph_set` and `external_search_results` contain. They were always empty in these runs.

## 3. Streaming protocol

- **[Observed]** There was **no SSE, no WebSocket and no chunked streaming body.** In every run there were zero WebSocket connections and every answer response was `application/json`. `EV-QA`, `EV-QC`, `EV-QB`
- **[Observed]** The client **creates, then polls**:
  1. *(new thread only)* `GET /ask?query=<q>&configName=prod&modelProfileName=<tier>&_rsc=…` (Next RSC navigation). `EV-QA`, `EV-QB`
  2. `POST /api/article` returns **201** with the new article (`status`, `output: null`, `partial_output: null`, `inputs`, access fields). `EV-QA`
  3. `GET /api/article/{id}` (once).
  4. `GET /api/article/{id}/output`, repeated: 47 polls in (a), 68 in (c) and 77 in (b′, Sackett). `EV-QA`, `EV-QC`, `EV-QB`
- **[Observed]** Each poll returns a **cumulative snapshot**, not a delta. The JSON node count rises steadily (61 → 1,939 nodes in (a)), and every poll carries the whole article so far in both `output` and `partial_output`, plus `status` and `id`. `EV-QA`
- **[Observed]** The **final poll** sets `partial_output` to `null` and adds the full article envelope: `inputs`, `title`, `collections`, `access_level`, `can_share_publicly` and so on. It also adds `annotations.question_specialties[]` and the last `generation_steps[].done`. `EV-QA`, `EV-QB`
- **[Inferred]** The client stops polling when the final shape or terminal `status` arrives.
- **[Observed]** Order of arrival within a run (`EV-QA`; Sackett `EV-QB` is the same):
  1. Empty section placeholder.
  2. `generation_steps` appear one at a time (1 → 3) while no answer text exists.
  3. The first paragraph and spans appear.
  4. Text grows paragraph by paragraph, with **citations arriving with or right after their spans**.
  5. The suggested-action section appears.
  6. `follow_up_questions` arrive one per poll (1 → 2 → 3).
  7. The final envelope.
- **[Unknown]** The exact poll interval. REA kept no per-request timestamps. The mean is at most about 3.2 s for (a) (47 polls in a 150 s window), 2.2 s for (c) and 2.3 s for (b′).
- **[Unknown]** The values of `status`, so the terminal state names aren't known.
- **[Observed]** `POST /api/article` request body (value-free):
  ```
  { article_type, personalization_enabled,
    original_article?,                      // present only on follow-ups
    inputs: { question, model_profile_name, variant_configuration_file,
              use_gatekeeper, attachments[],
              extra_template_context { supports_scout_cases } } }
  ```
  `EV-QA`, `EV-QC`
- **[Observed]** Article type: `/api/article/ct?article_type=Ask OpenEvidence Light with citations&status=success…` returns **401** for logged-out users. `EV-QA`
- **[Inferred]** That call is a per-user history count that needs auth.
- **[Observed]** Model tier travels as `model_profile_name` (and `modelProfileName` in the `/ask` URL). Observed values were `osler` and `sackett`. `EV-QA`, `EV-QB`
- **[Observed]** Side traffic: `POST /api/events` (analytics, several per run), `POST /api/getTargetCampaign`, and a `/…/vitals` POST. Favicons are proxied through `/_next/image?url=…google.com/s2/favicons…`. `EV-QA`

## 4. Reference metadata

**[Observed]** Each `citations[]` item has this value-free shape (`EV-QA`, `EV-QC`, `EV-QB`):

```
{ citation: string,
  metadata: {
    id, id_type, origin, origin_type, pmid?,
    citation_detail: { title, authors_string, journal_name, journal_short_name, journal_owner?,
                       dt_published, doi, pmid, href, publication_info_string,
                       publication_types[], resolved_publication_type?, short_citation?,
                       repository, source_origin },
    content_metadata: { is_guideline, is_abstract, section_path[], figures[], tables[] },
    why_cited: { impact_score, impact_score_type, recency_score, recency_score_type },
    related_publications[] } }
```

- **[Observed]** Reference row layout:
  - `n.` followed by the title as a link (accent colour).
  - Favicon, then "Journal. Year." then an author list truncated to about 3 names plus "et al.".
  - Badges.
  - Per-reference "Helpful" / "Not Helpful" thumbs on the right.

  `EV-SHOT-03`, `EV-QA`
- **[Observed]** Sources mix peer-reviewed journals, guideline publishers, systematic-review databases and agency documents (a drug-approval database, a national veterans' guideline). Pills show agency acronyms where there's no journal. `EV-SHOT-03`, `EV-QA`
- **[Inferred]** `section_path[]` is the location inside the source (for example a guideline chapter or heading). That supports "cited from section X".
- **[Unknown]** What `why_cited` scores mean and how they're scaled, and whether they appear in the UI. They weren't visibly rendered.

## 5. Follow-up suggestions

- **[Observed]** Three follow-ups per answer, delivered as plain strings in `structured_article.follow_up_questions[]` **inside the same polled article**. There's no separate endpoint. They arrive last, one per poll. `EV-QA`, `EV-QB`
- **[Observed]** They render as a "Follow-Up Questions" card: list icon, three full-width rows with chevrons, dividers between rows. Each row is a button containing a heading. `EV-QA`, `EV-SHOT-03`
- **[Observed]** `metadata.follow_up_questions_are_topics` was present. The rendered items were short topic phrases rather than full questions. `EV-QA`
- **[Inferred]** The flag was true here and switches between topic and question styling.
- **[Observed]** There's a separate, single "suggested next action" (a "Would you like to …? / Yes" button) at the end of the answer body. See section 2.
- **[Inferred]** The follow-up captured in (c) was submitted through that "Yes" button. The submitted text matched its offer rather than the text proposed to the user.
- **[Unknown]** Whether clicking a follow-up chip submits immediately or pre-fills the composer. Not exercised.
- **[Observed]** Bundle candidates `/suggested-questions/` and `/user-clicked-suggested-question-events` exist. `EV-BUNDLE`
- **[Inferred]** Chip clicks are logged.

## 6. Threads and history

- **[Observed]** **Every turn is its own article** with its own UUID. A follow-up `POST /api/article` returned a new ID, and the URL moved to `/ask/{newId}` while the page still showed the earlier turn above. `EV-QC`
- **[Observed]** The client sends only `original_article: <string>` on follow-ups and **no history**. The server returns `inputs.history[]` filled with prior turns. `EV-QC` Each history item has:
  - `articleId`, `articleType`, `input`, `outputId`, `outputText`
  - `outputArticleData` (the full structured article)
  - `outputTextShrinkWrapStrategy`, `outputArticleShrinkWrapStrategy`
  - `modelProfileName`, `configName`, `accessLevel`, `attachments[]`, `context`, `creatorId`, `status`, `title`, `voiceMode`, `personalizationApplied`, `dotflowUsed`

- **[Inferred]** The server builds conversation context from the article chain. The "shrink-wrap strategy" fields suggest prior turns are truncated or compressed to fit the model context.
- **[Observed]** Sharing and ownership fields on every article: `access_level`, `resolved_access_level`, `user_can_change_access_level`, `can_share_publicly`, `shared_with_emails[]`, `creator_id`, `collections[]`. `EV-QA`
- **[Observed]** Logged-out client storage holds only a few local/session keys (visitor-id style keys, a filter key and a device-fingerprint library key). There's no client-side thread store. `EV-QA`
- **[Inferred]** History lives on the server and is tied to the account or visitor.
- **[Unknown]** The history and sidebar list UI for signed-in users (`/conversation-history`, `/topic_history` and `/bookmarks` are bundle candidates only). We stayed logged out, and the `ct` count call returned 401.

## 7. Model tiers / DeepConsult

- **[Observed]** The selector menu has three named tiers, each with a one-line purpose and a latency hint, plus a FAST · BALANCED · DEEP meter. `EV-MENU`, `EV-SHOT-06`
  - Tier 1: direct point-of-care answers, about 5 s.
  - Tier 2: comprehensive answers for complex cases, about 30 s.
  - Tier 3: deep consults and long-form research, 5+ min.
- **[Observed]** The selected tier persists into the follow-up composer. `EV-SHOT-07`
- **[Observed]** Tier 2 (`sackett`) uses the **same API, schema and polling** as tier 1, with more spans and citations. `EV-QB`
- **[Inferred]** Tier 3 is the "DeepConsult" product. The bundle carries `isDeepResearchEnabled`. `EV-BUNDLE`
- **[Unknown]** Tier 3's transport, schema, progress UI and whether it needs login. Not captured.

## 8. Evidence badges and grading

- **[Observed]** Badges seen on references: **"Guideline"** (blue) and **"Recent"** (purple), sometimes both. No other badge text appeared across three answers. `EV-QA`, `EV-QC`, `EV-QB`, `EV-SHOT-03`
- **[Inferred]** "Guideline" comes from `content_metadata.is_guideline`, and "Recent" from `why_cited.recency_score` (or `dt_published`) above a threshold.
- **[Observed]** `annotations.evidence_grade` exists but was `null` in every run. `EV-QA`, `EV-QB`
- **[Unknown]** When it's filled in, and how a grade would display.
- **[Observed]** `publication_types[]` and `resolved_publication_type` exist on every citation, so there's room for study-design badges such as RCT or meta-analysis. `EV-QA`
- **[Unknown]** Whether the UI ever renders those as badges. None were seen.

## 9. Other capabilities seen (not exercised)

- **[Observed]** Voice: a "Start voice mode" button, `voice_mode` on articles, and `/transcription-token` and `/batch-speech-to-text` candidates. `EV-QA`, `EV-BUNDLE`
- **[Observed]** Attachments and images: `inputs.attachments[]` (empty in all runs) plus `/api/getuploadurl`, `/attachments/upload/` and `/attachments/delete/`. `EV-QA`, `EV-BUNDLE`
- **[Inferred]** The upload flow is a pre-signed URL request, an upload, then a reference in `inputs.attachments`.
- **[Unknown]** The attachment item shape and accepted types.
- **[Observed]** Templated workflows ("dot-flows"): `dotflow_id`, `dotflow_name` and `dotflow_quick_description` on articles, plus `/dot-flows` routes. The home quick-action chips are probably these. `EV-QA`, `EV-BUNDLE`
- **[Observed]** An answer can be copied as text or as an image, and tables can be exported. `EV-QA`, `EV-QC`
- **[Observed]** Bot protection: headless or automated access gets a 403 and a DataDome challenge (prior session, `ev_482128c6…`). A user-driven, non-headless profile with remote debugging loaded normally once the user had passed any check. `EV-TARGETS-2`

---

## Recommendations for our app

**Mirror (behaviour only, in our own design and words):**

1. **Structured answers, not markdown.** Stream an answer as sections, then paragraphs, then spans, with `citations[]` on each span. Derive the numbered reference list server-side: de-duplicate and number by first appearance, restarting per turn. This makes pills, popovers and "See all (N)" trivial and keeps citations exact.
2. **Keep SSE, but send structured events.** OpenEvidence polls cumulative snapshots, which is simple but heavy: 47 full re-sends for one answer in (a), the last ones about 1,900 JSON nodes each. Our FastAPI SSE can emit `step`, `section`, `span` (with citation refs), `reference`, `suggested_action`, `follow_ups` and `done` events. Add a **`GET /threads/{id}/turns/{turnId}` snapshot endpoint** so a reload or reconnect can recover without replaying the stream. That's the useful part of their polling design.
3. **Progress before text.** Show 2–4 labelled generation steps ("analysing question", "searching evidence", "writing") as one collapsible line above the answer.
4. **Bottom line first.** Open with a bold one-sentence answer, then short bolded run-in subheads and bullets, with a citation pill after each claim. Use a serif reading font for answer text and sans-serif for chrome.
5. **Citation pills with hover cards.** Show the source short name and favicon with "+N", and a hover card with the numbered reference, title link, journal · year · authors and badges. Keep the number in a data attribute for accessibility and copy-out (for example "[3]" in "copy as text").
6. **Reference rows** with title link, journal · year · authors (about 3 plus et al.), badges, and per-reference thumbs up/down. Collect per-reference feedback; it's a cheap quality signal.
7. **Badges from metadata, not from the model.** Use `is_guideline`, a recency threshold, and later study design from publication type. For Canada, add a **"Canadian guideline"** badge (Diabetes Canada, CCS, Thrombosis Canada and so on) and a jurisdiction field on sources. That's a real differentiator.
8. **Follow-ups**: three items delivered at the end of the same stream, shown as a titled card. Add one optional "suggested next action" offer inside the answer.
9. **Threads as a chain of turns.** The client sends `parent_turn_id` (their `original_article`), and the server assembles and compresses history. Give each turn its own URL (`/t/{threadId}#turn` or `/ask/{turnId}`) so any turn can be deep-linked and shared.
10. **Mode switch with honest latency hints.** Quick (about 5 s) and Deep (minutes), with a one-line purpose each, persisted per thread and shown in the composer. Keep the same API and schema across modes and change only depth and budget.
11. **Answer toolbar**: copy as text, helpful / not helpful, and later copy as image and table export.

**Avoid / differ:**

- Don't copy their tier names, branding, licensed-publisher card styling or wording. We have no publisher licences, so a "licensed source" card needs our own licensing first. Show plain citations otherwise.
- Don't poll. Our SSE plus a snapshot endpoint gives the same resilience with far less traffic.

**What we can't know from this observation:**

- Retrieval and ranking: which corpus, how sources are chosen, and what `impact_score` and `recency_score` mean.
- Prompts, model identities behind the tiers, and gatekeeper logic (`use_gatekeeper`).
- `status` values and the exact poll interval (values and timestamps weren't retained).
- The deep-consult tier's transport and format, which wasn't captured.
- How tables and figures are encoded.
- When `evidence_grade` is filled in.
- The signed-in history/sidebar UI and the attachment/image flow, since we stayed logged out and uploaded nothing.
- Drug-dosing/interaction answer specifics such as monograph or dose tables. Question (b) wasn't captured.

---

## Evidence index

All Evidence comes from REA passive observation over a loopback CDP connection to the user's Chrome. Records live in this session's REA evidence ledger.

| Key | Evidence ID | What |
|---|---|---|
| EV-TARGETS-1 | `ev_5714e54f393a3fd33a0d81e509b82b390ff656f90512815252652db7d08ddd54` | Target list: no HTTP(S) pages (Chrome first-run screen) |
| EV-TARGETS-2 | `ev_15af58831332b29f1f94025daa77ff468cee88d0420449c8415cc593998b6e9a` | Target list: OpenEvidence home tab loaded |
| EV-BUNDLE | `ev_8623e1a92cc04f0f7d9108d5058b90bac1d1baaec0ad0ee8329544f8ac704ef4` | `analyze_web_bundle`: 119 scripts, Next.js/React, 16 fetch endpoints, 270 route candidates |
| EV-HOME | `ev_c89cfe89cf79c4da693b846dc1a066212d6e7f3ea1ffea2bc5fcf48c2e39cf41` | Home page inspection (accessibility, storage keys) |
| EV-SHOT-01 | `ev_aa90f3d586f8c79140122751ad4fdbfbc464eb573836b9a3724455b61e21735c` | Screenshot: home, scrolled to footer |
| EV-TARGETS-3 | `ev_cca0008ba67a9179c8366641fef4c7be9dd2eaef5751922e33b3e324db06b5bc` | Target list after the tab was reopened |
| EV-EMPTY | `ev_5c501b6bc32a04d5d74608b662a6173c8dc33ffff271242583c07f9c77079836` | 150 s window with no submission (only a vitals POST) |
| EV-SHOT-02 | `ev_1db1d43e5c9ddac233cd1ccaaab8164fc8375747cf71d922186fed37db37b58d` | Screenshot: home ask box, model selector, quick actions |
| EV-QA | `ev_8040a65749e99682eea775295202171266ea57e5f8cec426e5163cb4fe688d30` | Run (a): Osler, new thread. Network shapes, 47 polls, answer accessibility tree, DOM attribute names |
| EV-SHOT-03 | `ev_d9021b7ce7dc35b7e39ee016fc485e835edffe2f5e0521bf08c9470869477331` | Screenshot: reference list with badges, follow-up card, composer |
| EV-SHOT-04 | `ev_edc53d182437e531cd7e1bb2f6c1498ce3e79419c848c29914f8b23f8bf46ae0` | Screenshot: answer top and citation hover popover (identical pixels: `ev_7ab8141b31d08f9a8b6321f4cd1424ee478ded426fb27cc90b89e178a8efe36e`) |
| EV-QC | `ev_f770ce3af3d1eefce46a3ad806f9410b6f30f9011b2e2f9c399d25266395a619` | Run (c): follow-up. `original_article`, server `inputs.history[]`, 68 polls, stacked turns, licensed-source card, table |
| EV-SHOT-05 | `ev_fd49b009cdf6186b6cae9deb189529c2934974409f6386070446066acf3f7b56` | Screenshot: follow-up turn with publisher card |
| EV-SHOT-06 | `ev_a4804e4f7eb29d86b3680b7c7deb3f55bb4fc9f174ac7971320a743114e6e3f9` | Screenshot: model tier menu |
| EV-MENU | `ev_0dbb53dfa3ce31b2592e6cd57edb7d4fb8309826662a982948cd85efe70ce1db` | Accessibility capture of the open model menu (3 menu items) |
| EV-QB | `ev_623db1596b999ac10b032eb9fc8e66bcabdff35a60768acef7c1fb8e2432c738` | Run (b′): Sackett, new thread. Same API and schema, 77 polls |
| EV-SHOT-07 | `ev_a685872a885a0c14a13b11d013cc7f9106c59d7a69e59a755852b00889032f47` | Screenshot: Sackett answer, composer shows selected tier |
| (prior) | `ev_482128c64777129f7ed3d4b59d6c191f1bc183b125c9c7521faa9207b86ff952` | Earlier session: headless access returns 403 and a DataDome challenge |

## Screenshots

The PNGs below were returned inline by REA `capture_web_screenshot`, decoded to files, and checked against REA's SHA-256. They show OpenEvidence UI and content for internal reference only; don't redistribute them.

| File | Evidence | Shows |
|---|---|---|
| `rea-screenshots/01-home-footer.png` | EV-SHOT-01 | Home page footer, sign-up bar |
| `rea-screenshots/02-home-ask-box.png` | EV-SHOT-02 | Ask box, model selector, quick-action chips |
| `rea-screenshots/03-answer-q-a.png` | EV-SHOT-03 | Reference rows with Guideline/Recent badges and thumbs, follow-up card, composer with voice button |
| `rea-screenshots/04-answer-top-citation-popover.png` | EV-SHOT-04 | Question bubble, progress line, bold lead, pills with "+N", hover popover with "See All (N)" |
| `rea-screenshots/05-follow-up-thread.png` | EV-SHOT-05 | Follow-up turn with licensed-publisher summary card |
| `rea-screenshots/06-model-menu.png` | EV-SHOT-06 | Three-tier model menu with latency hints and FAST/BALANCED/DEEP meter |
| `rea-screenshots/07-sackett-answer.png` | EV-SHOT-07 | Tier-2 answer, composer shows the selected tier |
