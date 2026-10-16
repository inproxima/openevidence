import { useEffect, useRef, useState } from 'react'
import { ArrowUp, ImagePlus, Square, Telescope, X, Zap } from 'lucide-react'

const MAX_SIDE = 1600 // px; larger photos are downscaled before upload

// Read a picked file into a JPEG/PNG data URL no larger than MAX_SIDE on its long edge.
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that image. Try a PNG or JPEG.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('That file is not an image this app can read. Try a PNG or JPEG.'))
      img.onload = () => {
        const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
        if (scale === 1 && file.size < 4_000_000) return resolve(reader.result)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.88))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

const MODES = [
  ['quick', 'Quick', Zap, 'Answer from the top sources in about 30 seconds'],
  ['deep', 'Deep', Telescope, 'Wider search and a structured evidence report, about 2 minutes'],
]

// Question box (from sara's SearchForm): auto-growing, Enter to send, Shift+Enter for a
// new line, Quick/Deep mode and an image attachment.
export default function Composer({ onSubmit, onStop, busy, mode, setMode, placeholder, autoFocus, compact }) {
  const [text, setText] = useState('')
  const [image, setImage] = useState(null)
  const [imageError, setImageError] = useState('')
  const textareaRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`
  }, [text])

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus()
  }, [autoFocus])

  const canSubmit = text.trim().length >= 3 && !busy

  const submit = () => {
    if (!canSubmit) return
    onSubmit({ question: text.trim(), image })
    setText('')
    setImage(null)
  }

  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImageError('')
    try {
      setImage(await loadImage(file))
    } catch (err) {
      setImageError(err.message)
    }
  }

  return (
    <div className="w-full">
      <div className="rounded-sheet border border-ink bg-paper-white shadow-lift transition-shadow focus-within:shadow-[0_0_0_3px_theme(colors.pen.mist)]">
        {image && (
          <div className="flex items-start gap-3 px-3 pt-3">
            <div className="relative shrink-0">
              <img src={image} alt="Attached" className="h-16 w-auto rounded border border-rule object-cover" />
              <button
                type="button"
                onClick={() => setImage(null)}
                aria-label="Remove image"
                className="absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink text-paper"
              >
                <X size={13} />
              </button>
            </div>
            <p className="pt-1 text-xs text-ink-soft">
              Remove names, faces, health card numbers and other identifiers before sending. Images are not stored.
            </p>
          </div>
        )}
        <label htmlFor="composer-input" className="sr-only">
          Your clinical question
        </label>
        <textarea
          id="composer-input"
          ref={textareaRef}
          rows={compact ? 1 : 2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={placeholder}
          className={`block w-full resize-none border-0 bg-transparent px-4 pb-2 pt-3.5 text-[1.0625rem] leading-relaxed text-ink placeholder:text-ink-muted focus:ring-0 ${
            compact ? 'min-h-[52px]' : 'min-h-[84px]'
          }`}
        />
        <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
          <div className="flex items-center gap-1.5">
            <div className="inline-flex rounded-sheet border border-rule p-0.5" role="radiogroup" aria-label="Answer mode">
              {MODES.map(([value, label, Icon, hint]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={mode === value}
                  title={hint}
                  onClick={() => setMode(value)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-[4px] px-2.5 text-xs font-bold transition-colors ${
                    mode === value ? 'bg-pen text-paper-white' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              title="Attach an image: ECG, skin photo, lab report"
              aria-label="Attach image"
              className="inline-flex h-9 w-9 items-center justify-center rounded-sheet text-ink-muted hover:bg-paper-shade hover:text-ink"
            >
              <ImagePlus size={18} />
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={pick} />
          </div>
          {busy ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop answering"
              className="inline-flex h-9 items-center gap-1.5 rounded-sheet bg-ink px-3 text-xs font-bold text-paper hover:bg-black"
            >
              <Square size={12} fill="currentColor" /> Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              aria-label="Ask"
              className={`inline-flex h-9 items-center gap-1.5 rounded-sheet px-3 text-xs font-bold transition-colors ${
                canSubmit ? 'bg-pen text-paper-white hover:bg-pen-dark' : 'bg-paper-shade text-ink-faint'
              }`}
            >
              Ask <ArrowUp size={15} />
            </button>
          )}
        </div>
      </div>
      {imageError && (
        <p role="alert" className="mt-1.5 text-xs text-alert">
          {imageError}
        </p>
      )}
    </div>
  )
}
