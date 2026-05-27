import { useState, useContext, useMemo } from 'react'
import { useStore } from '../store'
import { LangContext } from '../i18n'
import { usePermissions } from '../usePermissions'
import { today, fmt, fmtNum } from '../utils'
import { Drawer, EmptyState, Field, PrimaryBtn, SecondaryBtn, TBtn, Icons, inputCls, selectCls } from '../components'

const BRAND = '#1B3A6B'

const ESTADO_OC = {
  borrador:   { label: 'Borrador',   labelEn: 'Draft',      cls: 'bg-gray-100 text-gray-600'   },
  presentada: { label: 'Presentada', labelEn: 'Submitted',  cls: 'bg-blue-100 text-blue-700'   },
  aprobada:   { label: 'Aprobada',   labelEn: 'Approved',   cls: 'bg-green-100 text-green-700' },
  rechazada:  { label: 'Rechazada',  labelEn: 'Rejected',   cls: 'bg-red-100 text-red-600'     },
}

function EstadoBadge({ estado, isEs }) {
  const cfg = ESTADO_OC[estado] || ESTADO_OC.borrador
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.cls}`}>
      {isEs ? cfg.label : cfg.labelEn}
    </span>
  )
}

const emptyItem = () => ({
  tipo: 'existente', actividad_id: '', descripcion: '',
  unidad: 'und', cantidad_original: '', cantidad_nueva: '',
  precio_unitario: '', costo_mo: '', costo_materiales: '', costo_equipos: '',
})

export default function OrdenesCambio() {
  const { state, dispatch } = useStore()
  const { t, lang } = useContext(LangContext)
  const { can } = usePermissions()
  const isEs = lang === 'ES'

  const {
    proyectos, presupuesto,
    presupuesto_indirectos = [],
    ordenes_cambio = [], ordenes_cambio_items = [], ordenes_cambio_indirectos = [],
  } = state

  const puedeEditar  = can('ordenes_cambio_editar')
  const puedeAprobar = can('oc_aprobar')

  const [proyId, setProyId]     = useState(proyectos[0]?.id || '')
  const [drawer, setDrawer]     = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [form, setForm]         = useState({})
  const [items, setItems]       = useState([emptyItem()])
  const [ajustesInd, setAjustesInd] = useState({}) // { [ind_id]: monto_ajuste }

  const proy   = proyectos.find(p => p.id === proyId)
  const moneda = proy?.moneda || 'USD'
  const set    = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const actividades = useMemo(() =>
    presupuesto.filter(b => b.proyecto_id === proyId && b.tipo === 'actividad'),
    [presupuesto, proyId]
  )

  // Indirectos del proyecto para el formulario de ajuste
  const indsDelProy = useMemo(() =>
    presupuesto_indirectos.filter(p => p.proyecto_id === proyId),
    [presupuesto_indirectos, proyId]
  )

  const ocs = useMemo(() =>
    ordenes_cambio.filter(o => o.proyecto_id === proyId)
      .sort((a,b) => (b.numero||'').localeCompare(a.numero||'')),
    [ordenes_cambio, proyId]
  )

  const totalAprobadas   = ocs.filter(o=>o.estado==='aprobada').reduce((s,o)=>s+(parseFloat(o.total_oc)||0),0)
  const totalPresentadas = ocs.filter(o=>o.estado==='presentada').length
  const totalBorradores  = ocs.filter(o=>o.estado==='borrador').length

  const genNumero = () => {
    const year = new Date().getFullYear()
    const n = ocs.length + 1
    return `OC-${year}-${String(n).padStart(3,'0')}`
  }

  const setItem = (idx, k, v) => setItems(prev => prev.map((it,i) => i===idx ? {...it,[k]:v} : it))
  const addItem = () => setItems(prev => [...prev, emptyItem()])
  const removeItem = idx => setItems(prev => prev.filter((_,i) => i !== idx))

  // Para actividad nueva, PU = suma de los 3 costos
  const getPU = (it) => {
    if (it.tipo === 'nueva') {
      return (parseFloat(it.costo_mo)||0) + (parseFloat(it.costo_materiales)||0) + (parseFloat(it.costo_equipos)||0)
    }
    return parseFloat(it.precio_unitario||0)
  }

  const calcItem = (it) => {
    const pu   = getPU(it)
    const diff = parseFloat(it.cantidad_nueva||0) - parseFloat(it.cantidad_original||0)
    const monto = diff * pu
    return { diff, monto, pu }
  }

  const totalOC = items.reduce((s,it) => s + calcItem(it).monto, 0)

  const openNueva = () => {
    setForm({
      numero: genNumero(),
      fecha: today(),
      presentado_a: '',
      motivo: '',
      notas: '',
    })
    setItems([emptyItem()])
    setAjustesInd({})
    setDrawer('nueva')
  }

  const saveOC = () => {
    const validItems = items.filter(it => it.descripcion && it.cantidad_nueva !== '')
    if (!proyId || !form.numero || validItems.length === 0) return

    // Construir lista de ajustes de indirectos con ajuste != 0
    const indirectosPayload = indsDelProy
      .filter(ind => parseFloat(ajustesInd[ind.id] || 0) !== 0)
      .map(ind => ({
        ind_id:       ind.id,
        categoria:    ind.categoria,
        monto_actual: parseFloat(ind.monto_presupuestado || 0),
        ajuste:       parseFloat(ajustesInd[ind.id] || 0),
      }))

    dispatch({
      type: 'ADD_ORDEN_CAMBIO',
      payload: {
        orden: { ...form, proyecto_id: proyId, total_oc: totalOC },
        items: validItems.map(it => {
          const act = actividades.find(a => a.id === it.actividad_id)
          const pu  = getPU(it)
          return {
            ...it,
            descripcion:       it.descripcion || act?.descripcion || '',
            cantidad_original: parseFloat(it.cantidad_original||0),
            cantidad_nueva:    parseFloat(it.cantidad_nueva||0),
            precio_unitario:   pu,
            costo_mo:          parseFloat(it.costo_mo||0),
            costo_materiales:  parseFloat(it.costo_materiales||0),
            costo_equipos:     parseFloat(it.costo_equipos||0),
          }
        }),
        indirectos: indirectosPayload,
      }
    })
    setDrawer(null)
  }

  const cambiarEstado = (id, estado) => dispatch({ type: 'UPD_ORDEN_CAMBIO_ESTADO', payload: { id, estado } })
  const eliminarOC    = (id) => {
    if (!window.confirm(isEs ? '¿Eliminar esta orden de cambio?' : 'Delete this change order?')) return
    dispatch({ type: 'DEL_ORDEN_CAMBIO', payload: id })
  }

  const ocDetalle    = ordenes_cambio.find(o => o.id === detailId)
  const itemsDetalle = ordenes_cambio_items.filter(i => i.oc_id === detailId)
  const indsDetalle  = ordenes_cambio_indirectos.filter(i => i.oc_id === detailId)

  // Para el panel de impacto — separar nuevas de existentes
  const itemsNuevos     = itemsDetalle.filter(i => i.tipo === 'nueva')
  const itemsExistentes = itemsDetalle.filter(i => i.tipo === 'existente')

  const thCls = 'px-3 py-2.5 text-left text-xs text-gray-500 font-medium whitespace-nowrap'
  const tdCls = 'px-3 py-2.5 text-sm text-gray-700'

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            {isEs ? 'Órdenes de Cambio' : 'Change Orders'}
          </h1>
          {proy && <p className="text-sm text-gray-400 mt-0.5">{proy.project_code} — {proy.nombre}</p>}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#1B3A6B]"
            value={proyId} onChange={e => setProyId(e.target.value)}>
            <option value="">{t('lbl_select')}</option>
            {proyectos.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>)}
          </select>
          {proyId && puedeEditar && (
            <PrimaryBtn onClick={openNueva}>
              + {isEs ? 'Nueva OC' : 'New CO'}
            </PrimaryBtn>
          )}
        </div>
      </div>

      {!proyId ? (
        <EmptyState icon={Icons.budget} title={isEs ? 'Selecciona un proyecto' : 'Select a project'} />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            {[
              { label: isEs ? 'OC Aprobadas (monto)' : 'Approved COs (amount)', value: fmt(totalAprobadas, moneda), color: '#1D9E75' },
              { label: isEs ? 'Presentadas al cliente' : 'Submitted to client',  value: totalPresentadas,            color: '#185FA5' },
              { label: isEs ? 'En borrador'            : 'Draft',                value: totalBorradores,             color: '#6b7280' },
              { label: isEs ? 'Total OC'               : 'Total COs',            value: ocs.length,                  color: BRAND     },
            ].map(k => (
              <div key={k.label} className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">{k.label}</p>
                <p className="text-2xl font-bold font-mono" style={{ color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {ocs.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl py-16">
              <EmptyState icon={Icons.budget}
                title={isEs ? 'No hay órdenes de cambio' : 'No change orders'}
                subtitle={isEs ? 'Crea una OC para registrar cambios al contrato' : 'Create a CO to record contract changes'}
                action={puedeEditar ? (isEs ? '+ Nueva OC' : '+ New CO') : null}
                onAction={puedeEditar ? openNueva : null} />
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-xl overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {[
                      isEs?'Número':'Number',
                      isEs?'Fecha':'Date',
                      isEs?'Presentado a':'Submitted to',
                      isEs?'Motivo':'Reason',
                      isEs?'Ítems':'Items',
                      isEs?'Total OC':'CO Total',
                      isEs?'Estado':'Status',
                      '',
                    ].map((h,i) => <th key={i} className={thCls}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {ocs.map(oc => {
                    const ocItems = ordenes_cambio_items.filter(i => i.oc_id === oc.id)
                    const total   = parseFloat(oc.total_oc || 0)
                    const tieneNuevas = ocItems.some(i => i.tipo === 'nueva')
                    return (
                      <tr key={oc.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className={tdCls + ' font-mono font-bold'} style={{ color: BRAND }}>{oc.numero}</td>
                        <td className={tdCls + ' text-xs text-gray-400'}>{oc.fecha || '—'}</td>
                        <td className={tdCls + ' text-xs'}>{oc.presentado_a || '—'}</td>
                        <td className={tdCls + ' text-xs max-w-[180px] truncate'}>{oc.motivo || '—'}</td>
                        <td className={tdCls + ' text-xs text-gray-500'}>
                          {ocItems.length}
                          {tieneNuevas && (
                            <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                              {isEs ? 'c/nuevas' : 'w/new'}
                            </span>
                          )}
                        </td>
                        <td className={tdCls + ' font-mono font-bold'} style={{ color: total >= 0 ? '#1D9E75' : '#ef4444' }}>
                          {total >= 0 ? '+' : ''}{fmt(total, moneda)}
                        </td>
                        <td className={tdCls}><EstadoBadge estado={oc.estado} isEs={isEs} /></td>
                        <td className={tdCls}>
                          <div className="flex gap-1 flex-wrap">
                            <TBtn onClick={() => { setDetailId(oc.id); setDrawer('detalle') }}>
                              {t('btn_view')}
                            </TBtn>
                            {puedeEditar && oc.estado === 'borrador' && (
                              <TBtn onClick={() => cambiarEstado(oc.id, 'presentada')}>
                                {isEs ? 'Presentar' : 'Submit'}
                              </TBtn>
                            )}
                            {(puedeEditar || puedeAprobar) && oc.estado === 'presentada' && <>
                              <TBtn onClick={() => cambiarEstado(oc.id, 'aprobada')}
                                className="text-green-600 hover:bg-green-50">
                                {isEs ? 'Aprobar' : 'Approve'}
                              </TBtn>
                              <TBtn danger onClick={() => cambiarEstado(oc.id, 'rechazada')}>
                                {isEs ? 'Rechazar' : 'Reject'}
                              </TBtn>
                            </>}
                            {(puedeEditar || puedeAprobar) && (oc.estado === 'borrador' || oc.estado === 'rechazada') && (
                              <TBtn danger onClick={() => eliminarOC(oc.id)}>{t('btn_delete')}</TBtn>
                            )}
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

      {/* ── DRAWER: NUEVA OC ── */}
      <Drawer open={drawer === 'nueva'} onClose={() => setDrawer(null)}
        title={isEs ? 'Nueva Orden de Cambio' : 'New Change Order'} width={720}>

        <div className="grid grid-cols-2 gap-3">
          <Field label={isEs ? 'Número *' : 'Number *'}>
            <input className={inputCls} value={form.numero||''} onChange={set('numero')} />
          </Field>
          <Field label={isEs ? 'Fecha' : 'Date'}>
            <input type="date" className={inputCls} value={form.fecha||''} onChange={set('fecha')} />
          </Field>
        </div>

        <Field label={isEs ? 'Presentado a' : 'Submitted to'}>
          <input className={inputCls} value={form.presentado_a||''} onChange={set('presentado_a')}
            placeholder={isEs ? 'Nombre del supervisor o cliente' : 'Supervisor or client name'} />
        </Field>

        <Field label={isEs ? 'Motivo / Justificación' : 'Reason / Justification'}>
          <textarea className={inputCls} rows={2} value={form.motivo||''} onChange={set('motivo')}
            placeholder={isEs ? 'Ej: Planos incompletos — cantidades incorrectas en excavación' : 'E.g.: Incomplete drawings — incorrect quantities in excavation'} />
        </Field>

        {/* Ajuste de costos indirectos */}
        {indsDelProy.length > 0 && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {isEs ? 'Ajuste de costos indirectos (opcional)' : 'Indirect cost adjustment (optional)'}
              </p>
              <p className="text-xs text-gray-400">
                {isEs ? 'Solo ingresa los que cambian' : 'Only enter the ones that change'}
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {indsDelProy.map(ind => {
                const ajuste     = parseFloat(ajustesInd[ind.id] || 0)
                const montoNuevo = parseFloat(ind.monto_presupuestado || 0) + ajuste
                return (
                  <div key={ind.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{ind.categoria}</p>
                      <p className="text-xs text-gray-400 font-mono">
                        {isEs ? 'Actual:' : 'Current:'} {fmt(ind.monto_presupuestado, moneda)}
                        {ajuste !== 0 && (
                          <span className={`ml-2 font-medium ${ajuste > 0 ? 'text-amber-600' : 'text-red-500'}`}>
                            → {fmt(montoNuevo, moneda)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="w-36">
                      <input
                        type="number"
                        className={inputCls}
                        value={ajustesInd[ind.id] ?? ''}
                        onChange={e => setAjustesInd(prev => ({ ...prev, [ind.id]: e.target.value }))}
                        placeholder={isEs ? 'Ajuste (+/-)' : 'Adjustment (+/-)'}
                        step="0.01"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            {Object.values(ajustesInd).some(v => parseFloat(v||0) !== 0) && (
              <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-100 flex justify-between items-center">
                <span className="text-xs font-medium text-amber-700">
                  {isEs ? 'Total ajuste indirectos' : 'Total indirect adjustment'}
                </span>
                <span className="text-xs font-mono font-bold text-amber-700">
                  {(() => {
                    const total = indsDelProy.reduce((s, ind) => s + parseFloat(ajustesInd[ind.id]||0), 0)
                    return `${total >= 0 ? '+' : ''}${fmt(total, moneda)}`
                  })()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Items */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {isEs ? 'Cambios en actividades *' : 'Activity changes *'}
            </p>
            <button onClick={addItem}
              className="text-xs font-medium px-3 py-1 rounded-lg"
              style={{ color: BRAND, background: '#EEF2F7' }}>
              + {isEs ? 'Agregar' : 'Add'}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {items.map((it, idx) => {
              const { diff, monto, pu } = calcItem(it)
              const act = actividades.find(a => a.id === it.actividad_id)
              return (
                <div key={idx} className={`border rounded-xl p-3 ${it.tipo === 'nueva' ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200 bg-gray-50/50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500">#{idx+1}</span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(idx)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                    )}
                  </div>

                  {/* Tipo */}
                  <div className="flex gap-2 mb-3">
                    {['existente','nueva'].map(tipo => (
                      <button key={tipo}
                        onClick={() => setItem(idx, 'tipo', tipo)}
                        className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                          it.tipo === tipo
                            ? 'border-[#1B3A6B] text-[#1B3A6B] bg-blue-50 font-medium'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}>
                        {tipo === 'existente'
                          ? (isEs ? 'Actividad existente' : 'Existing activity')
                          : (isEs ? '+ Actividad nueva' : '+ New activity')}
                      </button>
                    ))}
                  </div>

                  {/* Actividad existente: selector */}
                  {it.tipo === 'existente' && (
                    <div className="mb-2">
                      <select className={selectCls} value={it.actividad_id||''} onChange={e => {
                        const act = actividades.find(a => a.id === e.target.value)
                        setItem(idx, 'actividad_id', e.target.value)
                        if (act) {
                          setItem(idx, 'descripcion', act.descripcion)
                          setItem(idx, 'unidad', act.unidad || 'und')
                          setItem(idx, 'cantidad_original', act.cantidad || '')
                          const pu = (act.costo_mo||0)+(act.costo_materiales||0)+(act.costo_equipos||0)
                          setItem(idx, 'precio_unitario', pu || '')
                        }
                      }}>
                        <option value="">{isEs ? '— Seleccionar actividad —' : '— Select activity —'}</option>
                        {actividades.map(a => (
                          <option key={a.id} value={a.id}>{a.code} — {a.descripcion}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Descripción */}
                  <div className="mb-2">
                    <input className={inputCls} value={it.descripcion||''}
                      onChange={e => setItem(idx, 'descripcion', e.target.value)}
                      placeholder={it.tipo === 'nueva'
                        ? (isEs ? 'Descripción de la actividad nueva *' : 'New activity description *')
                        : (isEs ? 'Descripción (editable)' : 'Description (editable)')} />
                  </div>

                  {/* Costos desglosados — solo para actividad NUEVA */}
                  {it.tipo === 'nueva' && (
                    <div className="grid grid-cols-3 gap-2 mb-2 p-2 bg-white rounded-lg border border-amber-100">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">
                          {isEs ? 'Costo MO / unidad' : 'Labor cost / unit'}
                        </label>
                        <input type="number" className={inputCls}
                          value={it.costo_mo||''} onChange={e => setItem(idx, 'costo_mo', e.target.value)}
                          placeholder="0.00" min="0" step="0.01" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">
                          {isEs ? 'Costo Materiales / unidad' : 'Materials cost / unit'}
                        </label>
                        <input type="number" className={inputCls}
                          value={it.costo_materiales||''} onChange={e => setItem(idx, 'costo_materiales', e.target.value)}
                          placeholder="0.00" min="0" step="0.01" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">
                          {isEs ? 'Costo Equipo / unidad' : 'Equipment cost / unit'}
                        </label>
                        <input type="number" className={inputCls}
                          value={it.costo_equipos||''} onChange={e => setItem(idx, 'costo_equipos', e.target.value)}
                          placeholder="0.00" min="0" step="0.01" />
                      </div>
                      {pu > 0 && (
                        <div className="col-span-3 flex items-center gap-2 text-xs pt-1 border-t border-amber-100">
                          <span className="text-gray-500">{isEs ? 'P.U. calculado:' : 'Calculated unit price:'}</span>
                          <span className="font-mono font-bold" style={{ color: BRAND }}>{fmt(pu, moneda)}</span>
                          <span className="text-gray-400">{isEs ? '(MO + Materiales + Equipo)' : '(Labor + Materials + Equipment)'}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cantidades y PU — actividad EXISTENTE */}
                  <div className={`grid gap-2 ${it.tipo === 'nueva' ? 'grid-cols-3' : 'grid-cols-4'}`}>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">{isEs ? 'Unidad' : 'Unit'}</label>
                      <input className={inputCls} value={it.unidad||'und'}
                        onChange={e => setItem(idx, 'unidad', e.target.value)} />
                    </div>
                    {it.tipo === 'existente' && (
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">
                          {isEs ? 'Cant. Original' : 'Original Qty'}
                        </label>
                        <input type="number" className={inputCls}
                          value={it.cantidad_original||''}
                          onChange={e => setItem(idx, 'cantidad_original', e.target.value)}
                          placeholder="0.00" min="0" step="0.01" />
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">
                        {it.tipo === 'nueva'
                          ? (isEs ? 'Cantidad *' : 'Quantity *')
                          : (isEs ? 'Cant. Nueva *' : 'New Qty *')}
                      </label>
                      <input type="number" className={inputCls}
                        value={it.cantidad_nueva||''} onChange={e => setItem(idx, 'cantidad_nueva', e.target.value)}
                        placeholder="0.00" min="0" step="0.01" />
                    </div>
                    {it.tipo === 'existente' && (
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">
                          {isEs ? 'P.U.' : 'Unit Price'}
                        </label>
                        <input type="number" className={inputCls}
                          value={it.precio_unitario||''} onChange={e => setItem(idx, 'precio_unitario', e.target.value)}
                          placeholder="0.00" min="0" step="0.01" />
                      </div>
                    )}
                  </div>

                  {/* Resultado del item */}
                  {(it.cantidad_nueva !== '' && pu > 0) && (
                    <div className="mt-2 flex items-center gap-3 text-xs flex-wrap">
                      {it.tipo === 'existente' && (
                        <span className="text-gray-500">
                          {isEs ? 'Diferencia:' : 'Difference:'} <strong>{diff >= 0 ? '+' : ''}{fmtNum(diff)} {it.unidad}</strong>
                        </span>
                      )}
                      <span className={`font-bold ${monto >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {monto >= 0 ? '+' : ''}{fmt(monto, moneda)}
                      </span>
                      {it.tipo === 'nueva' && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                          {isEs ? 'Se agregará al presupuesto al aprobar' : 'Will be added to budget upon approval'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Total OC */}
        <div className="border-t border-gray-100 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">{isEs ? 'Total Orden de Cambio' : 'Total Change Order'}</span>
            <span className={`text-xl font-bold font-mono ${totalOC >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {totalOC >= 0 ? '+' : ''}{fmt(totalOC, moneda)}
            </span>
          </div>
        </div>

        <Field label={isEs ? 'Notas adicionales' : 'Additional notes'}>
          <textarea className={inputCls} rows={2} value={form.notas||''} onChange={set('notas')} />
        </Field>

        <div className="flex gap-2 mt-auto pt-2">
          <SecondaryBtn onClick={() => setDrawer(null)} className="flex-1">{t('btn_cancel')}</SecondaryBtn>
          <PrimaryBtn onClick={saveOC}
            disabled={!proyId || !form.numero || items.every(it => !it.descripcion || it.cantidad_nueva === '')}
            className="flex-1">
            {isEs ? 'Guardar OC' : 'Save CO'}
          </PrimaryBtn>
        </div>
      </Drawer>

      {/* ── DRAWER: DETALLE OC ── */}
      <Drawer open={drawer === 'detalle'} onClose={() => setDrawer(null)}
        title={ocDetalle ? `${ocDetalle.numero}` : ''} width={700}>
        {ocDetalle && (
          <div className="flex flex-col gap-4">

            {/* Estado y acciones */}
            <div className="flex items-center justify-between">
              <EstadoBadge estado={ocDetalle.estado} isEs={isEs} />
              <div className="flex gap-2">
                {puedeEditar && ocDetalle.estado === 'borrador' && (
                  <button onClick={() => { cambiarEstado(ocDetalle.id, 'presentada'); setDrawer(null) }}
                    className="text-xs px-3 py-1.5 rounded-lg text-white font-medium"
                    style={{ background: '#185FA5' }}>
                    {isEs ? 'Presentar al cliente' : 'Submit to client'}
                  </button>
                )}
                {(puedeEditar || puedeAprobar) && ocDetalle.estado === 'presentada' && <>
                  <button onClick={() => { cambiarEstado(ocDetalle.id, 'aprobada'); setDrawer(null) }}
                    className="text-xs px-3 py-1.5 rounded-lg text-white font-medium bg-green-600">
                    {isEs ? 'Marcar aprobada' : 'Mark approved'}
                  </button>
                  <button onClick={() => { cambiarEstado(ocDetalle.id, 'rechazada'); setDrawer(null) }}
                    className="text-xs px-3 py-1.5 rounded-lg text-white font-medium bg-red-500">
                    {isEs ? 'Rechazar' : 'Reject'}
                  </button>
                </>}
              </div>
            </div>

            {/* Info general */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                [isEs?'Número':'Number',              ocDetalle.numero],
                [isEs?'Fecha':'Date',                  ocDetalle.fecha || '—'],
                [isEs?'Presentado a':'Submitted to',   ocDetalle.presentado_a || '—'],
                [isEs?'Proyecto':'Project',             proy?.project_code || '—'],
                [isEs?'Total OC':'CO Total',            <span className={`font-bold font-mono ${parseFloat(ocDetalle.total_oc||0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>{parseFloat(ocDetalle.total_oc||0) >= 0 ? '+' : ''}{fmt(ocDetalle.total_oc, moneda)}</span>],
              ].map(([k,v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">{k}</p>
                  <p className="font-medium text-gray-700">{v}</p>
                </div>
              ))}
            </div>

            {ocDetalle.motivo && (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium mb-1">{isEs ? 'Motivo' : 'Reason'}</p>
                <p className="text-sm text-gray-700">{ocDetalle.motivo}</p>
              </div>
            )}

            {/* ── PANEL DE IMPACTO — solo si aprobada ── */}
            {ocDetalle.estado === 'aprobada' && (
              <div className="rounded-xl border border-green-200 bg-green-50/40 overflow-hidden">
                <div className="px-4 py-2.5 bg-green-600 flex items-center gap-2">
                  <span className="text-white text-xs font-semibold uppercase tracking-wide">
                    {isEs ? 'Impacto aplicado al proyecto' : 'Impact applied to project'}
                  </span>
                </div>

                {/* Actividades nuevas agregadas */}
                {itemsNuevos.length > 0 && (
                  <div className="p-3 border-b border-green-100">
                    <p className="text-xs font-semibold text-green-700 mb-2">
                      {isEs ? 'Actividades nuevas agregadas al presupuesto' : 'New activities added to budget'}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {itemsNuevos.map(it => (
                        <div key={it.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-100">
                          <div>
                            <span className="text-sm font-medium text-gray-700">{it.descripcion}</span>
                            <span className="ml-2 text-xs text-gray-400">{fmtNum(it.cantidad_nueva)} {it.unidad}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-mono font-bold text-green-600">+{fmt(it.monto_cambio, moneda)}</p>
                            {(it.costo_mo > 0 || it.costo_materiales > 0 || it.costo_equipos > 0) && (
                              <p className="text-xs text-gray-400">
                                MO {fmt(it.costo_mo,moneda)} · Mat {fmt(it.costo_materiales,moneda)} · Eq {fmt(it.costo_equipos,moneda)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actividades modificadas */}
                {itemsExistentes.length > 0 && (
                  <div className="p-3 border-b border-green-100">
                    <p className="text-xs font-semibold text-blue-700 mb-2">
                      {isEs ? 'Actividades modificadas en el presupuesto' : 'Activities modified in budget'}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {itemsExistentes.map(it => {
                        const diff = parseFloat(it.diferencia || 0)
                        return (
                          <div key={it.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-blue-100">
                            <div>
                              <span className="text-sm font-medium text-gray-700">{it.descripcion}</span>
                              <span className="ml-2 text-xs text-gray-400">
                                {fmtNum(it.cantidad_original)} → {fmtNum(it.cantidad_nueva)} {it.unidad}
                                {' '}({diff >= 0 ? '+' : ''}{fmtNum(diff)})
                              </span>
                            </div>
                            <span className={`text-xs font-mono font-bold ${it.monto_cambio >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {it.monto_cambio >= 0 ? '+' : ''}{fmt(it.monto_cambio, moneda)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Ajuste de indirectos registrados */}
                {indsDetalle.length > 0 && (
                  <div className="p-3">
                    <p className="text-xs font-semibold text-amber-700 mb-2">
                      {isEs ? 'Costos indirectos ajustados' : 'Adjusted indirect costs'}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {indsDetalle.map(ind => (
                        <div key={ind.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100">
                          <div>
                            <span className="text-sm text-gray-700">{ind.categoria}</span>
                            <span className="ml-2 text-xs text-gray-400 font-mono">
                              {fmt(ind.monto_actual, moneda)} → {fmt(parseFloat(ind.monto_actual||0) + parseFloat(ind.ajuste||0), moneda)}
                            </span>
                          </div>
                          <span className={`text-xs font-mono font-bold ${parseFloat(ind.ajuste||0) >= 0 ? 'text-amber-600' : 'text-red-500'}`}>
                            {parseFloat(ind.ajuste||0) >= 0 ? '+' : ''}{fmt(ind.ajuste, moneda)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tabla de items — siempre visible */}
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {isEs ? 'Detalle de cambios' : 'Change detail'}
                </p>
              </div>
              <table className="w-full">
                <thead><tr className="border-b border-gray-100">
                  {[
                    isEs?'Tipo':'Type',
                    isEs?'Actividad':'Activity',
                    isEs?'Unidad':'Unit',
                    isEs?'Cant. Orig.':'Orig. Qty',
                    isEs?'Cant. Nueva':'New Qty',
                    isEs?'P.U.':'Unit Price',
                    isEs?'Monto':'Amount',
                  ].map((h,i) => <th key={i} className={thCls}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {itemsDetalle.map(it => {
                    const diff  = it.diferencia || (parseFloat(it.cantidad_nueva||0) - parseFloat(it.cantidad_original||0))
                    const monto = it.monto_cambio || diff * parseFloat(it.precio_unitario||0)
                    return (
                      <tr key={it.id} className="border-b border-gray-50">
                        <td className={tdCls}>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${it.tipo === 'nueva' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                            {it.tipo === 'nueva' ? (isEs?'Nueva':'New') : (isEs?'Modificada':'Modified')}
                          </span>
                        </td>
                        <td className={tdCls}>
                          <span className="text-sm text-gray-700">{it.descripcion}</span>
                          {it.tipo === 'nueva' && (it.costo_mo > 0 || it.costo_materiales > 0 || it.costo_equipos > 0) && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              MO {fmt(it.costo_mo,moneda)} · Mat {fmt(it.costo_materiales,moneda)} · Eq {fmt(it.costo_equipos,moneda)}
                            </p>
                          )}
                        </td>
                        <td className={tdCls + ' text-xs text-gray-400'}>{it.unidad}</td>
                        <td className={tdCls + ' font-mono text-xs'}>{fmtNum(it.cantidad_original)}</td>
                        <td className={tdCls + ' font-mono text-xs'}>{fmtNum(it.cantidad_nueva)}</td>
                        <td className={tdCls + ' font-mono text-xs'}>{fmt(it.precio_unitario, moneda)}</td>
                        <td className={tdCls + ' font-mono font-bold text-xs'} style={{ color: monto >= 0 ? '#1D9E75' : '#ef4444' }}>
                          {monto >= 0 ? '+' : ''}{fmt(monto, moneda)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-600">
                  {isEs ? 'Total Orden de Cambio' : 'Total Change Order'}
                </span>
                <span className={`text-lg font-bold font-mono ${parseFloat(ocDetalle.total_oc||0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {parseFloat(ocDetalle.total_oc||0) >= 0 ? '+' : ''}{fmt(ocDetalle.total_oc, moneda)}
                </span>
              </div>
            </div>

            {ocDetalle.notas && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">{isEs ? 'Notas' : 'Notes'}</p>
                <p className="text-sm text-gray-600">{ocDetalle.notas}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}
