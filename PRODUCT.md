# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Canadian clinicians, used equally on a phone at the point of care (quick lookups between patients) and at a desktop workstation while charting (reading longer answers and their sources side by side):

- family physicians: broad questions across specialties, Canadian primary-care guidance;
- specialists and hospitalists: narrower, deeper questions; society guidelines and trials;
- pharmacists: dosing, renal adjustment, interactions, Health Canada product monographs;
- residents and students: learning why a recommendation exists and how strong its evidence is.

Their job: get a trustworthy, cited answer to a clinical question fast, and check the evidence behind it before acting.

## Product Purpose

An evidence Q&A tool for Canadian clinicians. A clinician asks a question (optionally with an image such as an ECG or lab report); the product searches the literature and Canadian guidance and streams an answer in which every claim carries a numbered citation to a source the clinician can open. Success: the clinician trusts the answer enough to act, can verify it in seconds, and can see when the evidence is weak or missing.

## Positioning

Canada-first evidence. Answers draw on Canadian society guidelines (CCS, Diabetes Canada, CTFPHC, Thrombosis Canada, SOGC, CPS, provincial guidance), Health Canada product monographs for Canadian dosing, and PubMed / Europe PMC / ClinicalTrials.gov, and say plainly when the current Canadian text was not available rather than guessing. Modelled on the OpenEvidence workflow, without its name, branding or licensed content.

## Operating Context

- Point of care on a phone, one-handed, between patients; and a clinic or hospital workstation next to the EMR.
- Quick mode answers in about 25-45 s with first words at 15-30 s; Deep mode writes a structured evidence report in about 2 minutes. Progress must stay visible while the user waits.
- Answers are followed by related questions and continue as a thread; threads are saved in a history sidebar.
- Testers are invited clinicians (Auth0 login when deployed); local use has no login.

## Capabilities and Constraints

- Streamed markdown answer with numbered `[n]` citations; each maps to a source card with title, journal or site, year, authors, evidence-strength badge (Guideline, Systematic review, RCT, Clinical trial, Observational, Review, Case report, Health Canada, Registered trial, Preprint, Other), a Canada marker, and links (Health Canada cards open the product monograph PDF).
- Quick / Deep modes; image attachment (never stored; users are warned to remove identifiers); follow-up questions; copy answer with references; thread rename and delete.
- Source text the model could not read is disclosed in the answer, not hidden.
- Stack: React 19 + Vite + Tailwind CSS 3 frontend served by a FastAPI backend (SSE streaming). The API contract and behaviour must be preserved by UI work.
- English now; French is planned. Layouts must tolerate longer French strings and a later language switch.
- Working name "Clinical Evidence CA" is a placeholder, set by `APP_NAME`; no logo or brand assets exist yet.

## Brand Commitments

- Must not read as a consumer chatbot (chat bubbles, emoji, gradients), as pharma advertising (marketing gloss, stock imagery), or as a grey, cramped EMR form.
- Evidence must stay visible while reading, not buried below the answer.
- Not a medical device: a "not a substitute for clinical judgement" notice and the no-identifiers warning for images stay.
- Visual register: the clinical-reference standard, sitting alongside OpenEvidence / UpToDate and Perplexity / Notion, executed at full craft rather than an invented visual world. Light and dark themes follow the system setting.

## Evidence on Hand

- Real answers and sources produced by the live system (threads saved in `data/app.db`); no testimonials, customers, usage numbers, accreditations or partnerships exist, and none may be invented.

## Product Principles

1. Verification is the product: every claim leads to its source in one interaction, and evidence strength is visible at a glance.
2. Honesty over fluency: missing, weak or conflicting evidence is shown, never smoothed over.
3. Canadian context first: Canadian guidance and Health Canada information are identified as such wherever they appear.
4. Waiting is part of the experience: progress and partial results are shown while an answer streams.
5. Works one-handed on a phone and side-by-side on a desktop, with equal care.

## Accessibility & Inclusion

- Clinical use in varied lighting (bright wards, dim night shifts): text and badge contrast must meet WCAG 2.2 AA at minimum.
- Keyboard operable on desktop; citation popovers must work with focus as well as hover, and on touch.
- Room for French (strings up to ~30% longer) without truncating meaning.
