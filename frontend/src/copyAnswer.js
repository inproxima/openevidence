// Rich clipboard copies of an answer. In-text citations and the reference list link to
// each source, so a paste into Word, Google Docs or an email keeps them clickable; the
// plain-text half spells the links out for places that only take text (an EMR note).

const escapeHtml = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

const withPeriod = (s) => {
  const t = String(s || '').trim()
  return !t || /[.?!]$/.test(t) ? t : `${t}.`
}

// Where a citation or reference points: the source page, else its DOI.
export const sourceLink = (s) => s.url || (s.doi ? `https://doi.org/${s.doi}` : '')

// Reference fields in the order OpenEvidence uses: title (the link), authors, venue, DOI.
function referenceParts(s) {
  const more = /,\s*et al/.test(s.reference || '') // the API sends at most six names
  const authors = s.authors?.length ? `${s.authors.join(', ')}${more ? ', et al' : ''}` : ''
  return {
    title: withPeriod(s.title),
    rest: [authors, [s.journal, s.year].filter(Boolean).join('. '), s.doi ? `doi:${s.doi}` : '']
      .filter(Boolean)
      .map(withPeriod)
      .join(' '),
  }
}

export function referenceHtml(s) {
  const { title, rest } = referenceParts(s)
  const link = sourceLink(s)
  const head = link ? `<a href="${escapeHtml(link)}">${escapeHtml(title)}</a>` : escapeHtml(title)
  return rest ? `${head} ${escapeHtml(rest)}` : head
}

export function referenceText(s) {
  const { title, rest } = referenceParts(s)
  return [title, rest, sourceLink(s)].filter(Boolean).join(' ')
}

// CiteKey renders <a class="cite-key" href="#source-{turn}-{n}">n</a>; swap each for
// "[label]" linked to the source itself.
function linkCitations(root, byNumber, label) {
  for (const key of root.querySelectorAll('a.cite-key')) {
    const n = Number(key.getAttribute('href')?.match(/-(\d+)$/)?.[1])
    const source = byNumber.get(n)
    const href = source ? sourceLink(source) : ''
    const text = `[${label(n)}]`
    let node = document.createTextNode(text)
    if (href) {
      node = document.createElement('a')
      node.setAttribute('href', href)
      node.textContent = text
    }
    key.replaceWith(node)
  }
}

// Keep structure and links only: no classes, handlers or highlight spans.
function strip(root) {
  for (const el of root.querySelectorAll('*')) {
    for (const { name } of [...el.attributes]) {
      if (!(el.tagName === 'A' && name === 'href')) el.removeAttribute(name)
    }
  }
  for (const span of root.querySelectorAll('span')) span.replaceWith(...span.childNodes)
}

const BLOCKS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'BLOCKQUOTE', 'PRE', 'TABLE', 'TR'])
const CONTAINERS = new Set(['UL', 'OL', 'TABLE', 'THEAD', 'TBODY', 'TR']) // whitespace between their children is markup

// Plain text with paragraph breaks, bullets and numbered items, like the screen.
function toText(node) {
  let out = ''
  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      if (!(CONTAINERS.has(node.nodeName) && !child.textContent.trim())) out += child.textContent
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = child.tagName
      if (tag === 'BR') out += '\n'
      else if (tag === 'LI') {
        const list = child.parentElement
        const marker = list?.tagName === 'OL' ? `${[...list.children].indexOf(child) + 1}.` : '-'
        out += `${marker} ${toText(child).trim()}\n`
      } else if (tag === 'TD' || tag === 'TH') out += `${toText(child).trim()}\t`
      else if (BLOCKS.has(tag)) out += `\n${toText(child).trim()}\n\n`
      else out += toText(child)
    }
  }
  return out
}

const tidy = (text) => text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()

/**
 * The whole answer, for "Copy with references": the question, the answer as rendered with
 * citations renumbered 1..N in order of first use and linked to their sources, then the
 * numbered reference list with each title linked.
 */
export function answerClipboard({ question, root, byNumber, order }) {
  const number = new Map(order.map((n, i) => [n, i + 1]))
  const body = root.cloneNode(true)
  linkCitations(body, byNumber, (n) => number.get(n) ?? n)
  strip(body)
  const refs = order.map((n) => byNumber.get(n))
  const html = [
    `<p><strong>${escapeHtml(question)}</strong></p>`,
    body.innerHTML,
    refs.length ? `<p><strong>References</strong></p><ol>${refs.map((s) => `<li>${referenceHtml(s)}</li>`).join('')}</ol>` : '',
  ].join('')
  const text = [
    question,
    tidy(toText(body)),
    refs.length ? `References\n${refs.map((s, i) => `${i + 1}. ${referenceText(s)}`).join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
  return { html, text }
}

/**
 * A text selection inside the answer: citation keys become "[n]" links to their sources,
 * keeping the numbers shown on screen. Returns null when the selection cites nothing,
 * so the browser's own copy applies.
 */
export function selectionClipboard(fragment, byNumber) {
  if (!fragment.querySelector('a.cite-key')) return null
  const box = document.createElement('div')
  box.append(fragment)
  linkCitations(box, byNumber, (n) => n)
  strip(box)
  return { html: box.innerHTML, text: tidy(toText(box)) }
}

/** Write HTML and plain text together; browsers without ClipboardItem get the text. */
export async function writeClipboard({ html, text }) {
  if (window.ClipboardItem && navigator.clipboard.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      }),
    ])
  } else {
    await navigator.clipboard.writeText(text)
  }
}
