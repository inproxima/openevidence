import { useEffect, useRef, useState } from 'react'
import { ArrowUp, ImagePlus, ShieldAlert, Square, Telescope, X, Zap } from 'lucide-react'
import { btn } from '../ui.js'

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
      <div className="rounded-xl bg-surface shadow-sm ring-1 ring-line transition-shadow focus-within:ring-2 focus-within:ring-accent-focus">
        {image && (
          <div className="flex items-start gap-3 px-3 pt-3">
            <div className="relative shrink-0">
              <img src={image} alt="Attached" className="h-16 w-auto rounded-lg object-cover ring-1 ring-line" />
              <button
                type="button"
                onClick={() => setImage(null)}
                aria-label="Remove image"
                className="absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-fg text-canvas shadow-sm ring-2 ring-surface hover:bg-fg-soft"
              >
                <X size={13} />
              </button>
            </div>
            <p className="flex gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-900 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/20">
              <ShieldAlert size={15} aria-hidden="true" className="mt-px shrink-0" />
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
          className={`block w-full resize-none border-0 bg-transparent px-4 pb-2 pt-3.5 text-[1.0625rem] leading-relaxed text-fg placeholder:text-fg-muted focus:ring-0 ${
            compact ? 'min-h-[52px]' : 'min-h-[84px]'
          }`}
        />
        <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
          <div className="flex items-center gap-1.5">
            <div className="inline-flex rounded-lg bg-subtle p-0.5 ring-1 ring-inset ring-line" role="radiogroup" aria-label="Answer mode">
              {MODES.map(([value, label, Icon, hint]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={mode === value}
                  title={hint}
                  onClick={() => setMode(value)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors focus-visible:outline-offset-0 ${
                    mode === value ? 'bg-surface text-fg shadow-sm ring-1 ring-line' : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  <Icon size={14} className={mode === value ? 'text-accent-text' : ''} />
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              title="Attach an image: ECG, skin photo, lab report"
              aria-label="Attach image"
              className={btn.icon}
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
              className={btn.dark}
            >
              <Square size={12} fill="currentColor" /> Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              aria-label="Ask"
              className={btn.primary}
            >
              Ask <ArrowUp size={15} />
            </button>
          )}
        </div>
      </div>
      {imageError && (
        <p role="alert" className="mt-1.5 text-xs text-red-700 dark:text-red-400">
          {imageError}
        </p>
      )}
    </div>
  )
}
