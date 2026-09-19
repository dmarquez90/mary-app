import { useContext, useState, useEffect, useRef, useCallback, createContext, useMemo } from 'react'
import { ESTADO_COLORS, getEstadoLabel } from '../utils'
import { LangContext } from '../i18n'

// ═══════════════════════════════════════════════════════════
//  MARY — Librería de UI
//  Todos los colores salen de las variables CSS de index.css,
//  así que cada componente funciona en claro y en oscuro.
// ═══════════════════════════════════════════════════════════

// ── ICONOS ────────────────────────────────────────────────
const ico = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

export const Icons = {
  dashboard: <svg {...ico}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>,
  projects:  <svg {...ico}><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/></svg>,
  budget:    <svg {...ico}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>,
  inventory: <svg {...ico}><path d="M3 9h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M3 9 5 4h14l2 5"/><path d="M10 13h4"/></svg>,
  purchases: <svg {...ico}><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.4 12.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.2L21 7H6"/></svg>,
  financial: <svg {...ico}><path d="M12 2v20"/><path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  curvas:    <svg {...ico}><path d="M3 21V3"/><path d="M3 21h18"/><path d="M6 17c3.5 0 4-9 8-9 2.5 0 3.5 4 6 4"/></svg>,
  matpres:   <svg {...ico}><path d="M20 7 12 3 4 7l8 4 8-4z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/></svg>,
  table:     <svg {...ico}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="9" x2="9" y2="21"/></svg>,
  chat:      <svg {...ico}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.3-.6L3 21l1.8-5A8.3 8.3 0 0 1 4 11.5 8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z"/></svg>,
  supervision: <svg {...ico}><path d="M12 22s8-4.5 8-11V5l-8-3-8 3v6c0 6.5 8 11 8 11z"/><path d="m9 11 2 2 4-4"/></svg>,
  reports:   <svg {...ico}><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="7" rx="1"/><rect x="12.5" y="7" width="3" height="11" rx="1"/><rect x="18" y="13" width="3" height="5" rx="1"/></svg>,
  audit:     <svg {...ico}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/><path d="M8.5 11h5M11 8.5v5"/></svg>,
  settings:  <svg {...ico}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>,
  plus:      <svg {...ico} strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  trash:     <svg {...ico}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  edit:      <svg {...ico}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>,
  check:     <svg {...ico} strokeWidth="2.4"><polyline points="20 6 9 17 4 12"/></svg>,
  x:         <svg {...ico} strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  alert:     <svg {...ico}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  info:      <svg {...ico}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>,
  search:    <svg {...ico}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>,
  filter:    <svg {...ico}><polygon points="22 3 2 3 10 12.5 10 19 14 21 14 12.5"/></svg>,
  download:  <svg {...ico}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  upload:    <svg {...ico}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  refresh:   <svg {...ico}><path d="M4 4v6h6"/><path d="M20 20v-6h-6"/><path d="M20 9A8 8 0 0 0 6.3 5.3L4 7.6"/><path d="M4 15a8 8 0 0 0 13.7 3.7L20 16.4"/></svg>,
  arrowUp:   <svg {...ico} strokeWidth="2.2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
  arrowDown: <svg {...ico} strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
  chevron:   <svg {...ico} strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
  calendar:  <svg {...ico}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  box:       <svg {...ico}><path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.3 7 12 12 20.7 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>,
  users:     <svg {...ico}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/></svg>,
  clock:     <svg {...ico}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  sun:       <svg {...ico}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>,
  moon:      <svg {...ico}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>,
}

// ── TONOS SEMÁNTICOS ──────────────────────────────────────
export const TONES = {
  brand:   { fg: 'var(--brand)',  bg: 'var(--brand-soft)' },
  ok:      { fg: 'var(--ok)',     bg: 'var(--ok-soft)' },
  warn:    { fg: 'var(--warn)',   bg: 'var(--warn-soft)' },
  danger:  { fg: 'var(--danger)', bg: 'var(--danger-soft)' },
  info:    { fg: 'var(--info)',   bg: 'var(--info-soft)' },
  accent:  { fg: 'var(--accent)', bg: 'var(--accent-soft)' },
  neutral: { fg: 'var(--txt-2)',  bg: 'var(--surface-3)' },
}

// ── CLASES REUTILIZABLES (compatibilidad) ─────────────────
export const inputCls  = 'm-input'
export const selectCls = 'm-input'

