import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, LogOut, MoreHorizontal, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useAuth } from '../auth.jsx'

// History rail in ballpoint blue (ported from sara's Sidebar: filter, inline rename,
// delete), listing conversation threads. A drawer below the lg breakpoint.
export default function Sidebar({ open, appName, threads, activeId, onSelect, onNew, onRename, onDelete, onClose }) {
  const { enabled, user, logout } = useAuth()
  const [filter, setFilter] = useState('')
  const [editing, setEditing] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [menuFor, setMenuFor] = useState(null)
  const editRef = useRef(null)

  useEffect(() => {
    if (editing) editRef.current?.focus()
  }, [editing])

  useEffect(() => {
    if (!menuFor) return
    const close = () => setMenuFor(null)
    const onKey = (e) => e.key === 'Escape' && setMenuFor(null)
    window.addEventListener('click', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuFor])

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase()
    return f ? threads.filter((t) => t.title.toLowerCase().includes(f)) : threads
  }, [threads, filter])

  const save = (id) => {
    if (editValue.trim()) onRename(id, editValue.trim())
    setEditing(null)
  }

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col bg-pen text-paper-white transition-transform duration-300 ease-out lg:relative lg:translate-x-0 ${
        open ? 'translate-x-0 shadow-pop' : '-translate-x-full'
      }`}
      aria-label="Question history"
    >
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-4">
        <span className="flex items-center gap-2.5 font-bold tracking-[0.01em]">
          <span aria-hidden="true" className="relative inline-block h-6 w-6 rounded-[5px] bg-paper-white">
            <span className="absolute inset-x-1 top-[9px] h-[7px] rounded-[1px] bg-hl-yellow" />
            <span className="absolute inset-x-1 top-[6px] h-[1.5px] bg-pen" />
            <span className="absolute left-1 right-2.5 top-[18px] h-[1.5px] bg-pen" />
          </span>
          {appName}
        </span>
        <button type="button" onClick={onClose} aria-label="Close history" className="inline-flex h-9 w-9 items-center justify-center rounded-sheet hover:bg-white/10 lg:hidden">
          <X size={18} />
        </button>
      </div>

      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center justify-between rounded-sheet bg-paper-white px-3 py-2.5 text-sm font-bold text-pen shadow-lift transition-transform active:scale-[0.99]"
        >
          <span className="inline-flex items-center gap-2">
            <Plus size={16} /> New question
          </span>
          <span className="hidden gap-1 text-pen lg:inline-flex">
            <kbd className="kbd border-pen-mist">⌘</kbd>
            <kbd className="kbd border-pen-mist">K</kbd>
          </span>
        </button>
      </div>

      <div className="px-3 pb-2">
        <label className="relative block">
          <span className="sr-only">Search history</span>
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-pen-mist" />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search history"
            className="w-full rounded-sheet border-transparent bg-white/10 py-2 pl-8 pr-3 text-sm text-paper-white placeholder:text-pen-mist focus:border-white/40 focus:bg-white/15 focus:ring-0"
          />
        </label>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2" aria-label="Recent questions">
        <h2 className="mb-1 mt-2 px-2 text-2xs font-bold text-pen-mist">Recent</h2>
        {filtered.length === 0 ? (
          <p className="px-2 py-4 text-sm text-pen-mist">{filter ? 'No matching questions.' : 'Questions you ask are saved here.'}</p>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((t) => {
              const active = t.id === activeId
              return (
                <li key={t.id} className="relative">
                  {editing === t.id ? (
                    <div className="flex items-center gap-1 px-1 py-1">
                      <input
                        ref={editRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') save(t.id)
                          if (e.key === 'Escape') setEditing(null)
                        }}
                        aria-label="Question title"
                        className="min-w-0 flex-1 rounded-[4px] border-transparent bg-paper-white px-2 py-1 text-xs text-ink focus:ring-0"
                      />
                      <button type="button" onClick={() => save(t.id)} aria-label="Save title" className="rounded p-1 hover:bg-white/15">
                        <Check size={15} />
                      </button>
                      <button type="button" onClick={() => setEditing(null)} aria-label="Cancel renaming" className="rounded p-1 hover:bg-white/15">
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <div className={`group flex items-center rounded-sheet ${active ? 'bg-white/[0.16]' : 'hover:bg-white/[0.08]'}`}>
                      <button
                        type="button"
                        onClick={() => onSelect(t.id)}
                        aria-current={active ? 'page' : undefined}
                        title={t.title}
                        className={`min-w-0 flex-1 px-2 py-2 text-left text-sm leading-snug ${active ? 'font-bold text-paper-white' : 'text-[#E3E9FF]'}`}
                      >
                        {/* Clamp on the inner span: overflow clips at the padding box, so a clamp on the padded button leaks a third line. */}
                        <span className="line-clamp-2 break-words">{t.title}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuFor(menuFor === t.id ? null : t.id)
                        }}
                        aria-label={`Options for ${t.title}`}
                        aria-expanded={menuFor === t.id}
                        className={`mr-1 rounded-[4px] p-1 text-pen-mist hover:bg-white/15 hover:text-paper-white ${
                          active || menuFor === t.id ? 'opacity-100' : 'opacity-0 focus:opacity-100 group-hover:opacity-100'
                        }`}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  )}
                  {menuFor === t.id && (
                    <div role="menu" className="absolute right-1 top-9 z-50 w-40 rounded-sheet border border-rule bg-paper-white py-1 text-ink shadow-pop">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setEditing(t.id)
                          setEditValue(t.title)
                          setMenuFor(null)
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-paper-shade"
                      >
                        <Pencil size={14} /> Rename
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuFor(null)
                          onDelete(t.id)
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-alert hover:bg-alert-tint"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </nav>

      <div className="border-t border-white/15 px-4 py-3 text-2xs leading-relaxed text-[#D5DEFF]">
        {enabled && user && (
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="truncate text-xs font-bold text-paper-white">{user.email || user.name}</span>
            <button type="button" onClick={logout} aria-label="Sign out" className="rounded p-1 hover:bg-white/15">
              <LogOut size={14} />
            </button>
          </div>
        )}
        For licensed health professionals. Not a substitute for clinical judgement: check the cited sources before acting.
      </div>
    </aside>
  )
}
