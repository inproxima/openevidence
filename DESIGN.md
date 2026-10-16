---
name: Clinical Evidence CA
description: The clinical-reference standard at full craft. Cited answers on a quiet zinc page, one clinical teal, amber only for the source being read.
colors:
  canvas: "#FFFFFF"
  subtle: "#F7F7F8"
  surface: "#FFFFFF"
  fg: "#18181B"
  fg-soft: "#3F3F46"
  fg-muted: "#686870"
  fg-faint: "#A1A1AA"
  line: "#E4E4E7"
  line-strong: "#D4D4D8"
  accent: "#0F766E"
  accent-hover: "#115E59"
  accent-fg: "#FFFFFF"
  accent-text: "#0F766E"
  accent-soft: "#F0FDFA"
  accent-focus: "#0F766E"
  hl-key: "#FCD34D"
  hl-key-fg: "#09090B"
  hl-key-ring: "rgb(245 158 11 / 0.5)"
  hl-soft: "#FFFBEB"
  hl-ring: "#FCD34D"
  sweep: "#FDE68A"
  selection: "#CCFBF1"
  maple: "#DC2626"
  canvas-dark: "#18181B"
  subtle-dark: "#121214"
  surface-dark: "#1F1F23"
  fg-dark: "#F4F4F5"
  fg-soft-dark: "#D4D4D8"
  fg-muted-dark: "#A1A1AA"
  fg-faint-dark: "#71717A"
  line-dark: "#2E2E33"
  line-strong-dark: "#3F3F46"
  accent-dark: "#2DD4BF"
  accent-hover-dark: "#5EEAD4"
  accent-fg-dark: "#09090B"
  accent-text-dark: "#5EEAD4"
  accent-soft-dark: "#1A2B2B"
  accent-focus-dark: "rgb(45 212 191 / 0.5)"
  hl-soft-dark: "#3D3120"
  hl-ring-dark: "#956516"
  sweep-dark: "rgb(252 211 77 / 0.3)"
  selection-dark: "#134E4A"
  maple-dark: "#F87171"
typography:
  display:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.625rem"
    fontWeight: 600
    lineHeight: "3rem"
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: "2.3rem"
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.3125rem"
    fontWeight: 600
    lineHeight: "1.75rem"
    letterSpacing: "-0.01em"
  body:
    fontFamily: "STIX Two Text Variable, STIX Two Text, Georgia, serif"
    fontSize: "1.09375rem"
    fontWeight: 400
    lineHeight: "1.75rem"
    fontFeature: "\"lnum\" 1, \"tnum\" 1"
  body-ui:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: "1.4rem"
  label:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: "1.2rem"
  label-sm:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: "1.1rem"
rounded:
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  card-y: "12px"
  card-x: "14px"
  card-stack: "10px"
  column-gap: "48px"
  turn-gap: "64px"
  rail: "272px"
  measure: "37.5rem"
  frame: "1180px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    typography: "{typography.body-ui}"
    rounded: "{rounded.lg}"
    padding: "0 14px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-primary-disabled:
    backgroundColor: "rgb(24 24 27 / 0.07)"
    textColor: "{colors.fg-faint}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    rounded: "{rounded.lg}"
    height: "36px"
  button-secondary-hover:
    backgroundColor: "{colors.subtle}"
  button-dark:
    backgroundColor: "{colors.fg}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
    padding: "0 14px"
    height: "36px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    rounded: "{rounded.lg}"
  field-focus:
    borderColor: "{colors.accent-focus}"
  composer:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    rounded: "{rounded.xl}"
  source-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    rounded: "{rounded.lg}"
    padding: "12px 14px"
  source-card-lit:
    backgroundColor: "{colors.hl-soft}"
  cite-key:
    backgroundColor: "rgb(24 24 27 / 0.06)"
    textColor: "{colors.fg-soft}"
    rounded: "{rounded.full}"
  cite-key-lit:
    backgroundColor: "{colors.hl-key}"
    textColor: "{colors.hl-key-fg}"
  evidence-badge:
    typography: "{typography.label-sm}"
    rounded: "{rounded.md}"
    padding: "0 6px"
    height: "20px"
  publisher-mark:
    textColor: "{colors.fg-muted}"
    typography: "{typography.label-sm}"
  publisher-mark-tile:
    backgroundColor: "rgb(24 24 27 / 0.06)"
    textColor: "{colors.fg-soft}"
    rounded: "4px"
    width: "16px"
    height: "16px"
