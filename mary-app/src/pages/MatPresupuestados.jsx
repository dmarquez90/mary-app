import { useState, useContext, useMemo } from 'react'
import { useStore } from '../store'
import { LangContext } from '../i18n'
import { fmtNum, fmt } from '../utils'
import { Drawer, EmptyState, Field, PrimaryBtn, SecondaryBtn, TBtn, Icons, inputCls, selectCls } from '../components'

const emptyForm = () => ({ proyecto_id:'', actividad_id:'', material_id:'', cantidad_presupuestada:'' })

export default function MatPresupuestados() {
  const { state, dispatch } = useStore()
  const { t } = useContext(LangContext)
  const { proyectos, presupuesto, materiales, materiales_presupuestados = [], entradas, salidas } = state

  const [proyId, setProyId]   = useState(proyectos[0]?.id || '')
  const [drawer, setDrawer]   = useState(false)
  const [form, setForm]       = useState(emptyForm())
  const [editing, setEditing] = useState(null)
  const [search, setSearch]   = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const proy   = proyectos.find(p => p.id === proyId)
  const moneda = proy?.moneda || 'USD'

  // Etapas y actividades del proyecto seleccionado
  const etapas      = presupuesto.filter(b => b.proyecto_id === proyId && b.tipo === 'etapa')
  const subetapas   = presupuesto.filter(b => b.proyecto_id === proyId && b.tipo === 'sub_etapa')
  const actividades = presupuesto.filter(b => b.proyecto_id === proyId && b.tipo === 'actividad')

  // Materiales presupuestados del proyecto actual
  const matsPres = useMemo(() =>
    materiales_presupuestados.filter(mp => mp.proyecto_id === proyId),
    [materiales_presupuestados, proyId]
  )

  // Filtro de búsqueda
  const matsFiltrados = useMemo(() => {
    if (!search) return matsPres
    const q = search.toLowerCase()
    return matsPres.filter(mp => {
      const mat = materiales.find(m => m.id === mp.material_id)
      return mat?.codigo?.toLowerCase().includes(q) || mat?.descripcion?.toLowerCase().includes(q)
    })
  }, [matsPres, search, materiales])

  // Calcular consumo real por material (FIFO simplificado — total salidas)
  const consumoReal = (materialId) => {
    return salidas
      .filter(s => s.material_id === materialId && s.proyecto_id === proyId)
      .reduce((sum, s) => sum + parseFloat(s.cantidad||0), 0)
  }

  // Calcular precio promedio ponderado de entradas para valorización
  const precioPromedio = (materialId) => {
    const ents = entradas.filter(e => e.material_id === materialId)
    const totalCant = ents.reduce((s, e) => s + parseFloat(e.cantidad||0), 0)
    const totalVal  = ents.reduce((s, e) => s + (parseFloat(e.cantidad||0) * parseFloat(e.precio_unitario||0)), 0)
    return totalCant > 0 ? totalVal / totalCant : 0
  }

  // Total presupuestado en $ (cantidad × precio promedio)
  const totalPresupuestado = useMemo(() =>
    matsPres.reduce((sum, mp) => {
      const precio = precioPromedio(mp.material_id)
      return sum + (parseFloat(mp.cantidad_presupuestada||0) * precio)
    }, 0),
    [matsPres, entradas]
  )

  const save = () => {
    if (!form.proyecto_id || !form.material_id || !form.cantidad_presupuestada) return
    if (editing) {
      dispatch({ type:'UPD_MAT_PRES', payload:{ ...form, id:editing } })
    } else {
      dispatch({ type:'ADD_MAT_PRES', payload:form })
    }
    setDrawer(false); setEditing(null); setForm(emptyForm())
  }

  const openEdit = (mp) => {
    setForm({ ...mp })
    setEditing(mp.id)
    setDrawer(true)
  }

  const openAdd = () => {
    setForm({ ...emptyForm(), proyecto_id: proyId })
    setEditing(null)
    setDrawer(true)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{t('mp_title')}</h1>
          {proy && <p className="text-sm text-gray-400 mt-0.5">{proy.project_code} — {proy.nombre}</p>}
        </div>
        <div className="flex items-center gap-3">
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#1D9E75]"
            value={proyId} onChange={e => { setProyId(e.target.value); setSearch('') }}>
            <option value="">{t('lbl_select')}</option>
            {proyectos.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>)}
          </select>
          {proyId && <PrimaryBtn onClick={openAdd}>{t('mp_add')}</PrimaryBtn>}
        </div>
      </div>

      {!proyId ? (
        <EmptyState icon={Icons.budget} title={t('mp_no_project')} />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-400 mb-1">{t('mp_kpi_materials')}</p>
              <p className="text-xl font-semibold text-gray-800">{matsPres.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-400 mb-1">{t('mp_kpi_budget_value')}</p>
              <p className="text-xl font-semibold" style={{ color:'#1D9E75' }}>{fmt(totalPresupuestado, moneda)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-400 mb-1">{t('mp_kpi_activities')}</p>
              <p className="text-xl font-semibold text-gray-800">{actividades.length}</p>
            </div>
          </div>

          {/* BARRA DE BÚSQUEDA */}
          {matsPres.length > 0 && (
            <div className="mb-4">
              <input
                className={inputCls}
                placeholder={t('mp_search_placeholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          )}

          {matsPres.length === 0 ? (
            <EmptyState icon={Icons.inventory} title={t('mp_empty')}
              action={t('mp_add')} onAction={openAdd} />
          ) : matsFiltrados.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <p className="text-sm text-gray-400">{t('mp_no_results')}</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {[t('inv_col_code'),t('inv_col_desc'),t('inv_col_unit'),t('mp_col_budgeted'),t('mp_col_consumed'),t('mp_col_remaining'),t('mp_col_activity'),t('mp_col_status'),''].map((h,i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {matsFiltrados.map(mp => {
                    const mat      = materiales.find(m => m.id === mp.material_id)
                    const act      = presupuesto.find(b => b.id === mp.actividad_id)
                    const consumido = consumoReal(mp.material_id)
                    const presup   = parseFloat(mp.cantidad_presupuestada||0)
                    const restante = presup - consumido
                    const pct      = presup > 0 ? (consumido / presup) * 100 : 0
                    const status   = pct >= 100 ? 'agotado' : pct >= 80 ? 'alerta' : 'ok'

                    return (
                      <tr key={mp.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-xs font-mono text-gray-500">{mat?.codigo || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-800">{mat?.descripcion || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{mat?.unidad || '—'}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-700">{fmtNum(presup)}</td>
                        <td className="px-4 py-3 text-sm font-mono text-red-500">{fmtNum(consumido)}</td>
                        <td className="px-4 py-3 text-sm font-mono font-medium" style={{ color: restante < 0 ? '#ef4444' : '#1D9E75' }}>
                          {fmtNum(restante)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate">
                          {act ? `${act.code} — ${act.descripcion}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit
                              ${status === 'ok' ? 'bg-green-100 text-green-700' : status === 'alerta' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                              {status === 'ok' ? t('mp_status_ok') : status === 'alerta' ? t('mp_status_alert') : t('mp_status_depleted')}
                            </span>
                            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all"
                                style={{ width:`${Math.min(pct,100)}%`, background: status==='ok'?'#1D9E75':status==='alerta'?'#e0982c':'#ef4444' }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <TBtn onClick={() => openEdit(mp)}>{t('btn_edit')}</TBtn>
                            <TBtn danger onClick={() => dispatch({ type:'DEL_MAT_PRES', payload:mp.id })}>{t('btn_delete')}</TBtn>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* DRAWER */}
      <Drawer open={drawer} onClose={() => { setDrawer(false); setEditing(null) }}
        title={editing ? t('mp_form_edit') : t('mp_form_new')} width={420}>

        <Field label={t('lbl_project')} required>
          <select className={selectCls} value={form.proyecto_id||''} onChange={e => setForm(f => ({...f, proyecto_id:e.target.value, actividad_id:''}))}>
            <option value="">{t('lbl_select')}</option>
            {proyectos.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>)}
          </select>
        </Field>

        <Field label={t('mp_form_material')} required>
          <select className={selectCls} value={form.material_id||''} onChange={set('material_id')}>
            <option value="">{t('lbl_select')}</option>
            {materiales.filter(m => m.activo !== false).map(m => (
              <option key={m.id} value={m.id}>{m.codigo} — {m.descripcion}</option>
            ))}
          </select>
        </Field>

        {form.material_id && (
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500">
            {t('inv_stock_current')}: <span className="font-mono font-medium text-gray-700">
              {fmtNum(materiales.find(m=>m.id===form.material_id)?.stock_actual||0)} {materiales.find(m=>m.id===form.material_id)?.unidad}
            </span>
          </div>
        )}

        <Field label={t('mp_form_activity')}>
          <select className={selectCls} value={form.actividad_id||''} onChange={set('actividad_id')}>
            <option value="">{t('lbl_select')}</option>
            {actividades
              .filter(a => !form.proyecto_id || a.proyecto_id === form.proyecto_id)
              .map(a => <option key={a.id} value={a.id}>{a.code} — {a.descripcion}</option>)}
          </select>
        </Field>

        <Field label={t('mp_form_qty')} required>
          <input type="number" className={inputCls} value={form.cantidad_presupuestada||''}
            onChange={set('cantidad_presupuestada')} placeholder="0.00" min="0" step="0.01" />
        </Field>

        <div className="flex gap-2 mt-auto pt-2">
          <SecondaryBtn onClick={() => { setDrawer(false); setEditing(null) }} className="flex-1">{t('btn_cancel')}</SecondaryBtn>
          <PrimaryBtn onClick={save} disabled={!form.proyecto_id||!form.material_id||!form.cantidad_presupuestada} className="flex-1">
            {editing ? t('btn_save') : t('btn_add')}
          </PrimaryBtn>
        </div>
      </Drawer>
    </div>
  )
}
