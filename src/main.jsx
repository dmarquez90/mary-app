import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { LanguageProvider } from './i18n'
import { ThemeProvider, aplicarTemaInicial } from './theme'
import { ToastProvider } from './components'

// Aplica el tema guardado antes del primer render (evita el destello)
aplicarTemaInicial()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
)