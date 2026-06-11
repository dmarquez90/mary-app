import { useState, useContext, useMemo, useEffect, useRef } from 'react'
import { useStore } from '../store'
import { LangContext } from '../i18n'
import { usePermissions } from '../usePermissions'
import { fmtNum, fmt, UNIDADES_CONFIG } from '../utils'
import { Drawer, EmptyState, Field, PrimaryBtn, SecondaryBtn, TBtn, Icons, inputCls, selectCls } from '../components'
import ImportarMatPresupuestados from './ImportarMatPresupuestados'

const emptyForm = () => ({
  proyecto_id: '', nombre_libre: '', unidad_libre: 'und',
  cantidad_presupuestada: '', costo_unitario: '', actividad_id: '', etapa_id: '', sub_etapa_id: '',
  material_id: '', es_adicional: false,
})



export default function MatPresupuestados() {
  const { state, dispatch } = useStore()
  const { t, lang } = useContext(LangContext)
  const isEs = lang === 'ES'
  const { can } = usePermissions()
  const { proyectos, presupuesto, materiales, materiales_presupuestados = [], entradas, salidas, solicitud_items = [], solicitudes = [], equipos = [] } = state

  const [proyId, setProyId]   = useState(proyectos[0]?.id || '')
  const [drawer, setDrawer]   = useState(false)
  const [form, setForm]       = useState(emptyForm())
  const [editing, setEditing] = useState(null)
  const [search, setSearch]   = useState('')
  const [filterEtapa, setFilterEtapa] = useState('')
  const [matSearch, setMatSearch]     = useState('')
  const [matOpen, setMatOpen]         = useState(false)
  const matRef = useRef(null)
  useEffect(() => {
    if (!matOpen) return
    const handleClick = (e) => {
      if (matRef.current && !matRef.current.contains(e.target)) setMatOpen(false)
    }
    const handleKey = (e) => { if (e.key === 'Escape') setMatOpen(false) }
    // Use setTimeout to avoid capturing the same click that opened the dropdown
    const t = setTimeout(() => document.addEventListener('mousedown', handleClick), 0)
    document.addEventListener('keydown', handleKey)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey) }
  }, [matOpen])

  const puedeEditar = can('mat_pres_editar')
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const proy   = proyectos.find(p => p.id === proyId)
  const moneda = proy?.moneda || 'USD'

  // Para la vista principal (filtro por proyecto activo en la lista)
  const etapas      = presupuesto.filter(b => b.proyecto_id === proyId && b.tipo === 'etapa')
  const subEtapas   = presupuesto.filter(b => b.proyecto_id === proyId && b.tipo === 'sub_etapa')
  const actividades = presupuesto.filter(b => b.proyecto_id === proyId && b.tipo === 'actividad')

  // Para el drawer — usa form.proyecto_id (puede ser distinto al proyecto de la vista)
  const formEtapas    = presupuesto.filter(b => b.proyecto_id === form.proyecto_id && b.tipo === 'etapa')
  const formSubEtapas = presupuesto.filter(b => b.proyecto_id === form.proyecto_id && b.tipo === 'sub_etapa')
  const formActs      = presupuesto.filter(b => b.proyecto_id === form.proyecto_id && b.tipo === 'actividad')

  const subEtapasFiltradas   = formSubEtapas.filter(s => !form.etapa_id || s.parent_id === form.etapa_id)
  const actividadesFiltradas = formActs.filter(a => {
    if (form.sub_etapa_id) return a.parent_id === form.sub_etapa_id
    if (form.etapa_id) {
      const subs = formSubEtapas.filter(s => s.parent_id === form.etapa_id).map(s => s.id)
      return subs.includes(a.parent_id)
    }
    return true
  })

  const matsPres = useMemo(() =>
    materiales_presupuestados.filter(mp => mp.proyecto_id === proyId),
    [materiales_presupuestados, proyId]
  )

  const matsFiltrados = useMemo(() => {
    let list = matsPres
    if (filterEtapa) {
      const subs = subEtapas.filter(s => s.parent_id === filterEtapa).map(s => s.id)
      const acts = actividades.filter(a => subs.includes(a.parent_id)).map(a => a.id)
      list = list.filter(mp => acts.includes(mp.actividad_id))
    }
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter(mp => {
      const nombre = mp.nombre_libre || materiales.find(m => m.id === mp.material_id)?.descripcion || ''
      return nombre.toLowerCase().includes(q)
    })
  }, [matsPres, search, filterEtapa, materiales, subEtapas, actividades])

  // Solo solicitudes "vivas" — excluir anuladas, rechazadas y completadas
  const ESTADOS_ACTIVOS = ['pendiente', 'aprobada', 'oc_generada', 'pendiente_oc', 
    'pendiente_bodega', 'dividida', 'parcialmente_entregada']

  const solsDelProy = solicitudes
    .filter(s => s.proyecto_id === proyId && ESTADOS_ACTIVOS.includes(s.estado))
    .map(s => s.id)

  const cantSolicitada = (mp) => {
    if (!mp.material_id) return 0
    return solicitud_items
      .filter(si =>
        solsDelProy.includes(si.solicitud_id) &&
        si.material_id === mp.material_id &&
        // Contar si: no hay actividad en el item, O coincide con la actividad del mat. presupuestado
        (!si.actividad_id || !mp.actividad_id || si.actividad_id === mp.actividad_id)
      )
      .reduce((s, si) => s + parseFloat(si.cantidad || 0), 0)
  }

  const cantConsumida = (mp) => {
    if (!mp.material_id) return 0
    return salidas
      .filter(s => s.material_id === mp.material_id && s.proyecto_id === proyId &&
        (!mp.actividad_id || s.actividad_id === mp.actividad_id))
      .reduce((s, sa) => s + parseFloat(sa.cantidad || 0), 0)
  }

  const precioPromedio = (materialId) => {
    if (!materialId) return 0
    const ents = entradas.filter(e => e.material_id === materialId && e.proyecto_id === proyId)
    const entsAll = ents.length > 0 ? ents : entradas.filter(e => e.material_id === materialId)
    const totalCant = entsAll.reduce((s, e) => s + parseFloat(e.cantidad || 0), 0)
    const totalVal  = entsAll.reduce((s, e) => s + parseFloat(e.cantidad || 0) * parseFloat(e.precio_unitario || 0), 0)
    return totalCant > 0 ? totalVal / totalCant : 0
  }

  const costoPres = (mp) => {
    if (!mp.costo_unitario) return 0
    return parseFloat(mp.cantidad_presupuestada || 0) * parseFloat(mp.costo_unitario || 0)
  }

  const costoConsumido = (mp) => {
    // Caso 1: material con salidas de inventario
    if (mp.material_id) {
      const qty  = cantConsumida(mp)
      const prec = precioPromedio(mp.material_id)
      if (qty > 0) return qty * prec
    }
    // Caso 2: equipo — buscar en tabla equipos de Financiero
    // Vincula por mat_pres_id, por material_id, o por nombre_libre == descripcion
    const equiposVinculados = equipos.filter(eq =>
      eq.proyecto_id === proyId && (
        eq.mat_pres_id === mp.id ||
        (mp.material_id && eq.material_id === mp.material_id) ||
        (!mp.material_id && eq.descripcion?.toLowerCase().trim() === mp.nombre_libre?.toLowerCase().trim())
      )
    )
    if (equiposVinculados.length > 0)
      return equiposVinculados.reduce((s, eq) => s + parseFloat(eq.costo_total || 0), 0)
    return 0
  }

  const totalPresupuestado = useMemo(() =>
    matsPres.reduce((sum, mp) => sum + costoPres(mp), 0),
    [matsPres, presupuesto]
  )

  const totalConsumido = useMemo(() =>
    matsPres.reduce((sum, mp) => sum + costoConsumido(mp), 0),
    [matsPres, salidas, entradas, equipos]
  )

  const totalAdicionales = matsPres.filter(mp => mp.es_adicional).length
  const totalActividades = [...new Set(matsPres.map(mp => mp.actividad_id).filter(Boolean))].length

  const save = () => {
    if (!form.proyecto_id || !form.nombre_libre || !form.cantidad_presupuestada) return
    if (editing) dispatch({ type: 'UPD_MAT_PRES', payload: { ...form, id: editing } })
    else         dispatch({ type: 'ADD_MAT_PRES', payload: form })
    if (form.proyecto_id !== proyId) setProyId(form.proyecto_id)
    setDrawer(false); setEditing(null); setMatSearch(''); setMatOpen(false); setForm(emptyForm())
  }

  const openEdit = (mp) => {
    setForm({
      proyecto_id: mp.proyecto_id || '',
      nombre_libre: mp.nombre_libre || '',
      unidad_libre: mp.unidad_libre || 'und',
      cantidad_presupuestada: mp.cantidad_presupuestada || '',
      costo_unitario: mp.costo_unitario || '',
      actividad_id: mp.actividad_id || '',
      etapa_id: mp.etapa_id || '',
      sub_etapa_id: mp.sub_etapa_id || '',
      material_id: mp.material_id || '',
      es_adicional: mp.es_adicional || false,
    })
    setEditing(mp.id)
    setDrawer(true)
  }

  const openAdd = () => { setForm({ ...emptyForm(), proyecto_id: proyId }); setEditing(null); setDrawer(true) }

  const getNombre  = (mp) => mp.nombre_libre || materiales.find(m => m.id === mp.material_id)?.descripcion || '...'
  const getUnidad  = (mp) => mp.unidad_libre || materiales.find(m => m.id === mp.material_id)?.unidad || '...'
  const getActividad = (mp) => {
    const act = presupuesto.find(b => b.id === mp.actividad_id)
    return act ? `${act.code} ${act.descripcion}` : '...'
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{t('mp_title')}</h1>
          {proy && <p className="text-sm text-gray-400 mt-0.5">{proy.project_code} — {proy.nombre}</p>}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#1B3A6B]"
            value={proyId} onChange={e => { setProyId(e.target.value); setSearch(''); setFilterEtapa('') }}>
            <option value="">{t('lbl_select')}</option>
            {proyectos.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>)}
          </select>
          {proyId && puedeEditar && <PrimaryBtn onClick={openAdd}>{t('mp_add')}</PrimaryBtn>}
        </div>
      </div>

      {!proyId ? (
        <EmptyState icon={Icons.budget} title={t('mp_no_project')} />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            {[
              { label: t('mp_kpi_materials'), value: matsPres.length, color: '#1B3A6B' },
              { label: t('mp_kpi_additional'), value: totalAdicionales, color: totalAdicionales > 0 ? '#e0982c' : '#6b7280' },
              { label: t('mp_kpi_activities'), value: totalActividades, color: '#1B3A6B' },
              { label: t('mp_kpi_budget_value'), value: fmt(totalPresupuestado, moneda), color: '#1D9E75' },
              { label: t('mp_kpi_consumed_cost'), value: fmt(totalConsumido, moneda), color: totalConsumido > totalPresupuestado ? '#ef4444' : '#1D9E75' },
            ].map((k, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs text-gray-400 mb-1">{k.label}</p>
                <p className="text-xl font-semibold" style={{ color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* ── IMPORTAR DESDE EXCEL ── */}
          {proyId && puedeEditar && (
            <ImportarMatPresupuestados proyId={proyId} onDone={() => setSearch('')} />
          )}

          {matsPres.length > 0 && (
            <div className="flex gap-3 mb-4 flex-wrap mt-4">
              <input className={inputCls + ' flex-1 min-w-[200px]'}
                placeholder={t('mp_search_placeholder')}
                value={search} onChange={e => setSearch(e.target.value)} />
              {etapas.length > 0 && (
                <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A6B]"
                  value={filterEtapa} onChange={e => setFilterEtapa(e.target.value)}>
                  <option value="">{t('mp_filter_all_stages')}</option>
                  {etapas.map(e => <option key={e.id} value={e.id}>{e.code} — {e.descripcion}</option>)}
                </select>
              )}
            </div>
          )}

          {matsPres.length === 0 ? (
            <EmptyState icon={Icons.inventory} title={t('mp_empty')}
              action={puedeEditar ? t('mp_add') : null}
              onAction={puedeEditar ? openAdd : null} />
          ) : matsFiltrados.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <p className="text-sm text-gray-400">{t('mp_no_results')}</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {[
                      { label: t('mp_col_material'),       w: '220px' },
                      { label: t('mp_col_unit'),           w: '70px'  },
                      { label: t('mp_col_qty_budgeted'),   w: '100px' },
                      { label: t('mp_col_budget_cost'),    w: '120px' },
                      { label: t('mp_col_qty_requested'),  w: '90px'  },
                      { label: t('mp_col_qty_consumed'),   w: '110px' },
                      { label: t('mp_col_consumed_cost'),  w: '130px' },
                      { label: t('mp_col_diff_qty'),       w: '90px'  },
                      { label: t('mp_col_diff_money'),     w: '140px' },
                      { label: t('mp_col_activity'),       w: '160px' },
                      { label: t('mp_col_status'),         w: '100px' },
                      puedeEditar ? { label: '', w: '80px' } : null,
                    ].filter(h => h !== null).map((h, i) => (
                      <th key={i} style={{ minWidth: h.w, width: h.w }} className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">{h.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matsFiltrados.map(mp => {
                    const presup    = parseFloat(mp.cantidad_presupuestada || 0)
                    const solicit   = cantSolicitada(mp)
                    const consumido = cantConsumida(mp)
                    const dif       = presup - solicit
                    const pct       = presup > 0 ? (solicit / presup) * 100 : 0
                    const status    = pct >= 100 ? 'agotado' : pct >= 80 ? 'alerta' : 'ok'

                    return (
                      <tr key={mp.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3" style={{ minWidth: '220px', width: '220px' }}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-gray-800">{getNombre(mp)}</span>
                            {mp.es_adicional && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                                {t('mp_tag_additional')}
                              </span>
                            )}
                            {mp.material_id && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                {t('mp_tag_linked')}
                              </span>
                            )}
                          </div>
                          {mp.material_id && (
                            <p className="text-xs text-gray-400 font-mono mt-0.5">
                              {materiales.find(m => m.id === mp.material_id)?.codigo}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{getUnidad(mp)}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-700">{fmtNum(presup)}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600 whitespace-nowrap">{fmt(costoPres(mp), moneda)}</td>
                        <td className="px-4 py-3 text-sm font-mono" style={{ color: solicit > presup ? '#ef4444' : '#1B3A6B' }}>
                          {fmtNum(solicit)}{solicit > presup && ' ⚠'}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-500">{fmtNum(consumido)}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600 whitespace-nowrap">{fmt(costoConsumido(mp), moneda)}</td>
                        <td className="px-4 py-3 text-sm font-mono font-medium" style={{ color: dif < 0 ? '#ef4444' : '#1D9E75' }}>
                          {dif >= 0 ? '+' : ''}{fmtNum(dif)}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono font-medium whitespace-nowrap" style={{ minWidth: '140px', width: '140px', color: costoPres(mp) - costoConsumido(mp) < 0 ? '#ef4444' : '#1D9E75' }}>
                          {costoPres(mp) - costoConsumido(mp) >= 0 ? '+' : ''}{fmt(costoPres(mp) - costoConsumido(mp), moneda)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate">{getActividad(mp)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit
                              ${status === 'ok' ? 'bg-green-100 text-green-700' : status === 'alerta' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                              {status === 'ok' ? t('mp_status_ok') : status === 'alerta' ? t('mp_status_alert') : t('mp_status_depleted')}
                            </span>
                            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full"
                                style={{ width: `${Math.min(pct, 100)}%`, background: status === 'ok' ? '#1D9E75' : status === 'alerta' ? '#e0982c' : '#ef4444' }} />
                            </div>
                          </div>
                        </td>
                        {puedeEditar && (
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <TBtn onClick={() => openEdit(mp)}>{t('btn_edit')}</TBtn>
                              <TBtn danger onClick={() => dispatch({ type: 'DEL_MAT_PRES', payload: mp.id })}>{t('btn_delete')}</TBtn>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {puedeEditar && (
        <Drawer open={drawer} onClose={() => { setDrawer(false); setEditing(null); setMatSearch(''); setMatOpen(false) }}
          title={editing ? t('mp_form_edit') : t('mp_form_new')} width={440}>

          <Field label={t('lbl_project')} required>
            <select className={selectCls} value={form.proyecto_id || ''} onChange={e => setForm(f => ({ ...f, proyecto_id: e.target.value, etapa_id: '', sub_etapa_id: '', actividad_id: '' }))}>
              <option value="">{t('lbl_select')}</option>
              {proyectos.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>)}
            </select>
          </Field>

          <Field label={t('mp_form_name')} required>
            <input className={inputCls} value={form.nombre_libre || ''} onChange={set('nombre_libre')}
              placeholder={t('mp_form_name_ph')} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('mp_col_unit')}>
              <select className={selectCls} value={form.unidad_libre || 'und'} onChange={set('unidad_libre')}>
                {UNIDADES_CONFIG.map(u => (
                  <option key={u.value} value={u.value}>{isEs ? u.es : u.en}</option>
                ))}
              </select>
            </Field>
            <Field label={t('mp_form_qty')} required>
              <input type="number" className={inputCls} value={form.cantidad_presupuestada || ''}
                onChange={set('cantidad_presupuestada')} placeholder="0.00" min="0" step="0.01" />
            </Field>
          </div>
          <Field label={isEs ? 'Costo unitario presupuestado (opcional)' : 'Budgeted unit cost (optional)'}>
            <input type="number" className={inputCls} value={form.costo_unitario || ''}
              onChange={set('costo_unitario')} placeholder="0.00" min="0" step="0.01" />
            {form.costo_unitario && form.cantidad_presupuestada && (
              <p className="text-xs text-gray-400 mt-1">
                {isEs ? 'Total presupuestado:' : 'Budgeted total:'} {' '}
                <span className="font-mono font-medium text-gray-600">
                  $ {(parseFloat(form.costo_unitario||0) * parseFloat(form.cantidad_presupuestada||0)).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}
                </span>
              </p>
            )}
          </Field>

          <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
            <p className="text-xs font-medium text-gray-500 mb-2">
              {t('mp_form_link_catalog')}
            </p>
            {/* Searchable catalog picker */}
            <div className="relative" ref={matRef}>
              {/* Trigger button */}
              <button
                type="button"
                onClick={() => { setMatOpen(o => !o); setMatSearch('') }}
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:border-[#1B3A6B] focus:outline-none focus:border-[#1B3A6B] transition-colors"
              >
                <span className={form.material_id ? 'text-gray-800' : 'text-gray-400'}>
                  {form.material_id
                    ? (() => { const m = materiales.find(x => x.id === form.material_id); return m ? `${m.codigo} ${m.descripcion}` : t('mp_form_not_linked') })()
                    : t('mp_form_not_linked')}
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${matOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown */}
              {matOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {/* Search input */}
                  <div className="p-2 border-b border-gray-100">
                    <input
                      autoFocus
                      type="text"
                      value={matSearch}
                      onChange={e => setMatSearch(e.target.value)}
                      placeholder={isEs ? 'Buscar por código o nombre...' : 'Search by code or name...'}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-[#1B3A6B]"
                    />
                  </div>
                  {/* Options list */}
                  <div className="max-h-48 overflow-y-auto">
                    {/* Not linked option */}
                    <button
                      type="button"
                      onClick={() => { setForm(f => ({ ...f, material_id: '' })); setMatOpen(false); setMatSearch('') }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${!form.material_id ? 'bg-blue-50 text-[#1B3A6B] font-medium' : 'text-gray-400'}`}
                    >
                      {t('mp_form_not_linked')}
                    </button>
                    {materiales
                      .filter(m => m.activo !== false)
                      .filter(m => {
                        if (!matSearch.trim()) return true
                        const q = matSearch.toLowerCase()
                        return (m.codigo || '').toLowerCase().includes(q) || (m.descripcion || '').toLowerCase().includes(q)
                      })
                      .map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => { setForm(f => ({ ...f, material_id: m.id })); setMatOpen(false); setMatSearch('') }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-t border-gray-50 ${form.material_id === m.id ? 'bg-blue-50 text-[#1B3A6B] font-medium' : 'text-gray-700'}`}
                        >
                          <span className="font-mono text-xs text-gray-400 mr-1.5">{m.codigo}</span>
                          {m.descripcion}
                        </button>
                      ))}
                    {matSearch.trim() && materiales.filter(m => m.activo !== false).filter(m => {
                      const q = matSearch.toLowerCase()
                      return (m.codigo||'').toLowerCase().includes(q) || (m.descripcion||'').toLowerCase().includes(q)
                    }).length === 0 && (
                      <p className="px-3 py-2 text-xs text-gray-400 text-center">
                        {isEs ? 'Sin resultados' : 'No results'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {form.material_id && (
              <p className="text-xs text-gray-400 mt-1.5">
                {t('mp_form_current_stock')} <span className="font-mono font-medium text-gray-600">
                  {fmtNum(materiales.find(m => m.id === form.material_id)?.stock_actual || 0)} {materiales.find(m => m.id === form.material_id)?.unidad}
                </span>
              </p>
            )}
          </div>

          {form.proyecto_id && formEtapas.length > 0 && (
            <>
              <Field label={t('mp_form_stage')}>
                <select className={selectCls} value={form.etapa_id || ''} onChange={e => setForm(f => ({ ...f, etapa_id: e.target.value, sub_etapa_id: '', actividad_id: '' }))}>
                  <option value="">{t('mp_form_unassigned')}</option>
                  {formEtapas.map(e => <option key={e.id} value={e.id}>{e.code} {e.descripcion}</option>)}
                </select>
              </Field>
              {form.etapa_id && subEtapasFiltradas.length > 0 && (
                <Field label={t('mp_form_substage')}>
                  <select className={selectCls} value={form.sub_etapa_id || ''} onChange={e => setForm(f => ({ ...f, sub_etapa_id: e.target.value, actividad_id: '' }))}>
                    <option value="">{t('mp_form_unassigned')}</option>
                    {subEtapasFiltradas.map(s => <option key={s.id} value={s.id}>{s.code} {s.descripcion}</option>)}
                  </select>
                </Field>
              )}
              <Field label={t('mp_form_activity')}>
                <select className={selectCls} value={form.actividad_id || ''} onChange={set('actividad_id')}>
                  <option value="">{t('mp_form_unassigned')}</option>
                  {actividadesFiltradas.map(a => <option key={a.id} value={a.id}>{a.code} {a.descripcion}</option>)}
                </select>
              </Field>
            </>
          )}

          <label className="flex items-center gap-2 cursor-pointer mt-1">
            <input type="checkbox" className="w-4 h-4 accent-[#1B3A6B]"
              checked={form.es_adicional || false}
              onChange={e => setForm(f => ({ ...f, es_adicional: e.target.checked }))} />
            <span className="text-sm text-gray-600">
              {t('mp_form_is_additional')}
            </span>
          </label>

          <div className="flex gap-2 mt-auto pt-2">
            <SecondaryBtn onClick={() => { setDrawer(false); setEditing(null); setMatSearch(''); setMatOpen(false) }} className="flex-1">{t('btn_cancel')}</SecondaryBtn>
            <PrimaryBtn onClick={save}
              disabled={!form.proyecto_id || !form.nombre_libre || !form.cantidad_presupuestada}
              className="flex-1">
              {editing ? t('btn_save') : t('btn_add')}
            </PrimaryBtn>
          </div>
        </Drawer>
      )}
    </div>
  )
}
