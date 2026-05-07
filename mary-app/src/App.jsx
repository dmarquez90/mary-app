import { useState } from 'react'
import { StoreProvider } from './store'
import { LangProvider, useLanguage } from './i18n'
import { AuthProvider, useAuth } from './auth'
import { usePermissions, NAV_PERMISOS } from './usePermissions'
import { Icons } from './components'
import AuthRouter from './pages/AuthRouter'
import Admin from './pages/Admin'
import Configuracion from './pages/Configuracion'
import Dashboard from './pages/Dashboard'
import Proyectos from './pages/Proyectos'
import Presupuesto from './pages/Presupuesto'
import Inventario from './pages/Inventario'
import MatPresupuestados from './pages/MatPresupuestados'
import Compras from './pages/Compras'
import Financiero from './pages/Financiero'
import CurvaS from './pages/CurvaS'
import Reportes from './pages/Reportes'
import maryLogo from './assets/mary-logo.png'


const BRAND       = '#1B3A6B'
const BRAND_LIGHT = '#2E5FA3'
const BRAND_DARK  = '#122848'

const NAV = [
  { id: 'dashboard',   labelEs: 'Dashboard',           labelEn: 'Dashboard',          icon: 'dashboard' },
  { id: 'proyectos',   labelEs: 'Proyectos',           labelEn: 'Projects',           icon: 'projects'  },
  { id: 'presupuesto', labelEs: 'Presupuesto',         labelEn: 'Budget',             icon: 'budget'    },
  { id: 'inventario',  labelEs: 'Inventario',          labelEn: 'Inventory',          icon: 'inventory' },
  { id: 'mat_pres',    labelEs: 'Mat. Presupuestados', labelEn: 'Budgeted Materials', icon: 'matpres'   },
  { id: 'compras',     labelEs: 'Compras / OC',        labelEn: 'Purchases',          icon: 'purchases' },
  { id: 'financiero',  labelEs: 'Financiero',          labelEn: 'Financial',          icon: 'financial' },
  { id: 'curvas',      labelEs: 'Curva S',             labelEn: 'S Curve',            icon: 'curvas'    },
  { id: 'reportes',    labelEs: 'Reportes',            labelEn: 'Reports',            icon: 'curvas'    },
]

const PAGES = {
  dashboard:     Dashboard,
  proyectos:     Proyectos,
  presupuesto:   Presupuesto,
  inventario:    Inventario,
  mat_pres:      MatPresupuestados,
  compras:       Compras,
  financiero:    Financiero,
  curvas:        CurvaS,
  configuracion: Configuracion,
  reportes:      Reportes,
}

