// Shared class recipes, so every button, menu and field is drawn the same way.
// Sizes are separate variants rather than overrides: two conflicting utilities on one
// element resolve by stylesheet order, not by the order they are written in.
const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
const base = `inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed ${focus}`
const secondaryTone = 'bg-surface text-fg shadow-sm ring-1 ring-inset ring-line hover:bg-subtle'
// One disabled dim for every control that is not a primary button (icons, list rows).
export const dimmed = 'disabled:cursor-not-allowed disabled:opacity-50'
const iconTone = 'text-fg-muted hover:bg-fg/5 hover:text-fg disabled:opacity-50 disabled:hover:bg-transparent'

export const btn = {
  // The one primary action on a surface. Disabled is a neutral fill, the same in both themes.
  primary: `${base} h-9 px-3.5 text-sm bg-accent text-accent-fg shadow-sm hover:bg-accent-hover disabled:bg-fg/[0.07] disabled:text-fg-faint disabled:shadow-none disabled:hover:bg-fg/[0.07]`,
  secondary: `${base} h-9 text-sm ${secondaryTone}`,
  secondarySm: `${base} h-8 px-2.5 text-xs ${secondaryTone}`,
  // Stop while an answer streams: the inverse of the page.
  dark: `${base} h-9 px-3.5 text-sm bg-fg text-canvas shadow-sm hover:bg-fg-soft`,
  icon: `${base} h-9 w-9 shrink-0 ${iconTone}`,
  iconSm: `${base} h-8 w-8 shrink-0 ${iconTone}`,
}

// Inline text actions (Open source, Copy reference, Copy with references).
export const textAction = {
  accent: `inline-flex items-center gap-1 rounded font-semibold text-accent-text hover:underline ${focus}`,
  quiet: `inline-flex items-center gap-1 rounded font-semibold text-fg-muted hover:text-fg ${focus}`,
}

export const menu = 'rounded-lg bg-surface p-1 text-fg shadow-lg ring-1 ring-fg/10'
const item = 'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm'
export const menuItem = `${item} text-fg-soft hover:bg-fg/5 hover:text-fg`
export const menuItemDanger = `${item} text-red-700 hover:bg-red-50 hover:text-red-800 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300`

// Text fields: the forms plugin's reset, drawn with a ring that turns teal on focus (at
// half strength in dark, the same as the composer's focus-within ring).
export const field =
  'block w-full rounded-lg border-0 bg-surface text-fg shadow-sm ring-1 ring-inset ring-line placeholder:text-fg-muted focus:ring-2 focus:ring-inset focus:ring-accent-focus'

// The lit numbered key (citation key, card key, sheet position key); pair with ring-1 ring-inset.
export const litKey = 'bg-hl-key text-hl-key-fg ring-hl-key-ring/50'

// Tailwind UI alert, for errors.
export const alert =
  'rounded-lg bg-red-50 text-red-800 ring-1 ring-inset ring-red-600/10 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20'

// Scrim behind the phone drawer and the source sheet.
export const scrim = 'bg-zinc-950/40 dark:bg-black/60'
