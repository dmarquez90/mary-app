import { useState } from 'react'
import { useStore } from '../store'
import { useT } from '../i18n'
import { today } from '../utils'
import { Drawer, EmptyState, Badge, Field, PrimaryBtn, SecondaryBtn, TBtn, Icons, inputCls, selectCls } from '../components'

export default function Compras() {
  const { state, dispatch } = useStore()
  const t = useT()
  const { solicitudes, solicitud_items, ordenes_compra, proyectos, presupuesto, materiales } = state
  const [tab, setTab] = useState(0)
  const [drawer, setDrawer] = useState(null)
  const [form, setForm] = useState({})
  const [solItems, setSolItems] = useState([{ material_id:'', cantidad:'', unidad:'und' }])
  const [detail, setDetail] = useState(null)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const TABS = [t('comp_tab_sol'), t('comp_tab_oc')]

  const actividades = presupuesto.filter(b => b.proyecto_id === form.proyecto_id && b.tipo === 'actividad')
  const activos = materiales.filter(m => m.activo !== false)

  const saveSol = () => {
    if (!form.proyecto_id || solItems.every(i => !i.material_id)) return
    const validItems = solItems.filter(i => i.material_id && i.cantidad)
    dispatch({ type: 'ADD_SOLICITUD', payload: {
      solicitud: { proyecto_id: form.proyecto_id, actividad_id: form.actividad_id || null, justificacion: form.justificacion || '' },
      items: validItems
    }})
    setDrawer(null)
    setSolItems([{ material_id:'', cantidad:'', unidad:'und' }])
  }

  const saveOC = () => {
    if (!form.solicitud_id || !form.proveedor) return
    dispatch({ type:'ADD_OC', payload: { solicitud_id: form.solicitud_id, proveedor: form.proveedor, proyecto_id: solicitudes.find(s=>s.id===form.solicitud_id)?.proyecto_id } })
    setDrawer(null)
  }

  const detSol = solicitudes.find(s => s.id === detail)
  const detItems = solicitud_items.filter(i => i.solicitud_id === detail)
  const detOC = ordenes_compra.find(oc => oc.id === detail)
  const detOCItems = detOC ? solicitud_items.filter(i => i.solicitud_id === detOC.solicitud_id) : []

  const addSolItem = () => setSolItems(items => [...items, { material_id:'', cantidad:'', unidad:'und' }])
  const setSolItem = (idx, k, v) => setSolItems(items => items.map((it,i) => i === idx ? { ...it, [k]:v } : it))
  const removeSolItem = (idx) => setSolItems(items => items.filter((_,i) => i !== idx))

  const pendSol = solicitudes.filter(s=>s.estado==='pendiente').length
  const pendOC = ordenes_compra.filter(oc=>oc.estado==='pendiente_aprobacion').length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{t('comp_title')}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {t('comp_sub_pending', { n: pendSol })} · {t('comp_sub_oc', { n: pendOC })}
          </p>
        </div>
        {tab === 0 && <PrimaryBtn onClick={() => { setForm({ proyecto_id:'', actividad_id:'', justificacion:'' }); setSolItems([{material_id:'',cantidad:'',unidad:'und'}]); setDrawer('sol') }}>{t('comp_new_sol')}</PrimaryBtn>}
        {tab === 1 && <PrimaryBtn onClick={() => { setForm({ solicitud_id:'', proveedor:'' }); setDrawer('oc') }}>{t('comp_new_oc')}</PrimaryBtn>}
      </div>

      <div className="flex border-b border-gray-200 mb-5">
        {TABS.map((label, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px
              ${tab===i ? 'border-[#1D9E75] text-[#1D9E75]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
            {i===0 && pendSol > 0 && <span className="ml-1.5 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">{pendSol}</span>}
            {i===1 && pendOC > 0 && <span className="ml-1.5 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">{pendOC}</span>}
          </button>
        ))}
      </div>

      {tab === 0 && (
        solicitudes.length === 0 ? (
          <EmptyState icon={Icons.purchases} title={t('comp_empty_sol')}
            action={t('comp_new_sol')} onAction={() => { setForm({ proyecto_id:'', actividad_id:'', justificacion:'' }); setSolItems([{material_id:'',cantidad:'',unidad:'und'}]); setDrawer('sol') }} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                {[t('comp_col_project'),t('comp_col_activity'),t('comp_col_status'),t('comp_col_items'),t('comp_col_date'),t('comp_col_actions')].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[...solicitudes].reverse().map(sol => {
                  const proy = proyectos.find(p => p.id === sol.proyecto_id)
                  const act = presupuesto.find(b => b.id === sol.actividad_id)
                  const items = solicitud_items.filter(i => i.solicitud_id === sol.id)
                  return (
                    <tr key={sol.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs font-mono text-gray-600">{proy?.project_code || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[140px] truncate">{act ? `${act.code} ${act.descripcion}` : '—'}</td>
                      <td className="px-4 py-3"><Badge estado={sol.estado} /></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{t('comp_items_count', { n: items.length })}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{sol.created_at}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          <TBtn onClick={() => { setDetail(sol.id); setDrawer('detalle') }}>{t('btn_view')}</TBtn>
                          {sol.estado === 'pendiente' && <>
                            <TBtn onClick={() => dispatch({ type:'UPD_SOLICITUD_ESTADO', payload:{ id:sol.id, estado:'aprobada' } })}>{t('btn_approve')}</TBtn>
                            <TBtn danger onClick={() => dispatch({ type:'UPD_SOLICITUD_ESTADO', payload:{ id:sol.id, estado:'rechazada' } })}>{t('btn_reject')}</TBtn>
                          </>}
                          {sol.estado === 'aprobada' && (
                            <TBtn onClick={() => { setForm({ solicitud_id: sol.id, proveedor:'' }); setDrawer('oc') }}>{t('comp_generate_oc')}</TBtn>
                          )}
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

      {tab === 1 && (
        ordenes_compra.length === 0 ? (
          <EmptyState icon={Icons.purchases} title={t('comp_empty_oc')} subtitle={t('comp_empty_oc_sub')} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                {[t('comp_col_oc'),t('comp_col_project'),t('comp_col_supplier'),t('comp_col_status'),t('comp_col_approval'),t('comp_col_actions')].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">{h}</th>
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
                          {oc.estado === 'pendiente_aprobacion' && <>
                            <TBtn onClick={() => dispatch({ type:'UPD_OC_ESTADO', payload:{ id:oc.id, estado:'aprobada' } })}>{t('btn_approve')}</TBtn>
                            <TBtn danger onClick={() => dispatch({ type:'UPD_OC_ESTADO', payload:{ id:oc.id, estado:'cancelada' } })}>{t('comp_cancel_oc')}</TBtn>
                          </>}
                          {oc.estado === 'aprobada' && <span className="text-xs text-green-600 font-medium px-2">{t('comp_ready_receive')}</span>}
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

      <Drawer open={drawer==='sol'} onClose={() => setDrawer(null)} title={t('comp_form_sol_title')} width={440}>
        <Field label={t('comp_form_project')} required>
          <select className={selectCls} value={form.proyecto_id||''} onChange={e => setForm(f=>({...f,proyecto_id:e.target.value,actividad_id:''}))}>
            <option value="">{t('lbl_select')}</option>
            {proyectos.filter(p=>p.estado!=='completado'&&p.estado!=='cancelado').map(p=><option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>)}
          </select>
        </Field>
        <Field label={t('comp_form_activity')}>
          <select className={selectCls} value={form.actividad_id||''} onChange={set('actividad_id')}>
            <option value="">{t('lbl_select')}</option>
            {actividades.map(a=><option key={a.id} value={a.id}>{a.code} — {a.descripcion}</option>)}
          </select>
        </Field>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-500">{t('comp_form_items')} *</label>
            <button onClick={addSolItem} className="text-xs text-[#1D9E75] hover:underline">{t('comp_form_add_item')}</button>
          </div>
          {solItems.map((it, idx) => (
            <div key={idx} className="flex gap-2 mb-2 items-start">
              <select className={selectCls + ' flex-1'} value={it.material_id} onChange={e => setSolItem(idx,'material_id',e.target.value)}>
                <option value="">{t('lbl_select')}</option>
                {activos.map(m=><option key={m.id} value={m.id}>{m.codigo} — {m.descripcion}</option>)}
              </select>
              <input type="number" className={inputCls + ' w-20'} placeholder={t('lbl_quantity')} value={it.cantidad} onChange={e=>setSolItem(idx,'cantidad',e.target.value)} min="0" step="0.01"/>
              <input className={inputCls + ' w-16'} placeholder={t('lbl_unit')} value={it.unidad} onChange={e=>setSolItem(idx,'unidad',e.target.value)}/>
              {solItems.length > 1 && <button onClick={()=>removeSolItem(idx)} className="text-gray-300 hover:text-red-400 pt-2 text-sm">✕</button>}
            </div>
          ))}
        </div>
        <Field label={t('comp_form_justification')}>
          <textarea className={inputCls} rows={2} value={form.justificacion||''} onChange={set('justificacion')} placeholder={t('comp_form_justification_ph')} />
        </Field>
        <div className="flex gap-2 mt-auto pt-2">
          <SecondaryBtn onClick={() => setDrawer(null)} className="flex-1">{t('btn_cancel')}</SecondaryBtn>
          <PrimaryBtn onClick={saveSol} disabled={!form.proyecto_id || solItems.every(i=>!i.material_id||!i.cantidad)} className="flex-1">{t('comp_form_submit')}</PrimaryBtn>
        </div>
      </Drawer>

      <Drawer open={drawer==='oc'} onClose={() => setDrawer(null)} title={t('comp_form_oc_title')} width={380}>
        <Field label={t('comp_form_sol_ref')} required>
          <select className={selectCls} value={form.solicitud_id||''} onChange={set('solicitud_id')}>
            <option value="">{t('lbl_select')}</option>
            {solicitudes.filter(s=>s.estado==='aprobada').map(s=>{
              const p=proyectos.find(x=>x.id===s.proyecto_id)
              return <option key={s.id} value={s.id}>{p?.project_code} — {s.created_at}</option>
            })}
          </select>
        </Field>
        <Field label={t('comp_form_supplier')} required>
          <input className={inputCls} value={form.proveedor||''} onChange={set('proveedor')} placeholder={t('comp_form_supplier_ph')} />
        </Field>
        <div className="flex gap-2 mt-auto pt-2">
          <SecondaryBtn onClick={() => setDrawer(null)} className="flex-1">{t('btn_cancel')}</SecondaryBtn>
          <PrimaryBtn onClick={saveOC} disabled={!form.solicitud_id||!form.proveedor} className="flex-1">{t('comp_form_create_oc')}</PrimaryBtn>
        </div>
      </Drawer>

      <Drawer open={drawer==='detalle'} onClose={() => setDrawer(null)} title={t('comp_detail_sol')} width={400}>
        {detSol && <>
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-xs text-gray-400">{t('lbl_project')}</p><p className="text-sm font-medium">{proyectos.find(p=>p.id===detSol.proyecto_id)?.project_code || '—'}</p></div>
            <div><p className="text-xs text-gray-400">{t('lbl_status')}</p><Badge estado={detSol.estado} /></div>
            <div><p className="text-xs text-gray-400">{t('lbl_date')}</p><p className="text-sm">{detSol.created_at}</p></div>
          </div>
          {detSol.justificacion && <div><p className="text-xs text-gray-400">{t('comp_form_justification')}</p><p className="text-sm text-gray-700">{detSol.justificacion}</p></div>}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">{t('comp_detail_materials')}</p>
            {detItems.map(it => {
              const m = materiales.find(x=>x.id===it.material_id)
              return <div key={it.id} className="flex justify-between py-2 border-b border-gray-50 text-sm">
                <span className="text-gray-700">{m?.descripcion || '—'}</span>
                <span className="font-mono text-gray-500">{it.cantidad} {it.unidad}</span>
              </div>
            })}
          </div>
        </>}
      </Drawer>

      <Drawer open={drawer==='detoc'} onClose={() => setDrawer(null)} title={t('comp_detail_oc')} width={400}>
        {detOC && <>
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-xs text-gray-400">{t('comp_col_oc')}</p><p className="text-sm font-mono font-semibold">{detOC.oc_number}</p></div>
            <div><p className="text-xs text-gray-400">{t('lbl_status')}</p><Badge estado={detOC.estado} /></div>
            <div><p className="text-xs text-gray-400">{t('comp_col_supplier')}</p><p className="text-sm">{detOC.proveedor}</p></div>
            <div><p className="text-xs text-gray-400">{t('comp_col_approval')}</p><p className="text-sm">{detOC.fecha_aprobacion || t('comp_pending_approval')}</p></div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">{t('comp_detail_items')}</p>
            {detOCItems.map(it => {
              const m = materiales.find(x=>x.id===it.material_id)
              return <div key={it.id} className="flex justify-between py-2 border-b border-gray-50 text-sm">
                <span className="text-gray-700">{m?.descripcion || '—'}</span>
                <span className="font-mono text-gray-500">{it.cantidad} {it.unidad}</span>
              </div>
            })}
          </div>
          {detOC.estado === 'aprobada' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-700">
              {t('comp_oc_approved_msg')}
            </div>
          )}
        </>}
      </Drawer>
    </div>
  )
}