// ── BOTONES ───────────────────────────────────────────────
export function Btn({ children, variant = 'ghost', size, icon, block, type = 'button', className = '', ...rest }) {
  const cls = [
    'm-btn', `m-btn-${variant}`,
    size === 'sm' ? 'm-btn-sm' : size === 'lg' ? 'm-btn-lg' : '',
    block ? 'm-btn-block' : '', className,
  ].filter(Boolean).join(' ')
  return (
    <button type={type} className={cls} {...rest}>
      {icon && <span className="w-4 h-4 flex-shrink-0">{icon}</span>}
      {children}
    </button>
  )
}

export const PrimaryBtn   = ({ children, className = '', ...p }) => <Btn variant="primary" className={className} {...p}>{children}</Btn>
export const SecondaryBtn = ({ children, className = '', ...p }) => <Btn variant="ghost"   className={className} {...p}>{children}</Btn>
export const DangerBtn    = ({ children, className = '', ...p }) => <Btn variant="danger"  className={className} {...p}>{children}</Btn>
export const SoftBtn      = ({ children, className = '', ...p }) => <Btn variant="soft"    className={className} {...p}>{children}</Btn>

// Botón de barra de herramientas (compatibilidad con módulos actuales)
export function TBtn({ children, onClick, disabled, danger, icon, title }) {
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      className={`m-btn m-btn-sm ${danger ? 'm-btn-danger' : 'm-btn-ghost'}`}
    >
      {icon && <span className="w-3.5 h-3.5 flex-shrink-0">{icon}</span>}
      {children}
    </button>
  )
}

export function IconBtn({ icon, onClick, tip, danger, disabled, className = '' }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      data-tip={tip} aria-label={tip}
      className={`m-icon-btn ${danger ? 'm-icon-btn-danger' : ''} ${tip ? 'm-tip' : ''} ${className}`}
    >
      <span className="w-4 h-4">{icon}</span>
    </button>
  )
}

// ── CARD ──────────────────────────────────────────────────
export function Card({ children, className = '', padded = true, hover, onClick, style }) {
  return (
    <div
      onClick={onClick}
      className={`m-card ${hover ? 'm-card-hover' : ''} ${padded ? 'p-4' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, icon, action, tone = 'brand' }) {
  const t = TONES[tone] || TONES.brand
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && (
          <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: t.bg, color: t.fg }}>
            <span className="w-4 h-4">{icon}</span>
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--txt)' }}>{title}</p>
          {subtitle && <p className="text-xs truncate" style={{ color: 'var(--txt-3)' }}>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

// ── PAGE HEADER ───────────────────────────────────────────
export function PageHeader({ title, subtitle, actions, children }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight truncate" style={{ color: 'var(--txt)' }}>{title}</h1>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--txt-3)' }}>{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

// ── TOOLBAR + BUSCADOR ────────────────────────────────────
export function Toolbar({ children, className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 mb-4 ${className}`}>{children}</div>
  )
}

export function SearchInput({ value, onChange, placeholder, className = '', width = 240 }) {
  return (
    <div className={`relative ${className}`} style={{ width }}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--txt-3)' }}>
        {Icons.search}
      </span>
      <input
        className="m-input" style={{ paddingLeft: 34, paddingRight: value ? 30 : 12 }}
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      />
      {value && (
        <button onClick={() => onChange('')} aria-label="clear"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded"
          style={{ color: 'var(--txt-3)' }}>
          <span className="w-3.5 h-3.5">{Icons.x}</span>
        </button>
      )}
    </div>
  )
}

