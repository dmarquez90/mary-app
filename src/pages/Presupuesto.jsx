import { useState, useMemo, useContext } from 'react'
import { useStore } from '../store'
import { LangContext } from '../i18n'
import { usePermissions } from '../usePermissions'
import { fmt, fmtNum, flatBudgetItems, calcSubtotal, calcGrandTotal, UNIDADES, UNIDADES_CONFIG, getUnitLabel, r2 } from '../utils'
import { Drawer, EmptyState, Field, PrimaryBtn, SecondaryBtn, TBtn, Confirm, SectionBox, Icons, inputCls, selectCls } from '../components'
import ImportarPresupuesto from './ImportarPresupuesto'

const emptyForm = () => ({ tipo:'actividad', parent_id:'', descripcion:'', unidad:'m²', cantidad:'', costo_mo:'', costo_materiales:'', costo_equipos:'' })

export default function Presupuesto() {
  const { state, dispatch } = useStore()
  const { t, lang } = useContext(LangContext)
  const { can } = usePermissions()
  const { proyectos, presupuesto, presupuesto_indirectos = [] } = state

  const [proyId, setProyId]         = useState(proyectos[0]?.id || '')
  const [drawer, setDrawer]         = useState(false)
  const [form, setForm]             = useState(emptyForm())
  const [editing, setEditing]       = useState(null)
  const [selected, setSelected]     = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  const isEs = lang === 'ES'
  const puedeEditar = can('presupuesto_editar')

  const [indForm, setIndForm]   = useState({ categoria: '', monto_presupuestado: '' })
  const [indEdit, setIndEdit]   = useState(null)
  const setIndF = k => e => setIndForm(f => ({ ...f, [k]: e.target.value }))

  const CATS_IND = [
    { key: 'Administración de obra',              label: t('pres_cat_admin') },
    { key: 'Instalaciones y servicios generales', label: t('pres_cat_facilities') },
    { key: 'Seguros, fianzas y garantías',        label: t('pres_cat_insurance') },
    { key: 'Servicios profesionales y legales',   label: t('pres_cat_professional') },
  ]

  // Auto-sync desde Supabase al seleccionar un proyecto
  // Evita mostrar datos desincronizados del store local
  const [syncing, setSyncing] = useState(false)

  const syncPresupuesto = async (pid) => {
    if (!pid) return
    setSyncing(true)
    await dispatch({ type: 'REFRESH_PRESUPUESTO', payload: { proyectoId: pid } })
    setSyncing(false)
  }

  // Sincroniza automáticamente al cambiar de proyecto
  const handleProyChange = (pid) => {
    setProyId(pid)
    setSelected(null)
    syncPresupuesto(pid)
  }

  const proy   = proyectos.find(p => p.id === proyId)
  const items  = useMemo(() => presupuesto.filter(b => b.proyecto_id === proyId), [presupuesto, proyId])
  const flat   = useMemo(() => flatBudgetItems(items), [items])
  const closed = proy?.estado === 'completado' || proy?.estado === 'cancelado'

  const stages    = items.filter(i => i.tipo === 'etapa')
  const substages = items.filter(i => i.tipo === 'sub_etapa')
  const grandTotal = calcGrandTotal(items)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const ucPreview = r2((parseFloat(form.costo_mo)||0) + (parseFloat(form.costo_materiales)||0) + (parseFloat(form.costo_equipos)||0))
  const tcPreview = r2((parseFloat(form.cantidad)||0) * ucPreview)

  const openAdd = (tipo) => {
    const f = emptyForm()
    f.tipo = tipo
    if (selected) {
      const sel = items.find(i => i.id === selected)
      if (sel) {
        if (tipo === 'sub_etapa') f.parent_id = sel.tipo==='etapa' ? sel.id : sel.tipo==='sub_etapa' ? sel.parent_id : items.find(i=>i.id===sel.parent_id)?.parent_id || ''
        if (tipo === 'actividad') f.parent_id = sel.tipo==='sub_etapa' ? sel.id : sel.tipo==='actividad' ? sel.parent_id : sel.tipo==='etapa' ? sel.id : ''
      }
    }
    setForm(f); setEditing(null); setDrawer(true)
  }

  const openEdit = () => {
    if (!selected) return
    const item = items.find(i => i.id === selected)
    if (!item) return
    setForm({
      tipo: item.tipo, parent_id: item.parent_id || '',
      descripcion: item.descripcion, unidad: item.unidad || 'm²',
      cantidad: item.cantidad || '', costo_mo: item.costo_mo || '',
      costo_materiales: item.costo_materiales || '', costo_equipos: item.costo_equipos || ''
    })
    setEditing(selected); setDrawer(true)
  }

  const save = () => {
    if (!form.descripcion) return
    // Actividad y sub-etapa requieren parent; etapa no
    if (form.tipo !== 'etapa' && !form.parent_id) return
    if (editing) {
      dispatch({ type:'UPD_BUDGET', payload: {
        id: editing, descripcion: form.descripcion, unidad: form.unidad,
        cantidad: parseFloat(form.cantidad)||0, costo_mo: parseFloat(form.costo_mo)||0,
        costo_materiales: parseFloat(form.costo_materiales)||0, costo_equipos: parseFloat(form.costo_equipos)||0
      }})
    } else {
      dispatch({ type:'ADD_BUDGET', payload: {
        proyectoId: proyId, tipo: form.tipo, parent_id: form.parent_id || null,
        descripcion: form.descripcion, unidad: form.unidad,
        cantidad: parseFloat(form.cantidad)||0, costo_mo: parseFloat(form.costo_mo)||0,
        costo_materiales: parseFloat(form.costo_materiales)||0, costo_equipos: parseFloat(form.costo_equipos)||0
      }})
    }
    setDrawer(false); setSelected(null)
  }

  const del = () => {
    dispatch({ type:'DEL_BUDGET', payload: confirmDel })
    setConfirmDel(null); setSelected(null)
  }

  const moneda   = proy?.moneda || 'USD'

  const indsDelProy   = presupuesto_indirectos.filter(p => p.proyecto_id === proyId)
  const totalIndirecto = indsDelProy.reduce((s, p) => s + parseFloat(p.monto_presupuestado || 0), 0)
  const subtotalPres   = grandTotal + totalIndirecto
  const utilidadPct    = parseFloat(proy?.utilidad_pct || 0)
  const impuestoPct    = parseFloat(proy?.impuesto_pct || 0)
  const utilidadMonto  = r2(subtotalPres * (utilidadPct / 100))
  const granTotal      = r2(subtotalPres + utilidadMonto)
  const impuestoMonto  = r2(granTotal * (impuestoPct / 100))
  const totalConImp    = r2(granTotal + impuestoMonto)

  const saveInd = () => {
    if (!indForm.categoria || !indForm.monto_presupuestado) return
    if (indEdit) {
      dispatch({ type: 'UPD_PRES_IND', payload: { ...indForm, id: indEdit, proyecto_id: proyId } })
    } else {
      dispatch({ type: 'ADD_PRES_IND', payload: { ...indForm, proyecto_id: proyId } })
    }
    setIndForm({ categoria: '', monto_presupuestado: '' })
    setIndEdit(null)
  }
  const tipoLabel = (tipo) => {
    if (tipo==='etapa')     return t('pres_form_stage')
    if (tipo==='sub_etapa') return t('pres_form_substage')
    return t('pres_form_activity')
  }

  return (
    <div className="p-6 max-w-full">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{t('pres_title')}</h1>
          {proy && <p className="text-sm text-gray-400 mt-0.5">{proy.project_code} — {proy.nombre}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => syncPresupuesto(proyId)}
            disabled={!proyId || syncing}
            title={t('pres_reload_server')}
            className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 disabled:opacity-40 transition-colors text-sm">
            {syncing ? '⟳' : '↺'}
          </button>
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#1B3A6B]"
            value={proyId} onChange={e => handleProyChange(e.target.value)}>
            <option value="">{t('lbl_select')}</option>
            {proyectos.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>)}
          </select>
        </div>
      </div>

      {!proyId ? (
        <EmptyState icon={Icons.budget} title={t('pres_no_project')} subtitle={t('pres_empty_sub')} />
      ) : (
        <>
          <div className="bg-white border border-gray-100 rounded-xl mb-0 px-4 py-3 flex items-center gap-2 flex-wrap rounded-b-none border-b-0 sticky top-0 z-20">
            {puedeEditar && !closed && <>
              <TBtn onClick={() => openAdd('etapa')}>
                <span className="w-2 h-2 rounded-sm inline-block mr-1" style={{background:'#1D9E75'}}/>
                {t('pres_add_stage')}
              </TBtn>
              <TBtn onClick={() => openAdd('sub_etapa')} disabled={stages.length===0}>
                <span className="w-2 h-2 rounded-sm inline-block mr-1" style={{background:'#185FA5'}}/>
                {t('pres_add_substage')}
              </TBtn>
              {/* ← CAMBIO: actividad habilitada apenas haya una etapa */}
              <TBtn onClick={() => openAdd('actividad')} disabled={stages.length===0}>
                <span className="w-2 h-2 rounded-sm inline-block mr-1 bg-gray-400"/>
                {t('pres_add_activity')}
              </TBtn>
              <div className="w-px h-5 bg-gray-200 mx-1" />
              <TBtn onClick={openEdit} disabled={!selected}>✎ {t('btn_edit')}</TBtn>
              <TBtn danger onClick={() => selected && setConfirmDel(selected)} disabled={!selected}>✕ {t('btn_delete')}</TBtn>
            </>}
            <div className="ml-auto flex items-center gap-2 text-sm">
              <span className="text-gray-400 text-xs">{t('pres_grand_total')}:</span>
              <span className="font-semibold font-mono text-sm" style={{color:'#1D9E75'}}>{fmt(grandTotal, moneda)}</span>
            </div>
          </div>

          {/* ← IMPORTAR DESDE EXCEL */}
          {puedeEditar && !closed && (
            <ImportarPresupuesto proyId={proyId} moneda={moneda} onDone={() => setSelected(null)} />
          )}

          {flat.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl rounded-t-none py-16">
              <EmptyState icon={Icons.table} title={t('pres_empty')} subtitle={t('pres_empty_sub')}
                action={puedeEditar ? t('pres_add_stage') : null}
                onAction={puedeEditar ? () => openAdd('etapa') : null} />
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-xl rounded-t-none overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 ">
                    {['ID',t('pres_col_desc'),t('pres_col_unit'),t('pres_col_qty'),t('pres_col_mo'),t('pres_col_mat'),t('pres_col_eq'),t('pres_col_uc'),t('pres_col_total')].map((h,i) => (
                      <th key={i} className={`px-3 py-3 text-xs text-gray-500 whitespace-nowrap ${i>=3?'text-right':'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {flat.map(item => {
                    const isEt = item.tipo==='etapa'
                    const isSs = item.tipo==='sub_etapa'
                    const isAc = item.tipo==='actividad'
                    const uc   = isAc ? r2((item.costo_mo||0)+(item.costo_materiales||0)+(item.costo_equipos||0)) : 0
                    const tc   = isAc ? r2((item.cantidad||0)*uc) : calcSubtotal(items, item.id, item.tipo)
                    const sel  = item.id===selected
                    return (
                      <tr key={item.id}
                        onClick={() => puedeEditar ? setSelected(sel ? null : item.id) : null}
                        className={`transition-colors
                          ${isEt ? 'border-b-2 border-t border-gray-200' : 'border-b border-gray-50'}
                          ${puedeEditar ? 'cursor-pointer' : ''}
                          ${sel ? 'bg-blue-50' : isEt ? 'bg-green-50/60 hover:bg-green-50' : 'hover:bg-gray-50/50'}`}>
                        <td className="px-3 py-2.5">
                          {isEt ? (
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-5 rounded-full bg-green-500 flex-shrink-0"/>
                              <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-bold bg-green-100 text-green-700">
                                {item.code}
                              </span>
                            </div>
                          ) : (
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-medium
                              ${isSs?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-600'}`}>
                              {item.code}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 max-w-xs">
                          <div className="flex items-center gap-1.5" style={{ paddingLeft: isAc?24:isSs?12:0 }}>
                            <span className={`text-sm ${isEt?'font-semibold text-gray-800':isSs?'font-medium text-gray-700':'text-gray-600'}`}>
                              {item.descripcion}
                            </span>
                            {item.origen_oc_id && (
                              <span className="shrink-0 text-xs px-1.5 py-0.5 rounded font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                                OC
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs text-gray-500">{isAc ? getUnitLabel(item.unidad, lang) : '—'}</td>
                        <td className="px-3 py-2.5 text-right text-xs font-mono text-gray-600">{isAc?fmtNum(item.cantidad):'—'}</td>
                        <td className="px-3 py-2.5 text-right text-xs font-mono text-gray-500">{isAc?fmt(item.costo_mo,moneda):'—'}</td>
                        <td className="px-3 py-2.5 text-right text-xs font-mono text-gray-500">{isAc?fmt(item.costo_materiales,moneda):'—'}</td>
                        <td className="px-3 py-2.5 text-right text-xs font-mono text-gray-500">{isAc?fmt(item.costo_equipos,moneda):'—'}</td>
                        <td className="px-3 py-2.5 text-right text-xs font-mono font-medium text-gray-700">{isAc?fmt(uc,moneda):'—'}</td>
                        <td className="px-3 py-2.5 text-right text-sm font-mono font-semibold"
                          style={{ color: isEt?'#1D9E75':isSs?'#185FA5':'#374151' }}>
                          {fmt(tc, moneda)}
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td colSpan={8} className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('pres_grand_total')}</td>
                    <td className="px-3 py-3 text-right text-sm font-bold font-mono" style={{color:'#1D9E75'}}>{fmt(grandTotal, moneda)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── SECCIÓN COSTOS INDIRECTOS PRESUPUESTADOS ── */}
      {proyId && (
        <div className="mt-6 bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">{t('pres_indirect_title')}</p>
          </div>
          <div className="p-4">
            {puedeEditar && !closed && (
              <div className="flex gap-2 mb-4 flex-wrap">
                <select className={selectCls + ' flex-1 min-w-[220px]'}
                  value={indForm.categoria} onChange={setIndF('categoria')}>
                  <option value="">{t('pres_indirect_select_cat')}</option>
                  {CATS_IND.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                <input type="number" className={inputCls + ' w-36'}
                  placeholder={t('pres_indirect_budget_ph')}
                  value={indForm.monto_presupuestado} onChange={setIndF('monto_presupuestado')}
                  min="0" step="0.01" />
                <PrimaryBtn onClick={saveInd} disabled={!indForm.categoria || !indForm.monto_presupuestado}>
                  {indEdit ? t('btn_save') : t('btn_add')}
                </PrimaryBtn>
                {indEdit && (
                  <SecondaryBtn onClick={() => { setIndForm({ categoria: '', monto_presupuestado: '' }); setIndEdit(null) }}>
                    {t('btn_cancel')}
                  </SecondaryBtn>
                )}
              </div>
            )}
            {indsDelProy.length === 0 ? (
              <p className="text-xs text-gray-400 py-2 text-center">{t('pres_indirect_empty')}</p>
            ) : (
              <table className="w-full">
                <thead><tr className="border-b border-gray-100">
                  <th className="text-left text-xs text-gray-500 px-2 py-2">{t('pres_indirect_col_cat')}</th>
                  <th className="text-right text-xs text-gray-500 px-2 py-2">{t('pres_indirect_col_amount')}</th>
                  {puedeEditar && <th className="px-2 py-2"></th>}
                </tr></thead>
                <tbody>
                  {indsDelProy.map(ind => (
                    <tr key={ind.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-2 py-2 text-sm text-gray-700">
                        {CATS_IND.find(c => c.key === ind.categoria)?.label ?? ind.categoria}
                      </td>
                      <td className="px-2 py-2 text-sm font-mono text-right font-medium" style={{color:'#1B3A6B'}}>{fmt(ind.monto_presupuestado, moneda)}</td>
                      {puedeEditar && (
                        <td className="px-2 py-2">
                          <div className="flex gap-1">
                            <TBtn onClick={() => { setIndForm({ categoria: ind.categoria, monto_presupuestado: ind.monto_presupuestado }); setIndEdit(ind.id) }}>{t('btn_edit')}</TBtn>
                            <TBtn danger onClick={() => dispatch({ type: 'DEL_PRES_IND', payload: ind.id })}>{t('btn_delete')}</TBtn>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td className="px-2 py-2 text-xs font-semibold text-gray-500 text-right">{t('pres_indirect_total')}</td>
                    <td className="px-2 py-2 text-sm font-mono font-bold text-right" style={{color:'#1B3A6B'}}>{fmt(totalIndirecto, moneda)}</td>
                    {puedeEditar && <td/>}
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── RESUMEN FINANCIERO COMPLETO ── */}
      {proyId && (
        <div className="mt-4 bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">{t('pres_summary_title')}</p>
          </div>
          <div className="p-4 flex flex-col gap-1.5">
            {[
              [t('pres_summary_direct'), grandTotal, '#374151'],
              [t('pres_summary_indirect'), totalIndirecto, '#374151'],
            ].map(([label, val, color]) => (
              <div key={label} className="flex justify-between text-sm py-1 border-b border-gray-50">
                <span className="text-gray-500">{label}</span>
                <span className="font-mono" style={{color}}>{fmt(val, moneda)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm py-1 border-b border-gray-100">
              <span className="text-gray-600 font-medium">{t('pres_summary_subtotal')}</span>
              <span className="font-mono font-medium text-gray-700">{fmt(subtotalPres, moneda)}</span>
            </div>
            <div className="flex justify-between text-sm py-1 border-b border-gray-50">
              <span className="text-gray-500">{isEs ? `Utilidad (${utilidadPct}%)` : `Profit (${utilidadPct}%)`}</span>
              <span className="font-mono text-gray-600">{fmt(utilidadMonto, moneda)}</span>
            </div>
            <div className="flex justify-between text-base font-bold py-2 border-b border-gray-200">
              <span className="text-gray-800">{t('pres_summary_grand_total')}</span>
              <span className="font-mono" style={{color:'#1D9E75'}}>{fmt(granTotal, moneda)}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500">{proy?.impuesto_descripcion || (isEs ? `Impuesto (${impuestoPct}%)` : `Tax (${impuestoPct})`)}</span>
              <span className="font-mono text-gray-600">{fmt(impuestoMonto, moneda)}</span>
            </div>
            <div className="flex justify-between text-base font-bold py-2 bg-blue-50 rounded-lg px-3 mt-1">
              <span style={{color:'#1B3A6B'}}>{t('pres_summary_with_tax')}</span>
              <span className="font-mono" style={{color:'#1B3A6B'}}>{fmt(totalConImp, moneda)}</span>
            </div>
            {(!proy?.utilidad_pct && !proy?.impuesto_pct) && (
              <p className="text-xs text-amber-600 mt-2">
                {t('pres_summary_tax_hint')}
              </p>
            )}
          </div>
        </div>
      )}

      {puedeEditar && (
        <Drawer open={drawer} onClose={() => setDrawer(false)}
          title={`${editing?t('btn_edit'):t('btn_add')} ${tipoLabel(form.tipo)}`} width={380}>
          {form.tipo==='sub_etapa' && !editing && (
            <Field label={t('pres_form_parent_stage')} required>
              <select className={selectCls} value={form.parent_id} onChange={set('parent_id')}>
                <option value="">{t('lbl_select')}</option>
                {stages.map(s => <option key={s.id} value={s.id}>{s.code} — {s.descripcion}</option>)}
              </select>
            </Field>
          )}
          {/* ← CAMBIO: actividad puede tener como parent una sub-etapa O una etapa directamente */}
          {form.tipo==='actividad' && !editing && (
            <Field label={t('pres_form_parent_sub')} required>
              <select className={selectCls} value={form.parent_id} onChange={set('parent_id')}>
                <option value="">{t('lbl_select')}</option>
                {substages.length > 0 && (
                  <optgroup label="Sub-etapas">
                    {substages.map(s => <option key={s.id} value={s.id}>{s.code} — {s.descripcion}</option>)}
                  </optgroup>
                )}
                <optgroup label="Etapas (sin sub-etapa)">
                  {stages.map(s => <option key={s.id} value={s.id}>{s.code} — {s.descripcion}</option>)}
                </optgroup>
              </select>
            </Field>
          )}
          <Field label={t('pres_form_desc')} required>
            <input className={inputCls} value={form.descripcion} onChange={set('descripcion')}
              placeholder={form.tipo==='etapa'?'Ej: Obras Preliminares':form.tipo==='sub_etapa'?'Ej: Movimiento de Tierras':'Ej: Excavación manual'} />
          </Field>
          {form.tipo==='actividad' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('pres_form_unit')}>
                  <select className={selectCls} value={form.unidad} onChange={set('unidad')}>
                    {UNIDADES_CONFIG.map(u => (
                      <option key={u.value} value={u.value}>
                        {lang === 'ES' ? u.es : u.en}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t('pres_form_qty')}>
                  <input type="number" className={inputCls} value={form.cantidad} onChange={set('cantidad')} placeholder="0.00" min="0" step="0.01" />
                </Field>
              </div>
              <SectionBox title={t('pres_unit_cost')}>
                <Field label={t('pres_form_mo')}><input type="number" className={inputCls} value={form.costo_mo} onChange={set('costo_mo')} placeholder="0.00" min="0" step="0.01" /></Field>
                <Field label={t('pres_form_mat')}><input type="number" className={inputCls} value={form.costo_materiales} onChange={set('costo_materiales')} placeholder="0.00" min="0" step="0.01" /></Field>
                <Field label={t('pres_form_eq')}><input type="number" className={inputCls} value={form.costo_equipos} onChange={set('costo_equipos')} placeholder="0.00" min="0" step="0.01" /></Field>
                <div className="border-t border-gray-200 pt-2 mt-1 flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{t('pres_unit_cost')}</span>
                    <span className="font-mono font-medium">{fmt(ucPreview, moneda)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-gray-600">{t('pres_total_cost')}</span>
                    <span className="font-mono" style={{color:'#1D9E75'}}>{fmt(tcPreview, moneda)}</span>
                  </div>
                </div>
              </SectionBox>
            </>
          )}
          <div className="flex gap-2 mt-auto pt-2">
            <SecondaryBtn onClick={() => setDrawer(false)} className="flex-1">{t('btn_cancel')}</SecondaryBtn>
            <PrimaryBtn onClick={save} disabled={!form.descripcion||(form.tipo!=='etapa'&&!editing&&!form.parent_id)} className="flex-1">
              {editing ? t('btn_save') : t('btn_add')}
            </PrimaryBtn>
          </div>
        </Drawer>
      )}

      <Confirm open={!!confirmDel} message={t('pres_delete_confirm')}
        onConfirm={del} onCancel={() => setConfirmDel(null)}
        confirmLabel={t('btn_delete')} cancelLabel={t('btn_cancel')} />
    </div>
  )
}

