// Rehype plugin: wrap the claim each citation supports in <span class="claim" data-cites="…">,
// so the highlighter sweep can mark exactly the words a source backs.
// A claim is the run of inline content since the previous sentence end (or the previous
// citation) up to a group of citation links (#cite-n).

const CITE_HREF = /^#cite-(\d+)$/
// Inline emphasis counts too: models often bold a whole bottom-line paragraph, citations included.
const CONTAINERS = new Set(['p', 'li', 'td', 'th', 'strong', 'em', 'b', 'i'])
const BLOCKS = new Set(['p', 'ul', 'ol', 'table', 'blockquote', 'div', 'pre', 'h1', 'h2', 'h3', 'h4'])
// Sentence end: . ! ? followed by optional closing marks, whitespace, then more text.
// A semicolon joins clauses of one claim, so it is not a boundary.
const BOUNDARY = /[.!?](?:["'’”)\]]*)\s+(?=\S)/g

const isCite = (n) => n.type === 'element' && n.tagName === 'a' && CITE_HREF.test(String(n.properties?.href || ''))
const isSpace = (n) => n.type === 'text' && !n.value.trim()
const citeNumber = (n) => Number(CITE_HREF.exec(String(n.properties.href))[1])

function splitClaim(buffer) {
  for (let k = buffer.length - 1; k >= 0; k--) {
    const node = buffer[k]
    if (node.type !== 'text') continue
    let last = -1
    BOUNDARY.lastIndex = 0
    for (let m = BOUNDARY.exec(node.value); m; m = BOUNDARY.exec(node.value)) last = m.index + m[0].length
    if (last < 0) continue
    const before = node.value.slice(0, last)
    const after = node.value.slice(last)
    return [
      [...buffer.slice(0, k), ...(before ? [{ type: 'text', value: before }] : [])],
      [...(after ? [{ type: 'text', value: after }] : []), ...buffer.slice(k + 1)],
    ]
  }
  return [[], buffer]
}

// Leading ", " or whitespace after a previous citation belongs outside the claim.
function trimLead(lead, claim) {
  const first = claim[0]
  if (first?.type !== 'text') return [lead, claim]
  const m = /^[\s,;:–—-]+/.exec(first.value)
  if (!m) return [lead, claim]
  const rest = first.value.slice(m[0].length)
  return [[...lead, { type: 'text', value: m[0] }], rest ? [{ type: 'text', value: rest }, ...claim.slice(1)] : claim.slice(1)]
}

function wrap(children) {
  const out = []
  let buffer = []
  let i = 0
  while (i < children.length) {
    const node = children[i]
    if (isCite(node)) {
      const cites = []
      const citeNodes = []
      while (i < children.length && (isCite(children[i]) || (isSpace(children[i]) && isCite(children[i + 1] || {})))) {
        if (isCite(children[i])) cites.push(citeNumber(children[i]))
        citeNodes.push(children[i])
        i++
      }
      let [lead, claim] = splitClaim(buffer)
      ;[lead, claim] = trimLead(lead, claim)
      out.push(...lead)
      if (claim.length) {
        out.push({
          type: 'element',
          tagName: 'span',
          properties: { className: ['claim'], dataCites: cites.join(' ') },
          children: claim,
        })
      }
      out.push(...citeNodes)
      buffer = []
      continue
    }
    if (node.type === 'element' && BLOCKS.has(node.tagName)) {
      out.push(...buffer, node)
      buffer = []
    } else {
      buffer.push(node)
    }
    i++
  }
  out.push(...buffer)
  return out
}

function walk(node) {
  if (!node.children) return
  node.children.forEach(walk)
  if (node.type === 'element' && CONTAINERS.has(node.tagName)) node.children = wrap(node.children)
}

export default function rehypeClaims() {
  return (tree) => walk(tree)
}
