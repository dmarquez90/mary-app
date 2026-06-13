import { useState, useEffect, useMemo, useContext, Fragment } from 'react'
import { useStore } from '../store'
import { LangContext } from '../i18n'
import { usePermissions } from '../usePermissions'
import { supabase } from '../supabase'
import { EmptyState, Icons } from '../components'

// ── Diccionarios para traducir action.type a una etiqueta legible ─────────
const VERB_LABELS = {
  ADD:      { es: 'Creó',          en: 'Created' },
  DEL:      { es: 'Eliminó',       en: 'Deleted' },
  UPD:      { es: 'Actualizó',     en: 'Updated' },
  APROBAR:  { es: 'Aprobó',        en: 'Approved' },
  RECHAZAR: { es: 'Rechazó',       en: 'Rejected' },
  DEVOLVER: { es: 'Devolvió',      en: 'Returned' },
  EMITIR:   { es: 'Emitió',        en: 'Issued' },
  PAGAR:    { es: 'Pagó',          en: 'Paid' },
  TOGGLE:   { es: 'Cambió estado de', en: 'Toggled' },
}

const ENTITY_LABELS = {
  AJUSTE_EQUIPO:          { es: 'ajuste de equipo',              en: 'equipment adjustment',      modulo: 'Financiero' },
  AVALUO_CLIENTE:         { es: 'avalúo de cliente',             en: 'client valuation',          modulo: 'Avalúos' },
  BUDGET:                 { es: 'ítem de presupuesto',           en: 'budget item',               modulo: 'Presupuesto' },
  CAJA_CHICA:             { es: 'caja chica',                    en: 'petty cash fund',           modulo: 'Financiero' },
  COSTO_DIRECTO:          { es: 'costo directo',                 en: 'direct cost',               modulo: 'Financiero' },
  COSTO_INDIRECTO:        { es: 'costo indirecto',               en: 'indirect cost',             modulo: 'Financiero' },
  ENTRADA:                { es: 'entrada de material',           en: 'material entry',            modulo: 'Inventario' },
  EQUIPO:                 { es: 'equipo',                        en: 'equipment',                 modulo: 'Financiero' },
  FASE:                   { es: 'fase',                          en: 'phase',                     modulo: 'Proyectos' },
  GASTO_CC:               { es: 'gasto de caja chica',           en: 'petty cash expense',        modulo: 'Financiero' },
  LIQUIDACION_CC:         { es: 'liquidación de caja chica',     en: 'petty cash settlement',     modulo: 'Financiero' },
  MATERIAL:               { es: 'material',                      en: 'material',                  modulo: 'Inventario' },
  MATERIAL_CON_ENTRADA:   { es: 'material (con entrada)',        en: 'material (with entry)',     modulo: 'Inventario' },
  MAT_PRES:               { es: 'material presupuestado',        en: 'budgeted material',         modulo: 'Mat. Presupuestados' },
  NOMINA:                 { es: 'planilla',                      en: 'payroll',                   modulo: 'Financiero' },
  OC:                     { es: 'orden de compra',               en: 'purchase order',            modulo: 'Compras' },
  ORDEN_CAMBIO:           { es: 'orden de cambio',               en: 'change order',              modulo: 'Órdenes de Cambio' },
  PRES_IND:               { es: 'presupuesto de indirectos',     en: 'indirect cost budget',      modulo: 'Financiero' },
  PROYECTO:               { es: 'proyecto',                      en: 'project',                   modulo: 'Proyectos' },
  SALIDA:                 { es: 'salida de material',            en: 'material issue',            modulo: 'Inventario' },
  SC_AVALUO:              { es: 'avalúo de subcontrato',         en: 'subcontract valuation',     modulo: 'Financiero' },
  SC_CONTRATO:            { es: 'contrato de subcontrato',       en: 'subcontract',                modulo: 'Financiero' },
  SOLICITUD:              { es: 'solicitud',                     en: 'request',                   modulo: 'Compras' },
  SOL_ELIM:               { es: 'solicitud de eliminación',      en: 'deletion request',          modulo: 'Inventario' },
  SUBCONTRATO:            { es: 'subcontrato',                   en: 'subcontract',                modulo: 'Financiero' },
}