---

# Design System: Clinical Evidence CA

## Overview

**Creative North Star: "The Quiet Reference Desk"**

This is the clinical-reference category standard played straight, at full craft, beside OpenEvidence, UpToDate, Perplexity and Notion. The page is a white canvas (zinc-900 at night) with a near-white zinc history rail, zinc text and hairlines, and one deep clinical teal. Nothing on the chrome competes with the answer: the question is the page title, the answer sits in a serif reading column of about 68 characters, and the evidence margin lists the cited sources as flat bordered cards beside it. Light and dark themes follow the system setting through semantic CSS variables, so no component branches on theme for surfaces, text or lines.

Colour is spent on meaning, not mood. Teal says "act here" (the primary button, links, focus, the caret). Amber says "this is the source you are reading": the highlighter sweep across a claim, the lit citation key and the lit card. Evidence levels use Tailwind UI ring-inset badges in categorical hues. Everything else is zinc.

Density is reference-tool density: compact semibold UI in Atkinson Hyperlegible Next, generous serif leading for the answer, hairline dividers instead of boxes wherever a list will do. The world refuses the replaced printout look's coloured shell, heavy ink rules and candy tints, and refuses a centred chat column with sources dumped underneath.

**Key Characteristics:**
- White / zinc-900 canvas, zinc hairlines, one clinical teal accent.
- Amber reserved for the source being read.
- STIX Two Text for answer prose and findings; Atkinson Hyperlegible Next at semibold for UI.
- Answer column and evidence margin side by side from xl; source sheet below xl.
- Flat bordered cards; soft small shadows only on controls; real lift only for menus and the sheet.
- Themes follow the system; every surface, text and line colour is a semantic token.

## Colors

A neutral zinc page carrying exactly two signal colours, teal for action and amber for reading, plus a categorical badge palette for evidence levels.

### Primary
- **Clinical Teal** (`accent`; teal-400 `accent-dark` at night): the primary action fill, the focus outline (2px, offset 2px), the text caret and the stream caret. **Field Focus** (`accent-focus`) is the same teal as the 2px ring on a focused field or the composer: full strength in light, half strength in dark, where full teal-400 flares on zinc (half still clears 3:1 on the surface). Hover deepens to **Deep Teal** (`accent-hover`) in light and brightens to teal-300 in dark. Text on the fill is `accent-fg` (white in light, zinc-950 in dark).
- **Link Teal** (`accent-text`): links in prose, text actions ("Open source", "Copy with references"), the selected answer-mode icon, the New question plus, the sub-xl counts button, and hover on related-question arrows. In dark it is teal-300 for contrast on zinc.
- **Teal Wash** (`accent-soft`): the hover tint behind an idle citation key.
- **Selection Teal** (`selection`): text selection background, with `fg` text.

