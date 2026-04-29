import { useStore } from '../store'
import { fmt, calcGrandTotal, ESTADO_COLORS, ESTADO_LABELS } from '../utils'
import { StatCard, Icons, Badge } from '../components'

export default function Dashboard({ onNavigate }) {
  const { state } = useStore()
  const { proyectos, presupuesto, entradas, salidas, costos_directos, nominas, subcontratos, equipos, costos_indirectos, solicitudes, materiales, ordenes_compra } = state

  const activos = proyectos.filter(p => p.estado === 'en_ejecucion').length
  const totalPresupuestado = proyectos.reduce((s, p) => {
    const items = presupuesto.filter(b => b.proyecto_id === p.id)
    return s + calcGrandTotal(items)
  }, 0)

  const calcRealPorProyecto = (pid) => {
    const matCost = salidas.filter(s => s.proyecto_id === pid).reduce((s, sa) => {
      const entrada = entradas.find(e => e.material_id === sa.material_id)
      return s + (parseFloat(sa.cantidad)||0) * (parseFloat(entrada?.precio_unitario)||0)
    }, 0)
    const directos = costos_directos.filter(c => c.proyecto_id === pid).reduce((s,c) => s+(parseFloat(c.monto)||0), 0)
    const nom = nominas.filter(n => n.proyecto_id === pid).reduce((s,n) => s+(parseFloat(n.salario_base)||0)-(parseFloat(n.deducciones)||0), 0)
    const sub = subcontratos.filter(sc => sc.proyecto_id === pid).reduce((s,sc) => s+(parseFloat(sc.monto_pagado)||0), 0)
    const eq = equipos.filter(e => e.proyecto_id === pid).reduce((s,e) => s+(parseFloat(e.costo_total)||0), 0)
    const ind = costos_indirectos.filter(c => c.proyecto_id === pid).reduce((s,c) => s+(parseFloat(c.monto)||0), 0)
    return matCost + directos + nom + sub + eq + ind
  }

  const totalReal = proyectos.reduce((s, p) => s + calcRealPorProyecto(p.id), 0)
  const desviacion = totalReal - totalPresupuestado
  const stockCritico = materiales.filter(m => m.activo !== false && parseFloat(m.stock_actual) <= parseFloat(m.stock_minimo || 0)).length
  const solicPendientes = solicitudes.filter(s => s.estado === 'pendiente').length
  const ocPendientes = ordenes_compra.filter(oc => oc.estado === 'pendiente_aprobacion').length

  const alerts = []
  if (stockCritico > 0) alerts.push({ type: 'warning', msg: `${stockCritico} material(es) con stock crítico`, page: 'inventario' })
  if (solicPendientes > 0) alerts.push({ type: 'warning', msg: `${solicPendientes} solicitud(es) pendiente(s) de aprobación`, page: 'compras' })
  if (ocPendientes > 0) alerts.push({ type: 'info', msg: `${ocPendientes} OC pendiente(s) de aprobación`, page: 'compras' })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Panel Principal</h1>
        <p className="text-sm text-gray-400 mt-0.5">Resumen general del sistema</p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="flex flex-col gap-2 mb-5">
          {alerts.map((a, i) => (
            <div key={i}
              onClick={() => onNavigate(a.page)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm cursor-pointer transition-opacity hover:opacity-90
                ${a.type === 'warning' ? 'bg-amber-50 border border-amber-200 text-amber-700' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}
            >
              <span className="w-4 h-4 flex-shrink-0">{Icons.alert}</span>
              {a.msg} — <span className="underline ml-1">ver</span>
            </div>
          ))}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Proyectos activos" value={activos} sub={`de ${proyectos.length} total`} color="#1D9E75" />
        <StatCard label="Presupuestado total" value={fmt(totalPresupuestado)} sub="todos los proyectos" />
        <StatCard label="Ejecutado real" value={fmt(totalReal)} sub="costos registrados" />
        <StatCard
          label="Desviación global"
          value={`${desviacion >= 0 ? '+' : ''}${fmt(desviacion)}`}
          sub={desviacion >= 0 ? 'sobrecosto' : 'ahorro'}
          color={desviacion > 0 ? '#ef4444' : desviacion < 0 ? '#1D9E75' : '#6b7280'}
        />
      </div>

      {/* Projects table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-sm text-gray-700">Estado de Proyectos</h2>
          <button onClick={() => onNavigate('proyectos')} className="text-xs text-[#1D9E75] hover:underline">Ver todos →</button>
        </div>
        {proyectos.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-2 text-gray-400">
            <span className="w-10 h-10 text-gray-200">{Icons.projects}</span>
            <p className="text-sm">No hay proyectos registrados</p>
            <button onClick={() => onNavigate('proyectos')} className="text-xs text-[#1D9E75] hover:underline mt-1">Crear primer proyecto →</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  {['Código','Proyecto','Cliente','Estado','Moneda','Presupuestado','Ejecutado','Desviación'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {proyectos.map(p => {
                  const budget = calcGrandTotal(presupuesto.filter(b => b.proyecto_id === p.id))
                  const real = calcRealPorProyecto(p.id)
                  const dev = real - budget
                  return (
                    <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50/50 cursor-pointer" onClick={() => onNavigate('proyectos')}>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{p.project_code}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{p.nombre}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{p.cliente_externo || '—'}</td>
                      <td className="px-4 py-3"><Badge estado={p.estado} /></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{p.moneda}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{fmt(budget, p.moneda)}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{fmt(real, p.moneda)}</td>
                      <td className="px-4 py-3 text-sm font-mono font-medium" style={{ color: dev > 0 ? '#ef4444' : dev < 0 ? '#1D9E75' : '#6b7280' }}>
                        {dev >= 0 ? '+' : ''}{fmt(dev, p.moneda)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
