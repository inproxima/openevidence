import { memo, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeClaims from '../rehypeClaims.js'
import { useTurn } from '../turnContext.js'
import CiteKey from './CiteKey.jsx'

// [n] markers become #cite-n links; rehypeClaims then wraps the words each one supports.
const CITE = /\[(\d{1,3})\](?!\()/g
const withCitationLinks = (text) => text.replace(CITE, (_, n) => `[${n}](#cite-${n})`)

function Claim({ cites, lead, children }) {
  const { active, finale, endFinale } = useTurn()
  const ref = useRef(null)
  const [sweeping, setSweeping] = useState(false)
  const lit = active !== null && cites.includes(active)

  // Completion moment: when a live answer finishes, the highlighter crosses its bottom line
  // once, but only if the reader can see that line right then.
  useEffect(() => {
    if (!lead || !finale) return
    const io = new IntersectionObserver(([entry]) => {
      io.disconnect()
      if (entry.intersectionRatio >= 0.5) setSweeping(true)
      else endFinale()
    }, { threshold: [0, 0.5, 1] })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [lead, finale, endFinale])

  const settle = (e) => {
    if (e.target !== e.currentTarget) return
    setSweeping(false)
    endFinale()
  }

  return (
    <span ref={ref} onAnimationEnd={settle} className={`claim${lit ? ' is-lit' : ''}${sweeping ? ' is-sweeping' : ''}`}>
      {children}
    </span>
  )
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
      const lead = (rest['data-lead'] ?? node?.properties?.dataLead) !== undefined
      return (
        <Claim cites={String(cites).split(' ').map(Number)} lead={lead}>
          {children}
        </Claim>
      )
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
