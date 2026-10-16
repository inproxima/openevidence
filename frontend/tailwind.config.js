import typography from '@tailwindcss/typography'
import forms from '@tailwindcss/forms'

// Journal Club Printout: copy-paper ground, laser ink, a ballpoint-blue shell,
// and fluorescent highlighter inks reserved for evidence.
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: '#FAFAF7', white: '#FFFFFF', shade: '#F1F1EC' },
        ink: { DEFAULT: '#16181D', soft: '#30343C', muted: '#575D68', faint: '#8A8F98' },
        rule: { DEFAULT: '#D9DAD3', strong: '#B9BBB2' },
        pen: { DEFAULT: '#1D3FAE', dark: '#152F86', light: '#3C5CC9', wash: '#E8EDFF', mist: '#B9C8FF' },
        // Highlighter inks: the strokes, and the readable tints badges sit on.
        hl: {
          yellow: '#FFE24D', 'yellow-tint': '#FFF4B3',
          green: '#7EE08A', 'green-tint': '#D7F5DB',
          blue: '#8FD3FF', 'blue-tint': '#D6EEFF',
          pink: '#FF9EC3', 'pink-tint': '#FFDCEA',
          orange: '#FFB86B', 'orange-tint': '#FFE6CC',
          violet: '#C7B5FF', 'violet-tint': '#ECE5FF',
        },
        alert: { DEFAULT: '#B4232F', tint: '#FDECEC' },
        maple: '#C8102E',
      },
      fontFamily: {
        sans: ['"Atkinson Hyperlegible Next Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"STIX Two Text Variable"', 'STIX Two Text', 'Georgia', 'serif'],
      },
      // One strict scale. Answer prose uses `read`; UI uses 2xs-lg; the question title uses `title`.
      fontSize: {
        '2xs': ['0.75rem', { lineHeight: '1.1rem' }],
        xs: ['0.8125rem', { lineHeight: '1.2rem' }],
        sm: ['0.9375rem', { lineHeight: '1.4rem' }],
        read: ['1.09375rem', { lineHeight: '1.75rem' }],
        lg: ['1.3125rem', { lineHeight: '1.75rem' }],
        title: ['1.875rem', { lineHeight: '2.3rem' }],
        display: ['2.625rem', { lineHeight: '3rem' }],
      },
      borderRadius: { key: '999px', sheet: '6px' },
      boxShadow: {
        lift: '0 1px 2px rgba(22,24,29,0.06), 0 6px 18px -8px rgba(22,24,29,0.18)',
        sheet: '0 -8px 30px -12px rgba(22,24,29,0.35)',
        pop: '0 12px 32px -12px rgba(22,24,29,0.32), 0 2px 6px rgba(22,24,29,0.08)',
      },
      // One right edge for the question rule, answer (about 68ch of STIX at 17.5px),
      // related questions and composer.
      maxWidth: { measure: '37.5rem' },
      transitionTimingFunction: { out: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        // Motion from an already-visible state: content never starts hidden.
        rise: { '0%': { transform: 'translateY(8px)' }, '100%': { transform: 'none' } },
        'sheet-up': { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'none' } },
        blink: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0' } },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out both',
        rise: 'rise 320ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'sheet-up': 'sheet-up 360ms cubic-bezier(0.16, 1, 0.3, 1) both',
        blink: 'blink 1s step-end infinite',
      },
    },
  },
  plugins: [typography, forms],
}
