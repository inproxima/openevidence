---
name: Clinical Evidence CA
description: Journal Club Printout. Cited clinical answers on copy paper, with highlighter ink reserved for evidence.
colors:
  paper: "#FAFAF7"
  paper-white: "#FFFFFF"
  paper-shade: "#F1F1EC"
  ink: "#16181D"
  ink-soft: "#30343C"
  ink-muted: "#575D68"
  ink-faint: "#8A8F98"
  rule: "#D9DAD3"
  rule-strong: "#B9BBB2"
  pen: "#1D3FAE"
  pen-dark: "#152F86"
  pen-wash: "#E8EDFF"
  pen-mist: "#B9C8FF"
  hl-yellow: "#FFE24D"
  hl-yellow-tint: "#FFF4B3"
  hl-green-tint: "#D7F5DB"
  hl-blue-tint: "#D6EEFF"
  hl-pink-tint: "#FFDCEA"
  hl-orange-tint: "#FFE6CC"
  hl-violet-tint: "#ECE5FF"
  ink-on-green: "#0F4A22"
  ink-on-blue: "#0A3767"
  ink-on-pink: "#7A0F3A"
  ink-on-orange: "#6B3300"
  ink-on-violet: "#40237E"
  alert: "#B4232F"
  alert-tint: "#FDECEC"
  maple: "#C8102E"
typography:
  display:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.625rem"
    fontWeight: 700
    lineHeight: "3rem"
  headline:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: "2.3rem"
  title:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.3125rem"
    fontWeight: 700
    lineHeight: "1.75rem"
  reading:
    fontFamily: "STIX Two Text Variable, STIX Two Text, Georgia, serif"
    fontSize: "1.09375rem"
    fontWeight: 400
    lineHeight: "1.75rem"
    fontFeature: "\"lnum\" 1, \"tnum\" 1"
  body:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: "1.4rem"
  label:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: "1.2rem"
  micro:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: "1.1rem"
rounded:
  sheet: "6px"
  key: "999px"
spacing:
  card-y: "12px"
  card-x: "14px"
  gutter: "48px"
  measure: "37.5rem"
  frame: "1180px"
components:
  button-primary:
    backgroundColor: "{colors.pen}"
    textColor: "{colors.paper-white}"
    typography: "{typography.label}"
    rounded: "{rounded.sheet}"
    height: "36px"
    padding: "0 12px"
  button-primary-hover:
    backgroundColor: "{colors.pen-dark}"
  button-primary-disabled:
    backgroundColor: "{colors.paper-shade}"
    textColor: "{colors.ink-faint}"
  button-stop:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sheet}"
    height: "36px"
  cite-key:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.pen}"
    rounded: "{rounded.key}"
  cite-key-lit:
    backgroundColor: "{colors.hl-yellow}"
    textColor: "{colors.ink}"
  source-card:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "12px 14px"
  source-card-lit:
    backgroundColor: "{colors.hl-yellow-tint}"
  composer:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
  history-rail:
    backgroundColor: "{colors.pen}"
    textColor: "{colors.paper-white}"
    width: "272px"
  evidence-badge-guideline:
    backgroundColor: "{colors.hl-green-tint}"
    textColor: "{colors.ink-on-green}"
    typography: "{typography.micro}"
    height: "20px"
---

# Design System: Clinical Evidence CA

## Overview

**Creative North Star: "Journal Club Printout"**

Every answer reads like a printout a colleague has already checked for you. The ground is bright copy paper, the text is laser-black ink, and the app's shell (the history rail, the citation keys, the primary actions) is drawn in ballpoint blue. Fluorescent highlighter ink appears only where evidence is concerned: one yellow stroke marks the citation currently being read, and five quieter tints classify each source by evidence level.

Density is that of a working document, not a landing page. The answer is set in a journal serif to a fixed measure. Sources sit beside it in a sticky margin, each one a numbered card whose key hangs into the gutter, and hairline ink rules separate the parts. Depth is shallow: a sheet of paper on a desk, never floating glass.

