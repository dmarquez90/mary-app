import { ESTADO_COLORS, ESTADO_LABELS } from '../utils'

// ── DRAWER ────────────────────────────────────────────────
export function Drawer({ open, onClose, title, children, width = 360 }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div
        className="relative bg-white shadow-xl flex flex-col drawer-enter z-50 overflow-y-auto"
        style={{ width, maxWidth: '95vw' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="flex-1 p-5 flex flex-col gap-4">{children}</div>
      </div>
    </div>
  )
}

// ── EMPTY STATE ───────────────────────────────────────────
export function EmptyState({ icon, title, subtitle, action, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
      <div className="w-12 h-12 text-gray-300">{icon}</div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      {action && (
        <button
          onClick={onAction}
          className="mt-2 px-4 py-2 text-sm font-medium text-white rounded-lg"
          style={{ background: '#1D9E75' }}
        >{action}</button>
      )}
    </div>
  )
}

// ── BADGE ─────────────────────────────────────────────────
export function Badge({ estado, label }) {
  const cls = ESTADO_COLORS[estado] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label || ESTADO_LABELS[estado] || estado}
    </span>
  )
}

// ── FORM FIELD ────────────────────────────────────────────
export function Field({ label, required, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

export const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] bg-white"
export const selectCls = inputCls + " cursor-pointer"

// ── PRIMARY BUTTON ────────────────────────────────────────
export function PrimaryBtn({ children, onClick, disabled, type = 'button', className = '' }) {
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90 ${className}`}
      style={{ background: '#1D9E75' }}
    >{children}</button>
  )
}

export function SecondaryBtn({ children, onClick, className = '' }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors ${className}`}
    >{children}</button>
  )
}

export function DangerBtn({ children, onClick, className = '' }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors ${className}`}
    >{children}</button>
  )
}

// ── TOOLBAR BUTTON ────────────────────────────────────────
export function TBtn({ children, onClick, disabled, danger }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed
        ${danger ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-gray-600 border-gray-200 hover:bg-gray-50 bg-white'}`}
    >{children}</button>
  )
}

// ── STAT CARD ─────────────────────────────────────────────
export function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-semibold" style={{ color: color || '#111' }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── CONFIRM DIALOG ─────────────────────────────────────────
export function Confirm({ open, message, onConfirm, onCancel, confirmLabel = 'Eliminar', cancelLabel = 'Cancelar' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
        <p className="text-sm text-gray-700 mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <SecondaryBtn onClick={onCancel}>{cancelLabel}</SecondaryBtn>
          <DangerBtn onClick={onConfirm}>{confirmLabel}</DangerBtn>
        </div>
      </div>
    </div>
  )
}

// ── SECTION BOX ───────────────────────────────────────────
export function SectionBox({ title, children, color }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 flex flex-col gap-3">
      {title && <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide" style={color ? { color } : {}}>{title}</p>}
      {children}
    </div>
  )
}

// ── ICONS ─────────────────────────────────────────────────
export const Icons = {
  dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>,
  projects:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 7l10-5 10 5v10l-10 5L2 17z"/><path d="M12 2v20M2 7l10 5 10-5"/></svg>,
  budget:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="9" x2="9" y2="21"/></svg>,
  inventory: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  purchases: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
  financial: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  curvas:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  matpres:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
  table:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>,
  plus:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  trash:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  edit:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  check:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  alert:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
}
