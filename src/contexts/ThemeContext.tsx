import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import { isTheme, THEMES, type Theme } from '@/lib/themes'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'wled-pro:theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (isTheme(stored)) {
      return stored
    }
    return 'light'
  })

  useEffect(() => {
    const root = document.documentElement

    for (const { id, className } of THEMES) {
      if (className) root.classList.toggle(className, id === theme)
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
