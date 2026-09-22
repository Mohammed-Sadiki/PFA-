import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext(null)

function getInitialTheme() {
  // 1. Valeur sauvegardée dans localStorage
  const saved = localStorage.getItem('theme')
  if (saved === 'dark' || saved === 'light') return saved

  // 2. Détection automatique du thème système
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }

  // 3. Défaut : dark
  return 'dark'
}

function applyTheme(theme) {
  const root = document.documentElement
  // Ajouter une classe de transition pour une animation douce
  root.classList.add('theme-transitioning')
  
  if (theme === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.add('light')
    root.classList.remove('dark')
  }

  localStorage.setItem('theme', theme)

  // Retirer la classe de transition après l'animation
  setTimeout(() => {
    root.classList.remove('theme-transitioning')
  }, 400)
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Appliquer immédiatement pour éviter le flash
    const initial = getInitialTheme()
    applyTheme(initial)
    return initial
  })

  // Écouter les changements de préférence système (si pas de localStorage)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      // Seulement si l'utilisateur n'a pas choisi manuellement
      if (!localStorage.getItem('theme')) {
        const newTheme = e.matches ? 'dark' : 'light'
        setTheme(newTheme)
        applyTheme(newTheme)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const newTheme = t === 'dark' ? 'light' : 'dark'
      applyTheme(newTheme)
      return newTheme
    })
  }, [])

  const setThemeExplicit = useCallback((newTheme) => {
    setTheme(newTheme)
    applyTheme(newTheme)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme: setThemeExplicit, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
