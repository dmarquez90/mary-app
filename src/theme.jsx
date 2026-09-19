import { createContext, useContext, useEffect, useState, useCallback } from 'react'

// ─────────────────────────────────────────────────────────────
//  MARY — Tema claro / oscuro
//  Escribe data-theme en <html>; todos los colores de la app
//  salen de las variables CSS definidas en index.css.
// ─────────────────────────────────────────────────────────────

const LS_KEY = 'mary_theme'          // 'light' | 'dark' | 'system'
const ThemeContext = createContext(null)

export const useTheme = () => useContext(ThemeContext)

function leerPreferencia() {
  try {
    const saved = localStorage.getItem(LS_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  } catch { /* localStorage bloqueado */ }
  return 'system'
}

function sistemaPrefiereOscuro() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

function aplicar(modo) {
  const resuelto = modo === 'system' ? (sistemaPrefiereOscuro() ? 'dark' : 'light') : modo
  const root = document.documentElement
  root.setAttribute('data-theme', resuelto)
  root.style.colorScheme = resuelto
  return resuelto
}

export function ThemeProvider({ children }) {
  const [modo, setModo]       = useState(leerPreferencia)
  const [resuelto, setResuelto] = useState(() => aplicar(leerPreferencia()))

  useEffect(() => {
    setResuelto(aplicar(modo))
    try { localStorage.setItem(LS_KEY, modo) } catch { /* ignorar */ }
  }, [modo])

  // Si está en "system", seguir los cambios del sistema operativo
  useEffect(() => {
    if (modo !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setResuelto(aplicar('system'))
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [modo])

  const toggle = useCallback(() => {
    setModo(prev => {
      const actual = prev === 'system' ? (sistemaPrefiereOscuro() ? 'dark' : 'light') : prev
      return actual === 'dark' ? 'light' : 'dark'
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ modo, setModo, theme: resuelto, isDark: resuelto === 'dark', toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Aplica el tema guardado lo antes posible para evitar el "flash" blanco
export function aplicarTemaInicial() {
  aplicar(leerPreferencia())
}
