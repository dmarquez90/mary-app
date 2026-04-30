import { useState } from 'react'
import { useStore } from '../store'
import { useT } from '../i18n'
import { today, fmtNum, fmt } from '../utils'
import { Drawer, EmptyState, Field, PrimaryBtn, SecondaryBtn, TBtn, Icons, inputCls, selectCls } from '../components'

const emptyMat = () => ({ codigo:'', descripcion:'', unidad:'und', stock_actual:'0', stock_minimo:'0', ubicacion_bodega:'' })
const emptyIn = () => ({ proyecto_id:'', oc_id:'', material_id:'', cantidad:'', precio_unitario:'', numero_factura:'', proveedor:'', fecha_recepcion:today() })
const emptyOut = () => ({ proyecto_id:'', actividad_id:'', material_id:'', cantidad:'', fecha_salida:today() })

export default function Inventario() {
  const { state, dispatch } = useStore()
  const t = useT()
  const { materiales, entradas, salidas, proyectos, presupuesto, ordenes_compra } = state
  const [tab, setTab] = useState(0)
  const [drawer, setDrawer] = useState(null)
  const [form, setForm] = useState({})
  const [editMat, setEditMat] = useState(null)

  const TABS = [t('inv_tab_catalog'), t('inv_tab_entries'), t('inv_tab_exits'), t('inv_tab_movements')]

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const activos = materiales.filter(m => m.activo !== false)
  const criticos = activos.filter(m => parseFloat(m.stock_actual||0) <= parseFloat(m.stock_minimo||0))
  const ocAprobadas = ordenes_compra.filter(oc => oc.estado === 'aprobada' || oc.estado === 'recibida_parcial')

  const selectedMat = materiales.find(m => m.id === form.material_id)
  const stockDisp = selectedMat ? parseFloat(selectedMat.stock_actual||0) : 0
  const qtyOut = parseFloat(form.cantidad||0)
  const stockAlerta = drawer === 'out' && qtyOut > stockDisp

  const actividades = presupuesto.filter(b => b.proyecto_id === form.proyecto_id && b.tipo === 'actividad')

  const saveMat = () => {
    if (!form.codigo || !form.descripcion) return
    if (editMat) {
      dispatch({ type:'UPD_MATERIAL', payload:{ ...form, id:editMat } })
    } else {
      dispatch({ type:'ADD_MATERIAL', payload:form })
    }
    setDrawer(null)
  }

  const saveIn = () => {
    if (!form.material_id || !form.cantidad || !form.fecha_recepcion) return
    dispatch({ type:'ADD_ENTRADA', payload:form })
    setDrawer(null)
  }

  const saveOut = () => {
    if (!form.material_id || !form.cantidad || !form.proyecto_id) return
    if (stockAlerta) return
    dispatch({ type:'ADD_SALIDA', payload:form })
    setDrawer(null)
  }

  const allMovs = [
    ...entradas.map(e => ({ ...e, mov:'entrada', fecha: e.fecha_recepcion })),
    ...salidas.map(s => ({ ...s, mov:'salida', fecha: s.fecha_salida })),
  ].sort((a,b) => new Date(b.fecha) - new Date(a.fecha))

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{t('inv_title')}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {t('inv_sub', { n: activos.length })}
            {criticos.length > 0 && <span className="text-red-500 ml-1">· {t('inv_critical', { n: criticos.length })}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {tab === 0 && <PrimaryBtn onClick={() => { setForm(emptyMat()); setEditMat(null); setDrawer('mat') }}>{t('inv_add_material')}</PrimaryBtn>}
          {tab === 1 && <PrimaryBtn onClick={() => { setForm(emptyIn()); setDrawer('in') }}>{t('inv_add_entry')}</PrimaryBtn>}
          {tab === 2 && <PrimaryBtn onClick={() => { setForm(emptyOut()); setDrawer('out') }}>{t('inv_add_exit')}</PrimaryBtn>}
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-5">
        {TABS.map((label, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px
              ${tab === i ? 'border-[#1D9E75] text-[#1D9E75]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 0 && (
        activos.length === 0 ? (
          <EmptyState icon={Icons.inventory} title={t('inv_empty_catalog')}
            action={t('inv_add_material')} onAction={() => { setForm(emptyMat()); setEditMat(null); setDrawer('mat') }} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                {[t('inv_col_code'),t('inv_col_desc'),t('inv_col_unit'),t('inv_col_stock'),t('inv_col_min'),t('inv_col_location'),t('inv_col_status'),''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {activos.map(m => {
                  const crit = parseFloat(m.stock_actual||0) <= parseFloat(m.stock_minimo||0)
                  return (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{m.codigo}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{m.descripcion}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{m.unidad}</td>
                      <td className="px-4 py-3 text-sm font-mono font-medium" style={{ color: crit ? '#ef4444' : '#1D9E75' }}>
                        {fmtNum(m.stock_actual)} {crit && <span className="text-xs">⚠</span>}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-500">{fmtNum(m.stock_minimo)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{m.ubicacion_bodega || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${crit ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                          {crit ? t('inv_critical_badge') : t('inv_ok')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <TBtn onClick={() => { setForm({...m}); setEditMat(m.id); setDrawer('mat') }}>{t('btn_edit')}</TBtn>
                          <TBtn danger onClick={() => dispatch({ type:'TOGGLE_MATERIAL', payload:m.id })}>{t('inv_deactivate')}</TBtn>
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
        entradas.length === 0 ? (
          <EmptyState icon={Icons.inventory} title={t('inv_empty_entries')}
            action={t('inv_add_entry')} onAction={() => { setForm(emptyIn()); setDrawer('in') }} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                {[t('inv_col_date'),t('inv_col_material'),t('inv_col_qty'),t('inv_col_price'),t('inv_col_invoice'),t('inv_col_supplier'),t('inv_col_project')].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[...entradas].reverse().map(e => {
                  const mat = materiales.find(m => m.id === e.material_id)
                  const proy = proyectos.find(p => p.id === e.proyecto_id)
                  return (
                    <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs text-gray-500">{e.fecha_recepcion}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{mat?.descripcion || '—'}</td>
                      <td className="px-4 py-3 text-sm font-mono text-[#1D9E75]">+{fmtNum(e.cantidad)} {mat?.unidad}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">{fmt(e.precio_unitario, proy?.moneda)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{e.numero_factura || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{e.proveedor || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{proy?.project_code || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 2 && (
        salidas.length === 0 ? (
          <EmptyState icon={Icons.inventory} title={t('inv_empty_exits')}
            action={t('inv_add_exit')} onAction={() => { setForm(emptyOut()); setDrawer('out') }} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                {[t('inv_col_date'),t('inv_col_material'),t('inv_col_qty'),t('inv_col_project'),t('inv_col_activity')].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[...salidas].reverse().map(s => {
                  const mat = materiales.find(m => m.id === s.material_id)
                  const proy = proyectos.find(p => p.id === s.proyecto_id)
                  const act = presupuesto.find(b => b.id === s.actividad_id)
                  return (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs text-gray-500">{s.fecha_salida}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{mat?.descripcion || '—'}</td>
                      <td className="px-4 py-3 text-sm font-mono text-red-500">-{fmtNum(s.cantidad)} {mat?.unidad}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{proy?.project_code || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{act ? `${act.code} — ${act.descripcion}` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 3 && (
        allMovs.length === 0 ? (
          <EmptyState icon={Icons.inventory} title={t('inv_empty_movements')} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                {[t('inv_col_type'),t('inv_col_date'),t('inv_col_material'),t('inv_col_qty'),'Detalle'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {allMovs.map(m => {
                  const mat = materiales.find(x => x.id === m.material_id)
                  return (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.mov === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {m.mov === 'entrada' ? `↑ ${t('inv_entry')}` : `↓ ${t('inv_exit')}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{m.fecha}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{mat?.descripcion || '—'}</td>
                      <td className="px-4 py-3 text-sm font-mono font-medium" style={{ color: m.mov === 'entrada' ? '#1D9E75' : '#ef4444' }}>
                        {m.mov === 'entrada' ? '+' : '-'}{fmtNum(m.cantidad)} {mat?.unidad}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {m.mov === 'entrada' ? (m.proveedor || m.numero_factura || '—') : proyectos.find(p=>p.id===m.proyecto_id)?.project_code || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      <Drawer open={drawer === 'mat'} onClose={() => setDrawer(null)} title={editMat ? t('inv_form_mat_title_edit') : t('inv_form_mat_title')} width={380}>
        <Field label={t('inv_form_code')} required><input className={inputCls} value={form.codigo||''} onChange={set('codigo')} placeholder="MAT-001" /></Field>
        <Field label={t('inv_form_desc')} required><input className={inputCls} value={form.descripcion||''} onChange={set('descripcion')} placeholder="Ej: Cemento Portland" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('inv_form_unit')}><input className={inputCls} value={form.unidad||''} onChange={set('unidad')} placeholder="und" /></Field>
          <Field label={t('inv_form_location')}><input className={inputCls} value={form.ubicacion_bodega||''} onChange={set('ubicacion_bodega')} placeholder="Estante A-1" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('inv_form_stock')}><input type="number" className={inputCls} value={form.stock_actual||''} onChange={set('stock_actual')} placeholder="0" min="0" step="0.01" /></Field>
          <Field label={t('inv_form_min')}><input type="number" className={inputCls} value={form.stock_minimo||''} onChange={set('stock_minimo')} placeholder="0" min="0" step="0.01" /></Field>
        </div>
        <div className="flex gap-2 mt-auto pt-2">
          <SecondaryBtn onClick={() => setDrawer(null)} className="flex-1">{t('btn_cancel')}</SecondaryBtn>
          <PrimaryBtn onClick={saveMat} disabled={!form.codigo||!form.descripcion} className="flex-1">{t('btn_save')}</PrimaryBtn>
        </div>
      </Drawer>

      <Drawer open={drawer === 'in'} onClose={() => setDrawer(null)} title={t('inv_form_entry_title')} width={400}>
        <Field label={t('inv_form_material')} required>
          <select className={selectCls} value={form.material_id||''} onChange={set('material_id')}>
            <option value="">{t('lbl_select')}</option>
            {activos.map(m => <option key={m.id} value={m.id}>{m.codigo} — {m.descripcion}</option>)}
          </select>
        </Field>
        <Field label={t('inv_form_oc')}>
          <select className={selectCls} value={form.oc_id||''} onChange={set('oc_id')}>
            <option value="">{t('inv_no_oc')}</option>
            {ocAprobadas.map(oc => <option key={oc.id} value={oc.id}>{oc.oc_number} — {oc.proveedor || '—'}</option>)}
          </select>
        </Field>
        <Field label={t('inv_form_project')}>
          <select className={selectCls} value={form.proyecto_id||''} onChange={set('proyecto_id')}>
            <option value="">{t('lbl_select')}</option>
            {proyectos.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('inv_form_qty')} required><input type="number" className={inputCls} value={form.cantidad||''} onChange={set('cantidad')} placeholder="0.00" min="0" step="0.01" /></Field>
          <Field label={t('inv_form_price')} required><input type="number" className={inputCls} value={form.precio_unitario||''} onChange={set('precio_unitario')} placeholder="0.00" min="0" step="0.01" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('inv_form_invoice')}><input className={inputCls} value={form.numero_factura||''} onChange={set('numero_factura')} placeholder="FAC-0001" /></Field>
          <Field label={t('inv_form_supplier')}><input className={inputCls} value={form.proveedor||''} onChange={set('proveedor')} placeholder={t('inv_form_supplier')} /></Field>
        </div>
        <Field label={t('inv_form_date')} required><input type="date" className={inputCls} value={form.fecha_recepcion||today()} onChange={set('fecha_recepcion')} /></Field>
        <div className="flex gap-2 mt-auto pt-2">
          <SecondaryBtn onClick={() => setDrawer(null)} className="flex-1">{t('btn_cancel')}</SecondaryBtn>
          <PrimaryBtn onClick={saveIn} disabled={!form.material_id||!form.cantidad} className="flex-1">{t('inv_add_entry')}</PrimaryBtn>
        </div>
      </Drawer>

      <Drawer open={drawer === 'out'} onClose={() => setDrawer(null)} title={t('inv_form_exit_title')} width={400}>
        <Field label={t('inv_form_exit_project')} required>
          <select className={selectCls} value={form.proyecto_id||''} onChange={e => setForm(f => ({...f, proyecto_id: e.target.value, actividad_id: ''}))}>
            <option value="">{t('lbl_select')}</option>
            {proyectos.filter(p => p.estado !== 'completado' && p.estado !== 'cancelado').map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>)}
          </select>
        </Field>
        <Field label={t('inv_form_exit_activity')}>
          <select className={selectCls} value={form.actividad_id||''} onChange={set('actividad_id')}>
            <option value="">{t('lbl_select')}</option>
            {actividades.map(a => <option key={a.id} value={a.id}>{a.code} — {a.descripcion}</option>)}
          </select>
        </Field>
        <Field label={t('inv_form_exit_material')} required>
          <select className={selectCls} value={form.material_id||''} onChange={set('material_id')}>
            <option value="">{t('lbl_select')}</option>
            {activos.map(m => <option key={m.id} value={m.id}>{m.codigo} — {m.descripcion} (stock: {fmtNum(m.stock_actual)} {m.unidad})</option>)}
          </select>
        </Field>
        <Field label={t('inv_form_exit_qty')} required>
          <input type="number" className={inputCls} value={form.cantidad||''} onChange={set('cantidad')} placeholder="0.00" min="0" step="0.01" />
          {stockAlerta && <p className="text-xs text-red-500 mt-1">⚠ {t('inv_stock_warning', { n: fmtNum(stockDisp) })}</p>}
        </Field>
        <Field label={t('inv_form_exit_date')} required><input type="date" className={inputCls} value={form.fecha_salida||today()} onChange={set('fecha_salida')} /></Field>
        <div className="flex gap-2 mt-auto pt-2">
          <SecondaryBtn onClick={() => setDrawer(null)} className="flex-1">{t('btn_cancel')}</SecondaryBtn>
          <PrimaryBtn onClick={saveOut} disabled={!form.material_id||!form.cantidad||!form.proyecto_id||stockAlerta} className="flex-1">{t('inv_add_exit')}</PrimaryBtn>
        </div>
      </Drawer>
    </div>
  )
}