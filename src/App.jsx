import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { SubscriptionContext } from './subscriptionContext'
import { StoreProvider } from './store'
import { LangProvider, useLanguage } from './i18n'
import { AuthProvider, useAuth } from './auth'
import { usePermissions, NAV_PERMISOS } from './usePermissions'
import { MODULOS_PRO_PLUS, MODULOS_ENTERPRISE, PLAN_INFO } from './plans'
import { Icons, Avatar, Spinner } from './components'
import { useTheme } from './theme'
import { supabase } from './supabase'
import AuthRouter from './pages/AuthRouter'
import NotificacionesPanel from './pages/NotificacionesPanel'
import WelcomeTour from './pages/WelcomeTour'

// Páginas cargadas bajo demanda para dividir el bundle
const Admin             = lazy(() => import('./pages/Admin'))
const Configuracion     = lazy(() => import('./pages/Configuracion'))
const Dashboard         = lazy(() => import('./pages/Dashboard'))
const Proyectos         = lazy(() => import('./pages/Proyectos'))
const Presupuesto       = lazy(() => import('./pages/Presupuesto'))
const Inventario        = lazy(() => import('./pages/Inventario'))
const MatPresupuestados = lazy(() => import('./pages/MatPresupuestados'))
const Compras           = lazy(() => import('./pages/Compras'))
const OrdenesCambio     = lazy(() => import('./pages/OrdenesCambio'))
const AvaluosCliente    = lazy(() => import('./pages/AvaluosCliente'))
const Financiero        = lazy(() => import('./pages/Financiero'))
const CurvaS            = lazy(() => import('./pages/CurvaS'))
const Reportes          = lazy(() => import('./pages/Reportes'))
const Auditoria         = lazy(() => import('./pages/Auditoria'))
const Supervision       = lazy(() => import('./pages/Supervision'))
const Chat              = lazy(() => import('./pages/Chat'))
const PagoExitoso       = lazy(() => import('./pages/PagoExitoso'))
const Planes            = lazy(() => import('./pages/Planes'))
const Landing           = lazy(() => import('./pages/Landing'))

const PageSpinner = () => (
  <div className="flex items-center justify-center min-h-full p-16">
    <Spinner size={30} />
  </div>
)

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
  { id: 'supervision',    labelEs: 'Supervisión',         labelEn: 'Supervision',        icon: 'supervision' },
  { id: 'chat',           labelEs: 'Chat',                labelEn: 'Chat',               icon: 'chat'      },
]

// Agrupación del menú lateral por área de trabajo
const NAV_GROUPS = [
  { id: 'general',  labelEs: 'General',      labelEn: 'General',      items: ['dashboard', 'proyectos'] },
  { id: 'plan',     labelEs: 'Planificación',labelEn: 'Planning',     items: ['presupuesto', 'mat_pres', 'ordenes_cambio'] },
  { id: 'obra',     labelEs: 'Operación',    labelEn: 'Operations',   items: ['compras', 'inventario', 'supervision'] },
  { id: 'finanzas', labelEs: 'Finanzas',     labelEn: 'Finance',      items: ['avaluos', 'financiero', 'curvas', 'reportes'] },
  { id: 'equipo',   labelEs: 'Equipo',       labelEn: 'Team',         items: ['chat'] },
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
  auditoria:      Auditoria,
  supervision:    Supervision,
  chat:           Chat,
}

