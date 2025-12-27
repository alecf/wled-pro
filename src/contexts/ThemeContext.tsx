/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'neon' | 'cyberpunk' | 'sunset' | 'ocean'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'wled-pro:theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return (stored as Theme) || 'light'
  })

  useEffect(() => {
    const root = document.documentElement

    // Remove all theme classes
    root.classList.remove('dark', 'theme-neon', 'theme-cyberpunk', 'theme-sunset', 'theme-ocean')

    // Add appropriate theme class
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme !== 'light') {
      root.classList.add(`theme-${theme}`)
    }

    // Persist theme
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

export const THEME_LABELS: Record<Theme, string> = {
  light: 'Clean',
  dark: 'Dark',
  neon: 'Neon',
  cyberpunk: 'Cyberpunk',
  sunset: 'Sunset',
  ocean: 'Ocean',
}
