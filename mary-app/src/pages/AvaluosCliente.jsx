import { useState, useContext, useMemo } from 'react'
import { useStore } from '../store'
import { LangContext } from '../i18n'
import { usePermissions } from '../usePermissions'
import { today, fmt, fmtNum, calcGrandTotal } from '../utils'
import { Drawer, EmptyState, Field, PrimaryBtn, SecondaryBtn, TBtn, Icons, inputCls, selectCls } from '../components'

const BRAND = '#1B3A6B'

const ESTADO_AV = {
  borrador:   { label: 'Borrador',   labelEn: 'Draft',      cls: 'bg-gray-100 text-gray-600'   },
  presentado: { label: 'Presentado', labelEn: 'Submitted',  cls: 'bg-blue-100 text-blue-700'   },
  aprobado:   { label: 'Aprobado',   labelEn: 'Approved',   cls: 'bg-green-100 text-green-700' },
  rechazado:  { label: 'Rechazado',  labelEn: 'Rejected',   cls: 'bg-red-100 text-red-600'     },
}

function EstadoBadge({ estado, isEs }) {
  const cfg = ESTADO_AV[estado] || ESTADO_AV.borrador
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.cls}`}>{isEs ? cfg.label : cfg.labelEn}</span>
}

export default function AvaluosCliente() {
  const { state, dispatch } = useStore()
  const { t, lang } = useContext(LangContext)
  const { can, rol } = usePermissions()
  const isEs = lang === 'ES'

  const {
    proyectos, presupuesto,
    ordenes_cambio = [], ordenes_cambio_items = [],
    avaluos_cliente = [], avaluos_cliente_items = [],
    presupuesto_indirectos = [],
  } = state

  const puedeEditar = can('financiero_editar')
  const puedeAprobar = ['super_admin','client_admin','gerente'].includes(rol)

  const [proyId, setProyId]             = useState(proyectos[0]?.id || '')
  const [vista, setVista]               = useState('lista')
  const [detailId, setDetailId]         = useState(null)
  const [avForm, setAvForm]             = useState({})
  const [avItems, setAvItems]           = useState([])
  const [mostrarTodas, setMostrarTodas] = useState(false)

  const proy   = proyectos.find(p => p.id === proyId)
  const moneda = proy?.moneda || 'USD'
  const setAvF = k => e => setAvForm(f => ({ ...f, [k]: e.target.value }))

  // Componentes del precio de venta del proyecto
  const utilidadPct  = parseFloat(proy?.utilidad_pct  || 0) / 100
  const impuestoPct  = parseFloat(proy?.impuesto_pct  || 0) / 100
  const totalIndirectos = useMemo(() =>
    presupuesto_indirectos
      .filter(i => i.proyecto_id === proyId)
      .reduce((s, i) => s + parseFloat(i.monto_presupuestado || 0), 0),
    [presupuesto_indirectos, proyId]
  )

  const todosItems   = useMemo(() =>
    presupuesto.filter(b => b.proyecto_id === proyId),
    [presupuesto, proyId]
  )
  const actividades  = useMemo(() =>
    todosItems.filter(b => b.tipo === 'actividad'),
    [todosItems]
  )
  const ocAprobadas  = useMemo(() =>
    ordenes_cambio.filter(o => o.proyecto_id === proyId && o.estado === 'aprobada'),
    [ordenes_cambio, proyId]
  )
  const ocItemsAprobados = useMemo(() =>
    ordenes_cambio_items.filter(i => ocAprobadas.some(o => o.id === i.oc_id)),
    [ordenes_cambio_items, ocAprobadas]
  )
  const presupuestoOriginal = useMemo(() => calcGrandTotal(todosItems), [todosItems])
  const totalOCAprobadas    = useMemo(() => ocAprobadas.reduce((s,o) => s + parseFloat(o.total_oc||0), 0), [ocAprobadas])
  const presupuestoEfectivo = presupuestoOriginal + totalOCAprobadas

  const avs = useMemo(() =>
    avaluos_cliente.filter(a => a.proyecto_id === proyId)
      .sort((a,b) => (b.numero||0) - (a.numero||0)),
    [avaluos_cliente, proyId]
  )

  const numAvaluo             = avs.length + 1
  const pendientesAprobacion  = avs.filter(a => a.estado === 'presentado')

  const acumuladoPrevio = (actividadId) => {
    const avAprobados = avaluos_cliente.filter(a => a.proyecto_id === proyId && a.estado === 'aprobado')
    return avAprobados.reduce((s, av) => {
      const item = avaluos_cliente_items.find(i => i.avaluo_id === av.id && i.actividad_id === actividadId)
      return s + parseFloat(item?.cantidad_periodo || 0)
    }, 0)
  }

  const cantidadTotal = (act) => {
    const base    = parseFloat(act.cantidad || 0)
    const ocExtra = ocItemsAprobados.filter(i => i.actividad_id === act.id).reduce((s,i) => s + parseFloat(i.diferencia || 0), 0)
    return base + ocExtra
  }

  const precioUnitario = (act) =>
    parseFloat(act.costo_mo||0) + parseFloat(act.costo_materiales||0) + parseFloat(act.costo_equipos||0)

  const openNuevo = () => {
    setAvForm({
      numero: numAvaluo, periodo_inicio: '', periodo_fin: '',
      fecha_elaboracion: today(), presentado_a: '',
      impuesto_pct: '', impuesto_descripcion: '', notas: '',
    })
    const itemsBase = actividades.map(act => {
      const ant = acumuladoPrevio(act.id); const total = cantidadTotal(act); const pu = precioUnitario(act)
      return { actividad_id: act.id, descripcion: act.descripcion, unidad: act.unidad || 'und',
        cantidad_total: total, precio_unitario: pu, monto_contrato: total * pu,
        cantidad_anterior: ant, cantidad_periodo: '', es_oc: false, oc_item_id: null }
    })
    const itemsNuevos = ocItemsAprobados.filter(i => i.tipo === 'nueva').map(i => ({
      actividad_id: null, descripcion: i.descripcion, unidad: i.unidad || 'und',
      cantidad_total: parseFloat(i.cantidad_nueva || 0), precio_unitario: parseFloat(i.precio_unitario || 0),
      monto_contrato: parseFloat(i.cantidad_nueva || 0) * parseFloat(i.precio_unitario || 0),
      cantidad_anterior: 0, cantidad_periodo: '', es_oc: true, oc_item_id: i.id,
    }))
    setAvItems([...itemsBase, ...itemsNuevos])
    setVista('nuevo')
  }

  const avSubtotal = useMemo(() =>
    avItems.reduce((s,it) => s + parseFloat(it.cantidad_periodo||0) * parseFloat(it.precio_unitario||0), 0),
    [avItems]
  )

  // % de avance del período sobre el presupuesto directo efectivo
  const pctAvancePeriodo = presupuestoEfectivo > 0 ? avSubtotal / presupuestoEfectivo : 0

  // Overhead proporcional al avance del período
  const avIndirecto  = totalIndirectos * pctAvancePeriodo
  const avBase2      = avSubtotal + avIndirecto
  const avUtilidad   = avBase2 * utilidadPct
  const avBase3      = avBase2 + avUtilidad
  const avImpuesto   = avBase3 * impuestoPct
  const avTotal      = avBase3 + avImpuesto

  // Mantener compatibilidad con campos guardados
  const avImpPct     = parseFloat(avForm.impuesto_pct || 0)
  const avImpMonto   = avImpuesto  // se guarda el calculado automáticamente

  const setItemPeriodo = (idx, v) => {
    const cant = parseFloat(v || 0)
    setAvItems(prev => prev.map((it,i) => {
      if (i !== idx) return it
      const acum = parseFloat(it.cantidad_anterior||0) + cant
      const saldo = parseFloat(it.cantidad_total||0) - acum
      const pct  = it.cantidad_total > 0 ? (acum / it.cantidad_total) * 100 : 0
      const mp   = cant * parseFloat(it.precio_unitario||0)
      const ma   = parseFloat(it.cantidad_anterior||0) * parseFloat(it.precio_unitario||0)
      return { ...it, cantidad_periodo: v, cantidad_acumulada: acum, cantidad_saldo: saldo,
        pct_fisico: pct, monto_periodo: mp, monto_anterior: ma,
        monto_acumulado: ma + mp, monto_saldo: saldo * parseFloat(it.precio_unitario||0) }
    }))
  }

  const saveAvaluo = () => {
    const itemsConAvance = avItems.filter(it => parseFloat(it.cantidad_periodo||0) > 0)
    if (!proyId || itemsConAvance.length === 0) return
    dispatch({
      type: 'ADD_AVALUO_CLIENTE',
      payload: {
        avaluo: {
          ...avForm,
          proyecto_id:      proyId,
          subtotal:         avSubtotal,
          indirecto_monto:  avIndirecto,
          utilidad_monto:   avUtilidad,
          impuesto_monto:   avImpuesto,
          total:            avTotal,
          pct_avance:       pctAvancePeriodo,
        },
        items: avItems.map(it => ({
          ...it,
          cantidad_periodo:   parseFloat(it.cantidad_periodo   || 0),
          cantidad_acumulada: parseFloat(it.cantidad_acumulada || 0),
          cantidad_saldo:     parseFloat(it.cantidad_saldo     || 0),
          pct_fisico:         parseFloat(it.pct_fisico         || 0),
          monto_periodo:      parseFloat(it.monto_periodo      || 0),
          monto_anterior:     parseFloat(it.monto_anterior     || 0),
          monto_acumulado:    parseFloat(it.monto_acumulado    || 0),
          monto_saldo:        parseFloat(it.monto_saldo        || 0),
        })),
      }
    })
    setVista('lista')
  }

  const cambiarEstado = (id, estado, numero) =>
    dispatch({ type: 'UPD_AVALUO_CLIENTE_ESTADO', payload: { id, estado, numero } })

  const totalCobrado   = avs.filter(a=>a.estado==='aprobado').reduce((s,a)=>s+(parseFloat(a.total)||0),0)

  // Presupuesto total real = directo + indirectos + utilidad + impuesto
  const presupuestoTotalReal = useMemo(() => {
    const subtotal  = presupuestoEfectivo + totalIndirectos
    const utilidad  = subtotal * utilidadPct
    const impuesto  = (subtotal + utilidad) * impuestoPct
    return subtotal + utilidad + impuesto
  }, [presupuestoEfectivo, totalIndirectos, utilidadPct, impuestoPct])

  const saldoPorCobrar = presupuestoTotalReal - totalCobrado
  const pctEjecucion   = presupuestoTotalReal > 0 ? (totalCobrado/presupuestoTotalReal)*100 : 0

  const thCls = 'px-3 py-2.5 text-left text-xs text-gray-500 font-medium whitespace-nowrap'
  const tdCls = 'px-3 py-2.5 text-sm text-gray-700'

  const avDetalle    = avaluos_cliente.find(a => a.id === detailId)
  const itemsDetalle = avaluos_cliente_items.filter(i => i.avaluo_id === detailId)

  // ── VISTA NUEVO ──────────────────────────────────────────────────────────
  if (vista === 'nuevo') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setVista('lista')} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
          <div>
            <h1 className="text-xl font-semibold text-gray-800">
              {isEs ? `Avaluo #${numAvaluo}` : `Valuation #${numAvaluo}`} — {proy?.project_code}
            </h1>
            <p className="text-sm text-gray-400">{proy?.nombre}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            <Field label={isEs ? 'Periodo inicio' : 'Period start'}>
              <input type="date" className={inputCls} value={avForm.periodo_inicio||''} onChange={setAvF('periodo_inicio')} />
            </Field>
            <Field label={isEs ? 'Periodo fin' : 'Period end'}>
              <input type="date" className={inputCls} value={avForm.periodo_fin||''} onChange={setAvF('periodo_fin')} />
            </Field>
            <Field label={isEs ? 'Fecha elaboracion' : 'Prepared date'}>
              <input type="date" className={inputCls} value={avForm.fecha_elaboracion||''} onChange={setAvF('fecha_elaboracion')} />
            </Field>
          </div>
          <Field label={isEs ? 'Presentado a' : 'Submitted to'}>
            <input className={inputCls} value={avForm.presentado_a||''} onChange={setAvF('presentado_a')}
              placeholder={isEs ? 'Nombre del supervisor o cliente' : 'Supervisor or client name'} />
          </Field>
          {totalOCAprobadas !== 0 && (
            <div className="grid grid-cols-3 gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs">
              <div><p className="text-blue-500">{isEs?'Presupuesto original':'Original budget'}</p><p className="font-bold font-mono text-blue-700">{fmt(presupuestoOriginal, moneda)}</p></div>
              <div><p className="text-blue-500">{isEs?'OC aprobadas':'Approved COs'}</p><p className="font-bold font-mono text-blue-700">{totalOCAprobadas>=0?'+':''}{fmt(totalOCAprobadas, moneda)}</p></div>
              <div><p className="text-blue-500">{isEs?'Presupuesto efectivo':'Effective budget'}</p><p className="font-bold font-mono text-blue-800">{fmt(presupuestoEfectivo, moneda)}</p></div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {isEs ? 'Avance fisico por actividad' : 'Physical progress by activity'}
            </p>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-gray-500">{isEs ? 'Mostrar todas las actividades' : 'Show all activities'}</span>
              <div onClick={() => setMostrarTodas(v => !v)}
                className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${mostrarTodas ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <div className={`w-4 h-4 bg-white rounded-full m-0.5 transition-transform ${mostrarTodas ? 'translate-x-5' : ''}`} />
              </div>
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {[isEs?'Descripcion':'Description',isEs?'Unidad':'Unit',isEs?'Cant. Total':'Total Qty',
                    isEs?'P.U.':'Unit Price',isEs?'Monto Contrato':'Contract Amount',isEs?'Ant.':'Prev.',
                    isEs?'Este Periodo *':'This Period *',isEs?'Acumulado':'Accumulated',isEs?'Saldo':'Balance',
                    isEs?'% Fis.':'% Phys.',isEs?'Monto Periodo':'Period Amount',
                  ].map((h,i) => <th key={i} className="px-2 py-2 text-left text-gray-500 font-medium whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {avItems.map((it, idx) => {
                  const cant    = parseFloat(it.cantidad_periodo||0)
                  const acum    = parseFloat(it.cantidad_anterior||0) + cant
                  const saldo   = parseFloat(it.cantidad_total||0) - acum
                  const pct     = it.cantidad_total > 0 ? Math.min(100, (acum/it.cantidad_total)*100) : 0
                  const mp      = cant * parseFloat(it.precio_unitario||0)
                  const sobrepa = acum > parseFloat(it.cantidad_total||0)
                  if (!mostrarTodas && !it.cantidad_total) return null
                  return (
                    <tr key={idx} className={`border-b border-gray-50 ${sobrepa ? 'bg-red-50/30' : ''}`}>
                      <td className="px-2 py-2 text-gray-700">{it.descripcion}{it.es_oc && <span className="ml-1 text-xs px-1 py-0.5 rounded bg-amber-100 text-amber-700">OC</span>}</td>
                      <td className="px-2 py-2 text-gray-400">{it.unidad}</td>
                      <td className="px-2 py-2 font-mono">{fmtNum(it.cantidad_total)}</td>
                      <td className="px-2 py-2 font-mono text-gray-500">{fmt(it.precio_unitario, moneda)}</td>
                      <td className="px-2 py-2 font-mono font-medium" style={{color:BRAND}}>{fmt(it.monto_contrato, moneda)}</td>
                      <td className="px-2 py-2 font-mono text-gray-400">{it.cantidad_anterior > 0 ? fmtNum(it.cantidad_anterior) : '—'}</td>
                      <td className="px-2 py-2">
                        <input type="number"
                          className={`w-24 border rounded-lg px-2 py-1 text-xs focus:outline-none ${sobrepa ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white focus:border-[#1B3A6B]'}`}
                          value={it.cantidad_periodo} placeholder="0" min="0" step="0.01"
                          onChange={e => setItemPeriodo(idx, e.target.value)} />
                        {sobrepa && <p className="text-xs text-red-500 mt-0.5">! {isEs?'Excede':'Exceeds'}</p>}
                      </td>
                      <td className="px-2 py-2 font-mono" style={{color: sobrepa?'#ef4444':'#1D9E75'}}>{fmtNum(acum)}</td>
                      <td className="px-2 py-2 font-mono text-gray-500">{fmtNum(saldo)}</td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{width:`${Math.min(100,pct)}%`,background:sobrepa?'#ef4444':pct>=100?'#1D9E75':BRAND}} />
                          </div>
                          <span className="font-mono" style={{color:sobrepa?'#ef4444':BRAND}}>{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 font-mono font-medium" style={{color:'#1D9E75'}}>{mp > 0 ? fmt(mp, moneda) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {avSubtotal > 0 && (
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-blue-600 font-medium">{isEs?'Avance financiero global':'Global financial progress'}</span>
                <span className="text-xs font-mono text-blue-700">{fmt(totalCobrado + avSubtotal, moneda)} / {fmt(presupuestoEfectivo, moneda)}</span>
              </div>
              <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-blue-600" style={{width:`${Math.min(100,((totalCobrado+avSubtotal)/presupuestoEfectivo)*100)}%`}} />
              </div>
            </div>
          )}
          <div className="border-t border-gray-100 pt-3">
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500">{isEs ? 'Subtotal directo período' : 'Direct period subtotal'}</span>
              <span className="font-mono text-gray-700">{fmt(avSubtotal, moneda)}</span>
            </div>
            {avIndirecto > 0 && (
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-500">
                  {isEs ? `Costo indirecto proporcional (${(pctAvancePeriodo*100).toFixed(1)}%)` : `Proportional indirect cost (${(pctAvancePeriodo*100).toFixed(1)}%)`}
                </span>
                <span className="font-mono text-gray-600">{fmt(avIndirecto, moneda)}</span>
              </div>
            )}
            {avUtilidad > 0 && (
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-500">
                  {isEs ? `Utilidad (${(utilidadPct*100).toFixed(1)}%)` : `Profit (${(utilidadPct*100).toFixed(1)}%)`}
                </span>
                <span className="font-mono text-gray-600">{fmt(avUtilidad, moneda)}</span>
              </div>
            )}
            {avImpuesto > 0 && (
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-500">
                  {isEs ? `Impuesto (${(impuestoPct*100).toFixed(1)}%)` : `Tax (${(impuestoPct*100).toFixed(1)}%)`}
                </span>
                <span className="font-mono text-gray-600">{fmt(avImpuesto, moneda)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-100">
              <span>{isEs ? 'Total a cobrar' : 'Total to bill'}</span>
              <span style={{color:BRAND}}>{fmt(avTotal, moneda)}</span>
            </div>
          </div>
          <Field label={isEs?'Notas':'Notes'}>
            <textarea className={inputCls} rows={2} value={avForm.notas||''} onChange={setAvF('notas')} />
          </Field>
          <div className="flex gap-2 pt-2">
            <SecondaryBtn onClick={() => setVista('lista')} className="flex-1">{t('btn_cancel')}</SecondaryBtn>
            <PrimaryBtn onClick={saveAvaluo} disabled={avSubtotal === 0} className="flex-1">
              {isEs ? 'Guardar avaluo (borrador)' : 'Save valuation (draft)'}
            </PrimaryBtn>
          </div>
        </div>
      </div>
    )
  }

  // ── VISTA DETALLE ─────────────────────────────────────────────────────────
  if (vista === 'detalle' && avDetalle) {
    const avTotal2    = parseFloat(avDetalle.total || 0)
    const avSubtotal2 = parseFloat(avDetalle.subtotal || 0)
    const avImp2      = parseFloat(avDetalle.impuesto_monto || 0)
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setVista('lista')} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">
                {isEs ? `Avaluo #${avDetalle.numero}` : `Valuation #${avDetalle.numero}`}
              </h1>
              <p className="text-sm text-gray-400">{proy?.project_code} — {proy?.nombre}</p>
            </div>
          </div>
          <EstadoBadge estado={avDetalle.estado} isEs={isEs} />
        </div>

        {/* ── PANEL DE APROBACION ── */}
        {avDetalle.estado !== 'aprobado' && (
          <div className={`rounded-xl border px-5 py-4 mb-5 flex items-center justify-between gap-4 flex-wrap
            ${avDetalle.estado === 'presentado' ? 'bg-blue-50 border-blue-200' :
              avDetalle.estado === 'rechazado'  ? 'bg-red-50 border-red-200'  :
              'bg-amber-50 border-amber-200'}`}>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {avDetalle.estado === 'borrador'   ? (isEs ? 'Este avaluo esta en borrador' : 'This valuation is a draft') :
                 avDetalle.estado === 'rechazado'  ? (isEs ? 'Avaluo rechazado' : 'Valuation rejected') :
                 (isEs ? 'Pendiente de aprobacion' : 'Pending approval')}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {avDetalle.estado === 'borrador'
                  ? (isEs ? 'Presentalo al cliente cuando estes listo. Solo los aprobados cuentan como cobrado.' : 'Submit to client when ready. Only approved ones count as billed.')
                  : avDetalle.estado === 'rechazado'
                  ? (isEs ? 'Este avaluo fue rechazado. Corrige y vuelve a presentar.' : 'This valuation was rejected. Correct and resubmit.')
                  : (isEs ? 'Marcalo como aprobado cuando el cliente haya firmado o aceptado.' : 'Mark as approved when the client has signed or accepted.')}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0 flex-wrap">
              {puedeEditar && avDetalle.estado === 'borrador' && (
                <button onClick={() => cambiarEstado(avDetalle.id, 'presentado', avDetalle.numero)}
                  className="text-sm px-4 py-2 rounded-lg text-white font-medium" style={{ background: '#185FA5' }}>
                  {isEs ? 'Presentar al cliente' : 'Submit to client'}
                </button>
              )}
              {puedeAprobar && avDetalle.estado === 'rechazado' && (
                <button onClick={() => cambiarEstado(avDetalle.id, 'borrador', avDetalle.numero)}
                  className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50">
                  {isEs ? 'Reabrir borrador' : 'Reopen draft'}
                </button>
              )}
              {puedeAprobar && avDetalle.estado === 'presentado' && (
                <>
                  <button onClick={() => cambiarEstado(avDetalle.id, 'borrador', avDetalle.numero)}
                    className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50">
                    {isEs ? 'Regresar a borrador' : 'Back to draft'}
                  </button>
                  <button onClick={() => {
                    if (window.confirm(isEs
                      ? `Rechazar avaluo #${avDetalle.numero}?`
                      : `Reject valuation #${avDetalle.numero}?`))
                      cambiarEstado(avDetalle.id, 'rechazado', avDetalle.numero)
                  }}
                    className="text-sm px-4 py-2 rounded-lg border border-red-300 text-red-600 font-medium hover:bg-red-50">
                    {isEs ? 'Rechazar' : 'Reject'}
                  </button>
                  <button onClick={() => {
                    if (window.confirm(isEs
                      ? `Aprobar avaluo #${avDetalle.numero} por ${fmt(avTotal2, moneda)}? Esta accion sumara este monto al total cobrado.`
                      : `Approve valuation #${avDetalle.numero} for ${fmt(avTotal2, moneda)}? This will add this amount to the total billed.`))
                      cambiarEstado(avDetalle.id, 'aprobado', avDetalle.numero)
                  }}
                    className="text-sm px-4 py-2 rounded-lg text-white font-medium bg-green-600 hover:bg-green-700">
                    {isEs ? 'Aprobar y cobrar' : 'Approve and bill'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        {avDetalle.estado === 'aprobado' && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 mb-5 flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">ok</div>
            <div>
              <p className="text-sm font-semibold text-green-800">{isEs ? 'Avaluo aprobado' : 'Valuation approved'}</p>
              <p className="text-xs text-green-600">{isEs ? `${fmt(avTotal2, moneda)} registrado como cobrado.` : `${fmt(avTotal2, moneda)} recorded as billed.`}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-5">
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {[
                [isEs?'Periodo':'Period', avDetalle.periodo_inicio && avDetalle.periodo_fin ? `${avDetalle.periodo_inicio} → ${avDetalle.periodo_fin}` : '—'],
                [isEs?'Elaborado':'Prepared', avDetalle.fecha_elaboracion || '—'],
                [isEs?'Presentado a':'Submitted to', avDetalle.presentado_a || '—'],
                [isEs?'Estado':'Status', <EstadoBadge key="s" estado={avDetalle.estado} isEs={isEs} />],
              ].map(([k,v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">{k}</p>
                  <div className="font-medium text-gray-700">{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{isEs?'Detalle de avance':'Progress detail'}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-gray-100">
                  {[isEs?'Descripcion':'Description',isEs?'Unidad':'Unit',isEs?'Total':'Total',isEs?'P.U.':'U.P.',
                    isEs?'Monto Contrato':'Contract Amt',
                    isEs?'Ant. Qty':'Prev. Qty',isEs?'Este Periodo':'This Period',isEs?'Acum. Qty':'Accum. Qty',
                    isEs?'Saldo Qty':'Balance Qty',isEs?'% Fis.':'% Phys.',
                    isEs?'Monto Ant.':'Prev. Amt',isEs?'Monto Periodo':'Period Amt',
                    isEs?'Monto Acum.':'Accum. Amt',isEs?'Saldo $':'Balance $',
                  ].map((h,i) => <th key={i} className="px-3 py-2 text-left text-gray-500 font-medium whitespace-nowrap">{h}</th>)}
                </tr></thead>
                <tbody>
                  {itemsDetalle.filter(it => parseFloat(it.cantidad_periodo||0) > 0).map(it => (
                    <tr key={it.id} className="border-b border-gray-50">
                      <td className="px-3 py-2 text-gray-700">{it.descripcion}{it.es_oc && <span className="ml-1 text-xs px-1 py-0.5 rounded bg-amber-100 text-amber-700">OC</span>}</td>
                      <td className="px-3 py-2 text-gray-400">{it.unidad}</td>
                      <td className="px-3 py-2 font-mono">{fmtNum(it.cantidad_total)}</td>
                      <td className="px-3 py-2 font-mono text-gray-500">{fmt(it.precio_unitario, moneda)}</td>
                      <td className="px-3 py-2 font-mono font-medium" style={{color:BRAND}}>{fmt(it.monto_contrato, moneda)}</td>
                      <td className="px-3 py-2 font-mono text-gray-400">{it.cantidad_anterior > 0 ? fmtNum(it.cantidad_anterior) : '—'}</td>
                      <td className="px-3 py-2 font-mono font-bold" style={{color:BRAND}}>{fmtNum(it.cantidad_periodo)}</td>
                      <td className="px-3 py-2 font-mono text-green-600">{fmtNum(it.cantidad_acumulada)}</td>
                      <td className="px-3 py-2 font-mono text-gray-500">{fmtNum(it.cantidad_saldo)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{width:`${Math.min(100,parseFloat(it.pct_fisico||0))}%`,background:BRAND}} />
                          </div>
                          <span className="font-mono" style={{color:BRAND}}>{parseFloat(it.pct_fisico||0).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-400">{parseFloat(it.monto_anterior||0) > 0 ? fmt(it.monto_anterior, moneda) : '—'}</td>
                      <td className="px-3 py-2 font-mono font-bold text-green-600">{fmt(it.monto_periodo, moneda)}</td>
                      <td className="px-3 py-2 font-mono font-medium" style={{color:'#1D9E75'}}>{fmt(it.monto_acumulado, moneda)}</td>
                      <td className="px-3 py-2 font-mono text-gray-500">{fmt(it.monto_saldo, moneda)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-4 border-t border-gray-100 flex flex-col gap-1.5">
              {[
                [isEs?'Subtotal directo período':'Direct period subtotal', fmt(avSubtotal2, moneda)],
                ...(parseFloat(avDetalle.indirecto_monto||0) > 0
                  ? [[isEs?'Costo indirecto proporcional':'Proportional indirect cost', fmt(avDetalle.indirecto_monto, moneda)]]
                  : []),
                ...(parseFloat(avDetalle.utilidad_monto||0) > 0
                  ? [[isEs?'Utilidad':'Profit', fmt(avDetalle.utilidad_monto, moneda)]]
                  : []),
                ...(parseFloat(avDetalle.impuesto_monto||0) > 0
                  ? [[avDetalle.impuesto_descripcion || (isEs?'Impuesto':'Tax'), fmt(avDetalle.impuesto_monto, moneda)]]
                  : []),
              ].map(([k,v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-mono text-gray-700">{v}</span>
                </div>
              ))}
              <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                <span>{isEs?'Total cobrado':'Total billed'}</span>
                <span style={{color:'#1D9E75'}}>{fmt(avTotal2, moneda)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── LISTA ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{isEs ? 'Avaluos al Cliente' : 'Client Valuations'}</h1>
          {proy && <p className="text-sm text-gray-400 mt-0.5">{proy.project_code} — {proy.nombre}</p>}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#1B3A6B]"
            value={proyId} onChange={e => setProyId(e.target.value)}>
            <option value="">{t('lbl_select')}</option>
            {proyectos.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>)}
          </select>
          {proyId && puedeEditar && (
            <PrimaryBtn onClick={openNuevo}>+ {isEs ? 'Nuevo Avaluo' : 'New Valuation'}</PrimaryBtn>
          )}
        </div>
      </div>

      {!proyId ? (
        <EmptyState icon={Icons.budget} title={isEs ? 'Selecciona un proyecto' : 'Select a project'} />
      ) : (
        <>
          {/* ── BANNER PENDIENTES DE APROBACION ── */}
          {pendientesAprobacion.length > 0 && puedeEditar && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 mb-5 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {pendientesAprobacion.length}
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    {isEs
                      ? `${pendientesAprobacion.length} avaluo(s) pendiente(s) de aprobacion`
                      : `${pendientesAprobacion.length} valuation(s) pending approval`}
                  </p>
                  <p className="text-xs text-blue-600">
                    {isEs
                      ? 'Estos avaluos fueron presentados al cliente y esperan tu confirmacion.'
                      : 'These valuations were submitted to the client and await your confirmation.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setDetailId(pendientesAprobacion[0].id); setVista('detalle') }}
                className="text-sm px-4 py-2 rounded-lg text-white font-medium bg-blue-600 hover:bg-blue-700 whitespace-nowrap">
                {isEs ? 'Revisar ahora' : 'Review now'}
              </button>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            {[
              { label: isEs?'Presupuesto total (contrato)':'Total budget (contract)', value: fmt(presupuestoTotalReal, moneda), color: BRAND },
              { label: isEs?'Total cobrado (aprobado)':'Billed (approved)',           value: fmt(totalCobrado, moneda),         color: '#1D9E75' },
              { label: isEs?'Saldo por cobrar':'Balance to bill',                     value: fmt(saldoPorCobrar, moneda),       color: '#D97706' },
              { label: isEs?'% Ejecucion financiera':'% Financial exec.',             value: `${pctEjecucion.toFixed(1)}%`,    color: BRAND },
            ].map(k => (
              <div key={k.label} className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">{k.label}</p>
                <p className="text-xl font-bold font-mono" style={{ color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* ── RESUMEN FINANCIERO ── */}
          {avs.length > 0 && presupuestoTotalReal > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-5 mb-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {isEs ? 'Resumen financiero del proyecto' : 'Project financial summary'}
              </p>
              <div className="flex flex-col gap-3">
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{isEs ? 'Total cobrado (aprobado)' : 'Total billed (approved)'}</span>
                    <span className="font-mono font-medium" style={{color:'#1D9E75'}}>{fmt(totalCobrado, moneda)} / {fmt(presupuestoTotalReal, moneda)}</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-green-500" style={{width:`${Math.min(100, pctEjecucion)}%`, transition:'width 0.4s'}} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{pctEjecucion.toFixed(1)}% {isEs ? 'ejecutado financieramente' : 'financially executed'}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-gray-50">
                  {[
                    { label: isEs?'Pres. directo':'Direct budget',     value: fmt(presupuestoEfectivo, moneda),   color: BRAND },
                    { label: isEs?'Indirectos':'Indirect costs',        value: fmt(totalIndirectos, moneda),       color: '#6b7280' },
                    { label: isEs?'OC aprobadas':'Approved COs',        value: `${totalOCAprobadas >= 0 ? '+' : ''}${fmt(totalOCAprobadas, moneda)}`, color: totalOCAprobadas > 0 ? '#D97706' : '#6b7280' },
                    { label: isEs?'Saldo por cobrar':'Balance to bill', value: fmt(saldoPorCobrar, moneda),       color: saldoPorCobrar > 0 ? '#D97706' : '#1D9E75' },
                  ].map(k => (
                    <div key={k.label} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-0.5">{k.label}</p>
                      <p className="text-sm font-bold font-mono" style={{color: k.color}}>{k.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {avs.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl py-16">
              <EmptyState icon={Icons.budget}
                title={isEs ? 'No hay avaluos registrados' : 'No valuations registered'}
                subtitle={isEs ? 'Crea el primer avaluo para cobrar al cliente' : 'Create the first valuation to bill the client'}
                action={puedeEditar ? (isEs ? '+ Nuevo Avaluo' : '+ New Valuation') : null}
                onAction={puedeEditar ? openNuevo : null} />
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-xl overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['#', isEs?'Periodo':'Period', isEs?'Fecha':'Date', isEs?'Presentado a':'Submitted to',
                      isEs?'Subtotal':'Subtotal', isEs?'Impuesto':'Tax', isEs?'Total':'Total',
                      isEs?'Estado':'Status', ''].map((h,i) => <th key={i} className={thCls}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {avs.map(av => (
                    <tr key={av.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${av.estado === 'presentado' ? 'bg-blue-50/30' : ''}`}>
                      <td className={tdCls + ' font-bold font-mono'} style={{color:BRAND}}>#{av.numero}</td>
                      <td className={tdCls + ' text-xs text-gray-400'}>
                        {av.periodo_inicio && av.periodo_fin ? `${av.periodo_inicio} → ${av.periodo_fin}` : '—'}
                      </td>
                      <td className={tdCls + ' text-xs text-gray-400'}>{av.fecha_elaboracion || '—'}</td>
                      <td className={tdCls + ' text-xs'}>{av.presentado_a || '—'}</td>
                      <td className={tdCls + ' font-mono'}>{fmt(av.subtotal, moneda)}</td>
                      <td className={tdCls + ' font-mono text-gray-500'}>
                        {parseFloat(av.impuesto_monto||0) > 0 ? fmt(av.impuesto_monto, moneda) : '—'}
                      </td>
                      <td className={tdCls + ' font-mono font-bold'} style={{color:'#1D9E75'}}>{fmt(av.total, moneda)}</td>
                      <td className={tdCls}><EstadoBadge estado={av.estado} isEs={isEs} /></td>
                      <td className={tdCls}>
                        <div className="flex gap-1 flex-wrap">
                          <TBtn onClick={() => { setDetailId(av.id); setVista('detalle') }}>{t('btn_view')}</TBtn>
                          {puedeEditar && av.estado === 'borrador' && (
                            <button onClick={() => cambiarEstado(av.id, 'presentado', av.numero)}
                              className="text-xs px-2 py-1 rounded-lg text-white font-medium whitespace-nowrap"
                              style={{ background: '#185FA5' }}>
                              {isEs ? 'Presentar' : 'Submit'}
                            </button>
                          )}
                          {puedeAprobar && av.estado === 'presentado' && (
                            <>
                              <button
                                onClick={() => {
                                  if (window.confirm(isEs
                                    ? `Rechazar avaluo #${av.numero}?`
                                    : `Reject valuation #${av.numero}?`))
                                    cambiarEstado(av.id, 'rechazado', av.numero)
                                }}
                                className="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-500 whitespace-nowrap hover:bg-red-50">
                                {isEs ? 'Rechazar' : 'Reject'}
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(isEs
                                    ? `Aprobar avaluo #${av.numero} por ${fmt(av.total, moneda)}?`
                                    : `Approve valuation #${av.numero} for ${fmt(av.total, moneda)}?`))
                                    cambiarEstado(av.id, 'aprobado', av.numero)
                                }}
                                className="text-xs px-2 py-1 rounded-lg text-white font-medium whitespace-nowrap bg-green-600 hover:bg-green-700">
                                {isEs ? 'Aprobar' : 'Approve'}
                              </button>
                            </>
                          )}
                          {puedeAprobar && av.estado === 'rechazado' && (
                            <button
                              onClick={() => cambiarEstado(av.id, 'borrador', av.numero)}
                              className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 whitespace-nowrap hover:bg-gray-50">
                              {isEs ? 'Reabrir' : 'Reopen'}
                            </button>
                          )}
                          {puedeAprobar && (
                            <TBtn danger onClick={() => {
                              if (window.confirm(isEs
                                ? `Eliminar avaluo #${av.numero}? Esta accion no se puede deshacer.`
                                : `Delete valuation #${av.numero}? This action cannot be undone.`))
                                dispatch({ type:'DEL_AVALUO_CLIENTE', payload:av.id })
                            }}>{isEs ? 'Eliminar' : 'Delete'}</TBtn>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