// ── TABS / SEGMENTED ──────────────────────────────────────
export function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div className={`flex items-center gap-1 flex-wrap ${className}`}>
      {tabs.map(tab => {
        const id = tab.id ?? tab
        const label = tab.label ?? tab
        const on = value === id
        return (
          <button key={id} onClick={() => onChange(id)} className={`m-tab ${on ? 'm-tab-active' : ''}`}>
            {label}
            {tab.count != null && (
              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: on ? 'var(--brand)' : 'var(--surface-3)', color: on ? '#fff' : 'var(--txt-3)' }}>
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`m-seg ${className}`}>
      {options.map(opt => {
        const id = opt.id ?? opt
        const label = opt.label ?? opt
        return (
          <button key={id} onClick={() => onChange(id)}
            className={`m-seg-item ${value === id ? 'm-seg-item-active' : ''}`}>
            {opt.icon && <span className="w-3.5 h-3.5 inline-block align-middle mr-1">{opt.icon}</span>}
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ── BADGE / CHIP ──────────────────────────────────────────
export function Chip({ children, tone = 'neutral', dot, className = '', style }) {
  const t = TONES[tone] || TONES.neutral
  return (
    <span className={`m-chip ${className}`} style={{ background: t.bg, color: t.fg, ...style }}>
      {dot && <span className="m-chip-dot" />}
      {children}
    </span>
  )
}

// Badge de estado (compatibilidad: sigue leyendo ESTADO_COLORS)
export function Badge({ estado, label, tone }) {
  const { lang } = useContext(LangContext)
  if (tone) return <Chip tone={tone} dot>{label || getEstadoLabel(estado, lang)}</Chip>
  const cls = ESTADO_COLORS[estado] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label || getEstadoLabel(estado, lang)}
    </span>
  )
}

// ── FORM FIELD ────────────────────────────────────────────
export function Field({ label, required, hint, error, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-semibold" style={{ color: 'var(--txt-2)' }}>
          {label}{required && <span style={{ color: 'var(--danger)' }} className="ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs" style={{ color: 'var(--txt-3)' }}>{hint}</p>}
      {error && <p className="text-xs font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}

// ── KPI / STAT CARD ───────────────────────────────────────
export function Sparkline({ data = [], color = 'var(--brand-2)', w = 92, h = 28, fill = true }) {
  if (!data.length) return null
  const max = Math.max(...data), min = Math.min(...data)
  const span = max - min || 1
  const pts = data.map((v, i) => [
    (i / (data.length - 1 || 1)) * w,
    h - ((v - min) / span) * (h - 4) - 2,
  ])
  const d = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const gid = `spark${Math.round(w)}${Math.round(h)}${data.length}`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      {fill && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill={`url(#${gid})`} />
        </>
      )}
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.4" fill={color} />
    </svg>
  )
}

export function KpiCard({ label, value, sub, icon, tone = 'brand', trend, spark, onClick, className = '' }) {
  const t = TONES[tone] || TONES.brand
  const up = trend != null && trend >= 0
  return (
    <div onClick={onClick}
      className={`m-card m-card-hover p-4 ${onClick ? 'cursor-pointer' : ''} ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium" style={{ color: 'var(--txt-3)' }}>{label}</p>
        {icon && (
          <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: t.bg, color: t.fg }}>
            <span className="w-4 h-4">{icon}</span>
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight" style={{ color: 'var(--txt)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </p>
      <div className="flex items-end justify-between gap-2 mt-1">
        <div className="min-w-0">
          {trend != null && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold"
              style={{ color: up ? 'var(--ok)' : 'var(--danger)' }}>
              <span className="w-3 h-3">{up ? Icons.arrowUp : Icons.arrowDown}</span>
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {sub && <p className="text-xs truncate" style={{ color: 'var(--txt-3)' }}>{sub}</p>}
        </div>
        {spark?.length > 1 && <Sparkline data={spark} color={t.fg} />}
      </div>
    </div>
  )
}

// Compatibilidad con los módulos que ya usan StatCard
export function StatCard({ label, value, sub, color, icon, tone }) {
  return (
    <div className="m-card m-card-hover p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium" style={{ color: 'var(--txt-3)' }}>{label}</p>
        {icon && (
          <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: (TONES[tone] || TONES.brand).bg, color: (TONES[tone] || TONES.brand).fg }}>
            <span className="w-3.5 h-3.5">{icon}</span>
          </span>
        )}
      </div>
      <p className="text-xl font-bold mt-1.5" style={{ color: color || 'var(--txt)', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--txt-3)' }}>{sub}</p>}
    </div>
  )
}

// ── PROGRESS ──────────────────────────────────────────────
export function Progress({ value = 0, tone = 'brand', height = 7, showLabel, className = '' }) {
  const pct = Math.max(0, Math.min(100, value))
  const t = TONES[tone] || TONES.brand
  return (
    <div className={className}>
      <div style={{ height, background: 'var(--surface-3)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 999,
          background: tone === 'brand' ? 'var(--brand-grad)' : t.fg,
          transition: 'width .6s cubic-bezier(.22,1,.36,1)',
        }} />
      </div>
      {showLabel && (
        <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--txt-3)' }}>{pct.toFixed(1)}%</p>
      )}
    </div>
  )
}

export function Donut({ value = 0, size = 74, stroke = 8, tone = 'brand', label }) {
  const pct = Math.max(0, Math.min(100, value))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const t = TONES[tone] || TONES.brand
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={t.fg} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.22,1,.36,1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold" style={{ color: 'var(--txt)' }}>{pct.toFixed(0)}%</span>
        {label && <span className="text-[9px]" style={{ color: 'var(--txt-3)' }}>{label}</span>}
      </div>
    </div>
  )
}

// ── SKELETONS ─────────────────────────────────────────────
export const Skeleton = ({ w = '100%', h = 14, className = '', style }) => (
  <div className={`m-skeleton ${className}`} style={{ width: w, height: h, ...style }} />
)

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="m-card overflow-hidden">
      <div className="p-3 flex gap-3" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--bd)' }}>
        {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} h={10} />)}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="p-3 flex gap-3" style={{ borderBottom: '1px solid var(--bd)' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} h={12} style={{ opacity: 1 - r * 0.1 }} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardsSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="m-card p-4">
          <Skeleton w="45%" h={10} />
          <Skeleton w="70%" h={22} className="mt-3" />
          <Skeleton w="35%" h={9} className="mt-2" />
        </div>
      ))}
    </div>
  )
}

// ── EMPTY STATE ───────────────────────────────────────────
export function EmptyState({ icon, title, subtitle, action, onAction, compact }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-16'} px-4 m-fade`}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
        style={{ background: 'var(--surface-3)', color: 'var(--txt-3)' }}>
        <span className="w-6 h-6">{icon || Icons.box}</span>
      </div>
      <p className="text-sm font-semibold" style={{ color: 'var(--txt-2)' }}>{title}</p>
      {subtitle && <p className="text-xs mt-1 max-w-xs" style={{ color: 'var(--txt-3)' }}>{subtitle}</p>}
      {action && <PrimaryBtn className="mt-4" onClick={onAction}>{action}</PrimaryBtn>}
    </div>
  )
}

// ── DRAWER ────────────────────────────────────────────────
export function Drawer({ open, onClose, title, subtitle, children, width = 420, footer }) {
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 m-fade" style={{ background: 'rgba(8,18,32,0.45)', backdropFilter: 'blur(2px)' }} onClick={onClose} />
      <div className="relative m-drawer drawer-enter z-50 flex flex-col" style={{ width, maxWidth: '96vw' }}>
        <div className="flex items-start justify-between gap-3 px-5 py-4 sticky top-0 z-10"
          style={{ borderBottom: '1px solid var(--bd)', background: 'var(--surface)' }}>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--txt)' }}>{title}</h3>
            {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--txt-3)' }}>{subtitle}</p>}
          </div>
          <IconBtn icon={Icons.x} onClick={onClose} />
        </div>
        <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-5 py-4 flex items-center justify-end gap-2"
            style={{ borderTop: '1px solid var(--bd)', background: 'var(--surface-2)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ── MODAL ─────────────────────────────────────────────────
export function Modal({ open, onClose, title, subtitle, children, footer, width = 520 }) {
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="m-overlay" onClick={onClose}>
      <div className="m-modal" style={{ maxWidth: width }} onClick={e => e.stopPropagation()}>
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--bd)' }}>
            <div className="min-w-0">
              {title && <h3 className="font-semibold text-sm" style={{ color: 'var(--txt)' }}>{title}</h3>}
              {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--txt-3)' }}>{subtitle}</p>}
            </div>
            <IconBtn icon={Icons.x} onClick={onClose} />
          </div>
        )}
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-5 py-3.5 flex items-center justify-end gap-2"
            style={{ borderTop: '1px solid var(--bd)', background: 'var(--surface-2)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ── CONFIRM (compatibilidad) ──────────────────────────────
export function Confirm({ open, message, title, onConfirm, onCancel, confirmLabel = 'Eliminar', cancelLabel = 'Cancelar', danger = true }) {
  return (
    <Modal open={open} onClose={onCancel} width={430}
      title={title || confirmLabel}
      footer={
        <>
          <SecondaryBtn onClick={onCancel}>{cancelLabel}</SecondaryBtn>
          {danger
            ? <DangerBtn onClick={onConfirm}>{confirmLabel}</DangerBtn>
            : <PrimaryBtn onClick={onConfirm}>{confirmLabel}</PrimaryBtn>}
        </>
      }>
      <div className="flex gap-3">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: danger ? 'var(--danger-soft)' : 'var(--warn-soft)', color: danger ? 'var(--danger)' : 'var(--warn)' }}>
          <span className="w-4.5 h-4.5" style={{ width: 18, height: 18 }}>{Icons.alert}</span>
        </span>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--txt-2)' }}>{message}</p>
      </div>
    </Modal>
  )
}

// ── SECTION BOX (compatibilidad) ──────────────────────────
export function SectionBox({ title, children, color, className = '' }) {
  return (
    <div className={`rounded-xl p-3.5 flex flex-col gap-3 ${className}`}
      style={{ background: 'var(--surface-2)', border: '1px solid var(--bd)' }}>
      {title && (
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: color || 'var(--txt-3)' }}>{title}</p>
      )}
      {children}
    </div>
  )
}

// ── TABLA ─────────────────────────────────────────────────
export function TableWrap({ children, className = '', maxHeight }) {
  return (
    <div className={`m-card overflow-hidden ${className}`}>
      <div className="overflow-auto" style={maxHeight ? { maxHeight } : undefined}>
        <table className="m-table">{children}</table>
      </div>
    </div>
  )
}

// Encabezado ordenable
export function Th({ children, sortKey, sort, onSort, align = 'left', style }) {
  const active = sort?.key === sortKey
  return (
    <th style={{ textAlign: align, cursor: sortKey ? 'pointer' : 'default', ...style }}
      onClick={sortKey && onSort ? () => onSort(sortKey) : undefined}>
      <span className="inline-flex items-center gap-1" style={{ color: active ? 'var(--brand)' : undefined }}>
        {children}
        {sortKey && (
          <span className="w-3 h-3 inline-block" style={{ opacity: active ? 1 : 0.25 }}>
            {active && sort.dir === 'desc' ? Icons.arrowDown : Icons.arrowUp}
          </span>
        )}
      </span>
    </th>
  )
}

// Hook de ordenamiento para tablas
export function useSort(initialKey = null, initialDir = 'asc') {
  const [sort, setSort] = useState({ key: initialKey, dir: initialDir })
  const onSort = useCallback((key) => {
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }, [])
  const sortRows = useCallback((rows, accessors = {}) => {
    if (!sort.key) return rows
    const get = accessors[sort.key] || (r => r[sort.key])
    return [...rows].sort((a, b) => {
      const va = get(a), vb = get(b)
      if (va == null) return 1
      if (vb == null) return -1
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), undefined, { numeric: true })
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [sort])
  return { sort, onSort, sortRows }
}

// ── TOASTS ────────────────────────────────────────────────
const ToastContext = createContext(null)
export const useToast = () => useContext(ToastContext) || { push: () => {}, ok: () => {}, error: () => {}, warn: () => {} }

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const timers = useRef({})

  const remove = useCallback((id) => {
    setItems(list => list.map(i => i.id === id ? { ...i, out: true } : i))
    setTimeout(() => setItems(list => list.filter(i => i.id !== id)), 220)
  }, [])

  const push = useCallback((mensaje, tipo = 'info', duracion = 3800) => {
    const id = Math.random().toString(36).slice(2)
    setItems(list => [...list.slice(-3), { id, mensaje, tipo }])
    timers.current[id] = setTimeout(() => remove(id), duracion)
    return id
  }, [remove])

  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), [])

  const api = useMemo(() => ({
    push,
    ok:    (m, d) => push(m, 'ok', d),
    error: (m, d) => push(m, 'error', d ?? 5200),
    warn:  (m, d) => push(m, 'warn', d),
    info:  (m, d) => push(m, 'info', d),
  }), [push])

  const iconoPorTipo = { ok: Icons.check, error: Icons.alert, warn: Icons.alert, info: Icons.info }
  const colorPorTipo = { ok: 'var(--ok)', error: 'var(--danger)', warn: 'var(--warn)', info: 'var(--brand-2)' }

  return (
    <ToastContext.Provider value={api}>
      {children}
      {items.length > 0 && (
        <div className="m-toast-wrap">
          {items.map(t => (
            <div key={t.id} className={`m-toast m-toast-${t.tipo} ${t.out ? 'm-toast-out' : ''}`}>
              <span className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: colorPorTipo[t.tipo] }}>
                {iconoPorTipo[t.tipo]}
              </span>
              <p className="text-xs leading-relaxed flex-1" style={{ color: 'var(--txt)' }}>{t.mensaje}</p>
              <button onClick={() => remove(t.id)} className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--txt-3)' }}>
                {Icons.x}
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

// ── SPINNER ───────────────────────────────────────────────
export const Spinner = ({ size = 18, color = 'var(--brand-2)' }) => (
  <span className="inline-block m-spin" style={{
    width: size, height: size, borderRadius: '50%',
    border: `2px solid var(--surface-3)`, borderTopColor: color,
  }} />
)

export function PageLoader({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Spinner size={26} />
      {label && <p className="text-xs" style={{ color: 'var(--txt-3)' }}>{label}</p>}
    </div>
  )
}

// ── AVATAR ────────────────────────────────────────────────
export function Avatar({ name = '', size = 32, src }) {
  const iniciales = name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
  if (src) return <img src={src} alt={name} className="rounded-full object-cover" style={{ width: size, height: size }} />
  return (
    <span className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
      style={{
        width: size, height: size, fontSize: size * 0.38,
        background: 'var(--brand-grad)', color: '#fff', boxShadow: 'var(--sh-xs)',
      }}>
      {iniciales}
    </span>
  )
}
