import { useEffect, useState } from 'react'

const DAY = new Intl.DateTimeFormat('en-CA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const CLOCK = new Intl.DateTimeFormat('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false })

// "Thu 15 Oct 2026": day before month, as on a printed record.
export function printDate(d) {
  const p = Object.fromEntries(DAY.formatToParts(d).map(({ type, value }) => [type, value]))
  return `${p.weekday} ${p.day} ${p.month} ${p.year}`
}

// The printout's running header: the date and answer time of the question being read,
// held at the top of the thread while it scrolls. The meta strip under each question
// leaves them out, so nothing is stated twice.
export default function RunningHead({ turns, scroller, frame }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    let raf = 0
    const measure = () => {
      raf = 0
      const articles = [...el.querySelectorAll('article[data-turn]')]
      // The page being read is the last question whose title has passed under the header;
      // at the end of the thread it is the last question.
      const line = el.getBoundingClientRect().top + 96
      let i = 0
      articles.forEach((a, k) => {
        if (a.getBoundingClientRect().top <= line) i = k
      })
      const atEnd = el.scrollTop > 0 && el.scrollTop + el.clientHeight >= el.scrollHeight - 4
      setIndex(atEnd ? articles.length - 1 : i)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    measure()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [scroller, turns.length, turns[0]?.id])

  const at = Math.min(index, turns.length - 1)
  const turn = turns[at]
  if (!turn) return null
  const when = turn.answeredAt || turn.askedAt

  return (
    <div className="sticky top-0 z-20 bg-paper">
      <div className={frame}>
        <div className="flex h-9 items-center justify-between gap-4 border-b border-rule text-xs text-ink-muted tnum">
          <p className="min-w-0 truncate">
            {when && (
              <time dateTime={when.toISOString()}>
                <span className="font-bold text-ink-soft">{printDate(when)}</span>
                {turn.answeredAt && ` · ${CLOCK.format(turn.answeredAt)}`}
              </time>
            )}
            {turn.seconds ? ` · ${turn.seconds} s` : ''}
          </p>
          {turns.length > 1 && (
            <p className="shrink-0">
              Question {at + 1} of {turns.length}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
