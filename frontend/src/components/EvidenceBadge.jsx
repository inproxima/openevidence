import MapleLeaf from './MapleLeaf.jsx'

// Evidence level as a highlighter tint (set by backend/app/evidence.py). Yellow is reserved
// for the citation currently linked, so no level uses it. Text on every tint is dark ink,
// so each pair clears WCAG AA with room to spare.
const NEUTRAL_RING = 'bg-paper-shade text-ink-soft ring-1 ring-inset ring-rule-strong'
export const LEVELS = {
  Guideline: { cls: 'bg-hl-green-tint text-[#0F4A22]', note: 'Clinical practice guideline or position statement' },
  'Systematic review': { cls: 'bg-hl-violet-tint text-[#40237E]', note: 'Systematic review or meta-analysis' },
  RCT: { cls: 'bg-hl-blue-tint text-[#0A3767]', note: 'Randomised controlled trial' },
  'Clinical trial': { cls: 'bg-hl-blue-tint text-[#0A3767]', note: 'Non-randomised clinical trial' },
  'Health Canada': { cls: 'bg-hl-pink-tint text-[#7A0F3A]', note: 'Health Canada product record or monograph' },
  Observational: { cls: 'bg-hl-orange-tint text-[#6B3300]', note: 'Cohort, case-control or registry study' },
  'Case report': { cls: NEUTRAL_RING, note: 'Case report' },
  'Registered trial': { cls: NEUTRAL_RING, note: 'Trial registration; results may not exist yet' },
  Review: { cls: 'bg-paper-shade text-ink-soft', note: 'Narrative review' },
  Preprint: { cls: NEUTRAL_RING, note: 'Not peer reviewed' },
  Other: { cls: 'bg-paper-shade text-ink-soft', note: 'Other article type' },
}

export default function EvidenceBadge({ level }) {
  if (!level) return null
  const style = LEVELS[level] || LEVELS.Other
  return (
    <span title={style.note} className={`inline-flex items-center h-5 px-1.5 rounded-[3px] text-2xs font-bold ${style.cls}`}>
      {level}
    </span>
  )
}

// Canadian origin, carried in the byline (not as a second chip). Health Canada records
// don't get it: the level already says so.
export function CanadaMark({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 font-bold text-maple ${className}`}>
      <MapleLeaf size={11} />
      Canada
    </span>
  )
}
