import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeClaims from '../rehypeClaims.js'
import { useTurn } from '../turnContext.js'
import CiteKey from './CiteKey.jsx'

// [n] markers become #cite-n links; rehypeClaims then wraps the words each one supports.
const CITE = /\[(\d{1,3})\](?!\()/g
const withCitationLinks = (text) => text.replace(CITE, (_, n) => `[${n}](#cite-${n})`)

function Claim({ cites, children }) {
  const { active } = useTurn()
  const lit = active !== null && cites.includes(active)
  return <span className={`claim${lit ? ' is-lit' : ''}`}>{children}</span>
}

const components = {
  a: ({ node, href = '', children, ...rest }) => {
    const m = href.match(/^#cite-(\d+)$/)
    if (m) return <CiteKey n={Number(m[1])} />
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    )
  },
  span: ({ node, children, ...rest }) => {
    const cites = rest['data-cites'] ?? node?.properties?.dataCites
    if (cites !== undefined) {
      return <Claim cites={String(cites).split(' ').map(Number)}>{children}</Claim>
    }
    return <span {...rest}>{children}</span>
  },
}

// The markdown parse depends only on the text; lighting a claim re-renders just the
// Claim and CiteKey consumers through context.
function AnswerBody({ text, streaming }) {
  return (
    <div className={`answer ${streaming ? 'stream-caret' : ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeClaims]} components={components}>
        {withCitationLinks(text)}
      </ReactMarkdown>
    </div>
  )
}

export default memo(AnswerBody)
