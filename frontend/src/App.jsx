import { useCallback, useEffect, useRef, useState } from 'react'
import { CornerDownRight, Menu, Plus } from 'lucide-react'
import { api, streamAsk } from './api.js'
import { useAuth } from './auth.jsx'
import Composer from './components/Composer.jsx'
import EvidenceBadge, { CanadaMark, LEVELS } from './components/EvidenceBadge.jsx'
import Sidebar from './components/Sidebar.jsx'
import Turn, { TURN_COLUMNS } from './components/Turn.jsx'

const EXAMPLES = [
  'First-line pharmacotherapy for type 2 diabetes with established ASCVD per Diabetes Canada?',
  'Statins for primary prevention in adults over 75: what does the evidence show?',
  'Which patients with atrial fibrillation should get anticoagulation under the CCS algorithm?',
  'Is aspirin recommended for preeclampsia prevention, and at what dose?',
]

let turnCounter = 0
const newTurnId = () => `t${Date.now().toString(36)}${(turnCounter++).toString(36)}`

// Saved messages come back as user/assistant pairs; rebuild them as turns.
function turnsFromMessages(messages) {
  const turns = []
  for (const m of messages) {
    if (m.role === 'user') {
      turns.push({ id: m.id, question: m.content, mode: m.mode, hadImage: m.had_image, text: '', sources: [], followups: [], done: false })
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
      { id, question, mode, hadImage: Boolean(image), text: '', sources: [], followups: [], status: null, done: false },
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
      if (err.name === 'AbortError') updateTurn(id, (t) => ({ done: true, text: t.text || '', error: t.text ? null : 'Stopped.' }))
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
      <div className="flex min-h-screen items-center justify-center bg-pen px-4">
        <div className="w-full max-w-sm rounded-sheet border border-ink bg-paper p-8 shadow-pop">
          <h1 className="text-lg font-bold">{appName}</h1>
          <p className="mt-2 text-sm text-ink-soft">An early preview for clinicians. Sign in with Google or your email, or create an account.</p>
          <button type="button" onClick={auth.login} className="mt-6 w-full rounded-sheet bg-pen py-2.5 text-sm font-bold text-paper-white hover:bg-pen-dark">
            Sign in
          </button>
          <button type="button" onClick={auth.signup} className="mt-3 w-full rounded-sheet border border-pen py-2.5 text-sm font-bold text-pen hover:bg-pen-wash">
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
    <div className="flex h-[100dvh] overflow-hidden bg-paper">
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
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-ink/30 animate-fade-in lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 bg-pen px-2 text-paper-white lg:hidden">
          <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Open question history" className="inline-flex h-10 w-10 items-center justify-center rounded-sheet hover:bg-white/10">
            <Menu size={20} />
          </button>
          <span className="text-sm font-bold">{appName}</span>
          {!empty && (
            <button type="button" onClick={newQuestion} className="ml-auto inline-flex h-9 items-center gap-1 rounded-sheet px-2.5 text-xs font-bold hover:bg-white/10">
              <Plus size={15} /> New
            </button>
          )}
        </div>

        {error && (
          <div role="alert" className={`${frame} mt-3`}>
            <div className="flex items-start justify-between gap-3 rounded-sheet bg-alert-tint px-3.5 py-2.5 text-sm text-alert">
              <span>{error}</span>
              <button type="button" onClick={() => setError('')} className="shrink-0 font-bold hover:underline">
                Dismiss
              </button>
            </div>
          </div>
        )}

        {empty ? (
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[760px] px-4 pb-16 pt-[9vh] sm:px-8 sm:pt-[13vh]">
              <h1 className="text-[2rem] font-bold leading-tight sm:text-display">Ask a clinical question</h1>
              <p className="mt-3 max-w-[56ch] text-read text-ink-soft">
                Every claim in the answer is marked with the source that supports it, from Canadian guidelines, Health
                Canada monographs and the medical literature.
              </p>
              <div className="mt-7">
                <Composer
                  onSubmit={ask}
                  onStop={stop}
                  busy={busy}
                  mode={mode}
                  setMode={setMode}
                  placeholder="Anticoagulation for AF in a 78-year-old with CKD stage 4?"
                  autoFocus
                />
                <p className="mt-2 text-2xs text-ink-muted">Not a substitute for clinical judgement. Don't enter patient identifiers.</p>
              </div>

              <div className="mt-12 grid gap-10 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                <section>
                  <h2 className="text-sm font-bold">Example questions</h2>
                  <ul className="mt-2 border-t border-ink">
                    {EXAMPLES.map((q) => (
                      <li key={q} className="border-b border-rule">
                        <button
                          type="button"
                          onClick={() => ask({ question: q, image: null })}
                          className="flex w-full items-start gap-2.5 py-3 text-left text-sm text-ink hover:text-pen"
                        >
                          <CornerDownRight size={15} className="mt-0.5 shrink-0 text-pen" />
                          {q}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h2 className="text-sm font-bold">How sources are marked</h2>
                  <ul className="mt-2 space-y-2.5 border-t border-ink pt-3">
                    {['Guideline', 'Systematic review', 'RCT', 'Health Canada', 'Observational'].map((level) => (
                      <li key={level} className="flex items-start gap-2.5 text-xs text-ink-soft">
                        <span className="w-[8.5rem] shrink-0">
                          <EvidenceBadge level={level} />
                        </span>
                        <span className="pt-0.5">{LEVELS[level].note}</span>
                      </li>
                    ))}
                    <li className="flex items-start gap-2.5 text-xs text-ink-soft">
                      <span className="w-[8.5rem] shrink-0 pt-0.5 text-2xs">
                        <CanadaMark />
                      </span>
                      <span className="pt-0.5">Canadian source, shown in the byline</span>
                    </li>
                  </ul>
                </section>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className={`${frame} space-y-16 py-8 sm:py-10`}>
                {turns.map((t) => (
                  <Turn key={t.id} turn={t} busy={busy} onFollowUp={(q) => ask({ question: q, image: null })} />
                ))}
                <div ref={bottomRef} />
              </div>
            </div>
            <div className="shrink-0 border-t border-rule bg-paper pb-[env(safe-area-inset-bottom)]">
              <div className={`${frame} py-3`}>
                <div className={TURN_COLUMNS}>
                  <div className="min-w-0 max-w-measure">
                    <Composer onSubmit={ask} onStop={stop} busy={busy} mode={mode} setMode={setMode} placeholder="Ask a follow-up…" compact />
                    <p className="mt-1.5 text-2xs text-ink-muted">Not a substitute for clinical judgement. Don't enter patient identifiers.</p>
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