### Secondary
- **Reading Amber** (`hl-key`, amber-300, the same in both themes): the lit citation key fill, the lit hanging key on a card, the position key in the source sheet header. Its numerals are `hl-key-fg` (zinc-950) and its inset ring `hl-key-ring` (amber-500) at 50%, drawn together by the `litKey` recipe in `ui.js`.
- **Amber Wash** (`hl-soft`) and **Amber Ring** (`hl-ring`): the fill and border of the lit source card. In dark they are amber-500 at 14% and 55% over the surface (#3D3120 and #956516), so the lit card reads as amber rather than khaki without flaring, and keeps Muted Ink at 4.9:1, Link Teal at 8.6:1 and Ink at 11.5:1.
- **Sweep Amber** (`sweep`, amber-200 in light; amber-300 at 30% in dark): the highlighter stroke laid across a claim.

### Tertiary
- **Maple Red** (`maple`; red-400 in dark): the maple leaf in the Canada mark, and nothing else.
- **Brand Teal, Navy and Lime** (`mark` #099B94, `mark-ink` #102D46, `mark-hl` #C4E64B): the AppMark, the favicon and the logo files in `frontend/public/brand/`, and nothing else; they never stand in for Clinical Teal or Reading Amber. In dark the navy lines lift to zinc-200, since navy vanishes on zinc-900. The wordmark beside the mark is always Ink. The masters are drawn in `scripts/brand_assets.py`.
- **Evidence hues** (Tailwind palette, applied through `dark:` variants): Guideline green, Systematic review violet, RCT and Clinical trial blue, Health Canada rose, Observational orange. Review and Other share a plain zinc badge; Case report, Registered trial and Preprint share a transparent badge with a firmer zinc outline (the ones to read with care). Light badges are a 50-step wash with 700/800 text; dark badges are a 10% wash with 300 text.
- **Error red** (Tailwind red): the alert recipe (red-50 wash, red-800 text, red-600/10 ring; red-500/10 wash and red-300 text in dark) and the destructive menu item.

### Neutral
- **Canvas** (`canvas`): page ground, running header, sheet body, bottom composer dock.
- **Rail Zinc** (`subtle`): the history rail, segmented-control trough, inline code, quiet hover fills. In dark it is darker than the canvas, so the rail recedes.
- **Surface** (`surface`): cards, composer, fields, menus, secondary buttons. Equal to canvas in light; lifted one step in dark.
- **Ink** (`fg`), **Soft Ink** (`fg-soft`), **Muted Ink** (`fg-muted`), **Faint Ink** (`fg-faint`): titles and body; secondary text, findings and the Canada word; metadata, placeholders, bylines and publisher names; disabled labels and decorative icons only.
- **Hairline** (`line`) and **Firm Hairline** (`line-strong`): all borders and dividers, the scrollbar thumb, the sheet grabber. Solid in both themes so borders read the same on every surface.

### Named Rules
**The Amber Means Reading Rule.** Amber marks the source being read now: the claim sweep, the lit citation key, the lit card's fill and ring, the sheet's position key. No evidence level uses amber (Observational is orange). The one other amber in the product is the image-identifier caution in the composer, a single amber-50 note with amber-900 text and a ShieldAlert icon; it is a sanctioned one-off, not a warning style. The AppMark's lime line depicts the same act of reading a cited claim, in the brand's own colour; lime never enters the interface.

**The One Accent Rule.** Teal is the only accent. Primary action, links and text actions, focus, caret, selected mode and selection all draw from it; no second brand hue enters the chrome.

**The Neutral Disabled Rule.** A disabled primary button is a neutral fill (Ink at 7%) with a Faint Ink label and no shadow, in both themes. It never shows a faded accent.

## Typography

**Display Font:** Atkinson Hyperlegible Next Variable (with ui-sans-serif, system-ui)
**Body Font:** STIX Two Text Variable (with STIX Two Text, Georgia)

**Character:** A hyperlegible clinical sans for every control and label, paired with a journal serif for what the evidence says. The serif carries the answer and the findings quoted on cards; nothing else.

### Hierarchy
- **Display** (600, 2.625rem / 3rem, -0.02em): the home heading "Ask a clinical question" from sm up.
- **Headline** (600, 1.875rem / 2.3rem, -0.015em): the question as page title from sm up; the home heading on phones.
- **Title** (600, 1.3125rem / 1.75rem, -0.01em): the question title on phones; the source title inside the sheet.
- **Body** (STIX 400, 1.09375rem / 1.75rem, lining tabular figures): answer prose, max 37.5rem (about 68ch). Headings inside the answer switch to the sans at 600 and 0.9375rem. Findings on cards use the serif at 0.8125rem / 1.35rem, one clamped line until lit.
- **Body UI** (400, 0.9375rem / 1.4rem): history titles, related questions, menus, alerts, buttons (at 600).
- **Label** (600, 0.8125rem / 1.2rem): meta strip, mode segments, running header, the definition lists on the home aside. Section headings (Evidence, Related questions) are Body UI at 600.
- **Label Small** (600, 0.75rem / 1.1rem): evidence badges, card text actions, hanging keys, the margin's counts (at 400), disclaimers (at 400).

### Named Rules
**The Two Faces Rule.** STIX Two Text is for what a source or the answer says; Atkinson Hyperlegible Next at semibold is for everything the interface says. Never set UI chrome in the serif or answer prose in the sans.

**The One Scale Rule.** Sizes come from the seven-step scale (0.75, 0.8125, 0.9375, 1.09375, 1.3125, 1.875, 2.625rem). Numbers in keys, counts and dates use lining tabular figures.

## Layout

A three-zone reference layout inside an app shell of `100dvh`. The **history rail** (272px, Rail Zinc, right hairline) is docked from lg (1024px) and slides in as a drawer over a scrim below it. The **thread** scrolls inside a centred frame (max 1180px; 16px side padding, 32px from sm, 40px from xl) under a sticky **running header** (36px, date and answer time of the question being read, hairline below).

From xl (1280px) each turn is a two-column grid: the answer column (up to 37.5rem) and the **evidence margin** (min 320px), 48px apart. The margin is sticky under the running header, separated by a left hairline, and scrolls on its own. Below xl the margin's cards stack under the answer at the measure, and a citation opens the **source sheet** instead.

The **composer dock** is pinned at the bottom of the thread, behind a top hairline, and aligns to the answer column. Where the thread and the evidence margin meet it, content fades out over 1.5rem rather than shearing at the line (see The Soft Edge Rule). Turns are spaced 64px apart; the question header carries a hairline under it and 24px before the answer. Cards stack 10px apart and are inset 12px so their hanging keys sit in the gutter. Lists of choices (examples, related questions) are hairline-divided rows, not cards.

### Named Rules
**The Counts Once Rule.** The "n cited · N reviewed" counts appear once per breakpoint: in the evidence margin header from xl up, and below xl in the meta strip as the teal underlined button that opens the source sheet. The date and answer time live only in the running header.

**The One Right Edge Rule.** The question rule, answer, related questions and composer share one right edge, the 37.5rem measure.

**The Soft Edge Rule.** A scroller that ends at a docked band or a sticky edge fades its content out over 1.5rem with a `mask-image` (the `.scroll-edges` class and `useScrollEdges` hook), never a painted gradient overlay, so it fades to whatever lies behind in either theme. The fade appears only while more content lies past that edge, and grows in over 200ms. The thread fades at its bottom, above the composer dock; the evidence margin fades at both ends. The running header keeps its hard hairline: it is a header, not a scroll edge.

## Elevation & Depth

Depth is mostly tonal: Rail Zinc below the canvas, Surface above it in dark, and hairlines between. Shadows are small and functional. Controls you press or type into (buttons, fields, the composer, the selected mode segment, the hanging card key, the sign-in card) carry a soft small shadow; menus and the source sheet are the only things that truly float.

### Shadow Vocabulary
- **Control** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): primary, secondary and dark buttons, fields, the composer, the selected mode segment, the opaque hanging key on a card.
- **Menu** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): row menus in the rail, with an Ink 10% ring.
- **Sheet** (`box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25)`): the bottom source sheet over its scrim.