// Acciones que no siguen el patrón VERBO_ENTIDAD — etiqueta completa
const OVERRIDE_LABELS = {
  APROBAR_SOL_ELIM:           { es: 'Aprobó solicitud de eliminación',      en: 'Approved deletion request',        modulo: 'Inventario' },
  RECHAZAR_SOL_ELIM:          { es: 'Rechazó solicitud de eliminación',     en: 'Rejected deletion request',        modulo: 'Inventario' },
  APROBAR_SC_AVALUO:          { es: 'Aprobó avalúo de subcontrato',         en: 'Approved subcontract valuation',   modulo: 'Financiero' },
  APROBAR_CAJA_CHICA:         { es: 'Aprobó apertura de caja chica',        en: 'Approved petty cash fund opening', modulo: 'Financiero' },
  RECHAZAR_CAJA_CHICA:        { es: 'Rechazó apertura de caja chica',       en: 'Rejected petty cash fund opening', modulo: 'Financiero' },
  APROBAR_LIQUIDACION_CC:     { es: 'Aprobó liquidación de caja chica',     en: 'Approved petty cash settlement',   modulo: 'Financiero' },
  RECHAZAR_LIQUIDACION_CC:    { es: 'Rechazó liquidación de caja chica',    en: 'Rejected petty cash settlement',   modulo: 'Financiero' },
  PAGAR_REEMBOLSO_CC:         { es: 'Marcó reembolso como pagado',          en: 'Marked reimbursement as paid',     modulo: 'Financiero' },
  DEVOLVER_RETENCION:         { es: 'Devolvió retención a subcontratista',  en: 'Returned subcontractor retention', modulo: 'Financiero' },
  EMITIR_ORDEN_PAGO_RETENCION:{ es: 'Emitió orden de pago de retención',    en: 'Issued retention payment order',   modulo: 'Financiero' },
  TOGGLE_MATERIAL:            { es: 'Activó/desactivó material',           en: 'Toggled material status',          modulo: 'Inventario' },
  ADD_SOL_ELIM:               { es: 'Solicitó eliminación',                 en: 'Requested deletion',               modulo: 'Inventario' },
  ADD_MATERIAL_CON_ENTRADA:   { es: 'Creó material con entrada inicial',    en: 'Created material with initial entry', modulo: 'Inventario' },
  UPD_AVALUO_CLIENTE_ESTADO:  { es: 'Cambió estado de avalúo de cliente',   en: 'Changed client valuation status',  modulo: 'Avalúos' },
  UPD_OC_ESTADO:              { es: 'Cambió estado de orden de compra',     en: 'Changed purchase order status',    modulo: 'Compras' },
  UPD_ORDEN_CAMBIO_ESTADO:    { es: 'Cambió estado de orden de cambio',     en: 'Changed change order status',      modulo: 'Órdenes de Cambio' },
  UPD_SOLICITUD_ESTADO:       { es: 'Cambió estado de solicitud',           en: 'Changed request status',           modulo: 'Compras' },
}

const VERB_PREFIXES = ['APROBAR','RECHAZAR','DEVOLVER','EMITIR','PAGAR','TOGGLE','ADD','DEL','UPD']

function parseAccion(accion, isEs) {
  if (OVERRIDE_LABELS[accion]) {
    const o = OVERRIDE_LABELS[accion]
    return { label: isEs ? o.es : o.en, modulo: o.modulo }
  }
  for (const verb of VERB_PREFIXES) {
    if (accion.startsWith(verb + '_')) {
      const rest = accion.slice(verb.length + 1)
      const ent = ENTITY_LABELS[rest]
      const verbLabel = (VERB_LABELS[verb] || {})[isEs ? 'es' : 'en'] || verb
      if (ent) return { label: `${verbLabel} ${isEs ? ent.es : ent.en}`, modulo: ent.modulo }
      return { label: `${verbLabel} ${rest.toLowerCase().replace(/_/g,' ')}`, modulo: 'Otro' }
    }
  }
  return { label: accion, modulo: 'Otro' }
}

