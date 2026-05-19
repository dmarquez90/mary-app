import { useState, useRef, useEffect, useContext } from 'react'
import { useStore } from '../store'
import { LangContext } from '../i18n'

const BRAND = '#1B3A6B'

const TIPO_CONFIG = {
  aprobacion: { bg: 'bg-green-100', text: 'text-green-700', icon: '✅' },
  rechazo:    { bg: 'bg-red-100',   text: 'text-red-600',   icon: '❌' },
  solicitud:  { bg: 'bg-blue-100',  text: 'text-blue-700',  icon: '📋' },
  info:       { bg: 'bg-amber-100', text: 'text-amber-700', icon: '📌' },
}

const MODULO_LABELS = {
  compras:        { es: 'Compras / OC',      en: 'Purchases / PO' },
  inventario:     { es: 'Inventario',        en: 'Inventory' },
  financiero:     { es: 'Financiero',        en: 'Financial' },
  ordenes_cambio: { es: 'Órdenes de Cambio', en: 'Change Orders' },
  presupuesto:    { es: 'Presupuesto',       en: 'Budget' },
}

function timeAgo(dateStr, isEs) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return isEs ? 'Ahora mismo' : 'Just now'
  if (mins < 60)  return isEs ? `hace ${mins} min` : `${mins} min ago`
  if (hours < 24) return isEs ? `hace ${hours}h` : `${hours}h ago`
  if (days === 1) return isEs ? 'Ayer' : 'Yesterday'
  return isEs ? `hace ${days} días` : `${days} days ago`
}

function groupNotifs(notifs) {
  const today    = new Date(); today.setHours(0,0,0,0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const groups = { hoy: [], ayer: [], anteriores: [] }
  notifs.forEach(n => {
    const d = new Date(n.created_at); d.setHours(0,0,0,0)
    if (d >= today)     groups.hoy.push(n)
    else if (d >= yesterday) groups.ayer.push(n)
    else                groups.anteriores.push(n)
  })
  return groups
}

export default function NotificacionesPanel({ onNavigate }) {
  const { state, dispatch } = useStore()
  const { lang } = useContext(LangContext)
  const isEs = lang === 'ES'
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)

  const notifs   = state.notificaciones || []
  const noLeidas = notifs.filter(n => !n.leida).length
  const groups   = groupNotifs(notifs)

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleClick = (n) => {
    if (!n.leida) dispatch({ type: 'MARK_NOTIF_READ', payload: n.id })
    if (n.modulo && onNavigate) {
      onNavigate(n.modulo)
      setOpen(false)
    }
  }

  const markAllRead = () => dispatch({ type: 'MARK_ALL_NOTIF_READ' })

  const NotifItem = ({ n }) => {
    const cfg = TIPO_CONFIG[n.tipo] || TIPO_CONFIG.info
    return (
      <button
        onClick={() => handleClick(n)}
        className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${!n.leida ? 'bg-blue-50/40' : ''}`}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5 ${cfg.bg}`}>
          {cfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-medium leading-tight ${!n.leida ? 'text-gray-900' : 'text-gray-600'}`}>
              {n.titulo}
            </p>
            {!n.leida && (
              <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
            )}
          </div>
          {n.mensaje && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{n.mensaje}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400">{timeAgo(n.created_at, isEs)}</span>
            {n.modulo && MODULO_LABELS[n.modulo] && (
              <>
                <span className="text-gray-200">·</span>
                <span className={`text-xs font-medium ${cfg.text}`}>
                  {isEs ? MODULO_LABELS[n.modulo].es : MODULO_LABELS[n.modulo].en}
                </span>
              </>
            )}
          </div>
        </div>
      </button>
    )
  }

  const GroupLabel = ({ label }) => (
    <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
    </div>
  )

  return (
    <div className="relative" ref={panelRef}>
      {/* Campana */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
        title={isEs ? 'Notificaciones' : 'Notifications'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1"
            style={{ background: '#ef4444' }}>
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-11 w-96 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 flex flex-col overflow-hidden"
          style={{ maxHeight: '520px' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-800">
                {isEs ? 'Notificaciones' : 'Notifications'}
              </h3>
              {noLeidas > 0 && (
                <span className="text-xs font-medium text-white px-1.5 py-0.5 rounded-full"
                  style={{ background: BRAND }}>
                  {noLeidas}
                </span>
              )}
            </div>
            {noLeidas > 0 && (
              <button onClick={markAllRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
                {isEs ? 'Marcar todas leídas' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="overflow-y-auto flex-1">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-500">
                  {isEs ? 'Sin notificaciones' : 'No notifications'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {isEs ? 'Las actualizaciones importantes aparecerán aquí' : 'Important updates will appear here'}
                </p>
              </div>
            ) : (
              <>
                {groups.hoy.length > 0 && (
                  <>
                    <GroupLabel label={isEs ? 'Hoy' : 'Today'} />
                    {groups.hoy.map(n => <NotifItem key={n.id} n={n} />)}
                  </>
                )}
                {groups.ayer.length > 0 && (
                  <>
                    <GroupLabel label={isEs ? 'Ayer' : 'Yesterday'} />
                    {groups.ayer.map(n => <NotifItem key={n.id} n={n} />)}
                  </>
                )}
                {groups.anteriores.length > 0 && (
                  <>
                    <GroupLabel label={isEs ? 'Anteriores' : 'Earlier'} />
                    {groups.anteriores.map(n => <NotifItem key={n.id} n={n} />)}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
