import { useContext, useMemo } from 'react'
import { useStore } from '../store'
import { LangContext } from '../i18n'
import { fmt } from '../utils'

export default function Dashboard() {
  const { state } = useStore()
  const { t } = useContext(LangContext)
  const { proyectos, materiales, entradas, salidas, ordenes_compra, solicitudes } = state

  // Solo materiales activos
  const activos = materiales.filter(m => m.activo !== false)

  const totalProyectos   = proyectos.length
  const totalMateriales  = activos.length
  const totalEntradas    = entradas.length
  const totalSalidas     = salidas.length
  const totalOC          = ordenes_compra.length
  const totalSolicitudes = solicitudes.length

  // Valor del inventario usando FIFO
  // Para cada material activo: calculamos el costo promedio ponderado de las entradas
  // restando lo que ya salió (FIFO simplificado: precio promedio de entradas restantes)
  const valorInventario = useMemo(() => {
    return activos.reduce((total, mat) => {
      const stock = parseFloat(mat.stock_actual || 0)
      if (stock <= 0) return total

      // Entradas de este material ordenadas por fecha (FIFO = más antiguas primero)
      const entsOrdenadas = [...entradas]
        .filter(e => e.material_id === mat.id)
        .sort((a, b) => new Date(a.fecha_recepcion) - new Date(b.fecha_recepcion))

      // Total salidas de este material
      const totalSalidasMat = salidas
        .filter(s => s.material_id === mat.id)
        .reduce((s, sal) => s + parseFloat(sal.cantidad || 0), 0)

      // Aplicar FIFO: consumir las entradas más antiguas primero
      let restante = totalSalidasMat
      let valorStock = 0
      let cantidadEnStock = 0

      for (const entrada of entsOrdenadas) {
        const cantEntrada = parseFloat(entrada.cantidad || 0)
        const precioEntrada = parseFloat(entrada.precio_unitario || 0)

        if (restante >= cantEntrada) {
          // Esta entrada ya fue consumida completamente
          restante -= cantEntrada
        } else {
          // Esta entrada está parcialmente consumida
          const cantDisponible = cantEntrada - restante
          valorStock += cantDisponible * precioEntrada
          cantidadEnStock += cantDisponible
          restante = 0
        }
      }

      return total + valorStock
    }, 0)
  }, [activos, entradas, salidas])

  const cards = [
    { label: t('dash_projects'),        value: totalProyectos,   color: 'text-blue-600'   },
    { label: t('dash_materials'),       value: totalMateriales,  color: 'text-green-600'  },
    { label: t('dash_inv_value'),       value: fmt(valorInventario, 'USD'), color: 'text-emerald-600', big: true },
    { label: t('dash_entries'),         value: totalEntradas,    color: 'text-indigo-600' },
    { label: t('dash_outputs'),         value: totalSalidas,     color: 'text-red-600'    },
    { label: t('dash_requests'),        value: totalSolicitudes, color: 'text-yellow-600' },
    { label: t('dash_purchase_orders'), value: totalOC,          color: 'text-purple-600' },
  ]

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">{t('dash_title')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, i) => (
          <div key={i} className="bg-white shadow rounded p-4">
            <h2 className="text-lg font-semibold text-gray-700">{card.label}</h2>
            <p className={`font-bold mt-1 ${card.big ? 'text-2xl' : 'text-3xl'} ${card.color}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
