import { useContext, useMemo, useState } from 'react'
import { useStore } from '../store'
import { LangContext } from '../i18n'
import { fmt } from '../utils'
import {
  PageHeader, KpiCard, Card, CardHeader, Chip, Icons, Progress, Donut,
  EmptyState, Segmented, TONES,
} from '../components'

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

const ESTADO_TONE = {
  activo: 'ok', en_ejecucion: 'info', planificacion: 'accent',
  pausado: 'warn', completado: 'ok', cancelado: 'danger', finalizado: 'neutral',
}

const CAT_LABELS_EN = {
  madera: 'Wood', acero: 'Steel', concreto: 'Concrete', hierro: 'Iron',
  aluminio: 'Aluminum', plastico: 'Plastic', electrico: 'Electrical',
  herramienta: 'Tools', herramientas: 'Tools', pintura: 'Paint', ceramica: 'Ceramic',
  plomeria: 'Plumbing', vidrio: 'Glass', otros: 'Other',
  acabados: 'Finishes', equipos: 'Equipment',
}

const PALETA = ['var(--brand-2)', 'var(--ok)', 'var(--warn)', 'var(--accent)', 'var(--info)', 'var(--danger)']

// ── Gráfico de barras por mes (entradas vs salidas) ───────────────────────
function BarrasMensuales({ series, labels, isEs }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...series.flatMap(s => s.data))

  return (
    <div>
      <div className="flex items-end gap-2 h-[150px] mt-2">
        {labels.map((mes, i) => (
          <div key={mes} className="flex-1 flex flex-col items-center gap-1.5 min-w-0"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <div className="w-full flex items-end justify-center gap-1 flex-1">
              {series.map(s => {
                const h = (s.data[i] / max) * 100
                return (
                  <div key={s.id} className="flex-1 rounded-t-md relative"
                    style={{
                      height: `${Math.max(h, s.data[i] > 0 ? 4 : 0)}%`,
                      minHeight: s.data[i] > 0 ? 4 : 0,
                      background: s.color,
                      opacity: hover === null || hover === i ? 1 : 0.35,
                      transition: 'height .5s cubic-bezier(.22,1,.36,1), opacity .18s ease',
                    }}
                  />
                )
              })}
            </div>
            <span className="text-[10px] font-medium truncate w-full text-center"
              style={{ color: hover === i ? 'var(--txt)' : 'var(--txt-3)' }}>
              {mes}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: '1px solid var(--bd)' }}>
        {series.map(s => (
          <span key={s.id} className="flex items-center gap-1.5 text-[11.5px]" style={{ color: 'var(--txt-2)' }}>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
            <strong style={{ color: 'var(--txt)' }}>
              {hover !== null ? s.data[hover] : s.data.reduce((a, b) => a + b, 0)}
            </strong>
          </span>
        ))}
        {hover !== null && (
          <span className="text-[11px] ml-auto" style={{ color: 'var(--txt-3)' }}>
            {isEs ? 'Mes' : 'Month'}: {labels[hover]}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Fila de actividad ─────────────────────────────────────────────────────
function FilaActividad({ tipo, titulo, detalle, fecha }) {
  const cfg = {
    entrada:  { tone: 'ok',     icon: Icons.download },
    salida:   { tone: 'warn',   icon: Icons.upload },
    oc:       { tone: 'info',   icon: Icons.purchases },
    bitacora: { tone: 'accent', icon: Icons.supervision },
  }[tipo] || { tone: 'neutral', icon: Icons.box }
  const t = TONES[cfg.tone]

  return (
    <div className="flex items-center gap-3 py-2.5 px-1 rounded-lg m-row">
      <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: t.bg, color: t.fg }}>
        <span className="w-4 h-4">{cfg.icon}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium truncate" style={{ color: 'var(--txt)' }} title={titulo}>{titulo}</p>
        {detalle && <p className="text-[11px] truncate" style={{ color: 'var(--txt-3)' }}>{detalle}</p>}
      </div>
      <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--txt-3)' }}>{fecha}</span>
    </div>
  )
}

export default function Dashboard({ onNavigate }) {
  const { state } = useStore()
  const { t, lang } = useContext(LangContext)
  const isEs = lang === 'ES'
  const {
    proyectos = [], materiales = [], entradas = [], salidas = [],
    ordenes_compra = [], solicitudes = [], ordenes_cambio = [], bitacora_log = [],
  } = state

  const [rango, setRango] = useState('6m')

  // ── Bases ───────────────────────────────────────────────────────────────
  const activos = useMemo(() => materiales.filter(m => m.activo !== false), [materiales])

  const proyectosActivos = useMemo(() => proyectos.filter(
    p => p.estado !== 'finalizado' && p.estado !== 'completed' && p.estado !== 'finalized'
  ), [proyectos])

  const monedaPrincipal = useMemo(() => {
    if (proyectos.length === 0) return 'USD'
    const conteo = proyectos.reduce((acc, p) => {
      const m = p.moneda || 'USD'
      acc[m] = (acc[m] || 0) + 1
      return acc
    }, {})
    return Object.entries(conteo).sort((a, b) => b[1] - a[1])[0][0]
  }, [proyectos])

  // ── Valor de inventario (FIFO) ──────────────────────────────────────────
  const valorInventario = useMemo(() => {
    return activos.reduce((total, mat) => {
      const stock = parseFloat(mat.stock_actual || 0)
      if (stock <= 0) return total
      const entsOrdenadas = [...entradas]
        .filter(e => e.material_id === mat.id)
        .sort((a, b) => new Date(a.fecha_recepcion) - new Date(b.fecha_recepcion))
      if (entsOrdenadas.length === 0) return total + (stock * parseFloat(mat.precio_unitario || 0))

      const totalSalidasMat = salidas
        .filter(s => s.material_id === mat.id)
        .reduce((s, sal) => s + parseFloat(sal.cantidad || 0), 0)
      let restante = totalSalidasMat
      let valorStock = 0
      for (const entrada of entsOrdenadas) {
        const cantEntrada   = parseFloat(entrada.cantidad || 0)
        const precioEntrada = parseFloat(entrada.precio_unitario || mat.precio_unitario || 0)
        if (restante >= cantEntrada) restante -= cantEntrada
        else { valorStock += (cantEntrada - restante) * precioEntrada; restante = 0 }
      }
      return total + valorStock
    }, 0)
  }, [activos, entradas, salidas])

  // ── Serie mensual de movimientos ────────────────────────────────────────
  const { labels, serieEntradas, serieSalidas } = useMemo(() => {
    const meses = rango === '3m' ? 3 : rango === '6m' ? 6 : 12
    const hoy = new Date()
    const buckets = []
    for (let i = meses - 1; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString(isEs ? 'es' : 'en', { month: 'short' }).replace('.', ''),
        entradas: 0, salidas: 0,
      })
    }
    const idx = Object.fromEntries(buckets.map((b, i) => [b.key, i]))
    const clasificar = (fecha, campo) => {
      if (!fecha) return
      const d = new Date(fecha)
      const k = `${d.getFullYear()}-${d.getMonth()}`
      if (idx[k] != null) buckets[idx[k]][campo] += 1
    }
    entradas.forEach(e => clasificar(e.fecha_recepcion || e.created_at, 'entradas'))
    salidas.forEach(s => clasificar(s.fecha_salida || s.created_at, 'salidas'))

    return {
      labels: buckets.map(b => b.label),
      serieEntradas: buckets.map(b => b.entradas),
      serieSalidas: buckets.map(b => b.salidas),
    }
  }, [entradas, salidas, rango, isEs])

  // ── Variación último mes vs anterior ────────────────────────────────────
  const tendencia = (serie) => {
    if (serie.length < 2) return null
    const ult = serie[serie.length - 1]
    const prev = serie[serie.length - 2]
    if (!prev) return ult > 0 ? 100 : null
    return ((ult - prev) / prev) * 100
  }

  // ── Categorías de materiales ────────────────────────────────────────────
  const categorias = useMemo(() => {
    const map = {}
    activos.forEach(m => { const c = m.categoria || t('uncategorized'); map[c] = (map[c] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [activos, t])

  // ── Solicitudes y OC ────────────────────────────────────────────────────
  const solicitudesStats = useMemo(() => ({
    pendientes: solicitudes.filter(s => !s.estado || s.estado === '').length,
    ocGenerada: solicitudes.filter(s => s.estado === 'oc_generada').length,
    rechazadas: solicitudes.filter(s => s.estado === 'rechazada').length,
  }), [solicitudes])

  const ocStats = useMemo(() => ({
    pendientes: ordenes_compra.filter(o => ['pending','draft','pendiente','borrador'].includes(o.estado)).length,
    aprobadas:  ordenes_compra.filter(o => ['approved','sent','received','aprobada','enviada','recibida','recibida_parcial'].includes(o.estado)).length,
    canceladas: ordenes_compra.filter(o => ['cancelled','cancelada','Cancelada'].includes(o.estado)).length,
  }), [ordenes_compra])

  const ocCambioStats = useMemo(() => {
    const aprobadas  = ordenes_cambio.filter(o => o.estado === 'aprobada')
    const pendientes = ordenes_cambio.filter(o => o.estado === 'presentada')
    return {
      aprobadas: aprobadas.length,
      pendientes: pendientes.length,
      deltaTotal: aprobadas.reduce((s, o) => s + parseFloat(o.total_oc || 0), 0),
    }
  }, [ordenes_cambio])

  // ── Alertas de stock ────────────────────────────────────────────────────
  const stockBajo = useMemo(() => activos.filter(m => {
    const min = parseFloat(m.stock_minimo || 0)
    return min > 0 && parseFloat(m.stock_actual || 0) <= min
  }), [activos])

  // ── Actividad reciente combinada ────────────────────────────────────────
  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString(isEs ? 'es' : 'en', { month: 'short', day: 'numeric' })
    : '—'

  const nombreMaterial = (id) => materiales.find(m => m.id === id)?.descripcion || '—'

  const actividad = useMemo(() => {
    const items = [
      ...entradas.map(e => ({
        tipo: 'entrada', fecha: e.fecha_recepcion || e.created_at,
        titulo: nombreMaterial(e.material_id),
        detalle: `${isEs ? 'Entrada' : 'Receipt'} · ${parseFloat(e.cantidad || 0)}`,
      })),
      ...salidas.map(s => ({
        tipo: 'salida', fecha: s.fecha_salida || s.created_at,
        titulo: nombreMaterial(s.material_id),
        detalle: `${isEs ? 'Salida' : 'Issue'} · ${parseFloat(s.cantidad || 0)}`,
      })),
      ...ordenes_compra.map(o => ({
        tipo: 'oc', fecha: o.fecha_emision || o.created_at,
        titulo: `${isEs ? 'OC' : 'PO'} ${o.numero_oc || o.id?.slice(0, 6) || ''}`,
        detalle: o.proveedor || o.estado || '',
      })),
      ...bitacora_log.filter(b => !b.parent_id).map(b => ({
        tipo: 'bitacora', fecha: b.fecha || b.created_at,
        titulo: (b.descripcion || b.titulo || (isEs ? 'Registro de bitácora' : 'Field log entry')).slice(0, 70),
        detalle: isEs ? 'Bitácora de supervisión' : 'Supervision log',
      })),
    ]
    return items
      .filter(i => i.fecha)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 8)
  }, [entradas, salidas, ordenes_compra, bitacora_log, materiales, isEs])

  const irA = (destino) => onNavigate?.(destino)

  const hayDatos = proyectos.length > 0 || materiales.length > 0

  return (
    <div className="p-5 md:p-6 max-w-[1500px] mx-auto">
      <PageHeader
        title={t('dash_title')}
        subtitle={new Date().toLocaleDateString(isEs ? 'es' : 'en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        actions={
          <Segmented
            value={rango} onChange={setRango}
            options={[
              { id: '3m', label: isEs ? '3 meses' : '3 mo' },
              { id: '6m', label: isEs ? '6 meses' : '6 mo' },
              { id: '12m', label: isEs ? '12 meses' : '12 mo' },
            ]}
          />
        }
      />

      {!hayDatos ? (
        <Card padded={false}>
          <EmptyState
            icon={Icons.projects}
            title={isEs ? 'Aún no hay datos que mostrar' : 'No data to show yet'}
            subtitle={isEs
              ? 'Crea tu primer proyecto e importa tu presupuesto para ver aquí tus indicadores en vivo.'
              : 'Create your first project and import your budget to see live indicators here.'}
            action={isEs ? 'Ir a Proyectos' : 'Go to Projects'}
            onAction={() => irA('proyectos')}
          />
        </Card>
      ) : (
        <>
          {/* ══ KPIs ══════════════════════════════════════════════ */}
          <div className="grid gap-3.5 m-stagger"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(215px, 1fr))' }}>
            <KpiCard
              label={t('dash_projects')} value={proyectosActivos.length}
              sub={`${proyectos.length} ${isEs ? 'en total' : 'total'}`}
              icon={Icons.projects} tone="brand" onClick={() => irA('proyectos')}
            />
            <KpiCard
              label={t('dash_inv_value')} value={fmt(valorInventario, monedaPrincipal)}
              sub={t('dash_fifo')} icon={Icons.inventory} tone="ok"
              onClick={() => irA('inventario')}
            />
            <KpiCard
              label={t('dash_materials')} value={activos.length}
              sub={stockBajo.length > 0
                ? `${stockBajo.length} ${isEs ? 'bajo mínimo' : 'below minimum'}`
                : (isEs ? 'Stock saludable' : 'Healthy stock')}
              icon={Icons.box} tone={stockBajo.length > 0 ? 'warn' : 'info'}
              onClick={() => irA('inventario')}
            />
            <KpiCard
              label={t('dash_purchase_orders')} value={ordenes_compra.length}
              sub={`${ocStats.pendientes} ${isEs ? 'por aprobar' : 'to approve'}`}
              icon={Icons.purchases} tone={ocStats.pendientes > 0 ? 'warn' : 'accent'}
              trend={tendencia(serieEntradas)}
              spark={serieEntradas}
              onClick={() => irA('compras')}
            />
          </div>

          {/* ══ Gráfico + actividad ═══════════════════════════════ */}
          <div className="m-grid-main mt-3.5">
            <Card className="min-w-0">
              <CardHeader
                title={isEs ? 'Movimientos de bodega' : 'Warehouse movements'}
                subtitle={isEs ? 'Entradas y salidas registradas por mes' : 'Receipts and issues logged per month'}
                icon={Icons.curvas}
                action={
                  <button onClick={() => irA('inventario')}
                    className="m-btn m-btn-sm m-btn-ghost">
                    {isEs ? 'Ver bodega' : 'View warehouse'}
                  </button>
                }
              />
              <BarrasMensuales
                isEs={isEs}
                labels={labels}
                series={[
                  { id: 'in',  label: t('dash_entries'), color: 'var(--brand-2)', data: serieEntradas },
                  { id: 'out', label: t('dash_outputs'), color: 'var(--ok)',      data: serieSalidas },
                ]}
              />
            </Card>

            <Card className="min-w-0">
              <CardHeader
                title={isEs ? 'Actividad reciente' : 'Recent activity'}
                subtitle={isEs ? 'Lo último que registró tu equipo' : 'Latest entries from your team'}
                icon={Icons.clock} tone="accent"
              />
              {actividad.length === 0 ? (
                <EmptyState compact title={t('no_data')} icon={Icons.clock} />
              ) : (
                <div className="-mx-1 max-h-[268px] overflow-y-auto scrollbar-thin">
                  {actividad.map((a, i) => (
                    <FilaActividad key={i} tipo={a.tipo} titulo={a.titulo} detalle={a.detalle} fecha={fmtDate(a.fecha)} />
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* ══ Proyectos · Solicitudes · OC ══════════════════════ */}
          <div className="grid gap-3.5 mt-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))' }}>

            {/* Proyectos activos */}
            <Card>
              <CardHeader
                title={t('dash_projects')} icon={Icons.projects}
                subtitle={`${proyectosActivos.length} ${isEs ? 'activos' : 'active'}`}
                action={
                  <button onClick={() => irA('proyectos')} className="m-icon-btn m-tip" data-tip={isEs ? 'Ver todos' : 'View all'}>
                    <span className="w-4 h-4">{Icons.chevron}</span>
                  </button>
                }
              />
              {proyectosActivos.length === 0 ? (
                <EmptyState compact title={t('no_data')} icon={Icons.projects} />
              ) : (
                <div className="flex flex-col gap-2">
                  {proyectosActivos.slice(0, 6).map(p => (
                    <div key={p.id} className="flex items-center justify-between gap-2 py-1.5">
                      <span className="text-[13px] truncate" style={{ color: 'var(--txt-2)' }} title={p.nombre}>
                        {p.nombre}
                      </span>
                      {p.estado && (
                        <Chip tone={ESTADO_TONE[p.estado?.toLowerCase()] || 'neutral'} dot>
                          {isEs ? (ESTADO_LABELS_ES[p.estado] || p.estado) : (ESTADO_LABELS_EN[p.estado] || p.estado)}
                        </Chip>
                      )}
                    </div>
                  ))}
                  {proyectosActivos.length > 6 && (
                    <button onClick={() => irA('proyectos')} className="text-[12px] font-semibold text-left mt-1"
                      style={{ color: 'var(--brand)' }}>
                      +{proyectosActivos.length - 6} {isEs ? 'más' : 'more'}
                    </button>
                  )}
                </div>
              )}
            </Card>

            {/* Solicitudes */}
            <Card>
              <CardHeader
                title={t('dash_requests')} icon={Icons.matpres} tone="warn"
                subtitle={`${solicitudes.length} ${isEs ? 'en total' : 'total'}`}
                action={
                  <button onClick={() => irA('compras')} className="m-icon-btn m-tip" data-tip={isEs ? 'Ver compras' : 'View purchases'}>
                    <span className="w-4 h-4">{Icons.chevron}</span>
                  </button>
                }
              />
              {[
                { label: t('dash_pending'),    value: solicitudesStats.pendientes, tone: 'warn' },
                { label: t('dash_oc_generated'), value: solicitudesStats.ocGenerada, tone: 'info' },
                { label: t('dash_rejected'),   value: solicitudesStats.rechazadas, tone: 'danger' },
              ].map(fila => {
                const pct = solicitudes.length ? (fila.value / solicitudes.length) * 100 : 0
                return (
                  <div key={fila.label} className="mb-3 last:mb-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12.5px]" style={{ color: 'var(--txt-2)' }}>{fila.label}</span>
                      <span className="text-[12.5px] font-bold" style={{ color: TONES[fila.tone].fg }}>{fila.value}</span>
                    </div>
                    <Progress value={pct} tone={fila.tone} height={5} />
                  </div>
                )
              })}
            </Card>

            {/* Órdenes de compra */}
            <Card>
              <CardHeader
                title={t('dash_purchase_orders')} icon={Icons.purchases} tone="info"
                subtitle={`${ordenes_compra.length} ${isEs ? 'en total' : 'total'}`}
                action={
                  <button onClick={() => irA('compras')} className="m-icon-btn m-tip" data-tip={isEs ? 'Ver OC' : 'View POs'}>
                    <span className="w-4 h-4">{Icons.chevron}</span>
                  </button>
                }
              />
              <div className="flex items-center gap-4">
                <Donut
                  value={ordenes_compra.length ? (ocStats.aprobadas / ordenes_compra.length) * 100 : 0}
                  tone="ok" size={82} label={isEs ? 'aprob.' : 'appr.'}
                />
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  {[
                    { label: t('dash_pending_draft'), value: ocStats.pendientes, tone: 'warn' },
                    { label: t('dash_approved_sent_received'), value: ocStats.aprobadas, tone: 'ok' },
                    { label: t('dash_cancelled'), value: ocStats.canceladas, tone: 'danger' },
                  ].map(f => (
                    <div key={f.label} className="flex items-center justify-between gap-2">
                      <span className="text-[12px] truncate flex items-center gap-1.5" style={{ color: 'var(--txt-2)' }}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: TONES[f.tone].fg }} />
                        {f.label}
                      </span>
                      <span className="text-[12.5px] font-bold flex-shrink-0" style={{ color: 'var(--txt)' }}>{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Categorías de materiales */}
            <Card>
              <CardHeader
                title={t('dash_materials')} icon={Icons.inventory} tone="ok"
                subtitle={`${categorias.length} ${isEs ? 'categorías' : 'categories'}`}
              />
              {categorias.length === 0 ? (
                <EmptyState compact title={t('no_data')} icon={Icons.inventory} />
              ) : (
                <div className="flex flex-col gap-2.5">
                  {categorias.slice(0, 5).map(([cat, count], i) => {
                    const pct = (count / activos.length) * 100
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12.5px] truncate capitalize" style={{ color: 'var(--txt-2)' }}>
                            {isEs ? cat : (CAT_LABELS_EN[cat?.toLowerCase()] || cat)}
                          </span>
                          <span className="text-[12px] font-semibold" style={{ color: 'var(--txt-3)' }}>{count}</span>
                        </div>
                        <div style={{ height: 5, background: 'var(--surface-3)', borderRadius: 999 }}>
                          <div style={{
                            width: `${pct}%`, height: '100%', borderRadius: 999,
                            background: PALETA[i % PALETA.length],
                            transition: 'width .6s cubic-bezier(.22,1,.36,1)',
                          }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            {/* Órdenes de cambio */}
            {ordenes_cambio.length > 0 && (
              <Card>
                <CardHeader
                  title={isEs ? 'Órdenes de Cambio' : 'Change Orders'} icon={Icons.refresh} tone="accent"
                  subtitle={`${ordenes_cambio.length} ${isEs ? 'registradas' : 'recorded'}`}
                  action={
                    <button onClick={() => irA('ordenes_cambio')} className="m-icon-btn m-tip" data-tip={isEs ? 'Ver' : 'View'}>
                      <span className="w-4 h-4">{Icons.chevron}</span>
                    </button>
                  }
                />
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[12.5px]" style={{ color: 'var(--txt-2)' }}>{isEs ? 'Aprobadas' : 'Approved'}</span>
                  <Chip tone="ok">{ocCambioStats.aprobadas}</Chip>
                </div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[12.5px]" style={{ color: 'var(--txt-2)' }}>{isEs ? 'Pendientes aprobación' : 'Pending approval'}</span>
                  <Chip tone={ocCambioStats.pendientes > 0 ? 'warn' : 'neutral'}>{ocCambioStats.pendientes}</Chip>
                </div>
                {ocCambioStats.deltaTotal !== 0 && (
                  <div className="flex items-center justify-between gap-2 pt-3" style={{ borderTop: '1px solid var(--bd)' }}>
                    <span className="text-[12.5px] font-semibold" style={{ color: 'var(--txt-2)' }}>
                      {isEs ? 'Variación total' : 'Total variation'}
                    </span>
                    <span className="text-[13px] font-bold"
                      style={{ color: ocCambioStats.deltaTotal > 0 ? 'var(--ok)' : 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>
                      {ocCambioStats.deltaTotal > 0 ? '+' : ''}{fmt(ocCambioStats.deltaTotal, monedaPrincipal)}
                    </span>
                  </div>
                )}
              </Card>
            )}

            {/* Alertas de stock */}
            {stockBajo.length > 0 && (
              <Card>
                <CardHeader
                  title={isEs ? 'Stock bajo mínimo' : 'Stock below minimum'} icon={Icons.alert} tone="danger"
                  subtitle={`${stockBajo.length} ${isEs ? 'materiales' : 'materials'}`}
                  action={
                    <button onClick={() => irA('inventario')} className="m-icon-btn m-tip" data-tip={isEs ? 'Ver' : 'View'}>
                      <span className="w-4 h-4">{Icons.chevron}</span>
                    </button>
                  }
                />
                <div className="flex flex-col gap-2">
                  {stockBajo.slice(0, 5).map(m => (
                    <div key={m.id} className="flex items-center justify-between gap-2">
                      <span className="text-[12.5px] truncate" style={{ color: 'var(--txt-2)' }} title={m.descripcion}>
                        {m.descripcion}
                      </span>
                      <span className="text-[12px] font-bold flex-shrink-0" style={{ color: 'var(--danger)' }}>
                        {parseFloat(m.stock_actual || 0)} / {parseFloat(m.stock_minimo || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  )
}
