import { useState } from 'react'
import { Check, Copy, ExternalLink, FileText } from 'lucide-react'
import { referenceHtml, referenceText, writeClipboard } from '../copyAnswer.js'
import { useTurn } from '../turnContext.js'
import { litKey, textAction } from '../ui.js'
import EvidenceBadge, { CanadaMark } from './EvidenceBadge.jsx'
import PublisherMark from './PublisherMark.jsx'

// Title and byline without repeating what the badge or publisher mark already says
// (nothing labelled twice): the Health Canada badge carries the agency, so its records read
// as the product listing; the mark names a guideline site or the trial registry.
const DPD_PREFIX = /^Health Canada Drug Product Database:\s*/i

export function displayTitle(source) {
  if (source.origin !== 'health_canada') return source.title
  const t = source.title.replace(DPD_PREFIX, '')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function byline(source) {
  if (source.origin === 'health_canada') {
    return /pdf\.hres\.ca/.test(source.url) ? 'Drug Product Database · product monograph' : 'Drug Product Database'
  }
  const authors = source.authors || []
  const names = authors.length ? authors.slice(0, 2).join(', ') + (authors.length > 2 ? ' et al.' : '') : ''
  const journal = source.origin === 'guideline_web' || source.origin === 'clinicaltrials' ? '' : source.journal
  return [names, journal, source.year].filter(Boolean).join(' · ')
}

const LABEL = /^\s*(BACKGROUND|INTRODUCTION|OBJECTIVES?|PURPOSE|AIMS?|CONTEXT|IMPORTANCE)(\s*:\s*|\s+(?=[A-Z]))/i

// A finding is shown only when it reads as a sentence: never form fields or page chrome
// presented as what the source says.
function readable(s) {
  const letters = s.replace(/[^A-Za-z]/g, '')
  if (s.length < 30 || s.split(/\s+/).length < 5 || !letters) return false
  if (/\?\s*$/.test(s) || /\bY\s*\/?\s*N\b|\(if yes/i.test(s)) return false
  return letters.replace(/[^A-Z]/g, '').length / letters.length < 0.35
}

// The stored finding (backend citations.finding_line); for saved threads from before it
// existed, the first sentence of an article's snippet.
function finding(source) {
  let s = source.finding
  if (s === undefined) {
    if (source.kind !== 'article') return ''
    s = (source.snippet || '').split(/(?<=[.!?])\s+(?=[A-Z(])/)[0] || ''
  }
  s = s.replace(LABEL, '').trim()
  if (source.kind === 'drug') return s
  return readable(s) ? s : ''
}

export default function SourceCard({ source, cited = true, focus = false }) {
  const { turnId, active, setHover, togglePin, wide } = useTurn()
  const [copied, setCopied] = useState(false)
  const lit = active === source.n
  const line = finding(source)
  const isMonograph = /pdf\.hres\.ca/.test(source.url)
  const canada = source.canadian && source.evidence_level !== 'Health Canada'
  const by = byline(source)

  const copy = async () => {
    try {
      await writeClipboard({ html: referenceHtml(source), text: referenceText(source) })
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <li
      id={focus ? undefined : `source-${turnId}-${source.n}`}
      onMouseEnter={wide && !focus ? () => setHover(source.n) : undefined}
      onMouseLeave={wide && !focus ? () => setHover(null) : undefined}
      className={`group relative list-none scroll-mt-24 rounded-lg border px-3.5 py-3 transition-[background-color,border-color] duration-300 ease-out ${
        lit ? 'border-hl-ring bg-hl-soft' : 'border-line bg-surface hover:border-line-strong'
      } ${cited ? '' : 'opacity-90'}`}
    >
      <button
        type="button"
        onClick={() => wide && togglePin(source.n)}
        aria-label={`Highlight the claims citing source ${source.n}`}
        tabIndex={wide && !focus ? 0 : -1}
        className={`absolute -left-[13px] top-3 h-[26px] w-[26px] items-center justify-center rounded-full text-2xs font-semibold shadow-sm ring-1 ring-inset tnum transition-colors ${
          lit ? litKey : 'bg-surface text-fg-soft ring-line-strong hover:text-accent-text hover:ring-accent/40'
        } ${focus ? 'hidden' : 'inline-flex'}`}
      >
        {source.n}
      </button>
      <div className="pl-2.5">
        <div className="flex items-center gap-3">
          <EvidenceBadge level={source.evidence_level} />
          <PublisherMark source={source} className="ml-auto" />
        </div>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-2 block rounded font-semibold leading-snug text-fg decoration-fg/30 underline-offset-2 hover:underline ${focus ? 'text-lg' : 'text-sm'}`}
        >
          {displayTitle(source)}
        </a>
        {(canada || by) && (
          <p className="mt-0.5 text-xs text-fg-muted tnum">
            {canada && <CanadaMark />}
            {canada && by && <span aria-hidden="true"> · </span>}
            {by}
          </p>
        )}
        {line && (
          <p
            title={lit || focus ? undefined : line}
            className={`mt-2.5 border-t border-line pt-2.5 font-serif text-fg-soft ${
              focus ? 'text-read' : lit ? 'text-xs leading-[1.35rem]' : 'text-xs leading-[1.35rem] line-clamp-1'
            }`}
          >
            {line}
          </p>
        )}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-2xs">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className={textAction.accent}
          >
            {isMonograph ? <FileText size={13} /> : <ExternalLink size={13} />}
            {isMonograph ? 'Product monograph' : 'Open source'}
          </a>
          <button
            type="button"
            onClick={copy}
            className={textAction.quiet}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy reference'}
          </button>
          {source.full_text === false && source.origin !== 'health_canada' && (
            <span className="text-fg-muted">Abstract only</span>
          )}
        </div>
      </div>
    </li>
  )
}