The system's signature is the highlighter sweep. Hovering, focusing or tapping a citation key draws a yellow stroke left to right across exactly the words that source supports, and lights the matching margin card in the same ink.

**Key Characteristics:**
- Copy-paper ground, laser ink, ballpoint-blue shell.
- Highlighter ink is a signal for evidence, never decoration.
- STIX Two Text for answer prose; Atkinson Hyperlegible Next for every UI surface.
- One shared right edge (37.5rem) for the question rule, answer, related questions and composer.
- Hairline rules, 6px sheet corners, fully round numbered keys.
- Tabular lining numerals wherever numbers are read or compared.

## Colors

Near-neutral paper and ink, a single saturated blue, and a set of highlighter inks that are rationed by meaning.

### Primary
- **Ballpoint Blue** (pen): the shell. It fills the history rail and phone top bar, the primary Ask button and the selected mode, list markers in the answer, and the outline of every idle citation key. It is also the focus ring and the text caret. Ballpoint Deep (pen-dark) is its hover state. Pen Wash is the hover fill of a key, and Pen Mist is the composer's focus halo plus the secondary text on the blue rail.

### Secondary
- **Highlighter Yellow** (hl-yellow): the active citation, and nothing else. It fills a lit key and the claim sweep, and it is the text-selection colour. Its tint (hl-yellow-tint) fills the margin card of the lit source.

### Tertiary
- **Evidence Tints**: pale highlighter washes, each paired with a dark ink of the same hue for the label text. Green is Guideline, violet is Systematic review, blue is RCT and Clinical trial, pink is Health Canada, orange is Observational. Case reports, registered trials, preprints, narrative reviews and other types fall back to Paper Shade with soft ink, ringed in Rule Strong where the reader should be cautious.
- **Maple Red** (maple): the Canadian-origin mark in a source byline, drawn as a maple leaf and the word "Canada". It is never used as a fill.
- **Alert Red** (alert, on alert-tint): errors and destructive menu items only.

### Neutral
- **Copy Paper** (paper): the page ground everywhere outside the rail.
- **Bright Sheet** (paper-white): the raised surfaces, meaning source cards, the composer and the idle key face.
- **Paper Shade** (paper-shade): disabled buttons, inline code, neutral evidence badges and hover fills on quiet icon buttons.
- **Laser Ink** (ink): all primary text, the heavy rule under a question title or list heading, and a lit card's border.
- **Soft, Muted and Faint Ink** (ink-soft / ink-muted / ink-faint): in that order, secondary prose and findings; meta strips, bylines and placeholders; disabled labels.
- **Hairline Rule** and **Strong Rule** (rule / rule-strong): card borders, row dividers, the margin's left rule, and scrollbars.

### Named Rules
**The Reserved Yellow Rule.** Yellow means "the source you are reading now". No evidence level, status, brand mark or decoration may use yellow; the sweep, the lit key, the lit card and text selection are its only jobs.

**The Ink-on-Tint Rule.** Every highlighter tint carries dark ink of its own hue (or Laser Ink), never white or pen blue, so every badge and lit surface clears WCAG AA.

**The One Blue Rule.** Ballpoint Blue is the only chromatic UI colour. Interactive affordances are blue or ink; highlighter colour never marks a control as clickable.

## Typography

**Display Font:** Atkinson Hyperlegible Next Variable (with ui-sans-serif, system-ui)
**Body Font:** STIX Two Text Variable for answer prose (with Georgia, serif); Atkinson Hyperlegible Next for UI body
**Label/Mono Font:** Atkinson Hyperlegible Next, bold, with tabular numerals

**Character:** A journal serif for what the evidence says, and a legibility-first grotesque for everything the reader operates. Both faces are self-hosted variable fonts.

