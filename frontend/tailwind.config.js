import typography from '@tailwindcss/typography'
import forms from '@tailwindcss/forms'

// Semantic colour tokens. Each is a CSS variable of RGB channels set in index.css for the
// light and dark themes, so components never branch on theme for surfaces, text or lines,
// and opacity modifiers (bg-accent/10) still work.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // Themes follow the system setting; `dark:` is used only for categorical colours
  // (evidence badges, alerts) that come straight from the Tailwind palette.
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'), // page ground
        subtle: token('subtle'), // history rail, hover fills, quiet panels, inline code
        surface: token('surface'), // cards, composer, menus, sheets
        fg: {
          DEFAULT: token('fg'),
          soft: token('fg-soft'),
          muted: token('fg-muted'),
          faint: token('fg-faint'), // disabled text and decorative icons only
        },
        line: { DEFAULT: token('line'), strong: token('line-strong') },
        accent: {
          DEFAULT: token('accent'),
          hover: token('accent-hover'),
          fg: token('accent-fg'), // text on an accent fill
          text: token('accent-text'), // links and text actions
          soft: token('accent-soft'), // hover tint behind accent text
          // Field and composer focus ring: full strength in light, half in dark.
          focus: 'rgb(var(--accent) / var(--accent-focus-alpha))',
        },
        // Amber means one thing: the source being read now.
        hl: {
          key: { DEFAULT: token('hl-key'), fg: token('hl-key-fg'), ring: token('hl-key-ring') }, // the lit key
          soft: token('hl-soft'), // lit card fill
          ring: token('hl-ring'), // lit card border
        },
        maple: token('maple'),
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