// Extrae un detalle legible del payload de la acción
function describePayload(payload, isEs) {
  if (!payload || typeof payload !== 'object') return ''
  const t = payload.contrato || payload.avaluo || payload.gasto || payload.liquidacion
    || payload.material || payload.entrada || payload.item || payload
  const parts = []
  if (t.project_code) parts.push(`${t.project_code}${t.nombre ? ` — ${t.nombre}` : ''}`)
  else if (t.nombre) parts.push(t.nombre)
  if (t.descripcion) parts.push(t.descripcion)
  if (t.descripcion_trabajo) parts.push(t.descripcion_trabajo)
  if (t.subcontratista) parts.push(t.subcontratista)
  if (t.trabajador) parts.push(t.trabajador)
  if (t.proveedor) parts.push(t.proveedor)
  if (t.numero) parts.push(`#${t.numero}`)
  if (t.numero_factura) parts.push(t.numero_factura)
  if (t.cantidad) parts.push(`${isEs?'cant.':'qty'} ${t.cantidad}`)
  if (t.monto) parts.push(`$${parseFloat(t.monto).toFixed(2)}`)
  if (t.monto_total) parts.push(`$${parseFloat(t.monto_total).toFixed(2)}`)
  if (t.monto_asignado) parts.push(`$${parseFloat(t.monto_asignado).toFixed(2)}`)
  if (t.estado) parts.push(`(${t.estado})`)
  return parts.join(' — ')
}

