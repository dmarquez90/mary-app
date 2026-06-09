import { useState, useMemo, useContext } from 'react'
import { useStore } from '../store'
import { LangContext } from '../i18n'
import { fmt, calcGrandTotal } from '../utils'
import { EmptyState, StatCard, Icons } from '../components'
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Dot } from 'recharts'

function generarPeriodosMensuales(fechaInicio, fechaFin) {
  const periodos = []
  const fin = new Date(fechaFin + 'T00:00:00')
  const cur = new Date(fechaInicio + 'T00:00:00')
  cur.setDate(1)
  while (cur <= fin) {
    const key   = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}`
    const label = cur.toLocaleDateString('es', { month:'short', year:'2-digit' })
    periodos.push({ key, label })
    cur.setMonth(cur.getMonth() + 1)
  }
  return periodos
}

function generarPeriodosSemanales(fechaInicio, fechaFin) {
  const periodos = []
  const fin = new Date(fechaFin + 'T00:00:00')
  const cur = new Date(fechaInicio + 'T00:00:00')
  while (cur <= fin) {
    const m = String(cur.getMonth()+1).padStart(2,'0')
    const d = String(cur.getDate()).padStart(2,'0')
    periodos.push({ key: `${cur.getFullYear()}-${m}-${d}`, label: `${m}/${d}` })
    cur.setDate(cur.getDate() + 7)
  }
  return periodos
}

export default function CurvaS() {
  const { state } = useStore()
  const { t } = useContext(LangContext)
  const { proyectos, presupuesto, salidas, entradas, costos_directos, nominas, subcontratos, equipos, costos_indirectos,
    avaluos_cliente = [], avaluos_cliente_items = [], presupuesto_indirectos = [],
    subcontratos_contratos = [], subcontratos_avaluos = [], subcontratos_items = [],
    ordenes_cambio = [] } = state

  const [proyId, setProyId]           = useState(proyectos[0]?.id || '')
  const [granularity, setGranularity] = useState('mes')

  const proy   = proyectos.find(p => p.id === proyId)
  const moneda = proy?.moneda || 'USD'
  const items          = presupuesto.filter(b => b.proyecto_id === proyId)
  const totalDirectos  = calcGrandTotal(items)
  const indsDelProy    = presupuesto_indirectos.filter(p => p.proyecto_id === proyId)
  const totalIndPres   = indsDelProy.reduce((s, p) => s + parseFloat(p.monto_presupuestado || 0), 0)
  const subtotalPres   = totalDirectos + totalIndPres
  const utilidadPct    = parseFloat(proy?.utilidad_pct || 0)
  const impuestoPct    = parseFloat(proy?.impuesto_pct || 0)
  const utilidadMonto  = subtotalPres * (utilidadPct / 100)
  const granTotalPres  = subtotalPres + utilidadMonto
  const impuestoMonto  = granTotalPres * (impuestoPct / 100)
  const budget         = granTotalPres + impuestoMonto

  // ── Presupuesto revisado por Órdenes de Cambio aprobadas ─────────────────
  const ocsAprobadas   = ordenes_cambio.filter(o => o.proyecto_id === proyId && o.estado === 'aprobada')
  const deltaOCs       = ocsAprobadas.reduce((s, o) => s + parseFloat(o.total_oc || 0), 0)
  const budgetRevisado = budget + deltaOCs

  const allCosts = useMemo(() => {
    if (!proyId) return []
    const costs = []
    salidas.filter(s => s.proyecto_id === proyId).forEach(s => {
      const e = entradas.find(en => en.material_id === s.material_id)
      const monto = (parseFloat(s.cantidad)||0) * (parseFloat(e?.precio_unitario)||0)
      if (monto > 0) costs.push({ fecha: s.fecha_salida, monto })
    })
    costos_directos.filter(c => c.proyecto_id === proyId).forEach(c =>
      costs.push({ fecha: c.fecha || c.created_at?.slice(0,10), monto: parseFloat(c.monto)||0 })
    )
    nominas.filter(n => n.proyecto_id === proyId).forEach(n =>
      costs.push({ fecha: n.periodo_fin, monto: (parseFloat(n.salario_base)||0) - (parseFloat(n.deducciones)||0) })
    )
    subcontratos.filter(s => s.proyecto_id === proyId).forEach(s =>
      s.monto_pagado > 0 && costs.push({ fecha: s.created_at?.slice(0,10), monto: parseFloat(s.monto_pagado)||0 })
    )
    // Nuevo sistema de subcontratos — avalúos aprobados
    const scIdsProy = subcontratos_contratos.filter(sc => sc.proyecto_id === proyId).map(sc => sc.id)
    subcontratos_avaluos
      .filter(a => scIdsProy.includes(a.subcontrato_id) && a.estado === 'aprobado')
      .forEach(a => costs.push({ fecha: a.fecha_elaboracion || a.created_at?.slice(0,10), monto: parseFloat(a.monto_total)||0 }))
    equipos.filter(e => e.proyecto_id === proyId).forEach(e =>
      costs.push({ fecha: e.created_at?.slice(0,10), monto: parseFloat(e.costo_total)||0 })
    )
    costos_indirectos.filter(c => c.proyecto_id === proyId).forEach(c =>
      costs.push({ fecha: c.fecha || c.created_at?.slice(0,10), monto: parseFloat(c.monto)||0 })
    )
    return costs.filter(c => c.fecha && c.monto > 0).sort((a,b) => a.fecha.localeCompare(b.fecha))
  }, [proyId, salidas, entradas, costos_directos, nominas, subcontratos, subcontratos_contratos, subcontratos_avaluos, equipos, costos_indirectos])

  const chartData = useMemo(() => {
    if (!proy?.fecha_inicio) return []
    const fechaInicio = proy.fecha_inicio
    const fechaFin    = proy.fecha_fin_estimada || new Date().toISOString().slice(0,10)

    const periodos = granularity === 'mes'
      ? generarPeriodosMensuales(fechaInicio, fechaFin)
      : generarPeriodosSemanales(fechaInicio, fechaFin)

    if (periodos.length === 0) return []

    const periodKey = (fecha) => {
      const dt = new Date(fecha + 'T00:00:00')
      if (granularity === 'mes') {
        return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`
      }
      const m = String(dt.getMonth()+1).padStart(2,'0')
      const d = String(dt.getDate()).padStart(2,'0')
      return `${dt.getFullYear()}-${m}-${d}`
    }

    const closestPeriod = (fecha) => {
      const k = periodKey(fecha)
      if (granularity === 'semana') {
        return periodos.reduce((prev, cur) =>
          Math.abs(cur.key.localeCompare(k)) < Math.abs(prev.key.localeCompare(k)) ? cur : prev
        ).key
      }
      return k
    }

    // ── Distribución del presupuesto por avance físico de avalúos ──────
    // Usa el % de avance físico de cada avalúo para distribuir el presupuesto
    // Si no hay avalúos, cae a distribución lineal uniforme
    const avsDelProy = avaluos_cliente.filter(a => a.proyecto_id === proyId)
      .sort((a, b) => (a.fecha_elaboracion||a.created_at||'').localeCompare(b.fecha_elaboracion||b.created_at||''))

    const presPorPeriodo = {}

    if (avsDelProy.length > 0) {
      // Distribuir según pct_fisico acumulado por período de avalúo
      let pctAcumAnterior = 0
      avsDelProy.forEach(av => {
        const fecha    = av.fecha_elaboracion || av.created_at?.slice(0,10)
        if (!fecha) return
        const key      = closestPeriod(fecha)
        const pctAcum  = parseFloat(av.pct_avance_global || 0)
        const pctPeriodo = Math.max(0, pctAcum - pctAcumAnterior)
        presPorPeriodo[key] = (presPorPeriodo[key] || 0) + (budget * pctPeriodo / 100)
        pctAcumAnterior = pctAcum
      })
      // Asignar el saldo restante al último período
      const totalDistribuido = Object.values(presPorPeriodo).reduce((s,v) => s+v, 0)
      const saldo = budget - totalDistribuido
      if (saldo > 0 && avsDelProy.length > 0) {
        const ultimaFecha = avsDelProy[avsDelProy.length-1].fecha_elaboracion || avsDelProy[avsDelProy.length-1].created_at?.slice(0,10)
        if (ultimaFecha) {
          const k = closestPeriod(ultimaFecha)
          presPorPeriodo[k] = (presPorPeriodo[k] || 0) + saldo
        }
      }
    } else {
      // Distribución en curva S real usando CDF beta(2,2) acumulada
      // La CDF garantiza que siempre empiece en 0 y termine en budget,
      // independientemente del número de períodos
      const n = periodos.length
      if (n === 1) {
        presPorPeriodo[periodos[0].key] = budget
      } else {
        // CDF beta(2,2): F(x) = 3x² - 2x³  (integra la PDF 6x(1-x))
        // Genera valores acumulados 0→1 con forma de S suave
        const betaCDF = (x) => 3 * x * x - 2 * x * x * x
        // Calcular el presupuesto incremental por período usando la diferencia de la CDF
        periodos.forEach(({ key }, i) => {
          const x0 = i / n       // inicio del período normalizado
          const x1 = (i + 1) / n // fin del período normalizado
          presPorPeriodo[key] = budget * (betaCDF(x1) - betaCDF(x0))
        })
      }
    }

    // Costos reales por período
    const realPorPeriodo = {}
    allCosts.forEach(c => {
      const k = closestPeriod(c.fecha)
      realPorPeriodo[k] = (realPorPeriodo[k] || 0) + c.monto
    })

    // Ingresos cobrados — avalúos aprobados agrupados por periodo_fin
    const ingresoPorPeriodo = {}
    avaluos_cliente
      .filter(a => a.proyecto_id === proyId && a.estado === 'aprobado' && a.periodo_fin)
      .forEach(a => {
        const k = closestPeriod(a.periodo_fin)
        ingresoPorPeriodo[k] = (ingresoPorPeriodo[k] || 0) + parseFloat(a.total || a.monto_total || 0)
      })

    let presAcum    = 0
    let presRevAcum = 0
    let realAcum    = 0
    let ingresoAcum = 0

    return periodos.map(({ key, label }) => {
      const montoPres    = presPorPeriodo[key] || 0
      // Presupuesto revisado: misma distribución proporcional aplicada al budgetRevisado
      const montoPresRev = budgetRevisado > 0 && budget > 0
        ? montoPres * (budgetRevisado / budget)
        : montoPres
      presAcum    += montoPres
      presRevAcum += montoPresRev
      realAcum    += (realPorPeriodo[key] || 0)
      ingresoAcum += (ingresoPorPeriodo[key] || 0)
      return {
        periodo:        label,
        pres_periodo:   Math.round(montoPres * 100) / 100,
        real_periodo:   Math.round((realPorPeriodo[key] || 0) * 100) / 100,
        ingreso_periodo:Math.round((ingresoPorPeriodo[key] || 0) * 100) / 100,
        presAcum:       Math.round(Math.min(presAcum, budget) * 100) / 100,
        presRevAcum:    deltaOCs > 0 ? Math.round(Math.min(presRevAcum, budgetRevisado) * 100) / 100 : undefined,
        realAcum:       Math.round(realAcum * 100) / 100,
        ingresoAcum:    Math.round(ingresoAcum * 100) / 100,
      }
    })
  }, [allCosts, budget, budgetRevisado, deltaOCs, granularity, proy, avaluos_cliente, proyId])

  const totalReal      = allCosts.reduce((s,c) => s + c.monto, 0)
  const isEs           = useContext(LangContext).lang === 'ES'
  const avsDelProy     = avaluos_cliente.filter(a => a.proyecto_id === proyId)
  const totalIngresado = avaluos_cliente
    .filter(a => a.proyecto_id === proyId && a.estado === 'aprobado')
    .reduce((s,a) => s + parseFloat(a.total || a.monto_total || 0), 0)
  const flujo      = totalIngresado - totalReal
  // Desviación contra presupuesto revisado (con OCs) si hay OCs, sino contra base
  const desviacion = totalReal - budgetRevisado

  const actDeviations = useMemo(() => {
    if (!proyId) return []
    return items.filter(i => i.tipo === 'actividad').map(act => {
      const presupuestado = (act.cantidad||0) * ((act.costo_mo||0) + (act.costo_materiales||0) + (act.costo_equipos||0))
      const matCost = salidas.filter(s => s.proyecto_id===proyId && s.actividad_id===act.id).reduce((s,sa) => {
        const e = entradas.find(en => en.material_id === sa.material_id)
        return s + (parseFloat(sa.cantidad)||0) * (parseFloat(e?.precio_unitario)||0)
      }, 0)
      const dirCost = costos_directos.filter(c => c.proyecto_id===proyId && c.actividad_id===act.id).reduce((s,c) => s + (parseFloat(c.monto)||0), 0)
      const scIdsNuevo = subcontratos_items.filter(si => si.actividad_id===act.id).map(si => si.subcontrato_id)
      const subCostNuevo = subcontratos_avaluos.filter(a => scIdsNuevo.includes(a.subcontrato_id) && a.estado==='aprobado').reduce((s,a) => s + (parseFloat(a.monto_total)||0), 0)
      const subCostAntiguo = subcontratos.filter(s => s.proyecto_id===proyId && s.actividad_id===act.id).reduce((s,sc) => s + (parseFloat(sc.monto_pagado)||0), 0)
      const subCost = subCostNuevo + subCostAntiguo
      const eqCost  = equipos.filter(e => e.proyecto_id===proyId && e.actividad_id===act.id).reduce((s,e) => s + (parseFloat(e.costo_total)||0), 0)
      const real = matCost + dirCost + subCost + eqCost
      const dev  = real - presupuestado
      return { code: act.code, descripcion: act.descripcion, presupuestado, real, dev, devPct: presupuestado ? (dev/presupuestado)*100 : 0 }
    }).filter(a => a.presupuestado > 0 || a.real > 0)
  }, [items, salidas, entradas, costos_directos, subcontratos, subcontratos_items, subcontratos_avaluos, equipos, proyId])

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null
    const pres    = payload.find(p => p.dataKey === 'presAcum')
    const presRev = payload.find(p => p.dataKey === 'presRevAcum')
    const real    = payload.find(p => p.dataKey === 'realAcum')
    const ing     = payload.find(p => p.dataKey === 'ingresoAcum')
    const presPer = payload.find(p => p.dataKey === 'pres_periodo')
    const realPer = payload.find(p => p.dataKey === 'real_periodo')
    const base    = presRev?.value || pres?.value
    const ejecucion = base > 0 ? ((real?.value || 0) / base * 100).toFixed(1) : null
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-lg text-xs min-w-[180px]">
        <p className="font-semibold text-gray-700 mb-2 pb-1.5 border-b border-gray-100">{label}</p>
        {pres && <div className="flex justify-between gap-4 mb-1">
          <span style={{ color: '#185FA5' }}>● {isEs ? 'Presupuestado' : 'Budgeted'}</span>
          <span className="font-mono font-medium">{fmt(pres.value, moneda)}</span>
        </div>}
        {presRev && presRev.value != null && <div className="flex justify-between gap-4 mb-1">
          <span style={{ color: '#F59E0B' }}>● {isEs ? 'Pres. revisado' : 'Revised budget'}</span>
          <span className="font-mono font-medium">{fmt(presRev.value, moneda)}</span>
        </div>}
        {real && <div className="flex justify-between gap-4 mb-1">
          <span style={{ color: '#1D9E75' }}>● {isEs ? 'Real ejecutado' : 'Real executed'}</span>
          <span className="font-mono font-medium">{fmt(real.value, moneda)}</span>
        </div>}
        {ing && ing.value > 0 && <div className="flex justify-between gap-4 mb-1">
          <span style={{ color: '#7C3AED' }}>● {isEs ? 'Cobrado' : 'Billed'}</span>
          <span className="font-mono font-medium">{fmt(ing.value, moneda)}</span>
        </div>}
        {realPer?.value > 0 && <div className="flex justify-between gap-4 mt-1.5 pt-1.5 border-t border-gray-100 text-gray-400">
          <span>{isEs ? 'Gasto período' : 'Period spend'}</span>
          <span className="font-mono">{fmt(realPer.value, moneda)}</span>
        </div>}
        {ejecucion && <div className="flex justify-between gap-4 mt-1 text-gray-400">
          <span>{isEs ? 'Ejecución' : 'Execution'}</span>
          <span className="font-mono">{ejecucion}%</span>
        </div>}
      </div>
    )
  }

  const noData = budget === 0 && allCosts.length === 0

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{t('curva_title')}</h1>
          {proy && <p className="text-sm text-gray-400 mt-0.5">{proy.project_code} — {proy.nombre}</p>}
        </div>
        <div className="flex items-center gap-3">
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A6B]"
            value={proyId} onChange={e => setProyId(e.target.value)}>
            <option value="">— {t('curva_select_project')} —</option>
            {proyectos.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>)}
          </select>
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A6B]"
            value={granularity} onChange={e => setGranularity(e.target.value)}>
            <option value="mes">{t('curva_by_month')}</option>
            <option value="semana">{t('curva_by_week')}</option>
          </select>
        </div>
      </div>

      {!proyId ? (
        <EmptyState icon={Icons.curvas} title={t('curva_empty_title')} subtitle={t('curva_empty_sub')} />
      ) : noData ? (
        <EmptyState icon={Icons.curvas} title={t('curva_no_data')} subtitle={t('curva_no_data_sub')} />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <StatCard label={t('curva_kpi_budget')} value={fmt(budget, moneda)} />
            {deltaOCs > 0 && (
              <StatCard
                label={isEs ? 'Presupuesto revisado' : 'Revised budget'}
                value={fmt(budgetRevisado, moneda)}
                color='#F59E0B'
                sub={isEs ? `${ocsAprobadas.length} OC${ocsAprobadas.length !== 1 ? 's' : ''} aprobada${ocsAprobadas.length !== 1 ? 's' : ''}` : `${ocsAprobadas.length} approved CO${ocsAprobadas.length !== 1 ? 's' : ''}`}
              />
            )}
            <StatCard label={t('curva_kpi_real')}   value={fmt(totalReal, moneda)} />
            <StatCard
              label={t('curva_kpi_deviation')}
              value={`${desviacion>=0?'+':''}${fmt(desviacion,moneda)}`}
              color={desviacion > 0 ? '#ef4444' : desviacion < 0 ? '#1D9E75' : '#6b7280'}
              sub={deltaOCs > 0
                ? (isEs ? 'vs presupuesto revisado' : 'vs revised budget')
                : (desviacion > 0 ? t('curva_overcost') : desviacion < 0 ? t('curva_saving') : t('curva_on_budget'))}
            />
            <StatCard
              label={t('curva_kpi_execution')}
              value={budgetRevisado > 0 ? `${((totalReal/budgetRevisado)*100).toFixed(1)}%` : '0%'}
              sub={t('curva_kpi_execution_sub')}
            />
            <StatCard
              label={isEs ? 'Cobrado (aprobado)' : 'Billed (approved)'}
              value={fmt(totalIngresado, moneda)}
              color='#7C3AED'
            />
            <StatCard
              label={isEs ? 'Flujo (cobrado - gasto)' : 'Cash flow (billed - cost)'}
              value={`${flujo>=0?'+':''}${fmt(flujo,moneda)}`}
              color={flujo >= 0 ? '#1D9E75' : '#ef4444'}
              sub={flujo >= 0 ? (isEs?'Flujo positivo':'Positive flow') : (isEs?'Flujo negativo':'Negative flow')}
            />
          </div>

          {!proy?.fecha_inicio && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 text-sm text-amber-700">
              Define la fecha de inicio y fecha fin estimada del proyecto para ver la curva S completa.
            </div>
          )}

          {chartData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                {t('curva_chart_title')} ({moneda})
              </h2>
              {avsDelProy?.length > 0 ? (
              <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                <span>📊</span>
                {isEs ? 'Distribución del presupuesto basada en avance físico de avalúos registrados.' : 'Budget distribution based on physical progress from registered billings.'}
              </p>
            ) : (
              <p className="text-xs text-blue-500 mb-3 flex items-center gap-1">
                <span>📈</span>
                {isEs ? 'Curva S calculada con distribución beta — registra avalúos para mayor precisión.' : 'S-Curve using beta distribution — register billings for higher accuracy.'}
              </p>
            )}
            <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={chartData} margin={{ top:10, right:20, left:10, bottom:5 }}>
                  <defs>
                    <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#1D9E75" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#1D9E75" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gradPres" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#185FA5" stopOpacity={0.08}/>
                      <stop offset="95%" stopColor="#185FA5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="periodo"
                    tick={{ fontSize:11, fill:'#9ca3af' }}
                    interval={Math.max(0, Math.floor(chartData.length / 8) - 1)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize:11, fill:'#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => {
                      if (v >= 1000000) return `${(v/1000000).toFixed(1)}M`
                      if (v >= 1000)    return `${(v/1000).toFixed(0)}K`
                      return v
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize:12, paddingTop: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="presAcum"
                    name={t('curva_line_budget')}
                    stroke="#185FA5"
                    strokeWidth={2.5}
                    fill="url(#gradPres)"
                    dot={false}
                    activeDot={{ r:5, strokeWidth:0 }}
                  />
                  {deltaOCs > 0 && (
                    <Line
                      type="monotone"
                      dataKey="presRevAcum"
                      name={isEs ? 'Pres. revisado (OCs)' : 'Revised budget (COs)'}
                      stroke="#F59E0B"
                      strokeWidth={2}
                      strokeDasharray="8 4"
                      dot={false}
                      activeDot={{ r:5, strokeWidth:0 }}
                    />
                  )}
                  <Area
                    type="stepAfter"
                    dataKey="realAcum"
                    name={t('curva_line_real')}
                    stroke="#1D9E75"
                    strokeWidth={2.5}
                    fill="url(#gradReal)"
                    dot={(props) => {
                      const { cx, cy, payload } = props
                      if (!payload.real_periodo || payload.real_periodo === 0) return null
                      return <Dot key={props.key} cx={cx} cy={cy} r={4} fill="#1D9E75" stroke="#fff" strokeWidth={2} />
                    }}
                    activeDot={{ r:6, strokeWidth:0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ingresoAcum"
                    name={isEs ? 'Cobrado acumulado' : 'Accumulated billed'}
                    stroke="#7C3AED"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={false}
                    activeDot={{ r:5, strokeWidth:0 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {actDeviations.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="text-sm font-semibold text-gray-700">{t('curva_dev_title')}</h2>
              </div>
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {[t('curva_col_code'),t('curva_col_activity'),t('curva_col_budget'),t('curva_col_real'),t('curva_col_dev'),t('curva_col_dev_pct'),t('curva_col_status')].map((h,i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {actDeviations.map((a,i) => {
                    const status = a.dev <= 0 ? 'ok' : a.presupuestado > 0 && a.dev/a.presupuestado < 0.15 ? 'alerta' : 'critico'
                    return (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-xs font-mono text-gray-500">{a.code}</td>
                        <td className="px-4 py-3 text-sm text-gray-800 max-w-[180px] truncate">{a.descripcion}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{fmt(a.presupuestado, moneda)}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{fmt(a.real, moneda)}</td>
                        <td className="px-4 py-3 text-sm font-mono font-medium" style={{ color: a.dev>0?'#ef4444':a.dev<0?'#1D9E75':'#6b7280' }}>
                          {a.dev>0?'+':''}{fmt(a.dev, moneda)}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono" style={{ color: a.dev>0?'#ef4444':a.dev<0?'#1D9E75':'#6b7280' }}>
                          {a.dev>0?'+':''}{a.devPct.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                            ${status==='ok'?'bg-green-100 text-green-700':status==='alerta'?'bg-amber-100 text-amber-700':'bg-red-100 text-red-600'}`}>
                            {status==='ok' ? `✓ ${t('curva_status_ok')}` : status==='alerta' ? `⚠ ${t('curva_status_alert')}` : `⚠ ${t('curva_status_critical')}`}
                          </span>
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
    </div>
  )
}