### Hierarchy
- **Display** (700, 2.625rem/3rem): the home heading "Ask a clinical question" only. It drops to the Headline size on phones.
- **Headline** (700, 1.875rem/2.3rem): the question as the printout title. It drops to the Title size on phones and is balanced.
- **Title** (700, 1.3125rem/1.75rem): the phone question title, and the source title inside the focused source sheet.
- **Reading** (400, 1.09375rem/1.75rem, STIX Two Text, lining tabular numerals): answer prose, held to the 37.5rem measure (about 68ch). Headings inside an answer switch to Atkinson Hyperlegible Next at 700 and the Body size with 0.01em tracking, so they read as section labels within the printout.
- **Body** (400 or 700, 0.9375rem/1.4rem): UI text, list rows, card titles (bold) and section headings ("Evidence", "Related questions").
- **Label** (700, 0.8125rem/1.2rem): meta strips, bylines, mode buttons, progress steps. Findings under a source card use this size set in STIX.
- **Micro** (700, 0.75rem/1.1rem): evidence badges, card actions, keyboard hints, disclaimers.

### Named Rules
**The One Scale Rule.** Sizes come only from the seven-step scale (micro, label, body, reading, title, headline, display). Answer prose uses Reading, UI uses micro to title, and the question uses Headline.

**The Two Voices Rule.** Serif is for what sources and the answer say: answer prose, findings and blockquotes. Sans is for everything a user acts on or scans. Never set a control in STIX.

**The Counted Numerals Rule.** Counts, dates, doses, keys and table figures use lining tabular numerals.

## Layout

The app is a fixed-height two-pane shell. A 272px ballpoint-blue history rail sits on the left from 1024px up; below that it becomes an off-canvas drawer behind a 48px blue top bar. The content frame is centred at a maximum of 1180px, padded 16px on phones, 32px from 640px and 40px from 1280px.

From 1280px a turn is a two-column grid: the answer column at 37.5rem, then a 48px gutter, then the evidence margin (at least 320px) taking all remaining width. The margin is sticky 24px below the running header (60px from the top) and scrolls internally. Below 1280px the evidence list follows the answer in the single column, and the counts move into the meta strip as a button that opens the source sheet.

The question rule, the answer, related questions and the composer all end on one right edge. The composer is pinned at the bottom in the same column grid, so it lines up with the answer and never spans the margin. Turns in a thread are separated by 64px, under a sticky running header.

The home page is a cover sheet in the same frame and the same column grid: a ruled title block spans the frame, the composer and the example questions sit in the answer column, and the key to sources sits where the evidence margin will be (below the examples under 1280px). Asking a question therefore never moves the composer sideways.

