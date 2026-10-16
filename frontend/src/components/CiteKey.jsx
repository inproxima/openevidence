import { useTurn } from '../turnContext.js'
import { litKey } from '../ui.js'

// The idle face of a numbered key: a quiet filled chip, so a run of citations does not
// shout over the prose. Shared with the specimen in the home page's key to sources.
export const KEY_FACE =
  'inline-flex items-center justify-center rounded-full bg-fg/[0.06] font-sans font-semibold leading-none text-fg-soft ring-1 ring-inset ring-fg/10 tnum'

// A numbered citation key in the answer. Hover or focus lights its claim and source;
// click pins it (wide screens, where the evidence margin is visible) or opens the
// source sheet (narrower screens, where it is not).
export default function CiteKey({ n }) {
  const { turnId, byNumber, active, setHover, togglePin, openSheet, wide } = useTurn()
  const source = byNumber.get(n)
  if (!source) return null // a number outside the source list (removed when the answer completes)
  const lit = active === n

  const onClick = (e) => {
    e.preventDefault()
    if (wide) {
      togglePin(n)
      document.getElementById(`source-${turnId}-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    } else {
      openSheet(n, e.currentTarget)
    }
  }

  return (
    <a
      href={`#source-${turnId}-${n}`}
      onClick={onClick}
      onMouseEnter={() => setHover(n)}
      onMouseLeave={() => setHover(null)}
      onFocus={() => setHover(n)}
      onBlur={() => setHover(null)}
      aria-label={`Source ${n}: ${source.title}`}
      aria-describedby={wide ? `source-${turnId}-${n}` : undefined}
      // Below xl the key is the only way into the source sheet, so it gets a bigger face,
      // ~6px between neighbours and an invisible hit area of at least 28px.
      className={`cite-key relative -top-[0.12em] mx-[1px] inline-flex h-[1.3em] min-w-[1.3em] items-center justify-center rounded-full px-[0.35em] align-middle font-sans text-[0.68em] font-semibold leading-none no-underline ring-1 ring-inset tnum transition-colors duration-150 max-xl:mx-[3px] max-xl:h-[1.6em] max-xl:min-w-[1.6em] max-xl:text-[0.74em] max-xl:after:absolute max-xl:after:-inset-[4px] max-xl:after:content-[''] ${
        lit
          ? litKey
          : 'bg-fg/[0.06] text-fg-soft ring-fg/10 hover:bg-accent-soft hover:text-accent-text hover:ring-accent/30'
      }`}
    >
      {n}
    </a>
  )
}