### Named Rules
**The Flat Card Rule.** Source cards are flat: a hairline border, no shadow, in every state. Lighting a card changes its fill and border to amber; it never lifts. The hanging numbered key is the exception on the card: opaque Surface, a Firm Hairline ring and the control shadow, so it reads over the gutter.

## Shapes

Gently rounded throughout. Controls, fields, cards, menus and alerts use 8px; the composer 12px; the source sheet's top corners and the sign-in card 16px. Badges, menu items, mode segments and keyboard keys use 6px; the publisher mark's letter tile 4px. Citation keys, hanging keys and the sheet grabber are fully round, so a round chip is always a number and a square tile is always a publisher. Borders are 1px hairlines or 1px inset rings; focus is a 2px teal outline offset 2px (inset 0 on mode segments). Fields and the composer share one focus ring, 2px of Field Focus: full accent in light, accent at 50% in dark.

## Components

### Buttons
- **Shape:** gently curved (8px), 36px tall (32px small), semibold, icon and label 6px apart.
- **Primary:** Clinical Teal fill, `accent-fg` label, 14px side padding, control shadow; hover to Deep Teal. One per surface (Ask, Sign in).
- **Disabled primary:** neutral Ink-7% fill, Faint Ink label, no shadow, not-allowed cursor; identical in both themes.
- **Secondary:** Surface fill, Ink label, inset Hairline ring, control shadow; hover to Rail Zinc (New question, Create an account, phone "New").
- **Dark (Stop):** the inverse of the page, Ink fill with canvas label; hover to Soft Ink. Shown in place of Ask while an answer streams.
- **Icon:** 36px or 32px square, Muted Ink, hover Ink-5% fill and Ink; disabled at 50% opacity.
- **Disabled dim:** every disabled control other than the primary button (icon buttons, related-question rows) drops to 50% opacity with a not-allowed cursor, the `dimmed` recipe; text rows stay readable while an answer streams.
- **Text actions:** semibold inline links with a 13px icon; accent (Link Teal, underline on hover) or quiet (Muted Ink to Ink).

