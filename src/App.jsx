import { useState, useEffect, useRef } from 'react'
import { SubscriptionContext } from './subscriptionContext'
import { StoreProvider } from './store'
import { LangProvider, useLanguage } from './i18n'
import { AuthProvider, useAuth } from './auth'
import { usePermissions, NAV_PERMISOS } from './usePermissions'
import { MODULOS_PRO_PLUS, PLAN_INFO } from './plans'
import { Icons } from './components'
import { supabase } from './supabase'
import AuthRouter from './pages/AuthRouter'
import Admin from './pages/Admin'
import Configuracion from './pages/Configuracion'
import Dashboard from './pages/Dashboard'
import Proyectos from './pages/Proyectos'
import Presupuesto from './pages/Presupuesto'
import Inventario from './pages/Inventario'
import MatPresupuestados from './pages/MatPresupuestados'
import Compras from './pages/Compras'
import OrdenesCambio from './pages/OrdenesCambio'
import AvaluosCliente from './pages/AvaluosCliente'
import Financiero from './pages/Financiero'
import CurvaS from './pages/CurvaS'
import Reportes from './pages/Reportes'
import Chat from './pages/Chat'
import NotificacionesPanel from './pages/NotificacionesPanel'
import PagoExitoso from './pages/PagoExitoso'
import Planes from './pages/Planes'
import WelcomeTour from './pages/WelcomeTour'

const BRAND       = '#1B3A6B'
const BRAND_LIGHT = '#2E5FA3'
const BRAND_DARK  = '#122848'

const NAV = [
  { id: 'dashboard',      labelEs: 'Dashboard',           labelEn: 'Dashboard',          icon: 'dashboard' },
  { id: 'proyectos',      labelEs: 'Proyectos',           labelEn: 'Projects',           icon: 'projects'  },
  { id: 'presupuesto',    labelEs: 'Presupuesto',         labelEn: 'Budget',             icon: 'budget'    },
  { id: 'inventario',     labelEs: 'Inventario',          labelEn: 'Inventory',          icon: 'inventory' },
  { id: 'mat_pres',       labelEs: 'Mat. Presupuestados', labelEn: 'Budgeted Materials', icon: 'matpres'   },
  { id: 'compras',        labelEs: 'Compras / OC',        labelEn: 'Purchases',          icon: 'purchases' },
  { id: 'ordenes_cambio', labelEs: 'Órdenes de Cambio',  labelEn: 'Change Orders',      icon: 'budget'    },
  { id: 'avaluos',        labelEs: 'Avalúos',             labelEn: 'Valuations',         icon: 'financial' },
  { id: 'financiero',     labelEs: 'Financiero',          labelEn: 'Financial',          icon: 'financial' },
  { id: 'curvas',         labelEs: 'Curva S',             labelEn: 'S Curve',            icon: 'curvas'    },
  { id: 'reportes',       labelEs: 'Reportes',            labelEn: 'Reports',            icon: 'curvas'    },
  { id: 'chat',           labelEs: 'Chat',                labelEn: 'Chat',               icon: 'chat'      },
]

const PAGES = {
  dashboard:      Dashboard,
  proyectos:      Proyectos,
  presupuesto:    Presupuesto,
  inventario:     Inventario,
  mat_pres:       MatPresupuestados,
  compras:        Compras,
  ordenes_cambio: OrdenesCambio,
  avaluos:        AvaluosCliente,
  financiero:     Financiero,
  curvas:         CurvaS,
  configuracion:  Configuracion,
  reportes:       Reportes,
  chat:           Chat,
}

