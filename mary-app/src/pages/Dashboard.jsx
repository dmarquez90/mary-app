import { useContext, useMemo } from 'react'
import { useStore } from '../store'
import { LangContext } from '../i18n'
import { fmt } from '../utils'

const ESTADO_LABELS_ES = {
  activo: 'Activo', en_ejecucion: 'En Ejecución', planificacion: 'Planificación',
  pausado: 'Pausado', completado: 'Completado', cancelado: 'Cancelado',
  finalizado: 'Finalizado',
}
const ESTADO_LABELS_EN = {
  activo: 'Active', en_ejecucion: 'In Progress', planificacion: 'Planning',
  pausado: 'On Hold', completado: 'Completed', cancelado: 'Cancelled',
  finalizado: 'Finalized',
}

const CAT_LABELS_EN = {
  madera: 'Wood', acero: 'Steel', concreto: 'Concrete', hierro: 'Iron',
  aluminio: 'Aluminum', plastico: 'Plastic', electrico: 'Electrical',
  herramienta: 'Tools', herramientas: 'Tools', pintura: 'Paint', ceramica: 'Ceramic',
  plomeria: 'Plumbing', vidrio: 'Glass', otros: 'Other',
  acabados: 'Finishes', equipos: 'Equipment',
}

export default function Dashboard() {
  const { state } = useStore()
  const { t, lang } = useContext(LangContext)
  const isEs = lang === 'ES'
  const { proyectos, materiales, entradas, salidas, ordenes_compra, solicitudes, ordenes_cambio = [] } = state

  // ── Materiales activos ────────────────────────────────────────────────────
  const activos = materiales.filter(m => m.activo !== false)

  // ── Proyectos sin finalizados ─────────────────────────────────────────────
  const proyectosActivos = proyectos.filter(
    p => p.estado !== 'finalizado' && p.estado !== 'completed' && p.estado !== 'finalized'
  )

  // ── Categorías de materiales ──────────────────────────────────────────────
  const categorias = useMemo(() => {
    const map = {}
    activos.forEach(m => {
      const cat = m.categoria || t('uncategorized')
      map[cat] = (map[cat] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [activos, t])

  // ── Últimas 3 entradas ────────────────────────────────────────────────────
  const ultimasEntradas = useMemo(() => {
    return [...entradas]
      .sort((a, b) => new Date(b.fecha_recepcion || b.created_at) - new Date(a.fecha_recepcion || a.created_at))
      .slice(0, 3)
      .map(e => ({
        ...e,
        nombreMaterial: materiales.find(m => m.id === e.material_id)?.nombre || '—',
      }))
  }, [entradas, materiales])

  // ── Últimas 3 salidas ─────────────────────────────────────────────────────
  const ultimasSalidas = useMemo(() => {
    return [...salidas]
      .sort((a, b) => new Date(b.fecha_salida || b.created_at) - new Date(a.fecha_salida || a.created_at))
      .slice(0, 3)
      .map(s => ({
        ...s,
        nombreMaterial: materiales.find(m => m.id === s.material_id)?.nombre || '—',
      }))
  }, [salidas, materiales])

  // ── Solicitudes por estado ────────────────────────────────────────────────
  const solicitudesStats = useMemo(() => {
    const pendientes = solicitudes.filter(s => !s.estado || s.estado === '').length
    const ocGenerada = solicitudes.filter(s => s.estado === 'oc_generada').length
    const rechazadas = solicitudes.filter(s => s.estado === 'rechazada').length
    return { pendientes, ocGenerada, rechazadas }
  }, [solicitudes])

  // ── OC por status ─────────────────────────────────────────────────────────
  const ocStats = useMemo(() => {
    const pendientes = ordenes_compra.filter(o => o.status === 'pending' || o.status === 'draft').length
    const aprobadas  = ordenes_compra.filter(o => o.status === 'approved' || o.status === 'sent' || o.status === 'received').length
    const canceladas = ordenes_compra.filter(o => o.status === 'cancelled').length
    return { pendientes, aprobadas, canceladas }
  }, [ordenes_compra])

  // ── Órdenes de Cambio stats ───────────────────────────────────────────────
  const ocCambioStats = useMemo(() => {
    const aprobadas   = ordenes_cambio.filter(o => o.estado === 'aprobada')
    const pendientes  = ordenes_cambio.filter(o => o.estado === 'presentada')
    const deltaTotal  = aprobadas.reduce((s, o) => s + parseFloat(o.total_oc || 0), 0)
    return { aprobadas: aprobadas.length, pendientes: pendientes.length, deltaTotal }
  }, [ordenes_cambio])

  // ── Valor inventario FIFO ─────────────────────────────────────────────────
  const valorInventario = useMemo(() => {
    return activos.reduce((total, mat) => {
      const stock = parseFloat(mat.stock_actual || 0)
      if (stock <= 0) return total
      const entsOrdenadas = [...entradas]
        .filter(e => e.material_id === mat.id)
        .sort((a, b) => new Date(a.fecha_recepcion) - new Date(b.fecha_recepcion))
      if (entsOrdenadas.length === 0) {
        return total + (stock * parseFloat(mat.precio_unitario || 0))
      }
      const totalSalidasMat = salidas
        .filter(s => s.material_id === mat.id)
        .reduce((s, sal) => s + parseFloat(sal.cantidad || 0), 0)
      let restante = totalSalidasMat
      let valorStock = 0
      for (const entrada of entsOrdenadas) {
        const cantEntrada   = parseFloat(entrada.cantidad || 0)
        const precioEntrada = parseFloat(entrada.precio_unitario || mat.precio_unitario || 0)
        if (restante >= cantEntrada) {
          restante -= cantEntrada
        } else {
          valorStock += (cantEntrada - restante) * precioEntrada
          restante = 0
        }
      }
      return total + valorStock
    }, 0)
  }, [activos, entradas, salidas])

  // ── Moneda predominante ───────────────────────────────────────────────────
  const monedaPrincipal = useMemo(() => {
    if (proyectos.length === 0) return 'USD'
    const conteo = proyectos.reduce((acc, p) => {
      const m = p.moneda || 'USD'
      acc[m] = (acc[m] || 0) + 1
      return acc
    }, {})
    return Object.entries(conteo).sort((a, b) => b[1] - a[1])[0][0]
  }, [proyectos])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmtDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
  }

  const estadoColor = (estado) => ({
    activo:       'bg-green-100 text-green-700',
    'en curso':   'bg-blue-100 text-blue-700',
    en_ejecucion: 'bg-blue-100 text-blue-700',
    pausado:      'bg-yellow-100 text-yellow-700',
    cancelado:    'bg-red-100 text-red-700',
  }[estado?.toLowerCase()] || 'bg-gray-100 text-gray-600')

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">{t('dash_title')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* ── PROYECTOS ── */}
        <div className="bg-white shadow rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-700">{t('dash_projects')}</h2>
            <span className="text-2xl font-bold text-blue-600">{proyectosActivos.length}</span>
          </div>
          {proyectosActivos.length === 0 ? (
            <p className="text-sm text-gray-400">{t('no_data')}</p>
          ) : (
            <ul className="space-y-1.5">
              {proyectosActivos.map(p => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate max-w-[160px]" title={p.nombre}>{p.nombre}</span>
                  {p.estado && (
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${estadoColor(p.estado)}`}>
                      {isEs ? (ESTADO_LABELS_ES[p.estado] || p.estado) : (ESTADO_LABELS_EN[p.estado] || p.estado)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── MATERIALES ── */}
        <div className="bg-white shadow rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-700">{t('dash_materials')}</h2>
            <span className="text-2xl font-bold text-green-600">{activos.length}</span>
          </div>
          {categorias.length === 0 ? (
            <p className="text-sm text-gray-400">{t('no_data')}</p>
          ) : (
            <ul className="space-y-1.5">
              {categorias.map(([cat, count]) => (
                <li key={cat} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate max-w-[160px]" title={cat}>
                    {isEs ? cat : (CAT_LABELS_EN[cat?.toLowerCase()] || cat)}
                  </span>
                  <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded font-medium">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── INVENTORY VALUE ── */}
        <div className="bg-white shadow rounded p-4 flex flex-col justify-center">
          <h2 className="text-lg font-semibold text-gray-700 mb-1">{t('dash_inv_value')}</h2>
          <p className="text-2xl font-bold text-emerald-600">{fmt(valorInventario, monedaPrincipal)}</p>
          <p className="text-xs text-gray-400 mt-1">{t('dash_fifo')}</p>
        </div>

        {/* ── ENTRADAS ── */}
        <div className="bg-white shadow rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-700">{t('dash_entries')}</h2>
            <span className="text-2xl font-bold text-indigo-600">{entradas.length}</span>
          </div>
          {ultimasEntradas.length === 0 ? (
            <p className="text-sm text-gray-400">{t('no_data')}</p>
          ) : (
            <ul className="space-y-2">
              {ultimasEntradas.map(e => (
                <li key={e.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate max-w-[160px]" title={e.nombreMaterial}>{e.nombreMaterial}</span>
                  <span className="text-xs text-gray-400">{fmtDate(e.fecha_recepcion || e.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── SALIDAS ── */}
        <div className="bg-white shadow rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-700">{t('dash_outputs')}</h2>
            <span className="text-2xl font-bold text-red-600">{salidas.length}</span>
          </div>
          {ultimasSalidas.length === 0 ? (
            <p className="text-sm text-gray-400">{t('no_data')}</p>
          ) : (
            <ul className="space-y-2">
              {ultimasSalidas.map(s => (
                <li key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate max-w-[160px]" title={s.nombreMaterial}>{s.nombreMaterial}</span>
                  <span className="text-xs text-gray-400">{fmtDate(s.fecha_salida || s.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── SOLICITUDES ── */}
        <div className="bg-white shadow rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-700">{t('dash_requests')}</h2>
            <span className="text-2xl font-bold text-yellow-600">{solicitudes.length}</span>
          </div>
          <ul className="space-y-2">
            <li className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{t('dash_pending')}</span>
              <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded font-medium">{solicitudesStats.pendientes}</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{t('dash_oc_generated')}</span>
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">{solicitudesStats.ocGenerada}</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{t('dash_rejected')}</span>
              <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded font-medium">{solicitudesStats.rechazadas}</span>
            </li>
          </ul>
        </div>

        {/* ── PURCHASE ORDERS ── */}
        <div className="bg-white shadow rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-700">{t('dash_purchase_orders')}</h2>
            <span className="text-2xl font-bold text-purple-600">{ordenes_compra.length}</span>
          </div>
          <ul className="space-y-2">
            <li className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{t('dash_pending_draft')}</span>
              <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded font-medium">{ocStats.pendientes}</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{t('dash_approved_sent_received')}</span>
              <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded font-medium">{ocStats.aprobadas}</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{t('dash_cancelled')}</span>
              <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded font-medium">{ocStats.canceladas}</span>
            </li>
          </ul>
        </div>

        {/* ── ÓRDENES DE CAMBIO ── */}
        {ordenes_cambio.length > 0 && (
          <div className="bg-white shadow rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-700">
                {isEs ? 'Órdenes de Cambio' : 'Change Orders'}
              </h2>
              <span className="text-2xl font-bold" style={{ color: '#F59E0B' }}>{ordenes_cambio.length}</span>
            </div>
            <ul className="space-y-2">
              <li className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{isEs ? 'Aprobadas' : 'Approved'}</span>
                <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded font-medium">{ocCambioStats.aprobadas}</span>
              </li>
              <li className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{isEs ? 'Pendientes aprobación' : 'Pending approval'}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${ocCambioStats.pendientes > 0 ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-500'}`}>{ocCambioStats.pendientes}</span>
              </li>
              {ocCambioStats.deltaTotal !== 0 && (
                <li className="flex items-center justify-between text-sm pt-1 border-t border-gray-100 mt-1">
                  <span className="text-gray-600 font-medium">{isEs ? 'Variación total' : 'Total variation'}</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                    style={{ color: ocCambioStats.deltaTotal > 0 ? '#1D9E75' : '#ef4444', background: ocCambioStats.deltaTotal > 0 ? '#F0FDF4' : '#FEF2F2' }}>
                    {ocCambioStats.deltaTotal > 0 ? '+' : ''}{fmt(ocCambioStats.deltaTotal, monedaPrincipal)}
                  </span>
                </li>
              )}
            </ul>
          </div>
        )}

      </div>
    </div>
  )
}
