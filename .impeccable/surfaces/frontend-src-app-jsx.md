---
version: 1
slug: "frontend-src-app-jsx"
primary_target: "frontend/src/App.jsx"
related_targets: ["frontend/src/components"]
---

# Surface: answer workspace (home, thread, history)

Scope: the whole frontend app screen (frontend/src/App.jsx and components): home composer, streamed thread view, evidence sources, follow-ups, history rail and phone drawer. Mode: Operate.

Audience and task: Canadian clinicians (family physicians, specialists, pharmacists, trainees), equally on a phone at the point of care and a desktop while charting. They ask, read a streamed answer, and verify claims against sources before acting. Important states: empty home, planning/searching/reading progress, streaming, done, error, stopped, saved thread reopened, no-abstract or unread sources.

Constraints: keep all behaviour and the API contract; EN now, FR later (strings ~30% longer); WCAG 2.2 AA; not a chatbot, not pharma gloss, not grey EMR; evidence visible while reading.

## Direction contract

THESIS: Every answer reads like a printout a colleague already checked for you. It refuses the answer-engine default of a centred chat column with sources dumped underneath.

OWN-WORLD: Bright copy-paper ground (#FAFAF7), laser-black ink (#16181D), a ballpoint-blue shell rail and keys (#1D3FAE). Fluorescent highlighter inks appear only on evidence: yellow for the active citation and selection, then green, blue, pink, orange and violet tints keyed to evidence level. STIX Two Text for the answer, like journal print; Atkinson Hyperlegible Next for UI. Hairline ink rules, square-ish 6px corners, numbered circular keys.

STORY: The clinician sees the bottom line first, then each claim with its key. Tapping a key shows exactly which source says it and how strong it is. They trust the answer or see where it is thin, then ask the next question.

FIRST VIEWPORT: A blue history rail on the left (264px). The question is set as the printout title with a one-line meta strip (mode, sources cited of reviewed, time). The answer column sits at about 68ch. A sticky evidence margin (about 360px) on the right lists cited sources as numbered cards whose keys hang into the gutter. The composer is pinned at the bottom of the answer column. Signature move, the highlighter sweep: hovering, focusing or tapping a citation sweeps yellow highlighter left to right across its claim and lights the matching margin card in the same ink. On phones, a tap opens that source in a focused bottom sheet that keeps "n of N cited" in view.

FORM: Journal Club Printout, position 5 of the ordered grounded list (assigned by the roll). seed: none (unavailable)
Raised: one-line finding under every source (from character goods catalog); nothing labelled twice, origin folded into the byline (from Saville catalog sleeve); a focused phone source sheet that never shrinks the margin to chips (from midnight transit diagram); one strict type scale (from Emigre specimen); tabular numerals and AA contrast on every highlight (from Ikeda datamatics).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Memorable moment

The highlighter sweep linking a claim to its source.

## Unresolved

Dark/night-shift theme; French strings; brand name (APP_NAME placeholder).
