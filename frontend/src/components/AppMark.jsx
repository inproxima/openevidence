// The app's mark: a C holding three source lines, the middle one highlighted as a cited
// passage is. Brand teal, navy and lime; the navy lines lift to zinc in the dark theme.
// public/favicon.svg and public/brand/ are the same drawing (scripts/brand_assets.py).
export default function AppMark({ className = 'h-6 w-6' }) {
  return (
    <svg viewBox="0 0 48.25 48" aria-hidden="true" className={`shrink-0 ${className}`}>
      <path
        d="M24 0H38C42.06 0 48.25 4.95 48.25 8.2A1.55 1.55 0 0 1 46.7 9.75H23.25A13 14.25 0 0 0 10.25 24A13 14.25 0 0 0 23.25 38.25H46.7A1.55 1.55 0 0 1 48.25 39.8C48.25 43.05 42.06 48 38 48H24A24 24 0 0 1 0 24A24 24 0 0 1 24 0Z"
        className="fill-mark"
      />
      <rect x="17" y="14.25" width="21.5" height="5" rx="2.5" className="fill-mark-ink" />
      <rect x="17" y="21.5" width="30.75" height="5" rx="2.5" className="fill-mark-hl" />
      <rect x="17" y="28.75" width="21.5" height="5" rx="2.5" className="fill-mark-ink" />
    </svg>
  )
}
