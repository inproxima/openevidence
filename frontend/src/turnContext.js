import { createContext, useContext, useEffect, useState } from 'react'

// Per-answer state shared by citation keys, claims and source cards:
// which citation is lit (hover/focus) or pinned (click), and how to open a source.
export const TurnContext = createContext({
  turnId: '',
  byNumber: new Map(),
  active: null,
  setHover: () => {},
  togglePin: () => {},
  openSheet: () => {},
  wide: false,
})

export const useTurn = () => useContext(TurnContext)

// The evidence margin sits beside the answer from this width up.
export const WIDE_QUERY = '(min-width: 1280px)'

export function useMedia(query) {
  const get = () => typeof window !== 'undefined' && window.matchMedia(query).matches
  const [matches, setMatches] = useState(get)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    onChange()
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}

// Cited numbers in the order they first appear in the answer text.
export function citationOrder(text) {
  const seen = []
  for (const m of text.matchAll(/\[(\d{1,3})\](?!\()/g)) {
    const n = Number(m[1])
    if (!seen.includes(n)) seen.push(n)
  }
  return seen
}