export default function Auditoria() {
  const { state } = useStore()
  const { lang } = useContext(LangContext)
  const { canView } = usePermissions()
  const isEs = lang === 'ES'
  const { proyectos = [], usuarios = [] } = state

  const [logs, setLogs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [limit, setLimit]       = useState(200)
  const [expandedId, setExpandedId] = useState(null)

  // Filtros
  const [fUsuario, setFUsuario]   = useState('')
  const [fModulo, setFModulo]     = useState('')
  const [fProyecto, setFProyecto] = useState('')
  const [fDesde, setFDesde]       = useState('')
  const [fHasta, setFHasta]       = useState('')
  const [fTexto, setFTexto]       = useState('')

  const puedeVer = canView('auditoria')

  useEffect(() => {
    if (!puedeVer) return
    let cancelled = false
    async function load() {
      setLoading(true)
      let query = supabase.from('auditoria_log').select('*').order('created_at', { ascending: false }).limit(limit)
      if (fDesde) query = query.gte('created_at', `${fDesde}T00:00:00`)
      if (fHasta) query = query.lte('created_at', `${fHasta}T23:59:59`)
      if (fProyecto) query = query.eq('proyecto_id', fProyecto)
      if (fUsuario) query = query.eq('usuario_id', fUsuario)
      const { data, error } = await query
      if (!cancelled) {
        if (error) console.error('auditoria_log:', error)
        setLogs(data || [])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [puedeVer, limit, fDesde, fHasta, fProyecto, fUsuario])

  const rows = useMemo(() => {
    return logs.map(l => {
      const { label, modulo } = parseAccion(l.accion, isEs)
      const detalle = describePayload(l.payload, isEs)
      const proy = proyectos.find(p => p.id === l.proyecto_id)
      return { ...l, label, modulo, detalle, proyLabel: proy ? `${proy.project_code} — ${proy.nombre}` : '' }
    })
  }, [logs, isEs, proyectos])

  const modulos = useMemo(() => [...new Set(rows.map(r=>r.modulo))].sort(), [rows])

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (fModulo && r.modulo !== fModulo) return false
      if (fTexto) {
        const hay = `${r.label} ${r.detalle} ${r.usuario_nombre||''} ${r.accion}`.toLowerCase()
        if (!hay.includes(fTexto.toLowerCase())) return false
      }
      return true
    })
  }, [rows, fModulo, fTexto])

  const fmtFecha = (iso) => {
    const d = new Date(iso)
    return d.toLocaleString(isEs ? 'es' : 'en-US', { dateStyle: 'short', timeStyle: 'medium' })
  }

  if (!puedeVer) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <EmptyState icon={Icons.financial}
          title={isEs ? 'Acceso restringido' : 'Restricted access'}
          subtitle={isEs
            ? 'Este módulo solo está disponible para Administradores y Super Admin.'
            : 'This module is only available to Administrators and Super Admin.'} />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-800">{isEs ? 'Auditoría' : 'Audit Log'}</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {isEs
            ? 'Registro de todas las acciones realizadas por los usuarios — quién hizo qué y cuándo.'
            : 'Log of every action performed by users — who did what and when.'}
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5 grid grid-cols-2 md:grid-cols-6 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">{isEs?'Usuario':'User'}</label>
          <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A6B]"
            value={fUsuario} onChange={e=>setFUsuario(e.target.value)}>
            <option value="">{isEs?'Todos':'All'}</option>
            {usuarios.map(u=><option key={u.id} value={u.id}>{u.nombre||u.email}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">{isEs?'Módulo':'Module'}</label>
          <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A6B]"
            value={fModulo} onChange={e=>setFModulo(e.target.value)}>
            <option value="">{isEs?'Todos':'All'}</option>
            {modulos.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">{isEs?'Proyecto':'Project'}</label>
          <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A6B]"
            value={fProyecto} onChange={e=>setFProyecto(e.target.value)}>
            <option value="">{isEs?'Todos':'All'}</option>
            {proyectos.map(p=><option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">{isEs?'Desde':'From'}</label>
          <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A6B]"
            value={fDesde} onChange={e=>setFDesde(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">{isEs?'Hasta':'To'}</label>
          <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A6B]"
            value={fHasta} onChange={e=>setFHasta(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">{isEs?'Buscar':'Search'}</label>
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A6B]"
            value={fTexto} onChange={e=>setFTexto(e.target.value)} placeholder={isEs?'Texto libre...':'Free text...'} />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-400 px-5 py-6 text-center">{isEs?'Cargando...':'Loading...'}</p>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Icons.financial} title={isEs?'Sin actividad registrada':'No activity recorded'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{background:'#1B3A6B'}}>
                <tr>
                  {[isEs?'Fecha y hora':'Date & time', isEs?'Usuario':'User', isEs?'Módulo':'Module',
                    isEs?'Acción':'Action', isEs?'Detalle':'Detail', isEs?'Proyecto':'Project', '']
                    .map((h,i)=><th key={i} className="px-4 py-2.5 text-left text-xs font-semibold text-white whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r,i) => (
                  <Fragment key={r.id}>
                    <tr className={i%2===0?'bg-white':'bg-gray-50/50'}>
                      <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmtFecha(r.created_at)}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-700">
                        {r.usuario_nombre || '—'}
                        {r.usuario_rol && <span className="text-xs text-gray-400 ml-1">({r.usuario_rol})</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        <span className="px-2 py-0.5 rounded-full font-medium" style={{background:'#1B3A6B1A', color:'#1B3A6B'}}>{r.modulo}</span>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-700">{r.label}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-500 max-w-[260px] truncate">{r.detalle || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{r.proyLabel || '—'}</td>
                      <td className="px-4 py-2.5">
                        <button onClick={()=>setExpandedId(expandedId===r.id?null:r.id)} className="text-xs text-gray-400 hover:text-gray-600">
                          {expandedId===r.id ? (isEs?'Ocultar':'Hide') : (isEs?'Ver datos':'View data')}
                        </button>
                      </td>
                    </tr>
                    {expandedId===r.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="px-4 py-3">
                          <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all bg-white border border-gray-100 rounded-lg p-3 max-h-64 overflow-auto">
                            {JSON.stringify(r.payload, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && logs.length >= limit && (
          <div className="px-5 py-3 text-center border-t border-gray-100">
            <button onClick={()=>setLimit(l=>l+200)} className="text-sm text-[#1B3A6B] hover:underline">
              {isEs?'Cargar más':'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
