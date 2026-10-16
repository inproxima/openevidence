import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import SourceCard from './SourceCard.jsx'

// The evidence margin: cited sources in the order the answer first cites them, then the
// rest of what was reviewed. Sticky beside the answer on wide screens; below it otherwise.
export default function EvidenceMargin({ sources, order, done, wide }) {
  const [showRest, setShowRest] = useState(false)
  if (!sources?.length) return null
  const byNumber = new Map(sources.map((s) => [s.n, s]))
  const cited = order.map((n) => byNumber.get(n)).filter(Boolean)
  const rest = sources.filter((s) => !order.includes(s.n))
  const restOpen = showRest || (!done && cited.length === 0)

  return (
    <section
      aria-label="Evidence"
      className={wide ? 'sticky top-6 max-h-[calc(100dvh-13rem)] overflow-y-auto overscroll-contain border-l border-rule pb-6 pl-5 pr-1' : 'mt-8'}
    >
      <header className="mb-3 flex items-baseline justify-between gap-3 border-b border-ink pb-2">
        <h3 className="text-sm font-bold">Evidence</h3>
        {/* Counts appear once: here on wide screens, in the answer's meta strip below xl. */}
        {wide && (
          <p className="text-2xs text-ink-muted tnum">
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
              className="inline-flex items-center gap-1 text-xs font-bold text-ink-muted hover:text-ink"
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
