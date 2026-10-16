import MapleLeaf from './MapleLeaf.jsx'

// Evidence level (set by backend/app/evidence.py) as a ring-inset badge: a pale wash with
// dark text of the same hue in light, a translucent wash with light text in dark. Amber is
// kept for the citation being read, so no level uses it. Case reports, registrations and
// preprints share a plain badge with a firmer outline, the ones to read with care.
const PLAIN = 'bg-zinc-50 text-zinc-600 ring-zinc-500/15 dark:bg-zinc-400/10 dark:text-zinc-300 dark:ring-zinc-400/20'
const CAUTION = 'bg-transparent text-zinc-700 ring-zinc-400/70 dark:text-zinc-300 dark:ring-zinc-500'
const BLUE = 'bg-blue-50 text-blue-700 ring-blue-700/10 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/30'

export const LEVELS = {
  Guideline: {
    cls: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-300 dark:ring-green-500/20',
    note: 'Clinical practice guideline or position statement',
  },
  'Systematic review': {
    cls: 'bg-violet-50 text-violet-700 ring-violet-700/10 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/30',
    note: 'Systematic review or meta-analysis',
  },
  RCT: { cls: BLUE, note: 'Randomised controlled trial' },
  'Clinical trial': { cls: BLUE, note: 'Non-randomised clinical trial' },
  'Health Canada': {
    cls: 'bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/25',
    note: 'Health Canada product record or monograph',
  },
  Observational: {
    cls: 'bg-orange-50 text-orange-800 ring-orange-600/20 dark:bg-orange-400/10 dark:text-orange-300 dark:ring-orange-400/25',
    note: 'Cohort, case-control or registry study',
  },
  'Case report': { cls: CAUTION, note: 'Case report' },
  'Registered trial': { cls: CAUTION, note: 'Trial registration; results may not exist yet' },
  Review: { cls: PLAIN, note: 'Narrative review' },
  Preprint: { cls: CAUTION, note: 'Not peer reviewed' },
  Other: { cls: PLAIN, note: 'Other article type' },
}

export default function EvidenceBadge({ level }) {
  if (!level) return null
  const style = LEVELS[level] || LEVELS.Other
  return (
    <span title={style.note} className={`inline-flex h-5 items-center rounded-md px-1.5 text-2xs font-semibold ring-1 ring-inset ${style.cls}`}>
      {level}
    </span>
  )
}

// Canadian origin, carried in the byline (not as a second chip). Health Canada records
// don't get it: the level already says so.
export function CanadaMark({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 font-semibold text-fg-soft ${className}`}>
      <MapleLeaf size={11} className="text-maple" />
      Canada
    </span>
  )
}
