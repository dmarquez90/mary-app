import { useState } from 'react'
import { StoreProvider } from './store'
import { Icons } from './components'
import Dashboard from './pages/Dashboard'
import Proyectos from './pages/Proyectos'
import Presupuesto from './pages/Presupuesto'
import Inventario from './pages/Inventario'
import Compras from './pages/Compras'
import Financiero from './pages/Financiero'
import CurvaS from './pages/CurvaS'

const NAV = [
  { id: 'dashboard', label: 'Dashboard',    icon: 'dashboard' },
  { id: 'proyectos', label: 'Proyectos',    icon: 'projects'  },
  { id: 'presupuesto',label:'Presupuesto',  icon: 'budget'    },
  { id: 'inventario',label: 'Inventario',   icon: 'inventory' },
  { id: 'compras',   label: 'Compras / OC', icon: 'purchases' },
  { id: 'financiero',label: 'Financiero',   icon: 'financial' },
  { id: 'curvas',    label: 'Curva S',      icon: 'curvas'    },
]

const PAGES = {
  dashboard: Dashboard, proyectos: Proyectos, presupuesto: Presupuesto,
  inventario: Inventario, compras: Compras, financiero: Financiero, curvas: CurvaS
}

function Layout() {
  const [page, setPage] = useState('dashboard')
  const [sideOpen, setSideOpen] = useState(true)
  const Page = PAGES[page] || Dashboard

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className={`flex flex-col bg-gray-900 transition-all duration-200 ${sideOpen ? 'w-52' : 'w-14'} flex-shrink-0`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#1D9E75' }}>
            <span className="text-white font-bold text-xs">M</span>
          </div>
          {sideOpen && (
            <div>
              <p className="text-white font-semibold text-sm leading-none">MARY</p>
              <p className="text-gray-500 text-xs mt-0.5">ERP Construcción</p>
            </div>
          )}
        </div>
        {/* Nav */}
        <nav className="flex-1 py-4 flex flex-col gap-0.5 px-2">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors w-full
                ${page === item.id ? 'text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}
              style={page === item.id ? { background: '#1D9E75' } : {}}
              title={!sideOpen ? item.label : ''}
            >
              <span className="w-4 h-4 flex-shrink-0">{Icons[item.icon]}</span>
              {sideOpen && <span className="text-sm font-medium truncate">{item.label}</span>}
            </button>
          ))}
        </nav>
        {/* Collapse toggle */}
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

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="font-semibold text-gray-800 text-sm">{NAV.find(n => n.id === page)?.label}</p>
            <p className="text-xs text-gray-400">Marquez Project Solutions LLC</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{new Date().toLocaleDateString('es', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</span>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ background: '#1D9E75' }}>D</div>
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
      <Layout />
    </StoreProvider>
  )
}
