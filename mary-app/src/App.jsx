import { useState } from 'react'
import { StoreProvider } from './store'
import { LangProvider, useLanguage } from './i18n'
import { Icons } from './components'
import Dashboard from './pages/Dashboard'
import Proyectos from './pages/Proyectos'
import Presupuesto from './pages/Presupuesto'
import Inventario from './pages/Inventario'
import MatPresupuestados from './pages/MatPresupuestados'
import Compras from './pages/Compras'
import Financiero from './pages/Financiero'
import CurvaS from './pages/CurvaS'
import maryLogo from './assets/mary-logo.png'

const BRAND = '#1B3A6B'
const BRAND_LIGHT = '#2E5FA3'
const BRAND_DARK  = '#122848'
const ACCENT = '#2E6DB4'

const NAV = [
  { id: 'dashboard',   labelEs: 'Dashboard',           labelEn: 'Dashboard',          icon: 'dashboard' },
  { id: 'proyectos',   labelEs: 'Proyectos',           labelEn: 'Projects',           icon: 'projects'  },
  { id: 'presupuesto', labelEs: 'Presupuesto',         labelEn: 'Budget',             icon: 'budget'    },
  { id: 'inventario',  labelEs: 'Inventario',          labelEn: 'Inventory',          icon: 'inventory' },
  { id: 'mat_pres',    labelEs: 'Mat. Presupuestados', labelEn: 'Budgeted Materials', icon: 'matpres'   },
  { id: 'compras',     labelEs: 'Compras / OC',        labelEn: 'Purchases',          icon: 'purchases' },
  { id: 'financiero',  labelEs: 'Financiero',          labelEn: 'Financial',          icon: 'financial' },
  { id: 'curvas',      labelEs: 'Curva S',             labelEn: 'S Curve',            icon: 'curvas'    },
]

const PAGES = {
  dashboard:   Dashboard,
  proyectos:   Proyectos,
  presupuesto: Presupuesto,
  inventario:  Inventario,
  mat_pres:    MatPresupuestados,
  compras:     Compras,
  financiero:  Financiero,
  curvas:      CurvaS,
}

function Layout() {
  const [page, setPage]         = useState('dashboard')
  const [sideOpen, setSideOpen] = useState(true)
  const { lang, toggleLang }    = useLanguage()
  const Page = PAGES[page] || Dashboard
  const isEs = lang === 'ES'

  const currentNav = NAV.find(n => n.id === page)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F0F4F8' }}>

      {/* ── SIDEBAR ── */}
      <aside
        className={`flex flex-col flex-shrink-0 transition-all duration-200 ${sideOpen ? 'w-60' : 'w-16'}`}
        style={{ background: BRAND_DARK, borderRight: `1px solid ${BRAND}` }}>

        {/* Logo area */}
        <div className={`flex items-center px-4 py-4 border-b flex-shrink-0 ${sideOpen ? 'justify-start gap-3' : 'justify-center'}`}
          style={{ borderColor: BRAND, minHeight: 64 }}>
          {sideOpen ? (
            <img src={maryLogo} alt="MARY" className="h-9 w-auto object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
              style={{ background: BRAND_LIGHT }}>M</div>
          )}
        </div>

        {/* Company tag */}
        {sideOpen && (
          <div className="px-4 py-2 border-b" style={{ borderColor: `${BRAND}80` }}>
            <p className="text-xs font-medium truncate" style={{ color: '#7FA8D4' }}>
              Marquez Project Solutions LLC
            </p>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 py-3 flex flex-col gap-0.5 px-2 overflow-y-auto">
          {NAV.map(item => {
            const active = page === item.id
            return (
              <button key={item.id} onClick={() => setPage(item.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 w-full group relative`}
                style={{
                  background: active ? BRAND_LIGHT : 'transparent',
                  color: active ? '#fff' : '#93B8D8',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = `${BRAND}80` }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                title={!sideOpen ? (isEs ? item.labelEs : item.labelEn) : ''}>
                {/* Active indicator */}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                    style={{ background: '#7FB3E8' }} />
                )}
                <span className="w-4 h-4 flex-shrink-0">{Icons[item.icon]}</span>
                {sideOpen && (
                  <span className="text-sm font-medium truncate">
                    {isEs ? item.labelEs : item.labelEn}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Language toggle */}
        <div className="px-2 pb-2 border-t pt-2" style={{ borderColor: `${BRAND}80` }}>
          <button onClick={toggleLang}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors"
            style={{ background: `${BRAND}60`, color: '#93B8D8' }}
            onMouseEnter={e => e.currentTarget.style.background = BRAND_LIGHT}
            onMouseLeave={e => e.currentTarget.style.background = `${BRAND}60`}>
            <span className="text-xs font-bold">{isEs ? 'ES' : 'EN'}</span>
            {sideOpen && <span className="text-xs">{isEs ? '→ EN' : '→ ES'}</span>}
          </button>
        </div>

        {/* Collapse button */}
        <button onClick={() => setSideOpen(!sideOpen)}
          className="flex items-center justify-center py-3 border-t transition-colors"
          style={{ borderColor: `${BRAND}80`, color: '#7FA8D4' }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = '#7FA8D4'}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {sideOpen ? <polyline points="15 18 9 12 15 6"/> : <polyline points="9 18 15 12 9 6"/>}
          </svg>
        </button>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="flex items-center justify-between px-6 flex-shrink-0"
          style={{ background: '#fff', borderBottom: '1px solid #D6E4F0', height: 64 }}>
          <div className="flex items-center gap-3">
            {/* Breadcrumb line */}
            <div className="w-1 h-8 rounded-full" style={{ background: BRAND }} />
            <div>
              <p className="font-bold text-gray-900 text-base leading-tight">
                {isEs ? currentNav?.labelEs : currentNav?.labelEn}
              </p>
              <p className="text-xs text-gray-400">Marquez Project Solutions LLC</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Date */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: '#F0F4F8', border: '1px solid #D6E4F0' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1B3A6B" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span className="text-xs font-medium" style={{ color: BRAND }}>
                {new Date().toLocaleDateString(isEs ? 'es' : 'en', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
              </span>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-gray-200" />

            {/* User avatar */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow"
                style={{ background: `linear-gradient(135deg, ${BRAND_LIGHT}, ${BRAND_DARK})` }}>
                D
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-semibold text-gray-800 leading-none">Deybi M.</p>
                <p className="text-xs text-gray-400 mt-0.5">Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
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
      <LangProvider>
        <Layout />
      </LangProvider>
    </StoreProvider>
  )
}
