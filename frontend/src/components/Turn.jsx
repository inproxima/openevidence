import { useCallback, useMemo, useState } from 'react'
import { AlertTriangle, Check, Copy, CornerDownRight, ImageIcon, Loader2, Telescope, Zap } from 'lucide-react'
import { TurnContext, WIDE_QUERY, citationOrder, useMedia } from '../turnContext.js'
import AnswerBody from './AnswerBody.jsx'
import EvidenceMargin from './EvidenceMargin.jsx'
import SourceSheet from './SourceSheet.jsx'

const STAGES = [
  ['plan', 'Plan'],
  ['search', 'Search'],
  ['rank', 'Rank'],
  ['read', 'Read'],
  ['answer', 'Write'],
]
// Answer column on the shared 600px edge; the margin takes the slack (shared with App's composer row).
export const TURN_COLUMNS = 'xl:grid xl:grid-cols-[minmax(0,37.5rem)_minmax(320px,1fr)] xl:gap-x-12'

const STAMP = new Intl.DateTimeFormat('en-CA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
const stamp = (d) => STAMP.format(d)

const COUNT_LABELS = {
  pubmed: 'PubMed',
  pubmed_canada: 'Canadian journal guidelines',
  europepmc: 'Europe PMC',
  trials: 'trials',
  health_canada: 'Health Canada',
  guidelines: 'guideline pages',
  guidelines_planned: 'guideline pages',
}

function Progress({ status, mode }) {
  if (!status) return null
  const current = status.stage === 'image' ? -1 : STAGES.findIndex(([s]) => s === status.stage)
  const counts = {}
  for (const [k, v] of Object.entries(status.counts || {})) {
    if (typeof v === 'number' && v > 0) counts[COUNT_LABELS[k] || k] = (counts[COUNT_LABELS[k] || k] || 0) + v
  }
  return (
    <div className="animate-fade-in" aria-live="polite">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-xs">
        {STAGES.map(([id, label], i) => {
          const done = i < current
          const now = i === current
          return (
            <li key={id} className="flex items-center gap-1">
              <span
                className={`inline-flex h-7 items-center gap-1.5 rounded-sheet px-2 ${
                  now ? 'bg-ink font-bold text-paper' : done ? 'font-bold text-pen' : 'text-ink-muted'
                }`}
              >
                {done ? <Check size={14} /> : now ? <Loader2 size={14} className="animate-spin" /> : null}
                {label}
              </span>
              {i < STAGES.length - 1 && <span className="h-px w-3 bg-rule-strong" aria-hidden="true" />}
            </li>
          )
        })}
      </ol>
      <p className="mt-3 text-sm text-ink-soft">{status.message}</p>
      {Object.keys(counts).length > 0 && (
        <p className="mt-1 text-xs text-ink-muted tnum">
          Found {Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(' · ')}
        </p>
      )}
      {mode === 'deep' && <p className="mt-1 text-xs text-ink-muted">Deep answers take about two minutes.</p>}
    </div>
  )
}

export default function Turn({ turn, onFollowUp, busy }) {
  const wide = useMedia(WIDE_QUERY)
  const [hover, setHover] = useState(null)
  const [pinned, setPinned] = useState(null)
  const [sheet, setSheet] = useState(null) // { n, returnTo }
  const [copied, setCopied] = useState(false)

  const byNumber = useMemo(() => new Map(turn.sources.map((s) => [s.n, s])), [turn.sources])
  const order = useMemo(() => citationOrder(turn.text).filter((n) => byNumber.has(n)), [turn.text, byNumber])
  const streaming = !turn.done && !turn.error && turn.text.length > 0
  const waiting = !turn.done && !turn.error && turn.text.length === 0

  const togglePin = useCallback((n) => setPinned((p) => (p === n ? null : n)), [])
  const openSheet = useCallback((n, returnTo) => setSheet({ n, returnTo }), [])
  const closeSheet = useCallback(() => {
    setSheet((s) => {
      s?.returnTo?.focus?.()
      return null
    })
  }, [])

  const active = sheet?.n ?? hover ?? pinned
  const ctx = useMemo(
    () => ({ turnId: turn.id, byNumber, active, setHover, togglePin, openSheet, wide }),
    [turn.id, byNumber, active, togglePin, openSheet, wide],
  )

  const copy = async () => {
    const refs = order.map((n) => `[${n}] ${byNumber.get(n).reference}`).join('\n')
    try {
      await navigator.clipboard.writeText(`${turn.question}\n\n${turn.text}\n\nReferences\n${refs}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked */
    }
  }

  const sheetIndex = sheet ? order.indexOf(sheet.n) : -1
  const sheetSource = sheet ? byNumber.get(sheet.n) : null
  const counts = `${order.length} cited · ${turn.sources.length} reviewed`

  return (
    <TurnContext.Provider value={ctx}>
      <article className={`animate-rise ${TURN_COLUMNS}`}>
        <div className="min-w-0">
          <header className="mb-6 max-w-measure border-b border-ink pb-4">
            <h2 className="text-lg font-bold leading-snug sm:text-title">{turn.question}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted tnum">
              <span className="inline-flex items-center gap-1 font-bold text-ink-soft">
                {turn.mode === 'deep' ? <Telescope size={13} /> : <Zap size={13} />}
                {turn.mode === 'deep' ? 'Deep' : 'Quick'}
              </span>
              {turn.answeredAt && (
                <time dateTime={turn.answeredAt.toISOString()}>
                  {stamp(turn.answeredAt)}
                  {turn.seconds ? ` · ${turn.seconds} s` : ''}
                </time>
              )}
              {/* The counts live in the margin header on wide screens; here, below it, they open the sources. */}
              {!wide && order.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => openSheet(order[0], e.currentTarget)}
                  className="inline-flex min-h-[28px] items-center font-bold text-pen underline decoration-pen-mist underline-offset-4 hover:decoration-pen"
                >
                  {counts}
                </button>
              )}
              {!wide && order.length === 0 && turn.sources.length > 0 && <span>{counts}</span>}
              {turn.hadImage && (
                <span className="inline-flex items-center gap-1">
                  <ImageIcon size={13} /> Image attached
                </span>
              )}
              {turn.done && turn.text && (
                <button
                  type="button"
                  onClick={copy}
                  className="ml-auto inline-flex min-h-[28px] items-center gap-1 font-bold text-pen hover:underline"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied' : 'Copy with references'}
                </button>
              )}
            </div>
          </header>

          {waiting && <Progress status={turn.status} mode={turn.mode} />}

          {turn.text && <AnswerBody text={turn.text} streaming={streaming} />}

          {turn.error && (
            <div role="alert" className="mt-2 flex max-w-measure items-start gap-2.5 rounded-sheet bg-alert-tint px-3.5 py-3 text-sm text-alert">
              <AlertTriangle size={17} className="mt-0.5 shrink-0" />
              <p>{turn.error}</p>
            </div>
          )}

          {!wide && (
            <div className="max-w-measure">
              <EvidenceMargin sources={turn.sources} order={order} done={turn.done} wide={false} />
            </div>
          )}

          {turn.followups?.length > 0 && (
            <section className="mt-8 max-w-measure">
              <h3 className="mb-1 text-sm font-bold">Related questions</h3>
              <ul className="border-t border-ink">
                {turn.followups.map((q) => (
                  <li key={q} className="border-b border-rule">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onFollowUp(q)}
                      className="flex w-full items-center gap-2.5 py-3 text-left text-sm text-ink hover:text-pen disabled:opacity-50"
                    >
                      <CornerDownRight size={15} className="shrink-0 text-pen" />
                      {q}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {wide && (
          <aside className="min-w-0">
            <EvidenceMargin sources={turn.sources} order={order} done={turn.done} wide />
          </aside>
        )}
      </article>

      {sheetSource && (
        <SourceSheet
          source={sheetSource}
          position={sheetIndex + 1 || 1}
          total={order.length || turn.sources.length}
          onPrev={sheetIndex > 0 ? () => setSheet((s) => ({ ...s, n: order[sheetIndex - 1] })) : null}
          onNext={sheetIndex >= 0 && sheetIndex < order.length - 1 ? () => setSheet((s) => ({ ...s, n: order[sheetIndex + 1] })) : null}
          onClose={closeSheet}
        />
      )}
    </TurnContext.Provider>
  )
}