// ── Pantalla de upgrade para módulos bloqueados por plan ─────────────
function PlanUpgradeScreen({ moduloId, isEs }) {
  const navItem = NAV.find(n => n.id === moduloId)
  const nombre  = isEs ? navItem?.labelEs : navItem?.labelEn
  const isEnterprise = MODULOS_ENTERPRISE.includes(moduloId)

  const badgeBg    = isEnterprise ? PLAN_INFO.enterprise.bg    : '#EEEDFE'
  const badgeColor = isEnterprise ? PLAN_INFO.enterprise.color : '#3C3489'
  const badgeLabel = isEnterprise ? 'Enterprise' : 'Pro+'

  return (
    <div className="flex items-center justify-center min-h-full p-8">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: badgeBg }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={badgeColor} strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3"
          style={{ background: badgeBg, color: badgeColor }}>
          <span>{badgeLabel}</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {isEnterprise
            ? (isEs ? `${nombre} requiere plan Enterprise` : `${nombre} requires the Enterprise plan`)
            : (isEs ? `${nombre} requiere plan Pro o superior` : `${nombre} requires Pro plan or higher`)}
        </h2>
        <p className="text-sm text-gray-500 mb-6" style={{ lineHeight: 1.6 }}>
          {isEnterprise
            ? (isEs
                ? 'Este módulo está disponible exclusivamente en el plan Enterprise. Actualiza tu plan para acceder a la Auditoría y más.'
                : 'This module is exclusively available on the Enterprise plan. Upgrade to access the Audit Log and more.')
            : (isEs
                ? 'Este módulo no está disponible en el plan Starter. Actualiza tu plan para acceder a Órdenes de Cambio, Avalúos y más.'
                : 'This module is not available on the Starter plan. Upgrade to access Change Orders, Valuations, and more.')}
        </p>
        {isEnterprise ? (
          <div className="rounded-xl border p-4 text-left mb-4"
            style={{ borderColor: PLAN_INFO.enterprise.color, background: PLAN_INFO.enterprise.bg }}>
            <p className="text-xs font-semibold mb-2" style={{ color: PLAN_INFO.enterprise.color }}>
              {isEs ? `Plan Enterprise — $${PLAN_INFO.enterprise.precio_mes}/mes` : `Enterprise Plan — $${PLAN_INFO.enterprise.precio_mes}/mo`}
            </p>
            {[
              isEs ? '5 usuarios · 10 proyectos' : '5 users · 10 projects',
              isEs ? 'Auditoría completa de usuarios' : 'Full user audit log',
              isEs ? 'Usuarios adicionales' : 'Additional users',
              isEs ? 'Todos los módulos' : 'All modules',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs mb-1" style={{ color: PLAN_INFO.enterprise.color }}>
                <span style={{ color: '#0F6E56' }}>✓</span> {item}
              </div>
            ))}
          </div>
        ) : (
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
        )}
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

  const { isDark, toggle }      = useTheme()
  const [page, setPage]         = useState(defaultPage)
  const [sideOpen, setSideOpen] = useState(() => {
    try { return localStorage.getItem('mary_sidebar') !== 'closed' } catch { return true }
  })
  const [chatUnread, setChatUnread] = useState(0)
  const [userMenu, setUserMenu] = useState(false)
  const userMenuRef             = useRef(null)

  useEffect(() => {
    try { localStorage.setItem('mary_sidebar', sideOpen ? 'open' : 'closed') } catch { /* ignorar */ }
  }, [sideOpen])
  // Ref con la página actual para que los callbacks realtime no lean un valor congelado
  const pageRef = useRef(page)
  useEffect(() => { pageRef.current = page }, [page])
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
          if (pageRef.current !== 'chat') setChatUnread(prev => prev + 1)
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [perfil?.id, perfil?.tenant_id])

  useEffect(() => {
    if (page === 'chat') setChatUnread(0)
  }, [page])

  // Si el módulo activo está bloqueado por plan, mostrar pantalla upgrade
  const pageBlockedByPlan = [...MODULOS_PRO_PLUS, ...MODULOS_ENTERPRISE].includes(page) && !canUsePlan(page)

  const Page = PAGES[page] || Dashboard
  const currentNav = NAV.find(n => n.id === page)

  const tituloPagina = page === 'configuracion'
    ? (isEs ? 'Configuración' : 'Settings')
    : (isEs ? currentNav?.labelEs : currentNav?.labelEn) || ''

  // Badge de plan en sidebar
  const planInfo = PLAN_INFO[plan] || PLAN_INFO.starter

  // Navegación agrupada por área, filtrada por permisos del rol
  const gruposVisibles = NAV_GROUPS
    .map(g => ({ ...g, items: g.items.map(id => NAV.find(n => n.id === id)).filter(n => n && navVisible(n.id)) }))
    .filter(g => g.items.length > 0)

  // Cierra el menú de usuario al hacer clic fuera
  useEffect(() => {
    if (!userMenu) return
    const onClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenu(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setUserMenu(false) }
    document.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [userMenu])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ══ SIDEBAR ══════════════════════════════════════════════ */}
      <aside className={`flex flex-col flex-shrink-0 transition-all duration-200 ${sideOpen ? 'w-60' : 'w-[68px]'}`}
        style={{
          background: `linear-gradient(180deg, var(--nav-bg) 0%, var(--nav-bg-2) 100%)`,
          borderRight: '1px solid var(--nav-bd)',
        }}>

        {/* Logo */}
        <div className={`flex items-center px-4 flex-shrink-0 ${sideOpen ? 'justify-start' : 'justify-center'}`}
          style={{ borderBottom: '1px solid var(--nav-bd)', height: 64 }}>
          {sideOpen ? (
            <svg viewBox="0 0 200 56" xmlns="http://www.w3.org/2000/svg" style={{ height: 34, width: 'auto' }} aria-label="MARY"><g transform="translate(4,3)"><rect x="14" y="29" width="8" height="16" rx="1.5" fill="#7a8fa6" opacity="0.75"/><rect x="24" y="23" width="8" height="22" rx="1.5" fill="#a0b4c8" opacity="0.75"/><rect x="34" y="17" width="8" height="28" rx="1.5" fill="#c0d0e0" opacity="0.75"/><ellipse cx="29" cy="33" rx="18" ry="5.5" fill="none" stroke="#3a8adc" strokeWidth="1.5" opacity="0.85"/><rect x="26" y="17" width="10" height="10" rx="2" fill="#3bb876" opacity="0.95"/><rect x="36" y="11" width="8" height="8" rx="2" fill="#26d4ff" opacity="0.9"/><line x1="36" y1="20" x2="48" y2="6" stroke="#3bb876" strokeWidth="1.8" opacity="0.9"/><polygon points="48,3 51,9 45,9" fill="#3bb876" opacity="0.9"/></g><text x="62" y="37" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="32" fill="#ffffff" letterSpacing="1">MARY</text></svg>
          ) : (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #1A5EB4, #2E78D6)', boxShadow: '0 4px 14px -4px rgba(26,94,180,0.9)' }}>M</div>
          )}
        </div>

        {/* Empresa + plan */}
        {sideOpen && (
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--nav-bd)' }}>
            <p className="text-xs font-semibold truncate" style={{ color: '#fff' }}>
              {perfil?.tenants?.nombre_empresa || 'Marquez Project Solutions'}
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                style={{ background: 'rgba(127,168,212,0.16)', color: '#A9C6E6', border: '1px solid rgba(127,168,212,0.22)' }}>
                {planInfo.nombre}
              </span>
              {isSuperAdmin && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: 'rgba(245,158,11,0.16)', color: '#F5B345' }}>ADMIN</span>
              )}
            </div>
          </div>
        )}

        {/* Navegación agrupada */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto scrollbar-thin">
          {gruposVisibles.map(grupo => (
            <div key={grupo.id} className="mb-3">
              {sideOpen && (
                <p className="px-3 mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: 'rgba(169,198,230,0.45)' }}>
                  {isEs ? grupo.labelEs : grupo.labelEn}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {grupo.items.map(item => {
                  const active    = page === item.id
                  const bloqueado = [...MODULOS_PRO_PLUS, ...MODULOS_ENTERPRISE].includes(item.id) && !canUsePlan(item.id)
                  const label     = isEs ? item.labelEs : item.labelEn
                  return (
                    <button key={item.id} onClick={() => setPage(item.id)}
                      data-tip={!sideOpen ? label : undefined}
                      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left transition-all duration-150 ${!sideOpen ? 'm-tip justify-center' : ''}`}
                      style={{
                        background: active ? 'linear-gradient(120deg, rgba(46,120,214,0.30), rgba(26,158,92,0.12))' : 'transparent',
                        color: active ? 'var(--nav-txt-active)' : bloqueado ? 'rgba(169,198,230,0.45)' : 'var(--nav-txt)',
                        border: `1px solid ${active ? 'rgba(46,120,214,0.45)' : 'transparent'}`,
                        boxShadow: active ? '0 6px 18px -10px rgba(26,94,180,0.9)' : 'none',
                      }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(127,168,212,0.09)' }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
                      {active && sideOpen && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                          style={{ background: 'linear-gradient(180deg, #3BB876, #26D4FF)' }} />
                      )}
                      <span className="w-[18px] h-[18px] flex-shrink-0 relative">
                        {bloqueado ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                        ) : Icons[item.icon]}
                        {item.id === 'chat' && chatUnread > 0 && !sideOpen && (
                          <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] rounded-full text-white text-[9px] font-bold flex items-center justify-center px-0.5"
                            style={{ background: '#E5484D' }}>
                            {chatUnread > 9 ? '9+' : chatUnread}
                          </span>
                        )}
                      </span>
                      {sideOpen && (
                        <span className="text-[13px] font-medium truncate flex-1 flex items-center justify-between gap-2">
                          <span className="truncate">{label}</span>
                          {bloqueado && (
                            <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0"
                              style={MODULOS_ENTERPRISE.includes(item.id)
                                ? { background: 'rgba(124,58,237,0.22)', color: '#C4B5FD' }
                                : { background: 'rgba(46,120,214,0.22)', color: '#93C5FD' }}>
                              {MODULOS_ENTERPRISE.includes(item.id) ? 'ENT' : 'PRO'}
                            </span>
                          )}
                          {item.id === 'chat' && chatUnread > 0 && (
                            <span className="min-w-[18px] h-[18px] rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1 flex-shrink-0"
                              style={{ background: '#E5484D' }}>
                              {chatUnread > 99 ? '99+' : chatUnread}
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Configuración / Admin */}
        <div className="px-2 py-2 flex flex-col gap-0.5" style={{ borderTop: '1px solid var(--nav-bd)' }}>
          {(isClientAdmin || perfil?.rol) && (
            <button onClick={() => setPage('configuracion')}
              data-tip={!sideOpen ? (isEs ? 'Configuración' : 'Settings') : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl w-full transition-colors ${!sideOpen ? 'm-tip justify-center' : ''}`}
              style={{
                background: page === 'configuracion' ? 'rgba(46,120,214,0.28)' : 'transparent',
                color: page === 'configuracion' ? '#fff' : 'var(--nav-txt)',
              }}
              onMouseEnter={e => { if (page !== 'configuracion') e.currentTarget.style.background = 'rgba(127,168,212,0.09)' }}
              onMouseLeave={e => { if (page !== 'configuracion') e.currentTarget.style.background = 'transparent' }}>
              <span className="w-[18px] h-[18px] flex-shrink-0">{Icons.settings}</span>
              {sideOpen && <span className="text-[13px] font-medium">{isEs ? 'Configuración' : 'Settings'}</span>}
            </button>
          )}

          {isSuperAdmin && (
            <a href="/admin"
              data-tip={!sideOpen ? (isEs ? 'Panel Admin' : 'Admin Panel') : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl w-full transition-colors ${!sideOpen ? 'm-tip justify-center' : ''}`}
              style={{ color: '#F5B345' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,179,69,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span className="w-[18px] h-[18px] flex-shrink-0">{Icons.settings}</span>
              {sideOpen && <span className="text-[13px] font-medium">{isEs ? 'Panel Admin' : 'Admin Panel'}</span>}
            </a>
          )}
        </div>

        {/* Idioma + tema + colapsar */}
        <div className="px-2 pb-2 pt-2 flex flex-col gap-1.5" style={{ borderTop: '1px solid var(--nav-bd)' }}>
          <div className={`flex gap-1.5 ${sideOpen ? '' : 'flex-col'}`}>
            <button onClick={toggleLang}
              data-tip={!sideOpen ? 'ES / EN' : undefined}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg transition-colors ${!sideOpen ? 'm-tip' : ''}`}
              style={{ background: 'rgba(127,168,212,0.08)', color: 'var(--nav-txt)', border: '1px solid var(--nav-bd)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(127,168,212,0.16)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(127,168,212,0.08)'}>
              <span className="text-[11px] font-bold">{isEs ? 'ES' : 'EN'}</span>
            </button>

            <button onClick={toggle}
              data-tip={!sideOpen ? (isDark ? (isEs ? 'Modo claro' : 'Light mode') : (isEs ? 'Modo oscuro' : 'Dark mode')) : undefined}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg transition-colors ${!sideOpen ? 'm-tip' : ''}`}
              style={{ background: 'rgba(127,168,212,0.08)', color: 'var(--nav-txt)', border: '1px solid var(--nav-bd)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(127,168,212,0.16)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(127,168,212,0.08)'}>
              <span className="w-[15px] h-[15px]">{isDark ? Icons.sun : Icons.moon}</span>
              {sideOpen && <span className="text-[11px] font-semibold">{isDark ? (isEs ? 'Claro' : 'Light') : (isEs ? 'Oscuro' : 'Dark')}</span>}
            </button>
          </div>

          <button onClick={() => setSideOpen(!sideOpen)}
            className="flex items-center justify-center py-2 rounded-lg transition-colors"
            style={{ color: 'rgba(169,198,230,0.7)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(127,168,212,0.09)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(169,198,230,0.7)' }}>
            <span className="w-4 h-4 inline-block transition-transform duration-200"
              style={{ transform: sideOpen ? 'rotate(180deg)' : 'none' }}>{Icons.chevron}</span>
          </button>
        </div>
      </aside>

      {/* ══ MAIN ═════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>

        {/* HEADER */}
        <header className="flex items-center justify-between px-5 flex-shrink-0 relative z-20"
          style={{
            background: 'var(--surface)',
            borderBottom: '1px solid var(--bd)',
            height: 64,
            boxShadow: 'var(--sh-xs)',
          }}>
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
              <span className="w-[18px] h-[18px]">{Icons[currentNav?.icon] || Icons.dashboard}</span>
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-[15px] leading-tight truncate" style={{ color: 'var(--txt)' }}>
                  {tituloPagina}
                </p>
                {[...MODULOS_PRO_PLUS, ...MODULOS_ENTERPRISE].includes(page) && !canUsePlan(page) && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    {MODULOS_ENTERPRISE.includes(page) ? 'Enterprise' : 'Pro+'}
                  </span>
                )}
              </div>
              <p className="text-[11px] truncate" style={{ color: 'var(--txt-3)' }}>
                {perfil?.tenants?.nombre_empresa || perfil?.tenant_id || ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--bd)' }}>
              <span className="w-3.5 h-3.5" style={{ color: 'var(--brand)' }}>{Icons.calendar}</span>
              <span className="text-[11.5px] font-medium capitalize" style={{ color: 'var(--txt-2)' }}>
                {new Date().toLocaleDateString(isEs ? 'es' : 'en', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>

            <button onClick={toggle} className="m-icon-btn m-tip"
              data-tip={isDark ? (isEs ? 'Modo claro' : 'Light mode') : (isEs ? 'Modo oscuro' : 'Dark mode')}>
              <span className="w-[17px] h-[17px]">{isDark ? Icons.sun : Icons.moon}</span>
            </button>

            <NotificacionesPanel onNavigate={setPage} />

            <div className="w-px h-7 mx-0.5" style={{ background: 'var(--bd)' }} />

            {/* Menú de usuario */}
            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setUserMenu(o => !o)}
                className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl transition-colors"
                style={{ background: userMenu ? 'var(--surface-3)' : 'transparent' }}
                onMouseEnter={e => { if (!userMenu) e.currentTarget.style.background = 'var(--surface-2)' }}
                onMouseLeave={e => { if (!userMenu) e.currentTarget.style.background = 'transparent' }}>
                <Avatar name={perfil?.nombre || 'Usuario'} size={32} />
                <span className="hidden md:block text-left">
                  <span className="block text-[12.5px] font-semibold leading-none" style={{ color: 'var(--txt)' }}>
                    {perfil?.nombre || 'Usuario'}
                  </span>
                  <span className="block text-[11px] mt-0.5 capitalize" style={{ color: 'var(--txt-3)' }}>
                    {perfil?.rol?.replace('_', ' ') || ''}
                  </span>
                </span>
                <span className="w-3.5 h-3.5 transition-transform duration-200 hidden md:block"
                  style={{ color: 'var(--txt-3)', transform: userMenu ? 'rotate(90deg)' : 'none' }}>
                  {Icons.chevron}
                </span>
              </button>

              {userMenu && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-56 rounded-2xl overflow-hidden m-pop"
                  style={{ background: 'var(--surface)', border: '1px solid var(--bd)', boxShadow: 'var(--sh-lg)' }}>
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--bd)', background: 'var(--surface-2)' }}>
                    <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--txt)' }}>{perfil?.nombre}</p>
                    <p className="text-[11px] truncate" style={{ color: 'var(--txt-3)' }}>{perfil?.email}</p>
                  </div>
                  <div className="p-1.5">
                    <button onClick={() => { setUserMenu(false); setPage('configuracion') }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors"
                      style={{ color: 'var(--txt-2)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <span className="w-4 h-4">{Icons.settings}</span>
                      {isEs ? 'Configuración' : 'Settings'}
                    </button>
                    <button onClick={() => { setUserMenu(false); toggle() }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors"
                      style={{ color: 'var(--txt-2)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <span className="w-4 h-4">{isDark ? Icons.sun : Icons.moon}</span>
                      {isDark ? (isEs ? 'Modo claro' : 'Light mode') : (isEs ? 'Modo oscuro' : 'Dark mode')}
                    </button>
                    <button onClick={logout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors"
                      style={{ color: 'var(--danger)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-soft)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                      {isEs ? 'Cerrar sesión' : 'Sign out'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Banner de suscripción */}
        {(isReadOnly || subWarning) && (
          <div className="flex items-center justify-between gap-3 px-5 py-2.5 text-xs font-medium flex-shrink-0 m-fade"
            style={{
              background: isReadOnly ? 'var(--danger-soft)' : 'var(--warn-soft)',
              borderBottom: `1px solid ${isReadOnly ? 'var(--danger)' : 'var(--warn)'}`,
              color: isReadOnly ? 'var(--danger)' : 'var(--warn)',
            }}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-4 h-4 flex-shrink-0">{Icons.alert}</span>
              <span className="truncate">
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
            <button onClick={() => setPage('configuracion')}
              className="m-btn m-btn-sm flex-shrink-0"
              style={{ background: isReadOnly ? 'var(--danger)' : 'var(--warn)', color: '#fff' }}>
              {isEs ? 'Ver suscripción' : 'View subscription'}
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto" style={{ backgroundImage: 'var(--bg-grad)' }}>
          <SubscriptionContext.Provider value={{ isReadOnly }}>
            {pageBlockedByPlan
              ? <PlanUpgradeScreen moduloId={page} isEs={isEs} />
              : <Suspense fallback={<PageSpinner />}><Page onNavigate={setPage} /></Suspense>
            }
          </SubscriptionContext.Provider>
        </main>
      </div>

      <WelcomeTour />
    </div>
  )
}

// ── Rutas públicas: landing (/) y pantallas de autenticación ─────────
// La app no usa router; se navega con history.pushState y estado local.
const AUTH_PATHS = ['/login', '/registro', '/signin', '/signup']

function PublicRoutes() {
  const { blockedReason } = useAuth()
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = (to) => {
    if (window.location.pathname !== to) window.history.pushState({}, '', to)
    setPath(to)
    window.scrollTo(0, 0)
  }

  // Cuenta bloqueada (trial vencido, usuario o empresa inactivos): AuthRouter
  // muestra su propia pantalla, sin importar la ruta.
  if (blockedReason) return <AuthRouter />

  const esRutaAuth = AUTH_PATHS.includes(path) || path.startsWith('/reset-password')
  if (!esRutaAuth) {
    return (
      <Suspense fallback={<div style={{ minHeight: '100vh', background: '#060E1D' }} />}>
        <Landing onNavigate={navigate} />
      </Suspense>
    )
  }

  return (
    <AuthRouter
      key={path}
      initialView={path === '/registro' || path === '/signup' ? 'register' : 'login'}
      onExitToLanding={() => navigate('/')}
    />
  )
}

function AppContent() {
  const { user, perfil, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center m-fade">
        <div className="flex justify-center mb-3"><Spinner size={32} /></div>
        <p className="text-sm" style={{ color: 'var(--txt-3)' }}>Cargando MARY...</p>
      </div>
    </div>
  )

  if (!user) return <PublicRoutes />

  const pathname = window.location.pathname
  if (pathname === '/pago-exitoso') return <Suspense fallback={<PageSpinner />}><PagoExitoso /></Suspense>
  if (pathname === '/planes') return <Suspense fallback={<PageSpinner />}><Planes /></Suspense>
  if (pathname === '/admin') {
    if (!perfil) return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center m-fade">
          <div className="flex justify-center mb-3"><Spinner size={32} /></div>
          <p className="text-sm" style={{ color: 'var(--txt-3)' }}>Verificando acceso...</p>
        </div>
      </div>
    )
    if (perfil.rol === 'super_admin') return <Suspense fallback={<PageSpinner />}><Admin /></Suspense>
    return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}><p className="text-sm" style={{ color: 'var(--txt-3)' }}>Acceso no autorizado.</p></div>
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
