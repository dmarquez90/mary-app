import { useState, useContext, useRef, useEffect } from 'react'
import { useStore } from '../store'
import { LangContext } from '../i18n'
import { today } from '../utils'
import { Drawer, EmptyState, Badge, Field, PrimaryBtn, SecondaryBtn, TBtn, Icons, inputCls, selectCls } from '../components'

const BRAND = '#1B3A6B'

const printStyles = `
  @media print {
    body * { visibility: hidden; }
    #print-area, #print-area * { visibility: visible; }
    #print-area { position: fixed; left: 0; top: 0; width: 100%; }
    @page { margin: 1.2cm; size: letter landscape; }
  }
`

// ── BUSCADOR DE MATERIAL ──────────────────────────────────
function MaterialSearchInput({ materiales, value, onChange, placeholder }) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const ref               = useRef(null)
  const selected          = materiales.find(m => m.id === value)

  const filtered = query.trim()
    ? materiales.filter(m =>
        m.codigo?.toLowerCase().includes(query.toLowerCase()) ||
        m.descripcion?.toLowerCase().includes(query.toLowerCase())
      )
    : materiales

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (m) => { onChange(m.id); setQuery(''); setOpen(false) }
  const clear  = () => { onChange(''); setQuery('') }

  return (
    <div ref={ref} className="relative">
      {selected && !open ? (
        <div className="flex items-center gap-2 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <span className="font-mono text-xs text-gray-400 flex-shrink-0">{selected.codigo}</span>
          <span className="text-sm text-gray-800 flex-1 truncate">{selected.descripcion}</span>
          <span className="text-xs text-gray-400 flex-shrink-0">{selected.unidad}</span>
          <button onClick={clear} className="text-gray-300 hover:text-red-400 flex-shrink-0 text-sm">✕</button>
        </div>
      ) : (
        <input className={inputCls} placeholder={placeholder || 'Search material...'}
          value={query} onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)} autoComplete="off" />
      )}
      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">No results</div>
          ) : filtered.map(m => (
            <button key={m.id} onClick={() => select(m)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors text-left border-b border-gray-50 last:border-0">
              <span className="font-mono text-xs text-gray-400 w-24 flex-shrink-0">{m.codigo}</span>
              <span className="text-sm text-gray-800 flex-1">{m.descripcion}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">{m.unidad}</span>
              <span className="text-xs font-mono font-medium text-green-600 flex-shrink-0">Stock: {m.stock_actual}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── BUSCADOR DE SOLICITUD ─────────────────────────────────
function SolicitudSearchInput({ solicitudes, solicitud_items, materiales, proyectos, value, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const ref               = useRef(null)
  const selected          = solicitudes.find(s => s.id === value)

  const filtered = solicitudes.filter(s => {
    if (!query.trim()) return true
    const proy = proyectos.find(p => p.id === s.proyecto_id)
    const q = query.toLowerCase()
    return (
      proy?.project_code?.toLowerCase().includes(q) ||
      s.nombre_solicitante?.toLowerCase().includes(q) ||
      s.folio?.toLowerCase().includes(q) ||
      s.created_at?.includes(q)
    )
  })

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (s) => { onChange(s); setQuery(''); setOpen(false) }
  const clear  = () => { onChange(null); setQuery('') }
  const getItems = (solId) => solicitud_items.filter(i => i.solicitud_id === solId)

  return (
    <div ref={ref} className="relative">
      {selected && !open ? (
        <div className="border border-gray-200 rounded-xl p-3 bg-white">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {selected.folio && <span className="font-mono text-xs font-bold" style={{color:BRAND}}>{selected.folio}</span>}
                <span className="font-mono text-xs text-gray-600">{proyectos.find(p => p.id === selected.proyecto_id)?.project_code}</span>
                <span className="text-xs text-gray-400">{selected.created_at}</span>
              </div>
              {selected.nombre_solicitante && (
                <p className="text-xs text-gray-500 mb-1">
                  👤 <span className="font-medium text-gray-700">{selected.nombre_solicitante}</span>
                  {selected.cargo_solicitante && ` — ${selected.cargo_solicitante}`}
                </p>
              )}
              <div className="flex flex-wrap gap-1 mt-1">
                {getItems(selected.id).slice(0,4).map(it => {
                  const m = materiales.find(x => x.id === it.material_id)
                  return <span key={it.id} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono">{m?.codigo} × {it.cantidad}</span>
                })}
                {getItems(selected.id).length > 4 && <span className="text-xs text-gray-400">+{getItems(selected.id).length - 4} more</span>}
              </div>
            </div>
            <button onClick={clear} className="text-gray-300 hover:text-red-400 text-sm flex-shrink-0">✕</button>
          </div>
        </div>
      ) : (
        <input className={inputCls} placeholder="Search by folio, project, requester or date..."
          value={query} onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)} autoComplete="off" />
      )}
      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">No approved requests</div>
          ) : filtered.map(s => {
            const proy  = proyectos.find(p => p.id === s.proyecto_id)
            const items = getItems(s.id)
            return (
              <button key={s.id} onClick={() => select(s)}
                className="w-full flex flex-col px-4 py-3 hover:bg-blue-50 transition-colors text-left border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  {s.folio && <span className="font-mono text-xs font-bold" style={{color:BRAND}}>{s.folio}</span>}
                  <span className="font-mono text-xs font-semibold text-gray-700">{proy?.project_code}</span>
                  <span className="text-xs text-gray-400">{s.created_at}</span>
                  {s.nombre_solicitante && <span className="text-xs text-gray-500 ml-auto">👤 {s.nombre_solicitante}</span>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {items.slice(0,3).map(it => {
                    const m = materiales.find(x => x.id === it.material_id)
                    return <span key={it.id} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-mono">{m?.codigo} × {it.cantidad} {it.unidad}</span>
                  })}
                  {items.length > 3 && <span className="text-xs text-gray-400">+{items.length-3}</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Compras() {
  const { state, dispatch } = useStore()
  const { t } = useContext(LangContext)
  const { solicitudes, solicitud_items, ordenes_compra, proyectos, presupuesto, materiales } = state

  const [tab, setTab]       = useState(0)
  const [drawer, setDrawer] = useState(null)
  const [form, setForm]     = useState({})
  const [solItems, setSolItems] = useState([{ material_id:'', cantidad:'', unidad:'und', actividad_id:'', observaciones:'' }])
  const [detail, setDetail] = useState(null)
  const [printDoc, setPrintDoc] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const TABS             = [t('comp_tab_sol'), t('comp_tab_oc')]
  const todasActsDelProy = presupuesto.filter(b => b.proyecto_id === form.proyecto_id && b.tipo === 'actividad')
  const activos          = materiales.filter(m => m.activo !== false)
  const solsAprobadas    = solicitudes.filter(s => s.estado === 'aprobada')

  const genFolio = () => {
    const n = solicitudes.length + 1
    return `SOL-${new Date().getFullYear()}-${String(n).padStart(3,'0')}`
  }

  const saveSol = () => {
    if (!form.proyecto_id || solItems.every(i => !i.material_id)) return
    const validItems = solItems.filter(i => i.material_id && i.cantidad)
    dispatch({ type: 'ADD_SOLICITUD', payload: {
      solicitud: {
        proyecto_id:             form.proyecto_id,
        actividad_id:            null,
        folio:                   form.folio || genFolio(),
        justificacion:           form.justificacion || '',
        nombre_solicitante:      form.nombre_solicitante || '',
        cargo_solicitante:       form.cargo_solicitante || '',
        email_solicitante:       form.email_solicitante || '',
        departamento:            form.departamento || '',
        fecha_requerida:         form.fecha_requerida || null,
        prioridad:               form.prioridad || 'normal',
        observaciones_generales: form.observaciones_generales || '',
      },
      items: validItems
    }})
    setDrawer(null)
    setSolItems([{ material_id:'', cantidad:'', unidad:'und', actividad_id:'', observaciones:'' }])
  }

  const saveOC = () => {
    if (!form.solicitud_id || !form.proveedor) return
    dispatch({ type:'ADD_OC', payload: {
      solicitud_id:       form.solicitud_id,
      proveedor:          form.proveedor,
      proyecto_id:        solicitudes.find(s => s.id === form.solicitud_id)?.proyecto_id,
      elaboro_nombre:     form.elaboro_nombre || '',
      elaboro_cargo:      form.elaboro_cargo || '',
      solicitante_nombre: form.solicitante_nombre || '',
      solicitante_cargo:  form.solicitante_cargo || '',
      aprobador_nombre:   form.aprobador_nombre || '',
      aprobador_cargo:    form.aprobador_cargo || '',
      notas:              form.notas || '',
    }})
    setDrawer(null)
  }

  const confirmDelete = () => {
    if (!confirmDel) return
    if (confirmDel.type === 'sol') dispatch({ type:'DEL_SOLICITUD', payload: confirmDel.id })
    else dispatch({ type:'DEL_OC', payload: confirmDel.id })
    setConfirmDel(null); setDrawer(null)
  }

  const detSol     = solicitudes.find(s => s.id === detail)
  const detItems   = solicitud_items.filter(i => i.solicitud_id === detail)
  const detOC      = ordenes_compra.find(oc => oc.id === detail)
  const detOCItems = detOC ? solicitud_items.filter(i => i.solicitud_id === detOC.solicitud_id) : []

  const addSolItem    = () => setSolItems(items => [...items, { material_id:'', cantidad:'', unidad:'und', actividad_id:'', observaciones:'' }])
  const setSolItem    = (idx, k, v) => setSolItems(items => items.map((it,i) => i === idx ? { ...it, [k]:v } : it))
  const removeSolItem = (idx) => setSolItems(items => items.filter((_,i) => i !== idx))

  const pendSol = solicitudes.filter(s => s.estado === 'pendiente').length
  const pendOC  = ordenes_compra.filter(oc => oc.estado === 'pendiente_aprobacion').length

  const handlePrint  = () => window.print()
  const openPrintSol = (sol) => {
    const items = solicitud_items.filter(i => i.solicitud_id === sol.id)
    const proy  = proyectos.find(p => p.id === sol.proyecto_id)
    setPrintDoc({ type:'sol', sol, items, proy })
  }
  const openPrintOC = (oc) => {
    const items = solicitud_items.filter(i => i.solicitud_id === oc.solicitud_id)
    const proy  = proyectos.find(p => p.id === oc.proyecto_id)
    setPrintDoc({ type:'oc', oc, items, proy })
  }

  const PRIORIDAD_COLORS = {
    normal:  'bg-gray-100 text-gray-600',
    alta:    'bg-amber-100 text-amber-700',
    urgente: 'bg-red-100 text-red-600',
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <style>{printStyles}</style>

      {/* CONFIRM DELETE */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <p className="text-sm font-semibold text-gray-800 mb-1">
              {confirmDel.type === 'sol' ? t('comp_del_sol_title') : t('comp_del_oc_title')}
            </p>
            <p className="text-sm text-gray-500 mb-5">{t('comp_del_confirm_msg')}</p>
            <div className="flex justify-end gap-2">
              <SecondaryBtn onClick={() => setConfirmDel(null)}>{t('btn_cancel')}</SecondaryBtn>
              <button onClick={confirmDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600">{t('btn_delete')}</button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW */}
      {printDoc && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <p className="font-semibold text-gray-800 text-sm">
                {printDoc.type === 'sol' ? t('comp_print_sol_title') : t('comp_print_oc_title')}
              </p>
              <div className="flex gap-2">
                <PrimaryBtn onClick={handlePrint}>🖨 {t('comp_print_btn')}</PrimaryBtn>
                <SecondaryBtn onClick={() => setPrintDoc(null)}>{t('btn_close')}</SecondaryBtn>
              </div>
            </div>
            <div id="print-area" className="p-8">
              {printDoc.type === 'sol' && <PrintSolicitud doc={printDoc} materiales={materiales} presupuesto={presupuesto} t={t} />}
              {printDoc.type === 'oc'  && <PrintOC doc={printDoc} materiales={materiales} presupuesto={presupuesto} t={t} />}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{t('comp_title')}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{t('comp_sub_pending', { n: pendSol })} · {t('comp_sub_oc', { n: pendOC })}</p>
        </div>
        {tab === 0 && (
          <PrimaryBtn onClick={() => {
            setForm({ proyecto_id:'', folio: genFolio(), justificacion:'', nombre_solicitante:'', cargo_solicitante:'', email_solicitante:'', departamento:'', fecha_requerida:'', prioridad:'normal', observaciones_generales:'' })
            setSolItems([{ material_id:'', cantidad:'', unidad:'und', actividad_id:'', observaciones:'' }])
            setDrawer('sol')
          }}>{t('comp_new_sol')}</PrimaryBtn>
        )}
        {tab === 1 && (
          <PrimaryBtn onClick={() => {
            setForm({ solicitud_id:'', proveedor:'', elaboro_nombre:'', elaboro_cargo:'', solicitante_nombre:'', solicitante_cargo:'', aprobador_nombre:'', aprobador_cargo:'', notas:'' })
            setDrawer('oc')
          }}>{t('comp_new_oc')}</PrimaryBtn>
        )}
      </div>

      {/* TABS */}
      <div className="flex border-b border-gray-200 mb-5">
        {TABS.map((label, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px
              ${tab===i ? 'border-[#1B3A6B] text-[#1B3A6B]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
            {i===0 && pendSol > 0 && <span className="ml-1.5 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">{pendSol}</span>}
            {i===1 && pendOC  > 0 && <span className="ml-1.5 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">{pendOC}</span>}
          </button>
        ))}
      </div>

      {/* SOLICITUDES */}
      {tab === 0 && (
        solicitudes.length === 0 ? (
          <EmptyState icon={Icons.purchases} title={t('comp_empty_sol')} action={t('comp_new_sol')} onAction={() => {
            setForm({ proyecto_id:'', folio: genFolio(), justificacion:'', nombre_solicitante:'', cargo_solicitante:'', email_solicitante:'', departamento:'', fecha_requerida:'', prioridad:'normal', observaciones_generales:'' })
            setSolItems([{ material_id:'', cantidad:'', unidad:'und', actividad_id:'', observaciones:'' }])
            setDrawer('sol')
          }} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                {[t('comp_sol_folio'), t('comp_col_project'), t('comp_requester_name'), t('comp_col_status'), t('comp_sol_priority'), t('comp_col_items'), t('comp_col_date'), t('comp_col_actions')].map((h,i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[...solicitudes].reverse().map(sol => {
                  const proy  = proyectos.find(p => p.id === sol.proyecto_id)
                  const items = solicitud_items.filter(i => i.solicitud_id === sol.id)
                  return (
                    <tr key={sol.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs font-mono font-semibold" style={{color:BRAND}}>{sol.folio || '—'}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-600">{proy?.project_code || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{sol.nombre_solicitante || '—'}</td>
                      <td className="px-4 py-3"><Badge estado={sol.estado} /></td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORIDAD_COLORS[sol.prioridad] || PRIORIDAD_COLORS.normal}`}>
                          {sol.prioridad === 'normal' ? t('comp_sol_priority_normal') : sol.prioridad === 'alta' ? t('comp_sol_priority_alta') : t('comp_sol_priority_urgente')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{t('comp_items_count', { n: items.length })}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{sol.created_at}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          <TBtn onClick={() => { setDetail(sol.id); setDrawer('detalle') }}>{t('btn_view')}</TBtn>
                          <TBtn onClick={() => openPrintSol(sol)}>🖨</TBtn>
                          {sol.estado === 'pendiente' && <>
                            <TBtn onClick={() => dispatch({ type:'UPD_SOLICITUD_ESTADO', payload:{ id:sol.id, estado:'aprobada' } })}>{t('btn_approve')}</TBtn>
                            <TBtn danger onClick={() => dispatch({ type:'UPD_SOLICITUD_ESTADO', payload:{ id:sol.id, estado:'rechazada' } })}>{t('btn_reject')}</TBtn>
                          </>}
                          {sol.estado === 'aprobada' && (
                            <TBtn onClick={() => {
                              setForm({ solicitud_id: sol.id, proveedor:'', elaboro_nombre:'', elaboro_cargo:'', solicitante_nombre: sol.nombre_solicitante||'', solicitante_cargo: sol.cargo_solicitante||'', aprobador_nombre:'', aprobador_cargo:'', notas:'' })
                              setDrawer('oc')
                            }}>{t('comp_generate_oc')}</TBtn>
                          )}
                          <TBtn danger onClick={() => setConfirmDel({ type:'sol', id:sol.id })}>{t('btn_delete')}</TBtn>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ÓRDENES DE COMPRA */}
      {tab === 1 && (
        ordenes_compra.length === 0 ? (
          <EmptyState icon={Icons.purchases} title={t('comp_empty_oc')} subtitle={t('comp_empty_oc_sub')} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                {[t('comp_col_oc'),t('comp_col_project'),t('comp_col_supplier'),t('comp_col_status'),t('comp_col_approval'),t('comp_col_actions')].map((h,i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[...ordenes_compra].reverse().map(oc => {
                  const proy = proyectos.find(p => p.id === oc.proyecto_id)
                  return (
                    <tr key={oc.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs font-mono font-semibold text-gray-700">{oc.oc_number}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{proy?.project_code || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{oc.proveedor || '—'}</td>
                      <td className="px-4 py-3"><Badge estado={oc.estado} /></td>
                      <td className="px-4 py-3 text-xs text-gray-400">{oc.fecha_aprobacion || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          <TBtn onClick={() => { setDetail(oc.id); setDrawer('detoc') }}>{t('btn_view')}</TBtn>
                          <TBtn onClick={() => openPrintOC(oc)}>🖨</TBtn>
                          {oc.estado === 'pendiente_aprobacion' && <>
                            <TBtn onClick={() => dispatch({ type:'UPD_OC_ESTADO', payload:{ id:oc.id, estado:'aprobada' } })}>{t('btn_approve')}</TBtn>
                            <TBtn danger onClick={() => dispatch({ type:'UPD_OC_ESTADO', payload:{ id:oc.id, estado:'cancelada' } })}>{t('comp_cancel_oc')}</TBtn>
                          </>}
                          {oc.estado === 'aprobada' && <span className="text-xs text-green-600 font-medium px-2">{t('comp_ready_receive')}</span>}
                          <TBtn danger onClick={() => setConfirmDel({ type:'oc', id:oc.id })}>{t('btn_delete')}</TBtn>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* DRAWER SOLICITUD */}
      <Drawer open={drawer==='sol'} onClose={() => setDrawer(null)} title={t('comp_form_sol_title')} width={560}>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('comp_sol_folio')}>
            <input className={inputCls} value={form.folio||''} onChange={set('folio')} placeholder="SOL-2026-001" />
          </Field>
          <Field label={t('comp_form_project')} required>
            <select className={selectCls} value={form.proyecto_id||''} onChange={e => setForm(f=>({...f, proyecto_id:e.target.value}))}>
              <option value="">{t('lbl_select')}</option>
              {proyectos.filter(p=>p.estado!=='completado'&&p.estado!=='cancelado').map(p=>(
                <option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('comp_sol_req_date')}>
            <input type="date" className={inputCls} value={form.fecha_requerida||''} onChange={set('fecha_requerida')} />
          </Field>
          <Field label={t('comp_sol_priority')}>
            <select className={selectCls} value={form.prioridad||'normal'} onChange={set('prioridad')}>
              <option value="normal">{t('comp_sol_priority_normal')}</option>
              <option value="alta">{t('comp_sol_priority_alta')}</option>
              <option value="urgente">{t('comp_sol_priority_urgente')}</option>
            </select>
          </Field>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('comp_requester_info')}</p>
          <Field label={t('comp_requester_name')}>
            <input className={inputCls} value={form.nombre_solicitante||''} onChange={set('nombre_solicitante')} placeholder={t('comp_requester_name')} />
          </Field>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <Field label={t('comp_requester_position')}>
              <input className={inputCls} value={form.cargo_solicitante||''} onChange={set('cargo_solicitante')} placeholder={t('comp_requester_position')} />
            </Field>
            <Field label={t('comp_requester_dept')}>
              <input className={inputCls} value={form.departamento||''} onChange={set('departamento')} placeholder={t('comp_requester_dept')} />
            </Field>
          </div>
          <div className="mt-2">
            <Field label={t('comp_sol_email')}>
              <input type="email" className={inputCls} value={form.email_solicitante||''} onChange={set('email_solicitante')} placeholder="email@company.com" />
            </Field>
          </div>
        </div>

        <Field label={t('comp_form_justification')}>
          <textarea className={inputCls} rows={2} value={form.justificacion||''} onChange={set('justificacion')} placeholder={t('comp_form_justification_ph')} />
        </Field>

        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('comp_form_items')} *</label>
            <button onClick={addSolItem} className="text-xs font-medium px-2 py-1 rounded-md"
              style={{ color:BRAND, background:'#EEF2F7' }}>
              {t('comp_form_add_item')}
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {solItems.map((it, idx) => (
              <div key={idx} className="rounded-xl p-3 flex flex-col gap-2 border border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">#{idx + 1}</span>
                  {solItems.length > 1 && (
                    <button onClick={() => removeSolItem(idx)} className="text-xs text-red-400 hover:text-red-600">✕ Remove</button>
                  )}
                </div>
                <MaterialSearchInput
                  materiales={activos}
                  value={it.material_id}
                  onChange={v => {
                    const mat = activos.find(m => m.id === v)
                    setSolItem(idx, 'material_id', v)
                    if (mat) setSolItem(idx, 'unidad', mat.unidad || 'und')
                  }}
                  placeholder={t('inv_form_material') + '...'}
                />
                <div className="flex gap-2">
                  <input type="number"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B]"
                    style={{ background:'#F2F2F2' }}
                    placeholder={t('lbl_quantity') + ' *'}
                    value={it.cantidad} onChange={e=>setSolItem(idx,'cantidad',e.target.value)} min="0" step="0.01"/>
                  <input
                    className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A6B]"
                    style={{ background:'#F2F2F2' }}
                    placeholder={t('lbl_unit')}
                    value={it.unidad} onChange={e=>setSolItem(idx,'unidad',e.target.value)}/>
                </div>
                {form.proyecto_id && (
                  <select className={selectCls} value={it.actividad_id||''} onChange={e=>setSolItem(idx,'actividad_id',e.target.value)}>
                    <option value="">— {t('comp_form_activity')} ({t('btn_cancel') === 'Cancel' ? 'optional' : 'opcional'}) —</option>
                    {todasActsDelProy.map(a => <option key={a.id} value={a.id}>{a.code} — {a.descripcion}</option>)}
                  </select>
                )}
                <input className={inputCls}
                  placeholder={t('lbl_notes') + (t('btn_cancel') === 'Cancel' ? ' / Remarks (optional)' : ' / Observaciones (opcional)')}
                  value={it.observaciones||''} onChange={e=>setSolItem(idx,'observaciones',e.target.value)}/>
              </div>
            ))}
          </div>
        </div>

        <Field label={t('comp_sol_general_remarks')}>
          <textarea className={inputCls} rows={2} value={form.observaciones_generales||''} onChange={set('observaciones_generales')} placeholder={t('comp_sol_general_remarks_ph')} />
        </Field>

        <div className="flex gap-2 mt-auto pt-2">
          <SecondaryBtn onClick={() => setDrawer(null)} className="flex-1">{t('btn_cancel')}</SecondaryBtn>
          <PrimaryBtn onClick={saveSol} disabled={!form.proyecto_id || solItems.every(i=>!i.material_id||!i.cantidad)} className="flex-1">
            {t('comp_form_submit')}
          </PrimaryBtn>
        </div>
      </Drawer>

      {/* DRAWER OC */}
      <Drawer open={drawer==='oc'} onClose={() => setDrawer(null)} title={t('comp_form_oc_title')} width={520}>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">{t('comp_form_sol_ref')} *</label>
          <SolicitudSearchInput
            solicitudes={solsAprobadas}
            solicitud_items={solicitud_items}
            materiales={materiales}
            proyectos={proyectos}
            value={form.solicitud_id || ''}
            onChange={sol => {
              if (!sol) { setForm(f => ({ ...f, solicitud_id:'', solicitante_nombre:'', solicitante_cargo:'' })); return }
              setForm(f => ({ ...f, solicitud_id: sol.id, solicitante_nombre: sol.nombre_solicitante||'', solicitante_cargo: sol.cargo_solicitante||'' }))
            }}
          />
        </div>
        <Field label={t('comp_form_supplier')} required>
          <input className={inputCls} value={form.proveedor||''} onChange={set('proveedor')} placeholder={t('comp_form_supplier_ph')} />
        </Field>
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('comp_prepared_by')}</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('comp_name')}><input className={inputCls} value={form.elaboro_nombre||''} onChange={set('elaboro_nombre')} placeholder={t('comp_name')} /></Field>
            <Field label={t('comp_position')}><input className={inputCls} value={form.elaboro_cargo||''} onChange={set('elaboro_cargo')} placeholder={t('comp_position')} /></Field>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('comp_requested_by')}</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('comp_name')}><input className={inputCls} value={form.solicitante_nombre||''} onChange={set('solicitante_nombre')} placeholder={t('comp_name')} /></Field>
            <Field label={t('comp_position')}><input className={inputCls} value={form.solicitante_cargo||''} onChange={set('solicitante_cargo')} placeholder={t('comp_position')} /></Field>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('comp_approved_by')}</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('comp_name')}><input className={inputCls} value={form.aprobador_nombre||''} onChange={set('aprobador_nombre')} placeholder={t('comp_name')} /></Field>
            <Field label={t('comp_position')}><input className={inputCls} value={form.aprobador_cargo||''} onChange={set('aprobador_cargo')} placeholder={t('comp_position')} /></Field>
          </div>
        </div>
        <Field label={t('lbl_notes')}>
          <textarea className={inputCls} rows={2} value={form.notas||''} onChange={set('notas')} placeholder={t('comp_notes_ph')} />
        </Field>
        <div className="flex gap-2 mt-auto pt-2">
          <SecondaryBtn onClick={() => setDrawer(null)} className="flex-1">{t('btn_cancel')}</SecondaryBtn>
          <PrimaryBtn onClick={saveOC} disabled={!form.solicitud_id||!form.proveedor} className="flex-1">{t('comp_form_create_oc')}</PrimaryBtn>
        </div>
      </Drawer>

      {/* DRAWER DETALLE SOLICITUD */}
      <Drawer open={drawer==='detalle'} onClose={() => setDrawer(null)} title={t('comp_detail_sol')} width={440}>
        {detSol && <>
          <div className="grid grid-cols-2 gap-3">
            {detSol.folio && <div><p className="text-xs text-gray-400">{t('comp_sol_folio')}</p><p className="text-sm font-mono font-bold" style={{color:BRAND}}>{detSol.folio}</p></div>}
            <div><p className="text-xs text-gray-400">{t('lbl_project')}</p><p className="text-sm font-medium">{proyectos.find(p=>p.id===detSol.proyecto_id)?.project_code || '—'}</p></div>
            <div><p className="text-xs text-gray-400">{t('lbl_status')}</p><Badge estado={detSol.estado} /></div>
            <div><p className="text-xs text-gray-400">{t('comp_sol_priority')}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORIDAD_COLORS[detSol.prioridad] || PRIORIDAD_COLORS.normal}`}>
                {detSol.prioridad === 'normal' ? t('comp_sol_priority_normal') : detSol.prioridad === 'alta' ? t('comp_sol_priority_alta') : t('comp_sol_priority_urgente')}
              </span>
            </div>
            <div><p className="text-xs text-gray-400">{t('lbl_date')}</p><p className="text-sm">{detSol.created_at}</p></div>
            {detSol.fecha_requerida && <div><p className="text-xs text-gray-400">{t('comp_sol_req_date')}</p><p className="text-sm">{detSol.fecha_requerida}</p></div>}
            {detSol.nombre_solicitante && <div><p className="text-xs text-gray-400">{t('comp_requester_name')}</p><p className="text-sm">{detSol.nombre_solicitante}</p></div>}
            {detSol.cargo_solicitante  && <div><p className="text-xs text-gray-400">{t('comp_requester_position')}</p><p className="text-sm">{detSol.cargo_solicitante}</p></div>}
            {detSol.departamento       && <div><p className="text-xs text-gray-400">{t('comp_requester_dept')}</p><p className="text-sm">{detSol.departamento}</p></div>}
            {detSol.email_solicitante  && <div><p className="text-xs text-gray-400">{t('comp_sol_email')}</p><p className="text-sm">{detSol.email_solicitante}</p></div>}
          </div>
          {detSol.justificacion && <div><p className="text-xs text-gray-400">{t('comp_form_justification')}</p><p className="text-sm text-gray-700">{detSol.justificacion}</p></div>}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">{t('comp_detail_materials')}</p>
            {detItems.map(it => {
              const m   = materiales.find(x=>x.id===it.material_id)
              const act = presupuesto.find(b=>b.id===it.actividad_id)
              return (
                <div key={it.id} className="py-2 border-b border-gray-50">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">{m?.codigo} — {m?.descripcion || '—'}</span>
                    <span className="font-mono text-gray-500">{it.cantidad} {it.unidad}</span>
                  </div>
                  {act && <p className="text-xs text-gray-400 mt-0.5">{act.code} — {act.descripcion}</p>}
                  {it.observaciones && <p className="text-xs text-gray-400 italic mt-0.5">{it.observaciones}</p>}
                </div>
              )
            })}
          </div>
          {detSol.observaciones_generales && <div><p className="text-xs text-gray-400">{t('comp_sol_general_remarks')}</p><p className="text-sm text-gray-700">{detSol.observaciones_generales}</p></div>}
          <div className="flex gap-2">
            <PrimaryBtn onClick={() => openPrintSol(detSol)} className="flex-1">🖨 {t('comp_print_btn')}</PrimaryBtn>
            <button onClick={() => setConfirmDel({ type:'sol', id:detSol.id })} className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50">{t('btn_delete')}</button>
          </div>
        </>}
      </Drawer>

      {/* DRAWER DETALLE OC */}
      <Drawer open={drawer==='detoc'} onClose={() => setDrawer(null)} title={t('comp_detail_oc')} width={420}>
        {detOC && <>
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-xs text-gray-400">{t('comp_col_oc')}</p><p className="text-sm font-mono font-semibold">{detOC.oc_number}</p></div>
            <div><p className="text-xs text-gray-400">{t('lbl_status')}</p><Badge estado={detOC.estado} /></div>
            <div><p className="text-xs text-gray-400">{t('comp_col_supplier')}</p><p className="text-sm">{detOC.proveedor}</p></div>
            <div><p className="text-xs text-gray-400">{t('comp_col_approval')}</p><p className="text-sm">{detOC.fecha_aprobacion || t('comp_pending_approval')}</p></div>
            {detOC.elaboro_nombre   && <div><p className="text-xs text-gray-400">{t('comp_prepared_by')}</p><p className="text-sm">{detOC.elaboro_nombre}</p></div>}
            {detOC.aprobador_nombre && <div><p className="text-xs text-gray-400">{t('comp_approved_by')}</p><p className="text-sm">{detOC.aprobador_nombre}</p></div>}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">{t('comp_detail_items')}</p>
            {detOCItems.map(it => {
              const m = materiales.find(x=>x.id===it.material_id)
              return (
                <div key={it.id} className="flex justify-between py-2 border-b border-gray-50 text-sm">
                  <span className="text-gray-700">{m?.codigo} — {m?.descripcion || '—'}</span>
                  <span className="font-mono text-gray-500">{it.cantidad} {it.unidad}</span>
                </div>
              )
            })}
          </div>
          {detOC.notas && <div><p className="text-xs text-gray-400">{t('lbl_notes')}</p><p className="text-sm text-gray-700">{detOC.notas}</p></div>}
          {detOC.estado === 'aprobada' && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-700">{t('comp_oc_approved_msg')}</div>}
          <div className="flex gap-2">
            <PrimaryBtn onClick={() => openPrintOC(detOC)} className="flex-1">🖨 {t('comp_print_btn')}</PrimaryBtn>
            <button onClick={() => setConfirmDel({ type:'oc', id:detOC.id })} className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50">{t('btn_delete')}</button>
          </div>
        </>}
      </Drawer>
    </div>
  )
}

// ── PRINT: SOLICITUD ──────────────────────────────────────
function PrintSolicitud({ doc, materiales, presupuesto, t }) {
  const { sol, items, proy } = doc
  const cell = { padding:'6px 8px', border:'1px solid #ccc', fontSize:'11px' }
  const hdr  = { ...cell, background:BRAND, color:'white', fontWeight:'bold', fontSize:'10px' }
  const lbl  = { ...cell, background:'#EEF2F7', fontWeight:'bold', color:BRAND }

  const isEn = t('btn_save') === 'Save'
  const L = {
    title:       isEn ? 'MATERIALS REQUEST FORM' : 'SOLICITUD DE MATERIALES',
    subtitle:    isEn ? 'Materials Request Form' : 'Solicitud de Materiales',
    folio:       isEn ? 'Folio' : 'Folio',
    requester:   isEn ? 'REQUESTER' : 'SOLICITANTE',
    position:    isEn ? 'POSITION' : 'CARGO',
    dept:        isEn ? 'DEPARTMENT' : 'DEPARTAMENTO',
    email:       'E-MAIL',
    project:     isEn ? 'PROJECT' : 'PROYECTO',
    reqDate:     isEn ? 'REQUEST DATE' : 'FECHA SOLICITUD',
    reqByDate:   isEn ? 'REQUIRED DATE' : 'FECHA REQUERIDA',
    priority:    isEn ? 'PRIORITY' : 'PRIORIDAD',
    justif:      isEn ? 'JUSTIFICATION' : 'JUSTIFICACIÓN',
    num:         '#',
    code:        isEn ? 'CODE' : 'CÓDIGO',
    desc:        isEn ? 'MATERIAL / SUPPLY DESCRIPTION' : 'DESCRIPCIÓN DEL MATERIAL',
    unit:        isEn ? 'UNIT' : 'UNIDAD',
    qty:         isEn ? 'QUANTITY' : 'CANTIDAD',
    activity:    isEn ? 'ACTIVITY' : 'ACTIVIDAD',
    remarks:     isEn ? 'REMARKS' : 'OBSERVACIONES',
    genRemarks:  isEn ? 'GENERAL REMARKS' : 'OBSERVACIONES GENERALES',
    elaborated:  isEn ? 'ELABORATED BY' : 'ELABORADO POR',
    authorized:  isEn ? 'AUTHORIZED BY' : 'AUTORIZADO POR',
    received:    isEn ? 'RECEIVED BY' : 'RECIBIDO POR',
    date:        isEn ? 'Date' : 'Fecha',
    footer:      isEn
      ? 'Marquez Project Solutions LLC · Format: F-ALM-001 · Rev. 2026 · Controlled document – Do not duplicate without authorization'
      : 'Marquez Project Solutions LLC · Formato: F-ALM-001 · Rev. 2026 · Documento controlado – No duplicar sin autorización',
    prioLabel:   sol.prioridad === 'normal' ? (isEn ? 'NORMAL' : 'NORMAL') : sol.prioridad === 'alta' ? (isEn ? 'HIGH' : 'ALTA') : (isEn ? 'URGENT' : 'URGENTE'),
  }

  const PRIO_COLOR = { normal:'#374151', alta:'#D97706', urgente:'#DC2626' }

  return (
    <div style={{ fontFamily:'Arial, sans-serif', fontSize:'11px', color:'#111', maxWidth:'100%' }}>
      {/* HEADER */}
      <table style={{ width:'100%', borderCollapse:'collapse', border:`2px solid ${BRAND}` }}>
        <tbody><tr>
          <td style={{ padding:'10px 14px', width:'40%', borderRight:`2px solid ${BRAND}` }}>
            <p style={{ margin:0, fontSize:'16px', fontWeight:'bold', color:BRAND }}>Marquez Project Solutions LLC</p>
            <p style={{ margin:'2px 0 0', fontSize:'10px', color:'#666' }}>MARY ERP — Management And Resources Yield</p>
          </td>
          <td style={{ padding:'10px 14px', width:'40%', borderRight:`2px solid ${BRAND}`, textAlign:'center' }}>
            <p style={{ margin:0, fontSize:'14px', fontWeight:'bold', color:BRAND }}>{L.title}</p>
            <p style={{ margin:'2px 0 0', fontSize:'10px', color:'#666' }}>{L.subtitle}</p>
          </td>
          <td style={{ padding:'10px 14px', width:'20%' }}>
            <p style={{ margin:0, fontSize:'10px', color:'#666' }}>{L.folio}:</p>
            <p style={{ margin:'2px 0 0', fontWeight:'bold', fontSize:'13px', color:BRAND }}>{sol.folio || '—'}</p>
            <p style={{ margin:'4px 0 0', fontSize:'10px', color:'#666' }}>F-ALM-001 · Rev.2026</p>
          </td>
        </tr></tbody>
      </table>

      {/* INFO */}
      <table style={{ width:'100%', borderCollapse:'collapse', marginTop:'-1px', border:`1px solid ${BRAND}`, borderTop:'none' }}>
        <tbody>
          <tr>
            <td style={{ ...lbl, width:'20%' }}>{L.requester}</td>
            <td style={{ ...cell, width:'30%' }}>{sol.nombre_solicitante || '___________________'}</td>
            <td style={{ ...lbl, width:'15%' }}>{L.position}</td>
            <td style={{ ...cell, width:'35%' }}>{sol.cargo_solicitante || '___________________'}</td>
          </tr>
          <tr>
            <td style={lbl}>{L.dept}</td>
            <td style={cell}>{sol.departamento || '___________________'}</td>
            <td style={lbl}>{L.email}</td>
            <td style={cell}>{sol.email_solicitante || '___________________'}</td>
          </tr>
          <tr>
            <td style={lbl}>{L.project}</td>
            <td style={cell}>{proy?.project_code} — {proy?.nombre}</td>
            <td style={lbl}>{L.reqDate}</td>
            <td style={cell}>{sol.created_at}</td>
          </tr>
          <tr>
            <td style={lbl}>{L.reqByDate}</td>
            <td style={cell}>{sol.fecha_requerida || '___________________'}</td>
            <td style={lbl}>{L.priority}</td>
            <td style={{ ...cell, fontWeight:'bold', color: PRIO_COLOR[sol.prioridad] || '#374151' }}>{L.prioLabel}</td>
          </tr>
          <tr>
            <td style={lbl}>{L.justif}</td>
            <td style={cell} colSpan={3}>{sol.justificacion || '—'}</td>
          </tr>
        </tbody>
      </table>

      {/* TABLA MATERIALES */}
      <table style={{ width:'100%', borderCollapse:'collapse', marginTop:'8px' }}>
        <thead>
          <tr>
            <th style={{ ...hdr, width:'4%' }}>{L.num}</th>
            <th style={{ ...hdr, width:'10%' }}>{L.code}</th>
            <th style={{ ...hdr, width:'28%' }}>{L.desc}</th>
            <th style={{ ...hdr, width:'6%' }}>{L.unit}</th>
            <th style={{ ...hdr, width:'8%' }}>{L.qty}</th>
            <th style={{ ...hdr, width:'24%' }}>{L.activity}</th>
            <th style={{ ...hdr, width:'20%' }}>{L.remarks}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => {
            const m   = materiales.find(x => x.id === it.material_id)
            const act = presupuesto.find(b => b.id === it.actividad_id)
            return (
              <tr key={it.id} style={{ background: idx%2===0 ? '#fff' : '#F8FAFC' }}>
                <td style={{ ...cell, textAlign:'center' }}>{idx+1}</td>
                <td style={{ ...cell, fontFamily:'monospace' }}>{m?.codigo || '—'}</td>
                <td style={cell}>{m?.descripcion || '—'}</td>
                <td style={{ ...cell, textAlign:'center' }}>{it.unidad}</td>
                <td style={{ ...cell, textAlign:'center', fontWeight:'bold' }}>{it.cantidad}</td>
                <td style={{ ...cell, fontSize:'10px' }}>{act ? `${act.code} — ${act.descripcion}` : '—'}</td>
                <td style={{ ...cell, fontSize:'10px' }}>{it.observaciones || '—'}</td>
              </tr>
            )
          })}
          {Array.from({ length: Math.max(0, 15 - items.length) }).map((_, i) => (
            <tr key={`empty-${i}`} style={{ background: (items.length+i)%2===0 ? '#fff' : '#F8FAFC' }}>
              {[...Array(7)].map((_, j) => <td key={j} style={{ ...cell, height:'22px' }}></td>)}
            </tr>
          ))}
        </tbody>
      </table>

      {/* OBSERVACIONES GENERALES */}
      <table style={{ width:'100%', borderCollapse:'collapse', marginTop:'-1px' }}>
        <tbody><tr>
          <td style={{ ...lbl, width:'20%' }}>{L.genRemarks}</td>
          <td style={{ ...cell }}>{sol.observaciones_generales || '—'}</td>
        </tr></tbody>
      </table>

      {/* FIRMAS */}
      <table style={{ width:'100%', borderCollapse:'collapse', marginTop:'24px' }}>
        <tbody><tr>
          {[L.elaborated, L.authorized, L.received].map((label, i) => (
            <td key={i} style={{ padding:'0 16px', textAlign:'center', width:'33%', borderRight: i < 2 ? '1px solid #ddd' : 'none' }}>
              <div style={{ borderTop:`2px solid ${BRAND}`, paddingTop:'8px', marginTop:'40px' }}>
                <p style={{ margin:0, fontWeight:'bold', fontSize:'11px' }}>
                  {i === 0 ? (sol.nombre_solicitante || '___________________') : '___________________'}
                </p>
                <p style={{ margin:'2px 0 0', color:'#666', fontSize:'10px' }}>{label}</p>
                <p style={{ margin:'6px 0 0', color:'#666', fontSize:'10px' }}>{L.date}: _______________</p>
              </div>
            </td>
          ))}
        </tr></tbody>
      </table>

      <p style={{ textAlign:'center', fontSize:'9px', color:'#999', marginTop:'16px', borderTop:'1px solid #eee', paddingTop:'8px' }}>
        {L.footer}
      </p>
    </div>
  )
}

// ── PRINT: ORDEN DE COMPRA ────────────────────────────────
function PrintOC({ doc, materiales, presupuesto, t }) {
  const { oc, items, proy } = doc
  const cell = { padding:'6px 8px', border:'1px solid #ccc', fontSize:'11px' }
  const hdr  = { ...cell, background:BRAND, color:'white', fontWeight:'bold', fontSize:'10px' }
  const lbl  = { ...cell, background:'#EEF2F7', fontWeight:'bold', color:BRAND }

  const isEn = t('btn_save') === 'Save'
  const L = {
    title:      isEn ? 'PURCHASE ORDER' : 'ORDEN DE COMPRA',
    subtitle:   isEn ? 'Purchase Order' : 'Orden de Compra',
    oc:         isEn ? 'PO No.' : 'N° OC',
    project:    isEn ? 'PROJECT' : 'PROYECTO',
    supplier:   isEn ? 'SUPPLIER' : 'PROVEEDOR',
    status:     isEn ? 'STATUS' : 'ESTADO',
    approval:   isEn ? 'APPROVAL DATE' : 'FECHA APROBACIÓN',
    num:        '#',
    code:       isEn ? 'CODE' : 'CÓDIGO',
    desc:       isEn ? 'DESCRIPTION' : 'DESCRIPCIÓN',
    unit:       isEn ? 'UNIT' : 'UNIDAD',
    qty:        isEn ? 'QUANTITY' : 'CANTIDAD',
    activity:   isEn ? 'ACTIVITY' : 'ACTIVIDAD',
    notes:      isEn ? 'NOTES' : 'NOTAS',
    elaborated: isEn ? 'PREPARED BY' : 'ELABORADO POR',
    requested:  isEn ? 'REQUESTED BY' : 'SOLICITADO POR',
    authorized: isEn ? 'AUTHORIZED BY' : 'AUTORIZADO POR',
    date:       isEn ? 'Date' : 'Fecha',
    footer:     isEn
      ? 'Marquez Project Solutions LLC · Format: F-OC-001 · Rev. 2026 · Controlled document – Do not duplicate without authorization'
      : 'Marquez Project Solutions LLC · Formato: F-OC-001 · Rev. 2026 · Documento controlado – No duplicar sin autorización',
  }

  return (
    <div style={{ fontFamily:'Arial, sans-serif', fontSize:'11px', color:'#111' }}>
      {/* HEADER */}
      <table style={{ width:'100%', borderCollapse:'collapse', border:`2px solid ${BRAND}` }}>
        <tbody><tr>
          <td style={{ padding:'10px 14px', width:'40%', borderRight:`2px solid ${BRAND}` }}>
            <p style={{ margin:0, fontSize:'16px', fontWeight:'bold', color:BRAND }}>Marquez Project Solutions LLC</p>
            <p style={{ margin:'2px 0 0', fontSize:'10px', color:'#666' }}>MARY ERP — Management And Resources Yield</p>
          </td>
          <td style={{ padding:'10px 14px', width:'40%', borderRight:`2px solid ${BRAND}`, textAlign:'center' }}>
            <p style={{ margin:0, fontSize:'14px', fontWeight:'bold', color:BRAND }}>{L.title}</p>
            <p style={{ margin:'2px 0 0', fontSize:'10px', color:'#666' }}>{L.subtitle}</p>
          </td>
          <td style={{ padding:'10px 14px', width:'20%' }}>
            <p style={{ margin:0, fontSize:'10px', color:'#666' }}>{L.oc}:</p>
            <p style={{ margin:'2px 0 0', fontWeight:'bold', fontSize:'14px', color:BRAND }}>{oc.oc_number}</p>
            <p style={{ margin:'4px 0 0', fontSize:'10px', color:'#666' }}>{oc.created_at}</p>
          </td>
        </tr></tbody>
      </table>

      {/* INFO */}
      <table style={{ width:'100%', borderCollapse:'collapse', marginTop:'-1px', border:`1px solid ${BRAND}`, borderTop:'none' }}>
        <tbody>
          <tr>
            <td style={{ ...lbl, width:'15%' }}>{L.project}</td>
            <td style={{ ...cell, width:'35%' }}>{proy?.project_code} — {proy?.nombre}</td>
            <td style={{ ...lbl, width:'15%' }}>{L.supplier}</td>
            <td style={{ ...cell, width:'35%' }}>{oc.proveedor}</td>
          </tr>
          <tr>
            <td style={lbl}>{L.status}</td>
            <td style={cell}>{oc.estado?.toUpperCase()}</td>
            <td style={lbl}>{L.approval}</td>
            <td style={cell}>{oc.fecha_aprobacion || '___________________'}</td>
          </tr>
        </tbody>
      </table>

      {/* TABLA */}
      <table style={{ width:'100%', borderCollapse:'collapse', marginTop:'8px' }}>
        <thead>
          <tr>
            <th style={{ ...hdr, width:'4%' }}>{L.num}</th>
            <th style={{ ...hdr, width:'12%' }}>{L.code}</th>
            <th style={{ ...hdr, width:'34%' }}>{L.desc}</th>
            <th style={{ ...hdr, width:'8%' }}>{L.unit}</th>
            <th style={{ ...hdr, width:'10%' }}>{L.qty}</th>
            <th style={{ ...hdr, width:'32%' }}>{L.activity}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => {
            const m   = materiales.find(x => x.id === it.material_id)
            const act = presupuesto.find(b => b.id === it.actividad_id)
            return (
              <tr key={it.id} style={{ background: idx%2===0 ? '#fff' : '#F8FAFC' }}>
                <td style={{ ...cell, textAlign:'center' }}>{idx+1}</td>
                <td style={{ ...cell, fontFamily:'monospace' }}>{m?.codigo || '—'}</td>
                <td style={cell}>{m?.descripcion || '—'}</td>
                <td style={{ ...cell, textAlign:'center' }}>{it.unidad}</td>
                <td style={{ ...cell, textAlign:'center', fontWeight:'bold' }}>{it.cantidad}</td>
                <td style={{ ...cell, fontSize:'10px' }}>{act ? `${act.code} — ${act.descripcion}` : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {oc.notas && (
        <table style={{ width:'100%', borderCollapse:'collapse', marginTop:'-1px' }}>
          <tbody><tr>
            <td style={{ ...lbl, width:'15%' }}>{L.notes}</td>
            <td style={cell}>{oc.notas}</td>
          </tr></tbody>
        </table>
      )}

      {/* FIRMAS */}
      <table style={{ width:'100%', borderCollapse:'collapse', marginTop:'24px' }}>
        <tbody><tr>
          {[
            { label: L.elaborated, nombre: oc.elaboro_nombre,     cargo: oc.elaboro_cargo },
            { label: L.requested,  nombre: oc.solicitante_nombre, cargo: oc.solicitante_cargo },
            { label: L.authorized, nombre: oc.aprobador_nombre,   cargo: oc.aprobador_cargo },
          ].map((f, i) => (
            <td key={i} style={{ padding:'0 16px', textAlign:'center', width:'33%', borderRight: i < 2 ? '1px solid #ddd' : 'none' }}>
              <div style={{ borderTop:`2px solid ${BRAND}`, paddingTop:'8px', marginTop:'40px' }}>
                <p style={{ margin:0, fontWeight:'bold', fontSize:'11px' }}>{f.nombre || '___________________'}</p>
                <p style={{ margin:'2px 0 0', color:'#666', fontSize:'10px' }}>{f.cargo || f.label}</p>
                <p style={{ margin:'6px 0 0', color:'#666', fontSize:'10px' }}>{L.date}: _______________</p>
              </div>
            </td>
          ))}
        </tr></tbody>
      </table>

      <p style={{ textAlign:'center', fontSize:'9px', color:'#999', marginTop:'16px', borderTop:'1px solid #eee', paddingTop:'8px' }}>
        {L.footer}
      </p>
    </div>
  )
}
