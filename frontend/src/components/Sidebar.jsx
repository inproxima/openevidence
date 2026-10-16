import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, LogOut, MoreHorizontal, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useAuth } from '../auth.jsx'
import { btn, field, menu, menuItem, menuItemDanger } from '../ui.js'
import AppMark from './AppMark.jsx'

// History rail (ported from sara's Sidebar: filter, inline rename, delete), listing
// conversation threads. A quiet neutral column beside the page; a drawer below lg.
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
      className={`fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col border-r border-line bg-subtle text-fg transition-transform duration-300 ease-out lg:relative lg:translate-x-0 ${
        open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}
      aria-label="Question history"
    >
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-4">
        <span className="flex min-w-0 items-center gap-2.5 font-semibold">
          <AppMark />
          <span className="truncate">{appName}</span>
        </span>
        <button type="button" onClick={onClose} aria-label="Close history" className={`${btn.icon} lg:hidden`}>
          <X size={18} />
        </button>
      </div>

      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={onNew}
          className={`${btn.secondary} w-full justify-between pl-3 pr-2`}
        >
          <span className="inline-flex items-center gap-2">
            <Plus size={16} className="text-accent-text" /> New question
          </span>
          <span className="hidden gap-1 lg:inline-flex">
            <kbd className="kbd">⌘</kbd>
            <kbd className="kbd">K</kbd>
          </span>
        </button>
      </div>

      <div className="px-3 pb-2">
        <label className="relative block">
          <span className="sr-only">Search history</span>
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search history"
            className={`${field} py-2 pl-8 pr-3 text-sm`}
          />
        </label>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2" aria-label="Recent questions">
        <h2 className="mb-1 mt-3 px-2 text-2xs font-semibold text-fg-muted">Recent</h2>
        {filtered.length === 0 ? (
          <p className="px-2 py-4 text-sm text-fg-muted">{filter ? 'No matching questions.' : 'Questions you ask are saved here.'}</p>
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
                        className={`${field} min-w-0 flex-1 px-2 py-1 text-xs`}
                      />
                      <button type="button" onClick={() => save(t.id)} aria-label="Save title" className={btn.iconSm}>
                        <Check size={15} />
                      </button>
                      <button type="button" onClick={() => setEditing(null)} aria-label="Cancel renaming" className={btn.iconSm}>
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <div className={`group flex items-center rounded-lg ${active ? 'bg-fg/[0.07]' : 'hover:bg-fg/[0.04]'}`}>
                      <button
                        type="button"
                        onClick={() => onSelect(t.id)}
                        aria-current={active ? 'page' : undefined}
                        title={t.title}
                        className={`min-w-0 flex-1 rounded-lg px-2 py-2 text-left text-sm leading-snug ${active ? 'font-semibold text-fg' : 'text-fg-soft hover:text-fg'}`}
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
                        className={`mr-1 rounded-md p-1 text-fg-muted hover:bg-fg/[0.06] hover:text-fg ${
                          active || menuFor === t.id ? 'opacity-100' : 'opacity-0 focus:opacity-100 group-hover:opacity-100'
                        }`}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  )}
                  {menuFor === t.id && (
                    <div role="menu" className={`absolute right-1 top-9 z-50 w-40 ${menu}`}>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setEditing(t.id)
                          setEditValue(t.title)
                          setMenuFor(null)
                        }}
                        className={menuItem}
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
                        className={menuItemDanger}
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

      <div className="border-t border-line px-4 py-3 text-2xs leading-relaxed text-fg-muted">
        {enabled && user && (
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold text-fg">{user.email || user.name}</span>
            <button type="button" onClick={logout} aria-label="Sign out" className={btn.iconSm}>
              <LogOut size={14} />
            </button>
          </div>
        )}
        For licensed health professionals. Not a substitute for clinical judgement: check the cited sources before acting.
      </div>
    </aside>
  )
}
