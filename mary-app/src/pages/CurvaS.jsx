import { useState, useMemo, useContext } from 'react'
import { useStore } from '../store'
import { LangContext } from '../i18n'
import { fmt, calcGrandTotal } from '../utils'
import { EmptyState, StatCard, Icons } from '../components'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

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
  const { proyectos, presupuesto, salidas, entradas, costos_directos, nominas, subcontratos, equipos, costos_indirectos } = state

  const [proyId, setProyId]           = useState(proyectos[0]?.id || '')
  const [granularity, setGranularity] = useState('mes')

  const proy   = proyectos.find(p => p.id === proyId)
  const moneda = proy?.moneda || 'USD'
  const items  = presupuesto.filter(b => b.proyecto_id === proyId)
  const budget = calcGrandTotal(items)

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
    equipos.filter(e => e.proyecto_id === proyId).forEach(e =>
      costs.push({ fecha: e.created_at?.slice(0,10), monto: parseFloat(e.costo_total)||0 })
    )
    costos_indirectos.filter(c => c.proyecto_id === proyId).forEach(c =>
      costs.push({ fecha: c.fecha || c.created_at?.slice(0,10), monto: parseFloat(c.monto)||0 })
    )
    return costs.filter(c => c.fecha && c.monto > 0).sort((a,b) => a.fecha.localeCompare(b.fecha))
  }, [proyId, salidas, entradas, costos_directos, nominas, subcontratos, equipos, costos_indirectos])

  const chartData = useMemo(() => {
    if (!proy?.fecha_inicio) return []
    const fechaInicio = proy.fecha_inicio
    const fechaFin    = proy.fecha_fin_estimada || new Date().toISOString().slice(0,10)

    const periodos = granularity === 'mes'
      ? generarPeriodosMensuales(fechaInicio, fechaFin)
      : generarPeriodosSemanales(fechaInicio, fechaFin)

    if (periodos.length === 0) return []

    // Presupuesto distribuido uniformemente en todos los períodos
    const presPorPeriodo = budget / periodos.length

    // Agrupar costos reales por período
    const periodKey = (fecha) => {
      const dt = new Date(fecha + 'T00:00:00')
      if (granularity === 'mes') {
        return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`
      }
      // Para semanas, encontrar el período más cercano
      const m = String(dt.getMonth()+1).padStart(2,'0')
      const d = String(dt.getDate()).padStart(2,'0')
      return `${dt.getFullYear()}-${m}-${d}`
    }

    const realPorPeriodo = {}
    allCosts.forEach(c => {
      const k = periodKey(c.fecha)
      // Para semanas, asignar al período más cercano
      if (granularity === 'semana') {
        const closest = periodos.reduce((prev, cur) =>
          Math.abs(cur.key.localeCompare(k)) < Math.abs(prev.key.localeCompare(k)) ? cur : prev
        )
        realPorPeriodo[closest.key] = (realPorPeriodo[closest.key] || 0) + c.monto
      } else {
        realPorPeriodo[k] = (realPorPeriodo[k] || 0) + c.monto
      }
    })

    let presAcum = 0
    let realAcum = 0

    return periodos.map(({ key, label }) => {
      presAcum += presPorPeriodo
      realAcum += (realPorPeriodo[key] || 0)
      return {
        periodo:      label,
        pres_periodo: Math.round(presPorPeriodo * 100) / 100,
        real_periodo: Math.round((realPorPeriodo[key] || 0) * 100) / 100,
        presAcum:     Math.round(Math.min(presAcum, budget) * 100) / 100,
        realAcum:     Math.round(realAcum * 100) / 100,
      }
    })
  }, [allCosts, budget, granularity, proy])

  const totalReal  = allCosts.reduce((s,c) => s + c.monto, 0)
  const desviacion = totalReal - budget

  const actDeviations = useMemo(() => {
    if (!proyId) return []
    return items.filter(i => i.tipo === 'actividad').map(act => {
      const presupuestado = (act.cantidad||0) * ((act.costo_mo||0) + (act.costo_materiales||0) + (act.costo_equipos||0))
      const matCost = salidas.filter(s => s.proyecto_id===proyId && s.actividad_id===act.id).reduce((s,sa) => {
        const e = entradas.find(en => en.material_id === sa.material_id)
        return s + (parseFloat(sa.cantidad)||0) * (parseFloat(e?.precio_unitario)||0)
      }, 0)
      const dirCost = costos_directos.filter(c => c.proyecto_id===proyId && c.actividad_id===act.id).reduce((s,c) => s + (parseFloat(c.monto)||0), 0)
      const subCost = subcontratos.filter(s => s.proyecto_id===proyId && s.actividad_id===act.id).reduce((s,sc) => s + (parseFloat(sc.monto_pagado)||0), 0)
      const eqCost  = equipos.filter(e => e.proyecto_id===proyId && e.actividad_id===act.id).reduce((s,e) => s + (parseFloat(e.costo_total)||0), 0)
      const real = matCost + dirCost + subCost + eqCost
      const dev  = real - presupuestado
      return { code: act.code, descripcion: act.descripcion, presupuestado, real, dev, devPct: presupuestado ? (dev/presupuestado)*100 : 0 }
    }).filter(a => a.presupuestado > 0 || a.real > 0)
  }, [items, salidas, entradas, costos_directos, subcontratos, equipos, proyId])

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm text-xs">
        <p className="font-medium text-gray-700 mb-1">{label}</p>
        {payload.map((p,i) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {fmt(p.value, moneda)}</p>
        ))}
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard label={t('curva_kpi_budget')} value={fmt(budget, moneda)} />
            <StatCard label={t('curva_kpi_real')}   value={fmt(totalReal, moneda)} />
            <StatCard
              label={t('curva_kpi_deviation')}
              value={`${desviacion>=0?'+':''}${fmt(desviacion,moneda)}`}
              color={desviacion > 0 ? '#ef4444' : desviacion < 0 ? '#1D9E75' : '#6b7280'}
              sub={desviacion > 0 ? t('curva_overcost') : desviacion < 0 ? t('curva_saving') : t('curva_on_budget')}
            />
            <StatCard
              label={t('curva_kpi_execution')}
              value={budget > 0 ? `${((totalReal/budget)*100).toFixed(1)}%` : '0%'}
              sub={t('curva_kpi_execution_sub')}
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
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ top:5, right:20, left:10, bottom:5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="periodo"
                    tick={{ fontSize:11, fill:'#9ca3af' }}
                    interval={Math.max(0, Math.floor(chartData.length / 8) - 1)}
                  />
                  <YAxis
                    tick={{ fontSize:11, fill:'#9ca3af' }}
                    tickFormatter={v => {
                      if (v >= 1000000) return `${(v/1000000).toFixed(1)}M`
                      if (v >= 1000)    return `${(v/1000).toFixed(0)}K`
                      return v
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize:12 }} />
                  <Line
                    type="monotone"
                    dataKey="presAcum"
                    name={t('curva_line_budget')}
                    stroke="#185FA5"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r:5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="realAcum"
                    name={t('curva_line_real')}
                    stroke="#1D9E75"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r:5 }}
                  />
                </LineChart>
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
                    const status = Math.abs(a.devPct) < 5 ? 'ok' : Math.abs(a.devPct) < 15 ? 'alerta' : 'critico'
                    return (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-xs font-mono text-gray-500">{a.code}</td>
                        <td className="px-4 py-3 text-sm text-gray-800 max-w-[180px] truncate">{a.descripcion}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{fmt(a.presupuestado, moneda)}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{fmt(a.real, moneda)}</td>
                        <td className="px-4 py-3 text-sm font-mono font-medium" style={{ color: a.dev>0?'#ef4444':a.dev<0?'#1D9E75':'#6b7280' }}>
                          {a.dev>=0?'+':''}{fmt(a.dev, moneda)}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono" style={{ color: a.dev>0?'#ef4444':'#1D9E75' }}>
                          {a.dev>=0?'+':''}{a.devPct.toFixed(1)}%
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
