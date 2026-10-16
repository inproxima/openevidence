// The app's mark: a page of text with one line highlighted, as a cited claim is.
// Drawn in the theme's accent; the favicon in index.html is the same drawing.
export default function AppMark({ className = 'h-6 w-6' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`shrink-0 ${className}`}>
      <rect width="24" height="24" rx="6" className="fill-accent" />
      <rect x="5.5" y="10" width="13" height="4.5" rx="1.25" className="fill-hl-key" />
      <path d="M7 7h10M7 17.5h6.5" strokeWidth="1.75" strokeLinecap="round" className="stroke-accent-fg" />
    </svg>
  )
}
