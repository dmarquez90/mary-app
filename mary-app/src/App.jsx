import { useState } from 'react'
import { StoreProvider } from './store'
import { LangProvider, useLanguage } from './i18n'
import { Icons } from './components'
import Dashboard from './pages/Dashboard'
import Proyectos from './pages/Proyectos'
import Presupuesto from './pages/Presupuesto'
import Inventario from './pages/Inventario'
import Compras from './pages/Compras'
import Financiero from './pages/Financiero'
import CurvaS from './pages/CurvaS'

const NAV = [
  { id: 'dashboard',  labelEs: 'Dashboard',    labelEn: 'Dashboard',  icon: 'dashboard' },
  { id: 'proyectos',  labelEs: 'Proyectos',    labelEn: 'Projects',   icon: 'projects'  },
  { id: 'presupuesto',labelEs: 'Presupuesto',  labelEn: 'Budget',     icon: 'budget'    },
  { id: 'inventario', labelEs: 'Inventario',   labelEn: 'Inventory',  icon: 'inventory' },
  { id: 'compras',    labelEs: 'Compras / OC', labelEn: 'Purchases',  icon: 'purchases' },
  { id: 'financiero', labelEs: 'Financiero',   labelEn: 'Financial',  icon: 'financial' },
  { id: 'curvas',     labelEs: 'Curva S',      labelEn: 'S Curve',    icon: 'curvas'    },
]

const PAGES = {
  dashboard:   Dashboard,
  proyectos:   Proyectos,
  presupuesto: Presupuesto,
  inventario:  Inventario,
  compras:     Compras,
  financiero:  Financiero,
  curvas:      CurvaS,
}

function Layout() {
  const [page, setPage]       = useState('dashboard')
  const [sideOpen, setSideOpen] = useState(true)
  const { lang, toggleLang }  = useLanguage()   // ← toggleLang en vez de setLang
  const Page = PAGES[page] || Dashboard

  const isEs = lang === 'ES'  // ← comparación en MAYÚSCULAS

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* ── SIDEBAR ─────────────────────────────────────── */}
      <aside className={`flex flex-col bg-gray-900 transition-all duration-200 ${sideOpen ? 'w-52' : 'w-14'} flex-shrink-0`}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: '#1D9E75' }}
          >
            <span className="text-white font-bold text-xs">M</span>
          </div>
          {sideOpen && (
            <div>
              <p className="text-white font-semibold text-sm leading-none">MARY</p>
              <p className="text-gray-500 text-xs mt-0.5">
                ERP {isEs ? 'Construcción' : 'Construction'}
              </p>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 flex flex-col gap-0.5 px-2">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors w-full
                ${page === item.id
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}
              style={page === item.id ? { background: '#1D9E75' } : {}}
              title={!sideOpen ? (isEs ? item.labelEs : item.labelEn) : ''}
            >
              <span className="w-4 h-4 flex-shrink-0">{Icons[item.icon]}</span>
              {sideOpen && (
                <span className="text-sm font-medium truncate">
                  {isEs ? item.labelEs : item.labelEn}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Botón de idioma ── ahora llama toggleLang() */}
        <div className="px-2 pb-2">
          <button
            onClick={() => toggleLang()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            title={isEs ? 'Switch to English' : 'Cambiar a Español'}
          >
            <span className="text-xs font-bold text-gray-300">
              {isEs ? 'ES' : 'EN'}
            </span>
            {sideOpen && (
              <span className="text-xs text-gray-400">
                {isEs ? '→ EN' : '→ ES'}
              </span>
            )}
          </button>
        </div>

        {/* Colapsar sidebar */}
        <button
          onClick={() => setSideOpen(!sideOpen)}
          className="flex items-center justify-center py-3 border-t border-gray-800 text-gray-500 hover:text-gray-300"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {sideOpen
              ? <polyline points="15 18 9 12 15 6"/>
              : <polyline points="9 18 15 12 9 6"/>}
          </svg>
        </button>
      </aside>

      {/* ── CONTENIDO PRINCIPAL ─────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="font-semibold text-gray-800 text-sm">
              {isEs
                ? NAV.find(n => n.id === page)?.labelEs
                : NAV.find(n => n.id === page)?.labelEn}
            </p>
            <p className="text-xs text-gray-400">Marquez Project Solutions LLC</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {new Date().toLocaleDateString(
                isEs ? 'es' : 'en',
                { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
              )}
            </span>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
              style={{ background: '#1D9E75' }}
            >
              D
            </div>
          </div>
        </header>

        {/* Página activa */}
        <main className="flex-1 overflow-y-auto">
          <Page onNavigate={setPage} />
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <LangProvider>      {/* ← LangProvider envuelve el Layout */}
        <Layout />
      </LangProvider>
    </StoreProvider>
  )
}
