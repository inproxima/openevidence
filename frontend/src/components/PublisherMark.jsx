// Who says this: the site a card's link opens, as a letter tile and a short name, so the
// margin scans like a list of sites. The tile is drawn here, never fetched as a favicon,
// so opening a thread tells no third party what the reader is reading.
// Entries match a host (or a host and path prefix); the guideline sites mirror
// backend/app/search/guidelines.py CANADIAN_DOMAINS.
const PUBLISHERS = [
  ['pubmed.ncbi.nlm.nih.gov', 'PubMed', 'PubMed, US National Library of Medicine'],
  ['pmc.ncbi.nlm.nih.gov', 'PMC', 'PubMed Central'],
  ['ncbi.nlm.nih.gov/pmc', 'PMC', 'PubMed Central'],
  ['europepmc.org', 'Europe PMC'],
  ['clinicaltrials.gov', 'ClinicalTrials.gov', 'ClinicalTrials.gov trial registry'],
  ['diabetes.ca', 'Diabetes Canada'],
  ['ccs.ca', 'CCS', 'Canadian Cardiovascular Society'],
  ['onlinecjc.ca', 'CJC', 'Canadian Journal of Cardiology'],
  ['hypertension.ca', 'Hypertension Canada'],
  ['canadiantaskforce.ca', 'Task Force', 'Canadian Task Force on Preventive Health Care'],
  ['cda-amc.ca', 'CDA-AMC', "Canada's Drug Agency"],
  ['canada.ca/en/public-health', 'PHAC', 'Public Health Agency of Canada'],
  ['choosingwiselycanada.org', 'Choosing Wisely', 'Choosing Wisely Canada'],
  ['cmaj.ca', 'CMAJ', 'Canadian Medical Association Journal'],
  ['cfp.ca', 'CFP', 'Canadian Family Physician'],
  ['thrombosiscanada.ca', 'Thrombosis Canada'],
  ['cps.ca', 'CPS', 'Canadian Paediatric Society'],
  ['jogc.com', 'JOGC', 'Journal of Obstetrics and Gynaecology Canada'],
  ['ammi.ca', 'AMMI Canada', 'Association of Medical Microbiology and Infectious Disease Canada'],
  ['gov.bc.ca', 'Government of BC', 'Government of British Columbia'],
  ['hqontario.ca', 'Ontario Health'],
  ['cancercareontario.ca', 'Cancer Care Ontario', 'Ontario Health (Cancer Care Ontario)'],
  ['actt.albertadoctors.org', 'Alberta Medical Assoc.', 'Alberta Medical Association'],
]

function matches(host, path, entry) {
  const [domain, prefix = ''] = entry.split(/\/(.*)/s)
  const onHost = host === domain || host.endsWith(`.${domain}`)
  return onHost && (!prefix || path.startsWith(`/${prefix}`))
}

// The publisher of a source's link, or null for Health Canada records, whose evidence
// badge already names the agency (nothing labelled twice).
export function publisher(source) {
  if (source.origin === 'health_canada') return null
  let url
  try {
    url = new URL(source.url)
  } catch {
    return null
  }
  const host = url.hostname.toLowerCase().replace(/^www\d*\./, '')
  const path = url.pathname.toLowerCase()
  if (host === 'gov.bc.ca' || host.endsWith('.gov.bc.ca')) {
    if (path.includes('bc-guidelines')) return { name: 'BC Guidelines', full: 'BC Guidelines, Government of British Columbia' }
  }
  const known = PUBLISHERS.find(([entry]) => matches(host, path, entry))
  if (known) return { name: known[1], full: known[2] || known[1] }
  return { name: host, full: host }
}

// A letter tile the shape of a favicon: square, so it never reads as a round citation key.
export default function PublisherMark({ source, className = '' }) {
  const p = publisher(source)
  if (!p) return null
  return (
    <span title={p.full} className={`inline-flex min-w-0 items-center gap-1.5 text-2xs font-semibold text-fg-muted ${className}`}>
      <span
        aria-hidden="true"
        className="inline-flex h-4 w-4 shrink-0 select-none items-center justify-center rounded bg-fg/[0.06] text-[0.625rem] leading-none text-fg-soft ring-1 ring-inset ring-fg/10"
      >
        {p.name.charAt(0).toUpperCase()}
      </span>
      <span className="truncate">{p.name}</span>
    </span>
  )
}
