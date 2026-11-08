import { useState, useMemo, useContext } from 'react'
import { useProyectoActivo } from '../useProyectoActivo'
import { useStore } from '../store'
import { LangContext } from '../i18n'
import { fmt, calcGrandTotal, calcIndirectos, r2, flatBudgetItems, costosSalidasFIFO, localeDe, today } from '../utils'
import { EmptyState, StatCard, Icons, PageHeader } from '../components'
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Dot } from 'recharts'

function generarPeriodosMensuales(fechaInicio, fechaFin, lang = 'ES') {
  const periodos = []
  const fin = new Date(fechaFin + 'T00:00:00')
  const cur = new Date(fechaInicio + 'T00:00:00')
  cur.setDate(1)
  while (cur <= fin) {
    const key   = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}`
    const label = cur.toLocaleDateString(localeDe(lang), { month:'short', year:'2-digit' })
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
  const { t, lang } = useContext(LangContext)
  const { proyectos, presupuesto, salidas, entradas, materiales = [], costos_directos, nominas, subcontratos, equipos, costos_indirectos,
    avaluos_cliente = [], avaluos_cliente_items = [], presupuesto_indirectos = [],
    subcontratos_contratos = [], subcontratos_avaluos = [], subcontratos_items = [], subcontratos_avaluo_items = [],
    ordenes_cambio = [] } = state

  const [proyId, setProyId]           = useProyectoActivo(proyectos)
  const [granularity, setGranularity] = useState('mes')

  const proy   = proyectos.find(p => p.id === proyId)
  const moneda = proy?.moneda || 'USD'
  const items          = presupuesto.filter(b => b.proyecto_id === proyId)
  const totalDirectos  = calcGrandTotal(items)
  const indsDelProy    = presupuesto_indirectos.filter(p => p.proyecto_id === proyId)
  const utilidadPct    = parseFloat(proy?.utilidad_pct || 0)
  const impuestoPct    = parseFloat(proy?.impuesto_pct || 0)
  // Directo -> total con indirectos, utilidad e impuesto (mismo cálculo del Presupuesto)
  const totalConMarkups = (directo) => {
    const subtotal = directo + calcIndirectos(proy, directo, indsDelProy).total
    const conUtil  = r2(subtotal + r2(subtotal * (utilidadPct / 100)))
    return r2(conUtil + r2(conUtil * (impuestoPct / 100)))
  }

  // ── Órdenes de Cambio aprobadas ──────────────────────────────────────────
  // Al aprobarse, una OC ya modifica el presupuesto (cantidades y partidas nuevas),
  // así que el presupuesto actual ES el revisado. El original se reconstruye
  // restando el directo de las OCs aprobadas.
  const ocsAprobadas   = ordenes_cambio.filter(o => o.proyecto_id === proyId && o.estado === 'aprobada')
  const deltaOCs       = ocsAprobadas.reduce((s, o) => s + parseFloat(o.total_oc || 0), 0)
  const budgetRevisado = totalConMarkups(totalDirectos)
  const budget         = deltaOCs !== 0 ? totalConMarkups(totalDirectos - deltaOCs) : budgetRevisado

  const costosFIFO = useMemo(() => costosSalidasFIFO(entradas, salidas, materiales), [entradas, salidas, materiales])

  const allCosts = useMemo(() => {
    if (!proyId) return []
    const costs = []
    salidas.filter(s => s.proyecto_id === proyId).forEach(s => {
      const monto = costosFIFO[s.id] || 0
      if (monto > 0) costs.push({ fecha: s.fecha_salida, monto })
    })
    costos_directos.filter(c => c.proyecto_id === proyId && c.tipo !== 'subcontrato').forEach(c =>
      costs.push({ fecha: c.fecha || c.created_at?.slice(0,10), monto: parseFloat(c.monto)||0 })
    )
    nominas.filter(n => n.proyecto_id === proyId).forEach(n =>
      costs.push({ fecha: n.periodo_fin, monto: parseFloat(n.salario_base)||0 })  // bruto = costo de la empresa
    )
    subcontratos.filter(s => s.proyecto_id === proyId).forEach(s =>
      s.monto_pagado > 0 && costs.push({ fecha: s.created_at?.slice(0,10), monto: parseFloat(s.monto_pagado)||0 })
    )
    // Nuevo sistema de subcontratos — avalúos aprobados
    const scIdsProy = subcontratos_contratos.filter(sc => sc.proyecto_id === proyId).map(sc => sc.id)
    subcontratos_avaluos
      .filter(a => scIdsProy.includes(a.subcontrato_id) && a.estado === 'aprobado')
      .forEach(a => costs.push({ fecha: a.fecha_elaboracion || a.created_at?.slice(0,10), monto: parseFloat(a.monto_total)||0 }))
    equipos.filter(e => e.proyecto_id === proyId).forEach(e => {
      // Usar costo_real si el ajuste fue aprobado (estado ajustado o cerrado_parcial)
      const costoEq = (e.costo_real && (e.estado_equipo === 'ajustado' || e.estado_equipo === 'cerrado_parcial'))
        ? parseFloat(e.costo_real)
        : parseFloat(e.costo_total) || 0
      // Fecha real del gasto; created_at solo para registros antiguos sin fecha
      costs.push({ fecha: (e.fecha || e.eq_fecha_inicio || e.created_at)?.slice(0,10), monto: costoEq })
    })
    costos_indirectos.filter(c => c.proyecto_id === proyId).forEach(c =>
      costs.push({ fecha: c.fecha || c.created_at?.slice(0,10), monto: parseFloat(c.monto)||0 })
    )
    return costs.filter(c => c.fecha && c.monto > 0).sort((a,b) => a.fecha.localeCompare(b.fecha))
  }, [proyId, salidas, costosFIFO, costos_directos, nominas, subcontratos, subcontratos_contratos, subcontratos_avaluos, equipos, costos_indirectos])

  // Fecha con la que un avalúo entra en la curva: fin del período que cubre o, si no lo
  // tiene, su fecha de elaboración (antes solo contaban los que tenían periodo_fin).
  const fechaAvaluo = (a) => a.periodo_fin || a.fecha_elaboracion || a.created_at?.slice(0,10)

  const chartData = useMemo(() => {
    if (!proy?.fecha_inicio) return []
    const inicioPlan = proy.fecha_inicio
    const finPlan    = proy.fecha_fin_estimada || today()
    const avsAprobados = avaluos_cliente.filter(a => a.proyecto_id === proyId && a.estado === 'aprobado' && fechaAvaluo(a))

    // El eje cubre el plan y también los costos o avalúos fuera de él (p. ej. un anticipo
    // facturado antes del inicio): antes esos montos se perdían porque no tenían período.
    const fechasDatos = [...allCosts.map(c => c.fecha), ...avsAprobados.map(fechaAvaluo)].sort()
    const fechaInicio = [inicioPlan, fechasDatos[0]].filter(Boolean).sort()[0]
    const fechaFin    = [finPlan, fechasDatos[fechasDatos.length - 1]].filter(Boolean).sort().slice(-1)[0]

    const periodos = granularity === 'mes'
      ? generarPeriodosMensuales(fechaInicio, fechaFin, lang)
      : generarPeriodosSemanales(fechaInicio, fechaFin)

    if (periodos.length === 0) return []

    // Período al que pertenece una fecha: su mes, o la semana cuyo inicio es el último <= fecha.
    // (Antes la semana se elegía con localeCompare, que solo devuelve -1/0/1, y casi todo
    // caía en la primera semana.)
    const periodoDe = (fecha) => {
      if (granularity === 'mes') return fecha.slice(0, 7)
      let k = periodos[0].key
      for (const p of periodos) { if (p.key <= fecha) k = p.key; else break }
      return k
    }
    // Último día de cada período, para leer el plan acumulado a esa fecha
    const finDePeriodo = (key) => {
      if (granularity === 'mes') {
        const [y, m] = key.split('-').map(Number)
        return new Date(y, m, 0)
      }
      const d = new Date(key + 'T00:00:00'); d.setDate(d.getDate() + 6); return d
    }

    // ── Plan: curva S (CDF beta(2,2)) entre el inicio y el fin estimado del proyecto ──
    // Es la línea base y no depende de lo facturado. Antes se armaba con los propios
    // avalúos y el saldo se cargaba al último, así que el plan copiaba lo real.
    const betaCDF = (x) => 3 * x * x - 2 * x * x * x
    const t0 = new Date(inicioPlan + 'T00:00:00').getTime()
    const t1 = new Date(finPlan + 'T00:00:00').getTime()
    const planAcumA = (key) => {
      if (t1 <= t0) return budget
      const x = Math.min(1, Math.max(0, (finDePeriodo(key).getTime() - t0) / (t1 - t0)))
      return budget * betaCDF(x)
    }

    // Costos reales por período
    const realPorPeriodo = {}
    allCosts.forEach(c => {
      const k = periodoDe(c.fecha)
      realPorPeriodo[k] = (realPorPeriodo[k] || 0) + c.monto
    })

    // Facturado: avalúos aprobados (monto bruto, antes de retención)
    const ingresoPorPeriodo = {}
    avsAprobados.forEach(a => {
      const k = periodoDe(fechaAvaluo(a))
      ingresoPorPeriodo[k] = (ingresoPorPeriodo[k] || 0) + parseFloat(a.total || a.monto_total || 0)
    })

    let planPrevio   = 0
    let realAcum     = 0
    let ingresoAcum  = 0
    let realStarted    = false
    let ingresoStarted = false
    const factorRev = budgetRevisado > 0 && budget > 0 ? budgetRevisado / budget : 1

    return periodos.map(({ key, label }) => {
      const presAcum  = planAcumA(key)
      const montoPres = presAcum - planPrevio
      planPrevio = presAcum
      realAcum    += (realPorPeriodo[key] || 0)
      ingresoAcum += (ingresoPorPeriodo[key] || 0)

      // La curva "nace" en el primer período con actividad real; antes de eso
      // se emite null para que Recharts no dibuje un tramo plano desde 0.
      if (!realStarted && (realPorPeriodo[key] || 0) > 0) realStarted = true
      if (!ingresoStarted && (ingresoPorPeriodo[key] || 0) > 0) ingresoStarted = true

      return {
        periodo:        label,
        pres_periodo:   Math.round(montoPres * 100) / 100,
        real_periodo:   Math.round((realPorPeriodo[key] || 0) * 100) / 100,
        ingreso_periodo:Math.round((ingresoPorPeriodo[key] || 0) * 100) / 100,
        presAcum:       Math.round(presAcum * 100) / 100,
        presRevAcum:    deltaOCs > 0 ? Math.round(presAcum * factorRev * 100) / 100 : undefined,
        realAcum:       realStarted    ? Math.round(realAcum * 100) / 100    : null,
        ingresoAcum:    ingresoStarted ? Math.round(ingresoAcum * 100) / 100 : null,
      }
    })
  }, [allCosts, budget, budgetRevisado, deltaOCs, granularity, proy, avaluos_cliente, proyId, lang])

  const totalReal      = allCosts.reduce((s,c) => s + c.monto, 0)
  const isEs           = useContext(LangContext).lang === 'ES'
  const avsDelProy     = avaluos_cliente.filter(a => a.proyecto_id === proyId)
  const totalIngresado = avaluos_cliente
    .filter(a => a.proyecto_id === proyId && a.estado === 'aprobado')
    .reduce((s,a) => s + parseFloat(a.total || a.monto_total || 0), 0)
  // Flujo de caja: lo que el cliente realmente pagó (pagos registrados en los avalúos aprobados)
  // menos lo gastado. Lo facturado no es caja: incluye retención y pagos pendientes.
  const totalPagado = r2(avaluos_cliente
    .filter(a => a.proyecto_id === proyId && a.estado === 'aprobado')
    .reduce((s,a) => s + (parseFloat(a.monto_pagado) || 0), 0))
  const flujo      = r2(totalPagado - totalReal)

  // Avance físico por actividad: cantidad acumulada en los avalúos aprobados
  const avanceAct = useMemo(() => {
    const aprobados = new Set(avaluos_cliente.filter(a => a.proyecto_id === proyId && a.estado === 'aprobado').map(a => a.id))
    const cant = {}
    avaluos_cliente_items.forEach(i => {
      if (aprobados.has(i.avaluo_id) && i.actividad_id) cant[i.actividad_id] = (cant[i.actividad_id] || 0) + (parseFloat(i.cantidad_periodo) || 0)
    })
    return { hayAvance: aprobados.size > 0, cant }
  }, [avaluos_cliente, avaluos_cliente_items, proyId])

  const actDeviations = useMemo(() => {
    if (!proyId) return []
    return flatBudgetItems(items).filter(i => i.tipo === 'actividad').map(act => {
      const presupuestado = r2((act.cantidad||0) * ((act.costo_mo||0) + (act.costo_materiales||0) + (act.costo_equipos||0)))
      const matCost = salidas.filter(s => s.proyecto_id===proyId && s.actividad_id===act.id)
        .reduce((s,sa) => s + (costosFIFO[sa.id] || 0), 0)
      const dirCost = costos_directos.filter(c => c.proyecto_id===proyId && c.actividad_id===act.id && c.tipo!=='subcontrato').reduce((s,c) => s + (parseFloat(c.monto)||0), 0)
      // Costo real de subcontratos para ESTA actividad: se toma el monto_actual de cada
      // item del avalúo cuyo subcontratos_items.actividad_id === act.id (no el monto_total
      // completo del avalúo, que incluye otras actividades del mismo subcontrato).
      const itemIdsActividad   = subcontratos_items.filter(si => si.actividad_id===act.id).map(si => si.id)
      const avaluoIdsAprobados = subcontratos_avaluos.filter(a => a.estado==='aprobado').map(a => a.id)
      const subCostNuevo = subcontratos_avaluo_items
        .filter(ai => itemIdsActividad.includes(ai.subcontrato_item_id) && avaluoIdsAprobados.includes(ai.avaluo_id))
        .reduce((s,ai) => s + (parseFloat(ai.monto_actual)||0), 0)
      const subCostAntiguo = subcontratos.filter(s => s.proyecto_id===proyId && s.actividad_id===act.id).reduce((s,sc) => s + (parseFloat(sc.monto_pagado)||0), 0)
      const subCost = subCostNuevo + subCostAntiguo
      const eqCost  = equipos.filter(e => e.proyecto_id===proyId && e.actividad_id===act.id).reduce((s,e) => {
        const costoEq = (e.costo_real && (e.estado_equipo === 'ajustado' || e.estado_equipo === 'cerrado_parcial'))
          ? parseFloat(e.costo_real)
          : parseFloat(e.costo_total) || 0
        return s + costoEq
      }, 0)
      const real = matCost + dirCost + subCost + eqCost
      // El costo real se compara con lo que vale el trabajo hecho (valor ganado = presupuesto ×
      // avance físico de los avalúos aprobados), no con todo el presupuesto: si no, una partida
      // a medias o sin costos cargados siempre salía como "ahorro" y OK.
      const cantidad = parseFloat(act.cantidad) || 0
      const avance   = cantidad > 0 ? Math.min(1, (avanceAct.cant[act.id] || 0) / cantidad) : 0
      const ganado   = r2(presupuestado * avance)
      const base     = avanceAct.hayAvance ? ganado : presupuestado
      const dev      = r2(real - base)
      return { id: act.id, code: act.code, descripcion: act.descripcion, presupuestado, avance, ganado, real, base, dev,
        devPct: base ? (dev/base)*100 : 0 }
    }).filter(a => a.presupuestado > 0 || a.real > 0)
  }, [items, salidas, costosFIFO, costos_directos, subcontratos, subcontratos_items, subcontratos_avaluos, subcontratos_avaluo_items, equipos, proyId, avanceAct])

  // Estado de cada partida: sin costos cargados no es "OK", es falta de información
  const estadoDev = (a) => {
    if (a.real === 0) return a.base > 0 ? 'sin_costos' : 'sin_iniciar'
    if (a.dev <= 0) return 'ok'
    return a.base > 0 && a.dev / a.base < 0.15 ? 'alerta' : 'critico'
  }
  const totDev = actDeviations.reduce((s, a) => ({
    presupuestado: s.presupuestado + a.presupuestado, ganado: s.ganado + a.ganado, real: s.real + a.real, base: s.base + a.base,
  }), { presupuestado: 0, ganado: 0, real: 0, base: 0 })
  // Costos del proyecto sin partida (planilla, indirectos, gastos sin actividad): cuentan en el total
  const realSinActividad = r2(totalReal - totDev.real)

  // KPI de desviación: costo real vs valor ganado (con la parte proporcional de indirectos);
  // sin avalúos aprobados no hay avance medido y se compara contra el presupuesto revisado
  const indirectosProy = calcIndirectos(proy, totalDirectos, indsDelProy).total
  const valorGanado    = totalDirectos > 0 ? r2(totDev.ganado * (totalDirectos + indirectosProy) / totalDirectos) : 0
  const desviacion     = avanceAct.hayAvance ? r2(totalReal - valorGanado) : r2(totalReal - budgetRevisado)

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
      <div className="m-card p-3 shadow-lg text-xs min-w-[180px]">
        <p className="font-semibold text-gray-700 mb-2 pb-1.5 border-b border-gray-100">{label}</p>
        {pres && <div className="flex justify-between gap-4 mb-1">
          <span style={{ color: '#185FA5' }}>● {isEs ? 'Presupuestado' : 'Budgeted'}</span>
          <span className="font-mono font-medium">{fmt(pres.value, moneda)}</span>
        </div>}
        {presRev && presRev.value != null && <div className="flex justify-between gap-4 mb-1">
          <span style={{ color: '#F59E0B' }}>● {isEs ? 'Pres. revisado' : 'Revised budget'}</span>
          <span className="font-mono font-medium">{fmt(presRev.value, moneda)}</span>
        </div>}
        {real && real.value != null && <div className="flex justify-between gap-4 mb-1">
          <span style={{ color: '#1D9E75' }}>● {isEs ? 'Real ejecutado' : 'Real executed'}</span>
          <span className="font-mono font-medium">{fmt(real.value, moneda)}</span>
        </div>}
        {ing && ing.value > 0 && <div className="flex justify-between gap-4 mb-1">
          <span style={{ color: '#7C3AED' }}>● {isEs ? 'Facturado' : 'Billed'}</span>
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
    <div className="p-3 sm:p-5 md:p-6 max-w-[1500px] mx-auto">
      <PageHeader
        title={t('curva_title')}
        subtitle={proy ? `${proy.project_code} — ${proy.nombre}` : null}
        actions={<>
          <select
            className="m-input" style={{ width: 'auto', minWidth: 170 }}
            value={proyId} onChange={e => setProyId(e.target.value)}>
            <option value="">— {t('curva_select_project')} —</option>
            {proyectos.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>)}
          </select>
          <select
            className="m-input" style={{ width: 'auto', minWidth: 170 }}
            value={granularity} onChange={e => setGranularity(e.target.value)}>
            <option value="mes">{t('curva_by_month')}</option>
            <option value="semana">{t('curva_by_week')}</option>
          </select>
        </>}
      />

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
              sub={totalReal === 0
                ? (isEs ? 'sin costos registrados' : 'no costs recorded')
                : avanceAct.hayAvance
                ? `${desviacion > 0 ? t('curva_overcost') : desviacion < 0 ? t('curva_saving') : t('curva_on_budget')} · ${isEs ? 'vs valor ganado' : 'vs earned value'} ${fmt(valorGanado, moneda)}`
                : deltaOCs > 0
                ? (isEs ? 'vs presupuesto revisado' : 'vs revised budget')
                : (desviacion > 0 ? t('curva_overcost') : desviacion < 0 ? t('curva_saving') : t('curva_on_budget'))}
            />
            <StatCard
              label={t('curva_kpi_execution')}
              value={budgetRevisado > 0 ? `${((totalReal/budgetRevisado)*100).toFixed(1)}%` : '0%'}
              sub={t('curva_kpi_execution_sub')}
            />
            <StatCard
              label={isEs ? 'Facturado (aprobado)' : 'Billed (approved)'}
              value={fmt(totalIngresado, moneda)}
              color='#7C3AED'
            />
            <StatCard
              label={isEs ? 'Flujo (pagado - gasto)' : 'Cash flow (paid - cost)'}
              value={`${flujo>=0?'+':''}${fmt(flujo,moneda)}`}
              color={flujo >= 0 ? '#1D9E75' : '#ef4444'}
              sub={`${isEs ? 'Pagado por el cliente' : 'Paid by client'}: ${fmt(totalPagado, moneda)}`}
            />
          </div>

          {!proy?.fecha_inicio && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 text-sm text-amber-700">
              Define la fecha de inicio y fecha fin estimada del proyecto para ver la curva S completa.
            </div>
          )}

          {chartData.length > 0 && (
            <div className="m-card p-5 mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                {t('curva_chart_title')} ({moneda})
              </h2>
              <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                <span>📈</span>
                {isEs
                  ? `Plan: curva S entre el inicio (${proy?.fecha_inicio || '—'}) y el fin estimado (${proy?.fecha_fin_estimada || '—'}). Facturado: avalúos aprobados. Real: costos registrados.`
                  : `Plan: S-curve from start (${proy?.fecha_inicio || '—'}) to estimated finish (${proy?.fecha_fin_estimada || '—'}). Billed: approved valuations. Real: recorded costs.`}
              </p>
              {avsDelProy?.length > 0 && totalReal === 0 && (
                <p className="text-xs text-amber-600 mb-3">
                  {isEs
                    ? 'Este proyecto no tiene costos registrados (salidas de bodega, gastos, planilla, subcontratos o equipos), por eso la línea Real no aparece.'
                    : 'This project has no recorded costs (warehouse exits, expenses, payroll, subcontracts or equipment), so the Real line does not appear.'}
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
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" vertical={false} />
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
                    connectNulls={false}
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
                    name={isEs ? 'Facturado acumulado' : 'Accumulated billed'}
                    stroke="#7C3AED"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    connectNulls={false}
                    dot={(props) => {
                      const { cx, cy, payload } = props
                      if (!payload.ingreso_periodo || payload.ingreso_periodo === 0) return null
                      return <Dot key={props.key} cx={cx} cy={cy} r={4} fill="#7C3AED" stroke="#fff" strokeWidth={2} />
                    }}
                    activeDot={{ r:5, strokeWidth:0 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {actDeviations.length > 0 && (
            <div className="m-card overflow-x-auto">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="text-sm font-semibold text-gray-700">{t('curva_dev_title')}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {avanceAct.hayAvance
                    ? (isEs ? 'Desviación = costo real − valor ganado (presupuesto × avance físico de los avalúos aprobados).'
                            : 'Deviation = real cost − earned value (budget × physical progress from approved valuations).')
                    : (isEs ? 'Sin avalúos aprobados: la desviación se mide contra el presupuesto completo.'
                            : 'No approved valuations: deviation is measured against the full budget.')}
                </p>
              </div>
              <table className="w-full">
                <thead><tr className="m-thead-row">
                  {[t('curva_col_code'), t('curva_col_activity'), t('curva_col_budget'),
                    ...(avanceAct.hayAvance ? [isEs ? '% Avance' : '% Progress', isEs ? 'Valor ganado' : 'Earned value'] : []),
                    t('curva_col_real'), t('curva_col_dev'), t('curva_col_dev_pct'), t('curva_col_status')].map((h,i) => (
                    <th key={i} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {actDeviations.map(a => {
                    const status = estadoDev(a)
                    const sinDatos = status === 'sin_costos' || status === 'sin_iniciar'
                    const color = sinDatos ? '#9ca3af' : a.dev > 0 ? '#ef4444' : a.dev < 0 ? '#1D9E75' : '#6b7280'
                    return (
                      <tr key={a.id} className="m-tr">
                        <td className="px-4 py-3 text-xs font-mono text-gray-500">{a.code}</td>
                        <td className="px-4 py-3 text-sm text-gray-800 max-w-[180px] truncate">{a.descripcion}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{fmt(a.presupuestado, moneda)}</td>
                        {avanceAct.hayAvance && <>
                          <td className="px-4 py-3 text-sm font-mono text-gray-600">{(a.avance * 100).toFixed(1)}%</td>
                          <td className="px-4 py-3 text-sm font-mono text-gray-600">{fmt(a.ganado, moneda)}</td>
                        </>}
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{fmt(a.real, moneda)}</td>
                        <td className="px-4 py-3 text-sm font-mono font-medium" style={{ color }}>
                          {sinDatos ? '—' : `${a.dev>0?'+':''}${fmt(a.dev, moneda)}`}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono" style={{ color }}>
                          {sinDatos ? '—' : `${a.dev>0?'+':''}${a.devPct.toFixed(1)}%`}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                            ${status==='ok'?'bg-green-100 text-green-700':status==='alerta'?'bg-amber-100 text-amber-700':status==='critico'?'bg-red-100 text-red-600':'bg-gray-100 text-gray-500'}`}>
                            {status==='ok' ? `✓ ${t('curva_status_ok')}`
                              : status==='alerta' ? `⚠ ${t('curva_status_alert')}`
                              : status==='critico' ? `⚠ ${t('curva_status_critical')}`
                              : status==='sin_costos' ? (isEs ? 'Sin costos' : 'No costs')
                              : (isEs ? 'Sin iniciar' : 'Not started')}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {realSinActividad > 0.005 && (
                    <tr className="m-tr">
                      <td className="px-4 py-3 text-xs font-mono text-gray-400">—</td>
                      <td className="px-4 py-3 text-sm text-gray-500 italic" colSpan={avanceAct.hayAvance ? 4 : 2}>
                        {isEs ? 'Costos sin partida asignada (planilla, indirectos, gastos generales)' : 'Costs not assigned to an activity (payroll, indirect, general expenses)'}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">{fmt(realSinActividad, moneda)}</td>
                      <td colSpan={3} />
                    </tr>
                  )}
                  <tr className="m-tr font-semibold">
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-sm text-gray-800">{isEs ? 'Total' : 'Total'}</td>
                    <td className="px-4 py-3 text-sm font-mono">{fmt(totDev.presupuestado, moneda)}</td>
                    {avanceAct.hayAvance && <>
                      <td className="px-4 py-3 text-sm font-mono">{totDev.presupuestado > 0 ? ((totDev.ganado / totDev.presupuestado) * 100).toFixed(1) : '0.0'}%</td>
                      <td className="px-4 py-3 text-sm font-mono">{fmt(totDev.ganado, moneda)}</td>
                    </>}
                    <td className="px-4 py-3 text-sm font-mono">{fmt(totalReal, moneda)}</td>
                    <td colSpan={3} />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
