import { useState } from 'react'
import { Check, Copy, ExternalLink, FileText } from 'lucide-react'
import { referenceHtml, referenceText, writeClipboard } from '../copyAnswer.js'
import { useTurn } from '../turnContext.js'
import EvidenceBadge, { CanadaMark } from './EvidenceBadge.jsx'

const ORIGIN = {
  pubmed: 'PubMed',
  europepmc: 'Europe PMC',
  clinicaltrials: 'ClinicalTrials.gov',
  health_canada: 'Health Canada',
  guideline_web: '',
}

// Title and byline without repeating what the badge already says (nothing labelled twice):
// the Health Canada badge carries the agency, so its records read as the product listing.
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
  return [names, source.journal || ORIGIN[source.origin], source.year].filter(Boolean).join(' · ')
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
      className={`group relative list-none scroll-mt-24 rounded-sheet border bg-paper-white px-3.5 py-3 transition-[background-color,border-color] duration-300 ease-out ${
        lit ? 'border-ink bg-hl-yellow-tint' : 'border-rule hover:border-rule-strong'
      } ${cited ? '' : 'opacity-90'}`}
    >
      <button
        type="button"
        onClick={() => wide && togglePin(source.n)}
        aria-label={`Highlight the claims citing source ${source.n}`}
        tabIndex={wide && !focus ? 0 : -1}
        className={`absolute -left-[13px] top-3 inline-flex h-[26px] w-[26px] items-center justify-center rounded-key border text-2xs font-bold tnum transition-colors ${
          lit ? 'border-ink bg-hl-yellow text-ink' : 'border-pen bg-paper text-pen'
        } ${focus ? 'hidden' : ''}`}
      >
        {source.n}
      </button>
      <div className="pl-2.5">
        <EvidenceBadge level={source.evidence_level} />
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-1.5 block font-bold leading-snug text-ink hover:text-pen hover:underline ${focus ? 'text-lg' : 'text-sm'}`}
        >
          {displayTitle(source)}
        </a>
        <p className="mt-0.5 text-xs text-ink-muted tnum">
          {source.canadian && source.evidence_level !== 'Health Canada' && (
            <>
              <CanadaMark />
              <span aria-hidden="true"> · </span>
            </>
          )}
          {byline(source)}
        </p>
        {line && (
          <p
            title={lit || focus ? undefined : line}
            className={`mt-2 border-t border-dashed border-rule pt-2 font-serif text-ink-soft ${
              focus ? 'text-read' : lit ? 'text-xs leading-[1.35rem]' : 'text-xs leading-[1.35rem] line-clamp-1'
            }`}
          >
            {line}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-2xs font-bold text-pen hover:underline"
          >
            {isMonograph ? <FileText size={13} /> : <ExternalLink size={13} />}
            {isMonograph ? 'Product monograph' : 'Open source'}
          </a>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 text-2xs font-bold text-ink-muted hover:text-ink"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy reference'}
          </button>
          {source.full_text === false && source.origin !== 'health_canada' && (
            <span className="text-2xs text-ink-muted">Abstract only</span>
          )}
        </div>
      </div>
    </li>
  )
}