// ── Pantalla de upgrade para módulos bloqueados por plan ─────────────
function PlanUpgradeScreen({ moduloId, isEs }) {
  const navItem = NAV.find(n => n.id === moduloId)
  const nombre  = isEs ? navItem?.labelEs : navItem?.labelEn

  return (
    <div className="flex items-center justify-center min-h-full p-8">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: '#EEEDFE' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3"
          style={{ background: '#EEEDFE', color: '#3C3489' }}>
          <span>Pro+</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {isEs ? `${nombre} requiere plan Pro o superior` : `${nombre} requires Pro plan or higher`}
        </h2>
        <p className="text-sm text-gray-500 mb-6" style={{ lineHeight: 1.6 }}>
          {isEs
            ? 'Este módulo no está disponible en el plan Starter. Actualiza tu plan para acceder a Órdenes de Cambio, Avalúos y más.'
            : 'This module is not available on the Starter plan. Upgrade to access Change Orders, Valuations, and more.'}
        </p>
        <div className="rounded-xl border p-4 text-left mb-4"
          style={{ borderColor: '#AFA9EC', background: '#EEEDFE' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: '#3C3489' }}>
            {isEs ? 'Plan Pro — $49.99/mes' : 'Pro Plan — $49.99/mo'}
          </p>
          {[
            isEs ? '3 usuarios · 5 proyectos' : '3 users · 5 projects',
            isEs ? 'Órdenes de Cambio' : 'Change Orders',
            isEs ? 'Avalúos de clientes' : 'Client Valuations',
            isEs ? 'Todos los módulos base' : 'All base modules',
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs mb-1" style={{ color: '#534AB7' }}>
              <span style={{ color: '#0F6E56' }}>✓</span> {item}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400">
          {isEs
            ? 'Contacta a soporte para actualizar tu plan: soporte@appmary.com'
            : 'Contact support to upgrade: soporte@appmary.com'}
        </p>
      </div>
    </div>
  )
}

function Layout() {
  const { perfil, logout, isSuperAdmin, isClientAdmin, plan } = useAuth()
  const { navVisible, canUsePlan } = usePermissions()
  const { lang, toggleLang } = useLanguage()

  const navFiltrado = NAV.filter(item => navVisible(item.id))
  const defaultPage = navFiltrado[0]?.id || 'dashboard'

  const [page, setPage]         = useState(defaultPage)
  const [sideOpen, setSideOpen] = useState(true)
  const [chatUnread, setChatUnread] = useState(0)
  const isEs = lang === 'ES'

  // ── Estado de suscripción ────────────────────────────
  const [subStatus, setSubStatus] = useState(null)

  const checkSub = async () => {
    if (!perfil?.tenant_id) return
    const [{ data: t }, { data: s }] = await Promise.all([
      supabase.from('tenants').select('plan, es_trial, plan_vitalicio, grace_period_fin').eq('id', perfil.tenant_id).single(),
      supabase.from('suscripciones').select('status').eq('empresa_id', perfil.tenant_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    setSubStatus({
      plan:            t?.plan,
      plan_vitalicio:  t?.plan_vitalicio,
      grace_period_fin: t?.grace_period_fin,
      subStatus:       s?.status || null,
    })
  }

  useEffect(() => {
    checkSub()
  }, [perfil?.tenant_id])

  // #5 — Realtime: detecta cambios de plan en tiempo real (ej. otro admin renueva)
  useEffect(() => {
    if (!perfil?.tenant_id) return
    const channel = supabase
      .channel(`tenant_plan_${perfil.tenant_id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'tenants',
        filter: `id=eq.${perfil.tenant_id}`,
      }, () => checkSub())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [perfil?.tenant_id])

  const now = new Date()
  // Grace period activo: suscripción cancelada pero aún dentro del período de gracia
  const gracePeriodActive = subStatus?.grace_period_fin && new Date(subStatus.grace_period_fin) > now
  const daysGraceLeft = subStatus?.grace_period_fin
    ? Math.max(0, Math.ceil((new Date(subStatus.grace_period_fin) - now) / (1000 * 60 * 60 * 24)))
    : 0

  // #2 — past_due: pago fallido pero aún no cancelado → advertencia sin bloqueo
  const isPastDue = subStatus?.subStatus === 'past_due'

  // Modo lectura: plan trial + grace period vencido (o inexistente) + no vitalicio
  const isReadOnly = !isSuperAdmin && subStatus !== null && !subStatus.plan_vitalicio && (
    subStatus.plan === 'trial' && !gracePeriodActive
  )

  // Tipo de advertencia (si no está bloqueado)
  const subWarning = isReadOnly ? null : (
    gracePeriodActive ? 'grace' : isPastDue ? 'past_due' : null
  )

  // ── Badge de mensajes no leídos en nav ───────────────
  useEffect(() => {
    if (!perfil?.id || !perfil?.tenant_id) return

    async function loadChatUnread() {
      const { data: parts } = await supabase
        .from('chat_participantes')
        .select('canal_id, ultimo_leido')
        .eq('usuario_id', perfil.id)
      if (!parts?.length) return

      let total = 0
      await Promise.all(parts.map(async (p) => {
        const { count } = await supabase
          .from('chat_mensajes')
          .select('id', { count: 'exact', head: true })
          .eq('canal_id', p.canal_id)
          .neq('usuario_id', perfil.id)
          .gt('created_at', p.ultimo_leido || '1970-01-01')
        total += count || 0
      }))
      setChatUnread(total)
    }

    loadChatUnread()

    const channel = supabase
      .channel(`nav_chat_${perfil.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_mensajes',
        filter: `tenant_id=eq.${perfil.tenant_id}`,
      }, (payload) => {
        if (payload.new.usuario_id !== perfil.id) {
          if (page !== 'chat') setChatUnread(prev => prev + 1)
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [perfil?.id, perfil?.tenant_id])

  useEffect(() => {
    if (page === 'chat') setChatUnread(0)
  }, [page])

  // Si el módulo activo está bloqueado por plan, mostrar pantalla upgrade
  const pageBlockedByPlan = MODULOS_PRO_PLUS.includes(page) && !canUsePlan(page)

  const Page = PAGES[page] || Dashboard
  const currentNav = NAV.find(n => n.id === page)

  const iniciales = perfil?.nombre
    ? perfil.nombre.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()
    : 'U'

  // Badge de plan en sidebar
  const planInfo = PLAN_INFO[plan] || PLAN_INFO.starter

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F0F4F8' }}>

      {/* SIDEBAR */}
      <aside className={`flex flex-col flex-shrink-0 transition-all duration-200 ${sideOpen ? 'w-60' : 'w-16'}`}
        style={{ background: BRAND_DARK, borderRight: `1px solid ${BRAND}` }}>

        <div className={`flex items-center px-4 py-4 border-b flex-shrink-0 ${sideOpen ? 'justify-start' : 'justify-center'}`}
          style={{ borderColor: BRAND, minHeight: 64 }}>
          {sideOpen ? (
            <svg viewBox="0 0 200 56" xmlns="http://www.w3.org/2000/svg" style={{ height: "36px", width: "auto" }} aria-label="MARY"><g transform="translate(4,3)"><rect x="14" y="29" width="8" height="16" rx="1.5" fill="#7a8fa6" opacity="0.75"/><rect x="24" y="23" width="8" height="22" rx="1.5" fill="#a0b4c8" opacity="0.75"/><rect x="34" y="17" width="8" height="28" rx="1.5" fill="#c0d0e0" opacity="0.75"/><ellipse cx="29" cy="33" rx="18" ry="5.5" fill="none" stroke="#3a8adc" strokeWidth="1.5" opacity="0.85"/><rect x="26" y="17" width="10" height="10" rx="2" fill="#3bb876" opacity="0.95"/><rect x="36" y="11" width="8" height="8" rx="2" fill="#26d4ff" opacity="0.9"/><line x1="36" y1="20" x2="48" y2="6" stroke="#3bb876" strokeWidth="1.8" opacity="0.9"/><polygon points="48,3 51,9 45,9" fill="#3bb876" opacity="0.9"/></g><text x="62" y="37" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="32" fill="#ffffff" letterSpacing="1">MARY</text></svg>
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
            {/* Badge de plan */}
            <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: planInfo.bg, color: planInfo.color }}>
              {planInfo.nombre}
            </div>
          </div>
        )}

        <nav className="flex-1 py-3 flex flex-col gap-0.5 px-2 overflow-y-auto">
          {navFiltrado.map(item => {
            const active   = page === item.id
            const bloqueado = MODULOS_PRO_PLUS.includes(item.id) && !canUsePlan(item.id)

            return (
              <button key={item.id} onClick={() => setPage(item.id)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 w-full relative"
                style={{
                  background: active ? BRAND_LIGHT : 'transparent',
                  color: active ? '#fff' : bloqueado ? '#5a7a9a' : '#93B8D8',
                  opacity: bloqueado ? 0.8 : 1,
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = `${BRAND}80` }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                title={!sideOpen ? (isEs ? item.labelEs : item.labelEn) : ''}>
                {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full" style={{ background: '#7FB3E8' }} />}
                <span className="w-4 h-4 flex-shrink-0 relative">
                  {bloqueado ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                  ) : Icons[item.icon]}
                  {item.id === 'chat' && chatUnread > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                      {chatUnread > 99 ? '99+' : chatUnread}
                    </span>
                  )}
                </span>
                {sideOpen && (
                  <span className="text-sm font-medium truncate flex-1 flex items-center justify-between">
                    <span>{isEs ? item.labelEs : item.labelEn}</span>
                    <span className="flex items-center gap-1">
                      {/* Badge Pro+ para módulos bloqueados */}
                      {bloqueado && (
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: '#EEEDFE', color: '#534AB7', fontSize: '9px' }}>
                          Pro+
                        </span>
                      )}
                      {item.id === 'chat' && chatUnread > 0 && sideOpen && (
                        <span className="min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 ml-1">
                          {chatUnread > 99 ? '99+' : chatUnread}
                        </span>
                      )}
                    </span>
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Configuración — visible para todos los roles */}
        {(isClientAdmin || perfil?.rol) && (
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
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900 text-base leading-tight">
                  {isEs ? currentNav?.labelEs : currentNav?.labelEn}
                </p>
                {/* Badge Pro+ en el header si el módulo está bloqueado */}
                {MODULOS_PRO_PLUS.includes(page) && !canUsePlan(page) && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: '#EEEDFE', color: '#3C3489' }}>
                    Pro+
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">{perfil?.tenants?.nombre_empresa || perfil?.tenant_id || ''}</p>
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
            <NotificacionesPanel onNavigate={setPage} />
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

        {/* Banner de suscripción — 3 estados posibles */}
        {(isReadOnly || subWarning) && (
          <div className="flex items-center justify-between px-6 py-2.5 text-xs font-medium flex-shrink-0"
            style={{
              background: isReadOnly ? '#FEE2E2' : '#FEF3C7',
              borderBottom: `1px solid ${isReadOnly ? '#FCA5A5' : '#F59E0B'}`,
              color: isReadOnly ? '#991B1B' : '#92400E',
            }}>
            <div className="flex items-center gap-2">
              <span>{isReadOnly ? '🔒' : '⚠'}</span>
              <span>
                {isReadOnly && (isEs
                  ? 'Suscripción vencida. Modo lectura activo — no puedes crear ni editar datos.'
                  : 'Subscription expired. Read-only mode — no creating or editing.')}
                {subWarning === 'grace' && (isEs
                  ? `Suscripción cancelada. Tienes ${daysGraceLeft} día${daysGraceLeft !== 1 ? 's' : ''} antes de quedar en modo lectura.`
                  : `Subscription cancelled. You have ${daysGraceLeft} day${daysGraceLeft !== 1 ? 's' : ''} before read-only mode.`)}
                {subWarning === 'past_due' && (isEs
                  ? 'Problema con tu pago. Stripe reintentará el cobro automáticamente.'
                  : 'Payment issue. Stripe will automatically retry the charge.')}
              </span>
            </div>
            <button
              onClick={() => setPage('configuracion')}
              className="ml-4 px-3 py-1 rounded-lg text-xs font-bold text-white flex-shrink-0"
              style={{ background: isReadOnly ? '#DC2626' : '#D97706' }}>
              {isEs ? 'Ver suscripción' : 'View subscription'}
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <SubscriptionContext.Provider value={{ isReadOnly }}>
            {pageBlockedByPlan
              ? <PlanUpgradeScreen moduloId={page} isEs={isEs} />
              : <Page onNavigate={setPage} />
            }
          </SubscriptionContext.Provider>
        </main>
      </div>

      {/* Tour de bienvenida — primera vez de cada usuario */}
      <WelcomeTour />

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

  const pathname = window.location.pathname
  if (pathname === '/pago-exitoso') return <PagoExitoso />
  if (pathname === '/planes') return <Planes />
  if (pathname === '/admin') {
    if (!perfil) return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0F4F8' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-[#1B3A6B] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Verificando acceso...</p>
        </div>
      </div>
    )
    if (perfil.rol === 'super_admin') return <Admin />
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500 text-sm">Acceso no autorizado.</p></div>
  }

  return (
    <StoreProvider key={perfil?.tenant_id} tenantId={perfil?.tenant_id} rol={perfil?.rol}>
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
