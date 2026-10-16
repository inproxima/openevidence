import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, ArrowUpRight, Menu, Plus } from 'lucide-react'
import { api, streamAsk } from './api.js'
import { useAuth } from './auth.jsx'
import AppMark from './components/AppMark.jsx'
import { KEY_FACE } from './components/CiteKey.jsx'
import Composer from './components/Composer.jsx'
import EvidenceBadge, { CanadaMark, LEVELS } from './components/EvidenceBadge.jsx'
import RunningHead from './components/RunningHead.jsx'
import Sidebar from './components/Sidebar.jsx'
import Turn, { TURN_COLUMNS } from './components/Turn.jsx'
import { useScrollEdges } from './scrollEdges.js'
import { alert, btn, scrim } from './ui.js'

const EXAMPLES = [
  'First-line pharmacotherapy for type 2 diabetes with established ASCVD per Diabetes Canada?',
  'Statins for primary prevention in adults over 75: what does the evidence show?',
  'Which patients with atrial fibrillation should get anticoagulation under the CCS algorithm?',
  'Is aspirin recommended for preeclampsia prevention, and at what dose?',
]

// What the two modes do and what gets searched (the same facts as the mode tooltips).
const SHEET_FIELDS = [
  ['Quick', 'The top sources, in about 30 seconds'],
  ['Deep', 'A wider search and a structured evidence report, in about 2 minutes'],
  ['Searches', 'Canadian guidelines, Health Canada monographs, PubMed, Europe PMC and ClinicalTrials.gov'],
]
const KEY_LEVELS = ['Guideline', 'Systematic review', 'RCT', 'Health Canada', 'Observational']

let turnCounter = 0
const newTurnId = () => `t${Date.now().toString(36)}${(turnCounter++).toString(36)}`

// Saved messages come back as user/assistant pairs; rebuild them as turns.
function turnsFromMessages(messages) {
  const turns = []
  for (const m of messages) {
    if (m.role === 'user') {
      turns.push({
        id: m.id,
        question: m.content,
        mode: m.mode,
        hadImage: m.had_image,
        askedAt: m.created_at ? new Date(m.created_at) : null,
        text: '',
        sources: [],
        followups: [],
        done: false,
      })
    } else if (turns.length) {
      Object.assign(turns[turns.length - 1], {
        text: m.content,
        sources: m.sources,
        followups: m.followups,
        used: [...m.content.matchAll(/\[(\d+)\]/g)].map((x) => Number(x[1])),
        answeredAt: m.created_at ? new Date(m.created_at) : null,
        done: true,
      })
    }
  }
  return turns.filter((t) => t.done)
}

