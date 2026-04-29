import { useState, useMemo } from 'react'
import { useStore } from '../store'
import { fmt, fmtNum, calcGrandTotal } from '../utils'
import { EmptyState, StatCard, Icons } from '../components'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function CurvaS() {
  const { state } = useStore()
  const { proyectos, presupuesto, fases, salidas, entradas, costos_directos, nominas, subcontratos, equipos, costos_indirectos, materiales } = state
  const [proyId, setProyId] = useState(proyectos[0]?.id || '')
  const [granularity, setGranularity] = useState('mes')

  const proy = proyectos.find(p => p.id === proyId)
  const moneda = proy?.moneda || 'USD'

  const items = presupuesto.filter(b => b.proyecto_id === proyId)
  const budget = calcGrandTotal(items)

  // Gather all real costs with dates
  const allCosts = useMemo(() => {
    if (!proyId) return []
    const costs = []
    salidas.filter(s=>s.proyecto_id===proyId).forEach(s => {
      const e = entradas.find(en=>en.material_id===s.material_id)
      const monto = (parseFloat(s.cantidad)||0)*(parseFloat(e?.precio_unitario)||0)
      if (monto > 0) costs.push({ fecha: s.fecha_salida, monto })
    })
    costos_directos.filter(c=>c.proyecto_id===proyId).forEach(c => costs.push({ fecha:c.fecha, monto: parseFloat(c.monto)||0 }))
    nominas.filter(n=>n.proyecto_id===proyId).forEach(n => costs.push({ fecha:n.periodo_fin, monto: (parseFloat(n.salario_base)||0)-(parseFloat(n.deducciones)||0) }))
    subcontratos.filter(s=>s.proyecto_id===proyId).forEach(s => s.monto_pagado > 0 && costs.push({ fecha:s.created_at, monto: parseFloat(s.monto_pagado)||0 }))
    equipos.filter(e=>e.proyecto_id===proyId).forEach(e => costs.push({ fecha:e.created_at, monto: parseFloat(e.costo_total)||0 }))
    costos_indirectos.filter(c=>c.proyecto_id===proyId).forEach(c => costs.push({ fecha:c.fecha, monto: parseFloat(c.monto)||0 }))
    return costs.filter(c => c.fecha && c.monto > 0).sort((a,b) => a.fecha.localeCompare(b.fecha))
  }, [proyId, salidas, costos_directos, nominas, subcontratos, equipos, costos_indirectos, entradas])

  const chartData = useMemo(() => {
    if (!allCosts.length && !budget) return []
    const periodKey = (d) => {
      const dt = new Date(d + 'T00:00:00')
      if (granularity === 'mes') return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`
      const week = Math.ceil(dt.getDate() / 7)
      return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-S${week}`
    }
    const periodLabel = (k) => {
      if (granularity === 'mes') {
        const [y,m] = k.split('-')
        return new Date(parseInt(y), parseInt(m)-1).toLocaleDateString('es', { month:'short', year:'2-digit' })
      }
      return k.slice(5)
    }

    // Group real costs by period
    const byPeriod = {}
    allCosts.forEach(c => {
      const k = periodKey(c.fecha)
      byPeriod[k] = (byPeriod[k] || 0) + c.monto
    })

    // If no real costs, build presupuesto distribution over project dates
    const periods = Object.keys(byPeriod).sort()
    if (periods.length === 0 && proy?.fecha_inicio) {
      return [{ periodo: periodLabel(periodKey(proy.fecha_inicio)), presupuestado: budget, real: 0, presAcum: budget, realAcum: 0 }]
    }

    let realAcum = 0
    const budgetPerPeriod = budget / Math.max(periods.length, 1)
    let presAcum = 0

    return periods.map((k, i) => {
      realAcum += byPeriod[k]
      presAcum += budgetPerPeriod
      return {
        periodo: periodLabel(k),
        real_periodo: byPeriod[k],
        pres_periodo: budgetPerPeriod,
        realAcum: Math.round(realAcum * 100) / 100,
        presAcum: Math.round(Math.min(presAcum, budget) * 100) / 100,
      }
    })
  }, [allCosts, budget, granularity, proy])

  const totalReal = allCosts.reduce((s,c) => s+c.monto, 0)
  const desviacion = totalReal - budget

  // Deviations by activity
  const actDeviations = useMemo(() => {
    if (!proyId) return []
    return items.filter(i=>i.tipo==='actividad').map(act => {
      const presupuestado = (act.cantidad||0)*((act.costo_mo||0)+(act.costo_materiales||0)+(act.costo_equipos||0))
      const matCost = salidas.filter(s=>s.proyecto_id===proyId&&s.actividad_id===act.id).reduce((s,sa) => {
        const e = entradas.find(en=>en.material_id===sa.material_id)
        return s+(parseFloat(sa.cantidad)||0)*(parseFloat(e?.precio_unitario)||0)
      }, 0)
      const dirCost = costos_directos.filter(c=>c.proyecto_id===proyId&&c.actividad_id===act.id).reduce((s,c)=>s+(parseFloat(c.monto)||0), 0)
      const subCost = subcontratos.filter(s=>s.proyecto_id===proyId&&s.actividad_id===act.id).reduce((s,sc)=>s+(parseFloat(sc.monto_pagado)||0), 0)
      const eqCost = equipos.filter(e=>e.proyecto_id===proyId&&e.actividad_id===act.id).reduce((s,e)=>s+(parseFloat(e.costo_total)||0), 0)
      const real = matCost + dirCost + subCost + eqCost
      const dev = real - presupuestado
      return { code: act.code, descripcion: act.descripcion, presupuestado, real, dev, devPct: presupuestado ? (dev/presupuestado)*100 : 0 }
    }).filter(a => a.presupuestado > 0 || a.real > 0)
  }, [items, salidas, costos_directos, subcontratos, equipos, proyId, entradas])

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm text-xs">
        <p className="font-medium text-gray-700 mb-1">{label}</p>
        {payload.map((p,i) => (
          <p key={i} style={{color:p.color}}>{p.name}: {fmt(p.value, moneda)}</p>
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Curva S & Reportes</h1>
          {proy && <p className="text-sm text-gray-400 mt-0.5">{proy.project_code} — {proy.nombre}</p>}
        </div>
        <div className="flex items-center gap-3">
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1D9E75]" value={proyId} onChange={e => setProyId(e.target.value)}>
            <option value="">— Proyecto —</option>
            {proyectos.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>)}
          </select>
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1D9E75]" value={granularity} onChange={e=>setGranularity(e.target.value)}>
            <option value="mes">Por mes</option>
            <option value="semana">Por semana</option>
          </select>
        </div>
      </div>

      {!proyId ? (
        <EmptyState icon={Icons.curvas} title="Selecciona un proyecto" subtitle="Elige un proyecto para ver su Curva S" />
      ) : budget === 0 && allCosts.length === 0 ? (
        <EmptyState icon={Icons.curvas} title="Sin datos suficientes"
          subtitle="Registra el presupuesto y los costos reales del proyecto para generar la Curva S" />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard label="Presupuesto Total" value={fmt(budget, moneda)} />
            <StatCard label="Costo Real" value={fmt(totalReal, moneda)} />
            <StatCard label="Desviación" value={`${desviacion>=0?'+':''}${fmt(desviacion,moneda)}`}
              color={desviacion > 0 ? '#ef4444' : desviacion < 0 ? '#1D9E75' : '#6b7280'}
              sub={desviacion > 0 ? 'sobrecosto' : desviacion < 0 ? 'ahorro' : 'en presupuesto'} />
            <StatCard label="Ejecución" value={budget > 0 ? `${((totalReal/budget)*100).toFixed(1)}%` : '0%'}
              sub="del presupuesto utilizado" />
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Curva S — Costo Acumulado ({moneda})</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top:5, right:20, left:10, bottom:5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="periodo" tick={{ fontSize:11, fill:'#9ca3af' }} />
                  <YAxis tick={{ fontSize:11, fill:'#9ca3af' }} tickFormatter={v => {
                    if (v >= 1000000) return `${(v/1000000).toFixed(1)}M`
                    if (v >= 1000) return `${(v/1000).toFixed(0)}K`
                    return v
                  }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize:12 }} />
                  <Line type="monotone" dataKey="presAcum" name="Presupuestado" stroke="#185FA5" strokeWidth={2} dot={{ r:4 }} />
                  <Line type="monotone" dataKey="realAcum" name="Real Ejecutado" stroke="#1D9E75" strokeWidth={2} dot={{ r:4 }} strokeDasharray={totalReal < budget ? '5 5' : undefined} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Deviations table */}
          {actDeviations.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="text-sm font-semibold text-gray-700">Desviaciones por Actividad</h2>
              </div>
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {['Código','Actividad','Presupuestado','Real','Desviación $','Desv. %','Estado'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {actDeviations.map((a, i) => {
                    const status = Math.abs(a.devPct) < 5 ? 'ok' : Math.abs(a.devPct) < 15 ? 'alerta' : 'crítico'
                    return (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-xs font-mono text-gray-500">{a.code}</td>
                        <td className="px-4 py-3 text-sm text-gray-800 max-w-[180px] truncate">{a.descripcion}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{fmt(a.presupuestado, moneda)}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{fmt(a.real, moneda)}</td>
                        <td className="px-4 py-3 text-sm font-mono font-medium" style={{ color: a.dev > 0 ? '#ef4444' : a.dev < 0 ? '#1D9E75' : '#6b7280' }}>
                          {a.dev >= 0 ? '+' : ''}{fmt(a.dev, moneda)}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono" style={{ color: a.dev > 0 ? '#ef4444' : '#1D9E75' }}>
                          {a.dev >= 0 ? '+' : ''}{a.devPct.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                            ${status==='ok'?'bg-green-100 text-green-700':status==='alerta'?'bg-amber-100 text-amber-700':'bg-red-100 text-red-600'}`}>
                            {status==='ok'?'✓ OK':status==='alerta'?'⚠ Alerta':'⚠ Crítico'}
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