### Chips
- **Evidence badge:** 20px tall, 6px radius, 6px side padding, Label Small, 1px inset ring of the level's hue (see Colors). Sits first on every card.
- **Answer-mode segmented control:** Rail Zinc trough with a Hairline inset ring and 2px padding; segments 32px tall, 6px radius, Label. Selected: Surface, Ink, Hairline ring, control shadow, Link Teal icon. Unselected: Muted Ink, hover Ink.

### Cards / Containers
- **Corner Style:** 8px.
- **Background:** Surface with a Hairline border; hover border to Firm Hairline. Lit: Amber Wash fill, Amber Ring border, over 300ms ease-out.
- **Shadow Strategy:** none on the card (The Flat Card Rule).
- **Internal Padding:** 12px by 14px, content inset a further 10px from the hanging key.
- **Contents:** a top row with the badge on the left and the publisher mark on the right; semibold title (Body UI, underline on hover); Muted Ink byline with the Canada mark first when Canadian, then authors, journal and year, never the publisher the mark already names; a serif finding above a hairline; text actions.

### Inputs / Fields
- **Style:** Surface, no border, 1px inset Hairline ring, 8px radius, control shadow, Muted Ink placeholder.
- **Focus:** ring thickens to 2px Field Focus (`accent-focus`, half strength in dark), the same ring as the composer's.
- **Composer:** 12px radius, Surface, Hairline ring and control shadow; textarea auto-grows to 220px; footer row holds the mode control, attach icon and Ask/Stop. Focus-within: the field's 2px Field Focus ring.
- **Errors:** the alert recipe (red wash, ring, 8px) with a 17px alert icon; inline image errors as red-700 / red-400 text.

### Navigation
- **History rail:** 56px header with AppMark and semibold name; full-width secondary New question with a ⌘K hint; search field with a leading icon; "Recent" in Label Small Muted Ink; rows are 8px-radius, two-line clamped Body UI in Soft Ink, hover Ink-4% fill, active Ink-7% fill with semibold Ink. Row menus use the Menu shadow.
- **Phone top bar:** 48px, hairline below, menu icon, AppMark and name, small secondary New.
- **Running header:** sticky 36px strip in Label Muted Ink, the date in semibold Soft Ink, "Question n of N" on the right.

