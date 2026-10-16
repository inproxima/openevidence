import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { btn, litKey, scrim } from '../ui.js'
import SourceCard from './SourceCard.jsx'

// Phone and narrow-window view of one cited source: it opens in focus over the answer and
// keeps "n of N cited" in view, with previous/next through the cited list.
export default function SourceSheet({ source, position, total, onPrev, onNext, onClose }) {
  const closeRef = useRef(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev?.()
      if (e.key === 'ArrowRight') onNext?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onPrev, onNext])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="presentation">
      <div className={`absolute inset-0 animate-fade-in ${scrim}`} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Source ${source.n}`}
        className="relative w-full max-w-xl rounded-t-2xl bg-canvas px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl ring-1 ring-line animate-sheet-up"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-fg-soft tnum">
            <span className={`mr-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 ring-1 ring-inset ${litKey}`}>
              {source.n}
            </span>
            {position} of {total} cited
          </p>
          <div className="flex items-center gap-1">
            <button type="button" onClick={onPrev} disabled={!onPrev} aria-label="Previous source" className={btn.icon}>
              <ChevronLeft size={18} />
            </button>
            <button type="button" onClick={onNext} disabled={!onNext} aria-label="Next source" className={btn.icon}>
              <ChevronRight size={18} />
            </button>
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Close source" className={btn.icon}>
              <X size={18} />
            </button>
          </div>
        </div>
        <ul>
          <SourceCard source={source} focus />
        </ul>
      </div>
    </div>
  )
}
