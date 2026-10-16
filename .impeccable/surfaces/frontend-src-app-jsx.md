---
version: 1
slug: "frontend-src-app-jsx"
primary_target: "frontend/src/App.jsx"
related_targets: ["frontend/src/components"]
---

# Surface: answer workspace (home, thread, history)

Scope: the whole frontend app screen (frontend/src/App.jsx and components): home composer, streamed thread view, evidence sources, follow-ups, history rail and phone drawer. Mode: Operate.

Audience and task: Canadian clinicians (family physicians, specialists, pharmacists, trainees), equally on a phone at the point of care and a desktop while charting. They ask, read a streamed answer, and verify claims against sources before acting. Important states: empty home, planning/searching/reading progress, streaming, done, error, stopped, saved thread reopened, no-abstract or unread sources.

Constraints: keep all behaviour and the API contract; EN now, FR later (strings ~30% longer); WCAG 2.2 AA in light and dark; not a chatbot, not pharma gloss, not grey EMR; evidence visible while reading.

## Direction contract

THESIS: The clinical-reference standard, played straight at full craft: a quiet, trustworthy reading tool where the answer and its evidence do the talking. It refuses the loud coloured shell, heavy ink rules and candy tints of the replaced printout look, and still refuses a centred chat column with sources dumped underneath.

OWN-WORLD: White canvas and a near-white zinc rail in light; zinc-900 canvas and a darker rail in dark, both following the system. Zinc text and hairlines, one deep clinical teal (#0F766E light, teal-400 dark) for the primary action, links, focus and the selected mode. Amber is reserved for the source being read. Evidence levels as Tailwind UI ring-inset badges (green, violet, blue, rose, orange, zinc). STIX Two Text for answer prose, Atkinson Hyperlegible Next for UI at semibold. Rounded-lg controls, rounded-xl composer, flat bordered cards, a soft shadow-sm only on controls and what you type into.

STORY: The clinician sees the bottom line first, then each claim with its quiet numbered chip. Tapping a chip shows exactly which source says it and how strong it is. They trust the answer or see where it is thin, then ask the next question.

FIRST VIEWPORT: A neutral history rail on the left (272px) with a wordmark, a New question button and search. The question is the page title with a one-line meta strip (mode and copy; the cited/reviewed counts sit once per breakpoint, in the evidence margin header on wide screens and in the strip, as the button that opens the sources, below xl). The answer column sits at about 68ch; a sticky evidence margin on the right lists cited sources as numbered cards whose keys hang into the gutter. The composer is pinned at the bottom of the answer column. Signature move, the highlighter sweep: hovering, focusing or tapping a citation sweeps amber across its claim and lights the matching card. On phones, a tap opens that source in a bottom sheet that keeps "n of N cited" in view.

FORM: Category standard (the standing exit), user-pinned; benchmarks OpenEvidence / UpToDate and Perplexity / Notion. seed: none (user-pinned standard; no roll)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Memorable moment

The highlighter sweep linking a claim to its source.

## Unresolved

French strings; brand name (APP_NAME placeholder); a manual theme toggle (themes follow the system for now).
