/**
 * The app themes. Everything about a theme lives here: the picker's label and swatch, and the
 * class on <html> that selects its CSS variables (defined in src/index.css).
 */
export const THEMES = [
  {
    id: 'light',
    label: 'Clean',
    className: null,
    preview: { background: 'oklch(1 0 0)', primary: 'oklch(0.447 0.123 254.6)' },
  },
  {
    id: 'dark',
    label: 'Dark',
    className: 'dark',
    preview: { background: 'oklch(0.145 0 0)', primary: 'oklch(0.627 0.123 254.6)' },
  },
  {
    id: 'neon',
    label: 'Neon',
    className: 'theme-neon',
    preview: { background: 'oklch(0.08 0 0)', primary: 'oklch(0.75 0.25 330)' },
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk',
    className: 'theme-cyberpunk',
    preview: { background: 'oklch(0.1 0.02 280)', primary: 'oklch(0.7 0.25 180)' },
  },
  {
    id: 'sunset',
    label: 'Sunset',
    className: 'theme-sunset',
    preview: { background: 'oklch(0.95 0.03 50)', primary: 'oklch(0.55 0.2 30)' },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    className: 'theme-ocean',
    preview: { background: 'oklch(0.92 0.02 220)', primary: 'oklch(0.45 0.15 220)' },
  },
] as const

export type Theme = (typeof THEMES)[number]['id']

export function isTheme(value: unknown): value is Theme {
  return THEMES.some((t) => t.id === value)
}
