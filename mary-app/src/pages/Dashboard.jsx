import { useStore } from '../store'
import { useT } from '../i18n'

export default function Dashboard() {
  const { state } = useStore()
  const t = useT()

  const totalProyectos = state.proyectos.length
  const totalMateriales = state.materiales.length
  const totalEntradas = state.entradas.length
  const totalSalidas = state.salidas.length
  const totalOC = state.ordenes_compra.length
  const totalSolicitudes = state.solicitudes.length

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">{t('dash_title')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="bg-white shadow rounded p-4">
          <h2 className="text-lg font-semibold">{t('dash_projects')}</h2>
          <p className="text-3xl font-bold text-blue-600">{totalProyectos}</p>
        </div>

        <div className="bg-white shadow rounded p-4">
          <h2 className="text-lg font-semibold">{t('dash_materials')}</h2>
          <p className="text-3xl font-bold text-green-600">{totalMateriales}</p>
        </div>

        <div className="bg-white shadow rounded p-4">
          <h2 className="text-lg font-semibold">{t('dash_entries')}</h2>
          <p className="text-3xl font-bold text-indigo-600">{totalEntradas}</p>
        </div>

        <div className="bg-white shadow rounded p-4">
          <h2 className="text-lg font-semibold">{t('dash_outputs')}</h2>
          <p className="text-3xl font-bold text-red-600">{totalSalidas}</p>
        </div>

        <div className="bg-white shadow rounded p-4">
          <h2 className="text-lg font-semibold">{t('dash_requests')}</h2>
          <p className="text-3xl font-bold text-yellow-600">{totalSolicitudes}</p>
        </div>

        <div className="bg-white shadow rounded p-4">
          <h2 className="text-lg font-semibold">{t('dash_purchase_orders')}</h2>
          <p className="text-3xl font-bold text-purple-600">{totalOC}</p>
        </div>

      </div>
    </div>
  )
}