**The One Edge Rule.** Anything belonging to the answer column stops at 37.5rem. When there is extra width, the evidence margin absorbs it. Page furniture (the cover sheet's title block and the running header) spans the whole frame.

## Elevation & Depth

Paper on a desk: surfaces are flat and separated by hairline rules and by the step from Copy Paper to Bright Sheet. Shadows are soft, ink-tinted and reserved for things that physically sit above the page.

### Shadow Vocabulary
- **Lift** (`box-shadow: 0 1px 2px rgba(22,24,29,0.06), 0 6px 18px -8px rgba(22,24,29,0.18)`): the composer and the rail's New question button, the two surfaces you write into or press first.
- **Pop** (`box-shadow: 0 12px 32px -12px rgba(22,24,29,0.32), 0 2px 6px rgba(22,24,29,0.08)`): menus, the open phone drawer and the sign-in card.
- **Sheet** (`box-shadow: 0 -8px 30px -12px rgba(22,24,29,0.35)`): the bottom source sheet, which casts its shadow upwards.

### Named Rules
**The Flat Card Rule.** Source cards never take a shadow. A card shows its state through a border shift (Hairline, then Strong on hover, then Laser Ink when lit) and a fill change to the yellow tint.

## Shapes

The geometry is square-ish. Sheets, cards, buttons, inputs and alerts use a 6px corner (sheet). Citation keys and margin keys are full circles or pills (key), which makes them the only round objects on the page and easy to pick out. Evidence badges are near-square at 3px, the segments inside the mode switch are 4px, and the phone source sheet rounds only its top corners (14px). Borders are 1px hairlines throughout. Ink-weight rules (Laser Ink) sit under the question title and above list blocks, and the dashed hairline before a finding is the only broken line in the system.

## Components

### Buttons
Ink-solid and direct, with no gradients.
- **Shape:** sheet corners (6px), 36px tall, 12px horizontal padding, Label type in bold.
- **Primary:** Ballpoint Blue fill with Bright Sheet text ("Ask", "Sign in"). Disabled is a Paper Shade fill with Faint Ink text.
- **Hover / Focus:** hover deepens to Ballpoint Deep. Focus is a 2px Ballpoint Blue outline at 2px offset on every control.
- **Stop:** a Laser Ink fill with paper text, shown in place of Ask while an answer is streaming.
- **Text actions:** bold blue Micro or Label text with a 13px line icon ("Copy with references", "Open source"), underlined on hover. Quiet actions use Muted Ink and darken to Ink on hover.
- **Icon buttons:** a 36px square with sheet corners and a Paper Shade hover fill (or white at 10% on the blue rail).

### Chips
- **Evidence badge:** 20px tall, 6px horizontal padding, 3px corners, Micro bold, showing a highlighter tint with its matched ink (see Colors). Each badge has a tooltip with the level's definition.
- **Mode switch:** a segmented radio group inside a hairline-bordered sheet. The selected segment is Ballpoint Blue with white text; unselected segments are Muted Ink.

### Cards / Containers
- **Source card:** Bright Sheet on a Hairline border, 6px corners, padding 12px by 14px, no shadow. It stacks, in order: the evidence badge, a bold Body title, then a Label byline in Muted Ink with the Canada mark leading where relevant. Below that comes a one-line serif finding under a dashed rule, clamped to a single line until the card is lit, and finally the text actions. Uncited cards drop to 90% opacity.
- **Lit state:** the border turns to Laser Ink, the fill to Highlighter Yellow tint, and the hanging key turns yellow. Both transition over 300ms ease-out.
- **Alert:** an Alert Tint panel with Alert Red text, a warning icon and sheet corners.

### Inputs / Fields
- **Composer:** Bright Sheet with a 1px Laser Ink border, sheet corners and the Lift shadow. The textarea is borderless, grows with its text up to 220px, and has a placeholder in Muted Ink. The mode switch, image attach and Ask sit in the footer row.
- **Focus:** a 3px Pen Mist halo replaces the outline (`box-shadow: 0 0 0 3px #B9C8FF`).
- **Rail search:** a translucent white field on the blue rail with a Pen Mist placeholder; its fill brightens on focus.

### Navigation
- **History rail:** a 272px Ballpoint Blue column. It holds the app mark, a white New question button (Lift shadow, ⌘K hint), a search field, and a "Recent" list. Titles are Body text in pale blue and clamp to two lines. The active thread is bold white on white at 16%; hover is white at 8%. A row's options button appears on hover or focus and opens a Pop menu. The disclaimer sits at the foot over a hairline rule.
- **Phone:** the rail becomes a drawer with the Pop shadow over a 30% ink scrim, opened from the 48px blue top bar.

### Citation Key
A numbered round key placed inline after the claim it supports. Idle, it has a Bright Sheet face, a Ballpoint Blue ring and blue tabular numerals at 0.68em. Lit, it has a Highlighter Yellow face and a Laser Ink ring and text. Below 1280px the face grows to 1.6em with 3px side margins, and an invisible hit area extends 4px on every side so that every phone target is at least 24px. On wide screens a click pins the key; on narrow screens it opens the source sheet.

### Highlighter Sweep (signature)
Each claim a source supports is wrapped as one unit. Its highlight is a background gradient angled at 176 degrees, from transparent to yellow and back to transparent, sized from 0% to 100% width over 460ms on the `cubic-bezier(0.16, 1, 0.3, 1)` curve. Because the background is sliced per line fragment, the stroke travels through a sentence line by line. It is triggered by hover, focus, pin or an open sheet, and it lights the matching margin card at the same time. Reduced motion collapses the sweep to an instant state change.

**Completion sweep (the one authored moment).** When an answer finishes streaming in front of the reader, one slower stroke crosses its bottom line (the first claim in the answer) over about 900ms on `cubic-bezier(0.33, 1, 0.68, 1)`, holds, then fades from yellow back to paper (2.6s in all). The ink colour fades, not the words, so the claim never changes weight. It does not light a key or card, plays only if that claim is on screen at completion, and never plays for saved threads, stopped or failed answers, or under reduced motion. No other entrance or celebration motion may be added alongside it.

### Evidence Margin
A sticky column with a hairline left rule. Its header is "Evidence" over an ink rule, with "n cited · N reviewed" shown once at the right. Cited cards are listed in the order the answer first cites them, each with a 26px round key hanging 13px into the gutter. A disclosure ("n reviewed, not cited") reveals the remaining sources.

### Source Sheet (phone)
A bottom sheet on Copy Paper with a top ink rule, 14px top corners, the Sheet shadow, a grab handle and a 360ms rise. Its header keeps a yellow key and "n of N cited" in view, with previous, next and close icon buttons. The card inside drops its hanging key and sets its finding at Reading size.

### Meta Strip
Under the question: mode (bold, with an icon), the counts on narrow screens, and the image note. The date and answer time are in the running header, not here. "Copy with references" is pinned to the right of the first line while the facts beside it wrap, and it reads "Copy" below 640px (the full name stays for screen readers). All of it is Label size in Muted Ink.

### Running Header
A printout's running header, sticky at the top of the thread: 36px tall over a hairline, spanning the frame. It gives the date ("Thu 15 Oct 2026", bold Soft Ink), answer time and duration (when known) of the question currently under it, all in tabular numerals, plus "Question n of N" at the right when the thread has more than one. Label size in Muted Ink on Copy Paper.

### Cover Sheet (home)
A ruled title block: an ink rule, the Display heading with today's date at its right, a Reading-size standfirst, then a row of three fields (Quick, Deep, Searches) between a hairline and an ink rule, with a bold label column and Muted Ink values. Below it come the composer, then "Example questions" as a numbered contents list (bold blue tabular numerals, an ink rule above, hairline rows, a trailing arrow). The "Key to sources" pairs a specimen citation key, the five evidence badges and the Canada mark with their meanings. There is no label above any heading.

## Do's and Don'ts

### Do:
- **Do** keep Highlighter Yellow for the active citation, its claim sweep, its lit card and text selection only.
- **Do** classify evidence with the tint and matched-ink pairs: green for Guideline, violet for Systematic review, blue for RCT and Clinical trial, pink for Health Canada, orange for Observational, and Paper Shade for everything else.
- **Do** show Canadian origin once, as the maple mark in the byline, and show the cited and reviewed counts once per breakpoint.
- **Do** end every answer-column element on the 37.5rem edge and let the evidence margin take the slack.
- **Do** set answer prose and findings in STIX Two Text at Reading size with lining tabular numerals, and all controls in Atkinson Hyperlegible Next.
- **Do** separate parts with hairline rules and ink rules, and let cards change state through border and fill rather than shadow.
- **Do** start motion from an already-visible state (rise, fade, sweep) and honour reduced motion.

### Don't:
- **Don't** give any evidence level, status or brand element a yellow fill.
- **Don't** put white or blue text on a highlighter tint.
- **Don't** add a second chip for origin or repeat a count that is already shown.
- **Don't** centre a chat column with sources dumped underneath; sources live beside the answer, or in the sheet on phones.
- **Don't** shadow source cards or add type sizes outside the seven-step scale.
- **Don't** make highlighter colours interactive affordances; controls are blue or ink.