function Layout() {
  const { perfil, logout, isSuperAdmin, isClientAdmin } = useAuth()
  const { navVisible } = usePermissions()
  const { lang, toggleLang } = useLanguage()

  const navFiltrado = NAV.filter(item => navVisible(item.id))
  const defaultPage = navFiltrado[0]?.id || 'dashboard'

  const [page, setPage]         = useState(defaultPage)
  const [sideOpen, setSideOpen] = useState(true)
  const isEs = lang === 'ES'

  const Page = PAGES[page] || Dashboard
  const currentNav = NAV.find(n => n.id === page)

  const iniciales = perfil?.nombre
    ? perfil.nombre.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()
    : 'U'

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F0F4F8' }}>

      {/* SIDEBAR */}
      <aside className={`flex flex-col flex-shrink-0 transition-all duration-200 ${sideOpen ? 'w-60' : 'w-16'}`}
        style={{ background: BRAND_DARK, borderRight: `1px solid ${BRAND}` }}>

        <div className={`flex items-center px-4 py-4 border-b flex-shrink-0 ${sideOpen ? 'justify-start' : 'justify-center'}`}
          style={{ borderColor: BRAND, minHeight: 64 }}>
          {sideOpen ? (
            <img src={maryLogo} alt="MARY" className="h-9 w-auto object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
              style={{ background: BRAND_LIGHT }}>M</div>
          )}
        </div>

        {sideOpen && (
          <div className="px-4 py-2 border-b" style={{ borderColor: `${BRAND}80` }}>
            <p className="text-xs font-medium truncate" style={{ color: '#7FA8D4' }}>
              {perfil?.tenants?.nombre_empresa || 'Marquez Project Solutions LLC'}
            </p>
          </div>
        )}

        <nav className="flex-1 py-3 flex flex-col gap-0.5 px-2 overflow-y-auto">
          {navFiltrado.map(item => {
            const active = page === item.id
            return (
              <button key={item.id} onClick={() => setPage(item.id)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 w-full relative"
                style={{ background: active ? BRAND_LIGHT : 'transparent', color: active ? '#fff' : '#93B8D8' }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = `${BRAND}80` }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                title={!sideOpen ? (isEs ? item.labelEs : item.labelEn) : ''}>
                {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full" style={{ background: '#7FB3E8' }} />}
                <span className="w-4 h-4 flex-shrink-0">{Icons[item.icon]}</span>
                {sideOpen && <span className="text-sm font-medium truncate">{isEs ? item.labelEs : item.labelEn}</span>}
              </button>
            )
          })}
        </nav>

        {/* Configuración — client_admin y super_admin */}
        {isClientAdmin && (
          <div className="px-2 pb-1 border-t pt-2" style={{ borderColor: `${BRAND}80` }}>
            <button onClick={() => setPage('configuracion')}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-colors relative"
              style={{ background: page === 'configuracion' ? BRAND_LIGHT : 'transparent', color: page === 'configuracion' ? '#fff' : '#93B8D8' }}
              onMouseEnter={e => { if (page !== 'configuracion') e.currentTarget.style.background = `${BRAND}80` }}
              onMouseLeave={e => { if (page !== 'configuracion') e.currentTarget.style.background = 'transparent' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
              {sideOpen && <span className="text-sm font-medium">{isEs ? 'Configuración' : 'Settings'}</span>}
            </button>
          </div>
        )}

        {/* Admin Panel — solo Super Admin */}
        {isSuperAdmin && (
          <div className="px-2 pb-1 border-t pt-2" style={{ borderColor: `${BRAND}80` }}>
            <a href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-colors"
              style={{ color: '#F59E0B' }}
              onMouseEnter={e => e.currentTarget.style.background = `${BRAND}80`}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                <path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
              {sideOpen && <span className="text-sm font-medium">{isEs ? 'Panel Admin' : 'Admin Panel'}</span>}
            </a>
          </div>
        )}

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

      {/* MAIN */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 flex-shrink-0"
          style={{ background: '#fff', borderBottom: '1px solid #D6E4F0', height: 64 }}>
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 rounded-full" style={{ background: BRAND }} />
            <div>
              <p className="font-bold text-gray-900 text-base leading-tight">
                {isEs ? currentNav?.labelEs : currentNav?.labelEn}
              </p>
              <p className="text-xs text-gray-400">Marquez Project Solutions LLC</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
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
            <div className="w-px h-8 bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow"
                style={{ background: `linear-gradient(135deg, ${BRAND_LIGHT}, ${BRAND_DARK})` }}>
                {iniciales}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-semibold text-gray-800 leading-none">{perfil?.nombre || 'Usuario'}</p>
                <p className="text-xs text-gray-400 mt-0.5 capitalize">{perfil?.rol?.replace('_', ' ') || ''}</p>
              </div>
              <button onClick={logout}
                className="ml-2 text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                title={isEs ? 'Cerrar sesión' : 'Sign out'}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Page onNavigate={setPage} />
        </main>
      </div>
    </div>
  )
}

function AppContent() {
  const { user, perfil, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0F4F8' }}>
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-[#1B3A6B] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Cargando MARY...</p>
      </div>
    </div>
  )

  if (!user) return <AuthRouter />

  const isAdminRoute = window.location.pathname === '/admin'
  if (isAdminRoute && perfil?.rol === 'super_admin') return <Admin />

  return (
    <StoreProvider tenantId={perfil?.tenant_id}>
      <LangProvider>
        <Layout />
      </LangProvider>
    </StoreProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
