// Drawn maple-leaf mark for Canadian sources (an icon, not an emoji).
export default function MapleLeaf({ size = 12, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M12 1.5l1.7 3.4 1.9-.9-.6 4.7 2.5-2.6.6 1.8 3.1-.6-1 3.3 1.3.7-4.6 3.9.6 1.9-4.5-.8.2 5.3h-1.4l.2-5.3-4.5.8.6-1.9-4.6-3.9 1.3-.7-1-3.3 3.1.6.6-1.8 2.5 2.6-.6-4.7 1.9.9z" />
    </svg>
  )
}