### Citation Key (signature)
An inline numbered chip in the answer: fully round, sans semibold numerals at 0.68em (0.74em and a 28px hit area below xl), Ink-6% fill with an Ink-10% inset ring and Soft Ink numerals. Hover is Teal Wash with Link Teal. When lit it takes the `litKey` recipe (Reading Amber fill, `hl-key-fg` numerals, `hl-key-ring` at 50%), and its claim takes the sweep.

### Highlighter Sweep (signature)
A 176-degree amber stroke grows across the claim's line fragments over 460ms (`cubic-bezier(0.16, 1, 0.3, 1)`), so it travels through the sentence line by line. As a live answer completes, one slower 2600ms stroke crosses the last claim, holds, then fades out so amber is free again; never on saved threads or under reduced motion.

### Canada Mark
Inside the byline, never a second chip: an 11px maple leaf in Maple Red followed by the word "Canada" in semibold Soft Ink. Health Canada records omit it.

### Publisher Mark
Who says this, at the right end of a card's badge row, so the margin scans as a column of sites the way Perplexity's sources do: a 16px letter tile (4px radius, Ink-6% fill, Ink-10% inset ring, the initial in semibold Soft Ink at 0.625rem) followed by the publisher's short name in Label Small, semibold Muted Ink, truncated when the row is tight. It names the site the card's link opens: PubMed, PMC, Europe PMC, ClinicalTrials.gov, or one of the Canadian guideline sites (Diabetes Canada, CCS, CJC, Hypertension Canada, Task Force, CDA-AMC, PHAC, Choosing Wisely, CMAJ, CFP, Thrombosis Canada, CPS, JOGC, AMMI Canada, BC Guidelines, Government of BC, Ontario Health, Cancer Care Ontario, Alberta Medical Assoc.), with the full name in its tooltip. Unknown hosts fall back to the bare domain under the same neutral tile. The tile is drawn in the page, never fetched as a favicon, so opening a thread tells no third party what the reader is reading. Health Canada records have no mark (their badge already names the agency), and the byline drops whatever the mark says.

### Source Sheet
Below xl a citation opens a bottom sheet: Canvas, 16px top corners, Hairline ring, Sheet shadow, a grabber, a header with the amber position key and "n of N cited", previous/next/close icons, and the card at Title size with the full serif finding. Enters with a 360ms slide up over a fading scrim.

## Do's and Don'ts

### Do:
- **Do** draw every surface, text and line colour from the semantic tokens, so light and dark follow the system without component branches.
- **Do** keep teal for action, links, focus, caret and the selected mode, and keep amber for the source being read.
- **Do** set answer prose and card findings in STIX Two Text at the 37.5rem measure; set all UI in Atkinson Hyperlegible Next, semibold for labels and actions.
- **Do** keep source cards flat with a hairline border, and light them by fill and border only.
- **Do** show the cited and reviewed counts once per breakpoint: margin header from xl, meta-strip button below xl.
- **Do** use hairline-divided rows for lists of choices and the evidence badge palette for evidence levels.
- **Do** end a scroller at a docked band or sticky edge with the mask fade, shown only while there is more to scroll.

### Don't:
- **Don't** use amber for an evidence level, a status or a generic warning; the composer's image-identifier caution is the only amber note.
- **Don't** fade the accent for a disabled primary button; use the neutral Ink-7% fill.
- **Don't** add shadows to source cards, or raise anything above the control shadow except menus and the sheet.
- **Don't** introduce a second accent hue or a coloured app shell.
- **Don't** add a second Canada chip; the mark lives in the byline.
- **Don't** repeat the date, answer time or counts in more than one place at a breakpoint.
- **Don't** load favicons or logos from a third-party service; publisher marks are drawn locally.
- **Don't** give publisher tiles a hue; the categorical hues belong to the evidence badges.
