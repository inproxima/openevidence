import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
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
      <div className="absolute inset-0 bg-ink/30 animate-fade-in" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Source ${source.n}`}
        className="relative w-full max-w-xl rounded-t-[14px] border-t border-ink bg-paper px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-sheet animate-sheet-up"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-rule-strong" aria-hidden="true" />
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-bold tnum">
            <span className="mr-2 inline-flex h-6 min-w-6 items-center justify-center rounded-key border border-ink bg-hl-yellow px-1.5">
              {source.n}
            </span>
            {position} of {total} cited
          </p>
          <div className="flex items-center gap-1">
            <button type="button" onClick={onPrev} disabled={!onPrev} aria-label="Previous source" className="inline-flex h-9 w-9 items-center justify-center rounded-sheet text-ink hover:bg-paper-shade disabled:opacity-35">
              <ChevronLeft size={18} />
            </button>
            <button type="button" onClick={onNext} disabled={!onNext} aria-label="Next source" className="inline-flex h-9 w-9 items-center justify-center rounded-sheet text-ink hover:bg-paper-shade disabled:opacity-35">
              <ChevronRight size={18} />
            </button>
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Close source" className="inline-flex h-9 w-9 items-center justify-center rounded-sheet text-ink hover:bg-paper-shade">
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
