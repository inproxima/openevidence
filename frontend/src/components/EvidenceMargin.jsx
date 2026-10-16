import { useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useScrollEdges } from '../scrollEdges.js'
import SourceCard from './SourceCard.jsx'

// The evidence margin: cited sources in the order the answer first cites them, then the
// rest of what was reviewed. Sticky beside the answer on wide screens; below it otherwise.
export default function EvidenceMargin({ sources, order, done, wide }) {
  const [showRest, setShowRest] = useState(false)
  const ref = useRef(null)
  // Sticky and scrolling on its own on wide screens: both of its edges fade.
  useScrollEdges(ref, { top: true, enabled: wide && sources?.length > 0 })
  if (!sources?.length) return null
  const byNumber = new Map(sources.map((s) => [s.n, s]))
  const cited = order.map((n) => byNumber.get(n)).filter(Boolean)
  const rest = sources.filter((s) => !order.includes(s.n))
  const restOpen = showRest || (!done && cited.length === 0)

  return (
    <section
      ref={ref}
      aria-label="Evidence"
      className={wide ? 'scroll-edges sticky top-[3.75rem] max-h-[calc(100dvh-15.25rem)] overflow-y-auto overscroll-contain border-l border-line pb-6 pl-5 pr-1' : 'mt-10'}
    >
      <header className="mb-3 flex items-baseline justify-between gap-3 pb-1">
        <h3 className="text-sm font-semibold">Evidence</h3>
        {/* Counts appear once: here on wide screens, in the answer's meta strip below xl. */}
        {wide && (
          <p className="text-2xs text-fg-muted tnum">
            {cited.length} cited · {sources.length} reviewed
          </p>
        )}
      </header>
      {cited.length > 0 && (
        <ul className="grid gap-2.5 pl-3">
          {cited.map((s) => (
            <SourceCard key={s.n} source={s} />
          ))}
        </ul>
      )}
      {rest.length > 0 && (
        <div className={cited.length ? 'mt-4' : ''}>
          {(done || cited.length > 0) && (
            <button
              type="button"
              onClick={() => setShowRest((v) => !v)}
              aria-expanded={restOpen}
              className="inline-flex items-center gap-1 rounded text-xs font-semibold text-fg-muted hover:text-fg"
            >
              <ChevronDown size={15} className={`transition-transform ${restOpen ? 'rotate-180' : ''}`} />
              {rest.length} reviewed, not cited
            </button>
          )}
          {restOpen && (
            <ul className="mt-2.5 grid gap-2.5 pl-3">
              {rest.map((s) => (
                <SourceCard key={s.n} source={s} cited={false} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