export default function App() {
  const auth = useAuth()
  const [appName, setAppName] = useState('Clinical Evidence CA')
  const [threads, setThreads] = useState([])
  const [threadId, setThreadId] = useState(null)
  const [turns, setTurns] = useState([])
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState('quick')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef(null)
  const bottomRef = useRef(null)
  const scrollerRef = useRef(null)
  const threadIdRef = useRef(null)
  threadIdRef.current = threadId

  const getToken = auth.getToken

  const refreshThreads = useCallback(async () => {
    try {
      setThreads((await api.threads(getToken)).threads)
    } catch (err) {
      setError(`Could not load history: ${err.message}`)
    }
  }, [getToken])

  useEffect(() => {
    api.config().then((c) => {
      setAppName(c.app_name)
      document.title = c.app_name
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (auth.ready && auth.isAuthenticated) refreshThreads()
  }, [auth.ready, auth.isAuthenticated, refreshThreads])

  // Keep the open thread in the address bar (?thread=…) so refresh and shared links return to it.
  // The link is read once, before any effect can rewrite the URL.
  const linkedThread = useRef(new URLSearchParams(window.location.search).get('thread'))
  useEffect(() => {
    if (!threadId && linkedThread.current) return // the linked thread hasn't opened yet
    const url = new URL(window.location.href)
    if (threadId) url.searchParams.set('thread', threadId)
    else url.searchParams.delete('thread')
    if (url.href !== window.location.href) window.history.replaceState(null, '', url)
  }, [threadId])

  const updateTurn = (id, patch) =>
    setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, ...(typeof patch === 'function' ? patch(t) : patch) } : t)))

  const ask = async ({ question, image }) => {
    if (busy) return
    setError('')
    const id = newTurnId()
    setTurns((prev) => [
      ...prev,
      { id, question, mode, hadImage: Boolean(image), text: '', sources: [], followups: [], status: null, done: false, askedAt: new Date() },
    ])
    setBusy(true)
    const started = Date.now()
    const controller = new AbortController()
    abortRef.current = controller
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50)

    try {
      await streamAsk(
        getToken,
        { question, mode, image, thread_id: threadIdRef.current },
        (event, data) => {
          if (event === 'thread') setThreadId(data.thread_id)
          else if (event === 'status') updateTurn(id, { status: data })
          else if (event === 'sources') updateTurn(id, { sources: data.sources })
          else if (event === 'delta') updateTurn(id, (t) => ({ text: t.text + data.text }))
          else if (event === 'citations') updateTurn(id, { text: data.text, used: data.used })
          else if (event === 'followups') updateTurn(id, { followups: data.questions })
          else if (event === 'done')
            updateTurn(id, { done: true, answeredAt: new Date(), seconds: Math.round((Date.now() - started) / 1000) })
          else if (event === 'error') updateTurn(id, { error: data.message })
        },
        controller.signal,
      )
    } catch (err) {
      if (err.name === 'AbortError') updateTurn(id, (t) => ({ done: true, stopped: true, text: t.text || '', error: t.text ? null : 'Stopped.' }))
      else updateTurn(id, { error: `Connection problem: ${err.message}` })
    } finally {
      setBusy(false)
      abortRef.current = null
      refreshThreads()
    }
  }

  const stop = () => abortRef.current?.abort()

  const openThread = async (id) => {
    if (busy) stop()
    setSidebarOpen(false)
    try {
      const thread = await api.thread(getToken, id)
      setThreadId(id)
      setTurns(turnsFromMessages(thread.messages))
      window.scrollTo({ top: 0 })
    } catch (err) {
      setError(`Could not open that conversation: ${err.message}`)
    }
  }

  // Open the thread named in the URL once the user is known.
  useEffect(() => {
    const id = linkedThread.current
    if (!id || !auth.ready || !auth.isAuthenticated) return
    linkedThread.current = null
    openThread(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.ready, auth.isAuthenticated])

  const newQuestion = useCallback(() => {
    abortRef.current?.abort()
    setThreadId(null)
    setTurns([])
    setSidebarOpen(false)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        newQuestion()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [newQuestion])

  // The thread fades out above the docked composer instead of shearing at its line.
  useScrollEdges(scrollerRef, { enabled: turns.length > 0 })

  const rename = async (id, title) => {
    try {
      await api.rename(getToken, id, title)
      refreshThreads()
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this conversation?')) return
    try {
      await api.remove(getToken, id)
      if (id === threadId) newQuestion()
      refreshThreads()
    } catch (err) {
      setError(err.message)
    }
  }

  if (auth.enabled && auth.ready && !auth.isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-subtle px-4">
        <div className="w-full max-w-sm rounded-2xl bg-surface p-8 shadow-sm ring-1 ring-line">
          <AppMark className="h-9 w-9" />
          <h1 className="mt-5 text-lg font-semibold">{appName}</h1>
          <p className="mt-2 text-sm text-fg-soft">An early preview for clinicians. Sign in with Google or your email, or create an account.</p>
          <button type="button" onClick={auth.login} className={`${btn.primary} mt-6 h-10 w-full`}>
            Sign in
          </button>
          <button type="button" onClick={auth.signup} className={`${btn.secondary} mt-3 h-10 w-full`}>
            Create an account
          </button>
        </div>
      </div>
    )
  }

  const empty = turns.length === 0
  // Same columns as a turn, so the composer lines up with the answer and the margin stays clear.
  const frame = 'mx-auto w-full max-w-[1180px] px-4 sm:px-8 xl:px-10'

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-canvas">
      <Sidebar
        open={sidebarOpen}
        appName={appName}
        threads={threads}
        activeId={threadId}
        onSelect={openThread}
        onNew={newQuestion}
        onRename={rename}
        onDelete={remove}
        onClose={() => setSidebarOpen(false)}
      />
      {sidebarOpen && <div className={`fixed inset-0 z-30 animate-fade-in lg:hidden ${scrim}`} onClick={() => setSidebarOpen(false)} />}

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-canvas px-2 lg:hidden">
          <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Open question history" className={btn.icon}>
            <Menu size={20} />
          </button>
          <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
            <AppMark className="h-5 w-5" />
            <span className="truncate">{appName}</span>
          </span>
          {!empty && (
            <button type="button" onClick={newQuestion} className={`${btn.secondarySm} ml-auto`}>
              <Plus size={15} className="text-accent-text" /> New
            </button>
          )}
        </div>

        {error && (
          <div role="alert" className={`${frame} mt-3`}>
            <div className={`flex items-start gap-2.5 px-3.5 py-2.5 text-sm ${alert}`}>
              <AlertCircle size={17} aria-hidden="true" className="mt-0.5 shrink-0" />
              <span className="min-w-0 flex-1">{error}</span>
              <button type="button" onClick={() => setError('')} className="shrink-0 rounded font-semibold underline-offset-2 hover:underline">
                Dismiss
              </button>
            </div>
          </div>
        )}

        {empty ? (
          <div className="flex-1 overflow-y-auto">
            {/* Home: the heading across the page, then the composer and examples on the answer
                column's edge, with the reference notes where the evidence margin will be. */}
            <div className={`${frame} pb-16 pt-8 sm:pt-14 xl:pt-20`}>
              <header className="max-w-measure">
                <h1 className="text-title font-semibold tracking-[-0.015em] sm:text-display sm:tracking-[-0.02em]">Ask a clinical question</h1>
                <p className="mt-3 text-read text-fg-soft">Every claim in the answer is marked with the source that supports it.</p>
              </header>

              <div className={`mt-8 ${TURN_COLUMNS}`}>
                <div className="min-w-0 max-w-measure">
                  <Composer
                    onSubmit={ask}
                    onStop={stop}
                    busy={busy}
                    mode={mode}
                    setMode={setMode}
                    placeholder="Anticoagulation for AF in a 78-year-old with CKD stage 4?"
                    autoFocus
                  />
                  <p className="mt-2 text-2xs text-fg-muted">Not a substitute for clinical judgement. Don't enter patient identifiers.</p>

                  <section aria-labelledby="examples-heading" className="mt-12">
                    <h2 id="examples-heading" className="text-sm font-semibold">
                      Example questions
                    </h2>
                    <ul className="mt-3 divide-y divide-line border-y border-line">
                      {EXAMPLES.map((q) => (
                        <li key={q}>
                          <button
                            type="button"
                            onClick={() => ask({ question: q, image: null })}
                            className="group flex w-full items-start gap-3 py-3 text-left text-sm text-fg-soft transition-colors hover:text-fg"
                          >
                            <span className="min-w-0 flex-1">{q}</span>
                            <ArrowUpRight
                              size={16}
                              aria-hidden="true"
                              className="mt-0.5 shrink-0 text-fg-faint transition-[color,transform] duration-200 ease-out group-hover:-translate-y-px group-hover:translate-x-px group-hover:text-accent-text"
                            />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>

                <aside className="mt-12 max-w-measure space-y-10 xl:mt-0 xl:max-w-none xl:border-l xl:border-line xl:pl-6">
                  <section aria-labelledby="modes-heading">
                    <h2 id="modes-heading" className="text-sm font-semibold">
                      Modes and sources
                    </h2>
                    <dl className="mt-3 space-y-2.5 text-xs">
                      {SHEET_FIELDS.map(([term, detail]) => (
                        <div key={term} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3">
                          <dt className="font-semibold text-fg">{term}</dt>
                          <dd className="text-pretty text-fg-muted">{detail}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>

                  <section aria-labelledby="key-heading">
                    <h2 id="key-heading" className="text-sm font-semibold">
                      Key to sources
                    </h2>
                    <dl className="mt-3 space-y-2.5 text-pretty text-xs text-fg-muted">
                      <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-x-3">
                        <dt>
                          <span aria-hidden="true" className={`${KEY_FACE} h-5 min-w-5 px-1.5 text-2xs`}>
                            1
                          </span>
                          <span className="sr-only">Numbered key</span>
                        </dt>
                        <dd className="pt-0.5">A citation: hover or tap it to see the source and the words it supports</dd>
                      </div>
                      {KEY_LEVELS.map((level) => (
                        <div key={level} className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-x-3">
                          <dt>
                            <EvidenceBadge level={level} />
                          </dt>
                          <dd className="pt-0.5">{LEVELS[level].note}</dd>
                        </div>
                      ))}
                      <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-x-3">
                        <dt className="pt-0.5 text-2xs">
                          <CanadaMark />
                        </dt>
                        <dd className="pt-0.5">Canadian source, shown in the byline</dd>
                      </div>
                    </dl>
                  </section>
                </aside>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div ref={scrollerRef} className="scroll-edges flex-1 overflow-y-auto">
              <RunningHead turns={turns} scroller={scrollerRef} frame={frame} />
              <div className={`${frame} space-y-16 pb-8 pt-6 sm:pb-10 sm:pt-8`}>
                {turns.map((t) => (
                  <Turn key={t.id} turn={t} busy={busy} onFollowUp={(q) => ask({ question: q, image: null })} />
                ))}
                <div ref={bottomRef} />
              </div>
            </div>
            <div className="shrink-0 border-t border-line bg-canvas pb-[env(safe-area-inset-bottom)]">
              <div className={`${frame} py-3`}>
                <div className={TURN_COLUMNS}>
                  <div className="min-w-0 max-w-measure">
                    <Composer onSubmit={ask} onStop={stop} busy={busy} mode={mode} setMode={setMode} placeholder="Ask a follow-up…" compact />
                    <p className="mt-1.5 text-2xs text-fg-muted">Not a substitute for clinical judgement. Don't enter patient identifiers.</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
