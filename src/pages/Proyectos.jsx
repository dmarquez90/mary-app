import { useState, useContext, useMemo, useRef, useEffect } from 'react'
import { useStore } from '../store'
import { LangContext } from '../i18n'
import { usePermissions } from '../usePermissions'
import { today, MONEDAS, calcGrandTotal, PAIS_MONEDA, MONEDA_SIMBOLO } from '../utils'
import {
  Drawer, Modal, EmptyState, Chip, Field, PrimaryBtn, SecondaryBtn,
  TBtn, Confirm, Icons, inputCls, selectCls, PageHeader, Toolbar, SearchInput,
  Segmented, Card, KpiCard, Progress, IconBtn, TableWrap, Th, useSort, TONES,
} from '../components'

const ESTADOS_PROYECTO = ['planificacion','en_ejecucion','pausado','completado','cancelado']

const ESTADO_TONE = {
  planificacion: 'accent', en_ejecucion: 'info', pausado: 'warn',
  completado: 'ok', cancelado: 'danger',
}

const PAISES_AMERICA = [
  'Argentina','Belice','Bolivia','Brasil','Canadá','Chile','Colombia','Costa Rica',
  'Cuba','Ecuador','El Salvador','United States','Guatemala','Guyana','Haití',
  'Honduras','Jamaica','México','Nicaragua','Panamá','Paraguay','Perú',
  'República Dominicana','Trinidad y Tobago','Uruguay','Venezuela'
]

const ESTADOS_USA = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada',
  'New Hampshire','New Jersey','New Mexico','New York','North Carolina',
  'North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island',
  'South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming'
]

const empty = () => ({ nombre:'', cliente_externo:'', direccion:'', ciudad:'', pais:'', estado_usa:'', moneda:'USD', fecha_inicio:today(), fecha_fin_estimada:'', estado:'planificacion', utilidad_pct:'', impuesto_pct:'', impuesto_descripcion:'' })

const money = (n, moneda) =>
  `${MONEDA_SIMBOLO[moneda] || moneda} ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)}`

const compacto = (n, moneda) => {
  const abs = Math.abs(n || 0)
  const sim = MONEDA_SIMBOLO[moneda] || moneda
  if (abs >= 1e6) return `${sim} ${(n / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${sim} ${(n / 1e3).toFixed(1)}K`
  return money(n, moneda)
}

export default function Proyectos({ onNavigate }) {
  const { state, dispatch } = useStore()
  const { t, lang }         = useContext(LangContext)
  const { can }             = usePermissions()
  const isEs                = lang === 'ES'

  const { proyectos, presupuesto, fases, entradas, salidas, solicitudes,
    ordenes_compra, costos_directos, nominas, subcontratos, equipos,
    costos_indirectos, presupuesto_indirectos = [] } = state

  const [formOpen, setFormOpen]     = useState(false)
  const [form, setForm]             = useState(empty())
  const [editing, setEditing]       = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [detail, setDetail]         = useState(null)
  const [faseForm, setFaseForm]     = useState({ nombre:'', fecha_inicio:'', fecha_fin:'', estado:'pendiente' })
  const [addFase, setAddFase]       = useState(false)
  const [delError, setDelError]     = useState(null)

  // Vista y filtros
  const [vista, setVista]     = useState(() => { try { return localStorage.getItem('mary_proy_vista') || 'cards' } catch { return 'cards' } })
  const [busqueda, setBusqueda] = useState('')
  const [fEstado, setFEstado]   = useState('todos')
  const { sort, onSort, sortRows } = useSort('nombre')

  const cambiarVista = (v) => { setVista(v); try { localStorage.setItem('mary_proy_vista', v) } catch { /* ignorar */ } }

  const puedeCrear    = can('proyectos_crear')
  const puedeEditar   = can('proyectos_editar')
  const puedeEliminar = can('proyectos_eliminar')

  const set      = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const formRef = useRef(null)

  // El formulario vive en el flujo de la pagina, no en un panel lateral: al
  // abrirlo desde una tarjeta de mas abajo hay que traerlo a la vista.
  useEffect(() => {
    if (formOpen) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [formOpen, editing])

  const openAdd  = () => { setForm(empty()); setEditing(null); setFormOpen(true) }
  const openEdit = (p) => { setForm({ ...p }); setEditing(p.id); setFormOpen(true) }

  const save = () => {
    if (!form.nombre || !form.moneda || !form.fecha_inicio) return
    if (editing) dispatch({ type: 'UPD_PROYECTO', payload: { ...form, id: editing } })
    else dispatch({ type: 'ADD_PROYECTO', payload: form })
    setFormOpen(false)
  }

  const del = () => {
    const id = confirmDel
    const checks = {
      ent: entradas.some(e => e.proyecto_id === id),
      sal: salidas.some(s => s.proyecto_id === id),
      sol: solicitudes.some(s => s.proyecto_id === id),
      oc:  ordenes_compra.some(oc => oc.proyecto_id === id),
      dir: costos_directos.some(c => c.proyecto_id === id),
      nom: nominas.some(n => n.proyecto_id === id),
      sub: subcontratos.some(s => s.proyecto_id === id),
      eq:  equipos.some(e => e.proyecto_id === id),
      ind: costos_indirectos.some(c => c.proyecto_id === id),
    }

    if (Object.values(checks).some(Boolean)) {
      const labelsEs = {
        pres: 'Presupuesto', ent: 'Entradas de materiales', sal: 'Salidas de materiales',
        sol: 'Solicitudes de compra', oc: 'Órdenes de compra', matPres: 'Materiales presupuestados',
        dir: 'Costos directos', nom: 'Nómina / Planilla', sub: 'Subcontratos',
        eq: 'Equipos', ind: 'Costos indirectos',
      }
      const labelsEn = {
        pres: 'Budget', ent: 'Material entries', sal: 'Material exits',
        sol: 'Purchase requests', oc: 'Purchase orders', matPres: 'Budgeted materials',
        dir: 'Direct costs', nom: 'Payroll', sub: 'Subcontracts',
        eq: 'Equipment', ind: 'Indirect costs',
      }
      const labels = isEs ? labelsEs : labelsEn
      const items  = Object.entries(checks).filter(([, v]) => v).map(([k]) => labels[k])
      setConfirmDel(null)
      setDelError({ items, proyId: id })
      return
    }

    dispatch({ type: 'DEL_PROYECTO', payload: id })
    setConfirmDel(null)
    if (detail === id) setDetail(null)
  }

  const addFaseHandler = () => {
    if (!faseForm.nombre) return
    dispatch({ type: 'ADD_FASE', payload: { ...faseForm, proyecto_id: detail } })
    setFaseForm({ nombre:'', fecha_inicio:'', fecha_fin:'', estado:'pendiente' })
    setAddFase(false)
  }

  // Presupuesto total = directo + indirectos + utilidad + impuesto
  const calcBudgetTotal = (proyId) => {
    const p       = proyectos.find(x => x.id === proyId)
    const directo = calcGrandTotal(presupuesto.filter(b => b.proyecto_id === proyId))
    const ind     = presupuesto_indirectos
      .filter(i => i.proyecto_id === proyId)
      .reduce((s, i) => s + parseFloat(i.monto_presupuestado || 0), 0)
    const subtotal = directo + ind
    const utilidad = subtotal * (parseFloat(p?.utilidad_pct || 0) / 100)
    const impuesto = (subtotal + utilidad) * (parseFloat(p?.impuesto_pct || 0) / 100)
    return subtotal + utilidad + impuesto
  }

  // Avance por fases completadas
  const avanceFases = (proyId) => {
    const fs = fases.filter(f => f.proyecto_id === proyId)
    if (!fs.length) return null
    const listas = fs.filter(f => f.estado === 'completada').length
    return { pct: (listas / fs.length) * 100, listas, total: fs.length }
  }

  const diasRestantes = (p) => {
    if (!p.fecha_fin_estimada) return null
    const dias = Math.ceil((new Date(p.fecha_fin_estimada) - new Date()) / 86400000)
    return dias
  }

  // ── Filtrado y orden ────────────────────────────────────────────────────
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    let lista = proyectos.filter(p => {
      if (fEstado !== 'todos' && p.estado !== fEstado) return false
      if (!q) return true
      return [p.nombre, p.project_code, p.cliente_externo, p.ciudad, p.pais]
        .filter(Boolean).some(v => String(v).toLowerCase().includes(q))
    })
    return sortRows(lista, {
      presupuesto: p => calcBudgetTotal(p.id),
      avance: p => avanceFases(p.id)?.pct ?? -1,
    })
  }, [proyectos, busqueda, fEstado, sort, presupuesto, presupuesto_indirectos, fases]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Indicadores ─────────────────────────────────────────────────────────
  const resumen = useMemo(() => {
    const enCurso = proyectos.filter(p => p.estado === 'en_ejecucion').length
    const monedas = {}
    proyectos.forEach(p => { monedas[p.moneda || 'USD'] = (monedas[p.moneda || 'USD'] || 0) + calcBudgetTotal(p.id) })
    const principal = Object.entries(monedas).sort((a, b) => b[1] - a[1])[0]
    return {
      total: proyectos.length,
      enCurso,
      completados: proyectos.filter(p => p.estado === 'completado').length,
      presupuesto: principal ? principal[1] : 0,
      moneda: principal ? principal[0] : 'USD',
      variasMonedas: Object.keys(monedas).length > 1,
    }
  }, [proyectos, presupuesto, presupuesto_indirectos]) // eslint-disable-line react-hooks/exhaustive-deps

  const proyecto  = proyectos.find(p => p.id === detail)
  const proyFases = fases.filter(f => f.proyecto_id === detail)
  const budget    = detail ? calcBudgetTotal(detail) : 0

  const conteoEstado = (e) => e === 'todos' ? proyectos.length : proyectos.filter(p => p.estado === e).length

  return (
    <div className="p-5 md:p-6 max-w-[1500px] mx-auto">

      <PageHeader
        title={t('proy_title')}
        subtitle={t('proy_sub', { n: proyectos.length })}
        actions={
          <>
            <Segmented
              value={vista} onChange={cambiarVista}
              options={[
                { id: 'cards', label: isEs ? 'Tarjetas' : 'Cards' },
                { id: 'table', label: isEs ? 'Tabla' : 'Table' },
              ]}
            />
            {puedeCrear && <PrimaryBtn icon={Icons.plus} onClick={openAdd}>{t('proy_new')}</PrimaryBtn>}
          </>
        }
      />

      {/* ══ FORMULARIO (panel en línea) ══════════════════════════ */}
      {formOpen && (
        <section ref={formRef} className="m-card m-fade-up mb-4 overflow-hidden" style={{ scrollMarginTop: 16 }}>
          <div className="flex items-start justify-between gap-3 px-5 py-4"
            style={{ borderBottom: '1px solid var(--bd)' }}>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--txt)' }}>
                {editing ? t('proy_form_title_edit') : t('proy_form_title_new')}
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--txt-3)' }}>
                {editing ? form.project_code : (isEs ? 'Nuevo proyecto' : 'New project')}
              </p>
            </div>
            <IconBtn icon={Icons.x} onClick={() => setFormOpen(false)} />
          </div>

          <div className="p-5 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-3.5">
              <Field label={t('proy_form_name')} required className="md:col-span-2">
                <input className={inputCls} value={form.nombre} onChange={set('nombre')} placeholder="Ej: Residencial Las Palmas" />
              </Field>
              <Field label={t('proy_form_client')} className="md:col-span-2">
                <input className={inputCls} value={form.cliente_externo} onChange={set('cliente_externo')} placeholder="Ej: Constructora ABC" />
              </Field>
              <Field label={t('proy_form_city')}>
                <input className={inputCls} value={form.ciudad} onChange={set('ciudad')} placeholder="Sacramento" />
              </Field>
              <Field label={t('proy_form_country')}>
                <select className={selectCls} value={form.pais} onChange={e => {
                  const pais = e.target.value
                  const moneda = PAIS_MONEDA[pais] || form.moneda || 'USD'
                  setForm(f => ({ ...f, pais, estado_usa: '', moneda }))
                }}>
                  <option value="">— {t('lbl_select')} —</option>
                  {PAISES_AMERICA.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              {form.pais === 'United States' && (
                <Field label={t('proy_state_usa')}>
                  <select className={selectCls} value={form.estado_usa || ''} onChange={set('estado_usa')}>
                    <option value="">— {t('lbl_select')} —</option>
                    {ESTADOS_USA.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              )}
              <Field label={t('proy_form_address')} className="md:col-span-2">
                <input className={inputCls} value={form.direccion} onChange={set('direccion')} placeholder={t('proy_form_address')} />
              </Field>
              <Field label={t('proy_form_currency')} required hint={editing ? t('lbl_currency') : null}>
                <select className={selectCls} value={form.moneda} onChange={set('moneda')} disabled={!!editing}>
                  {MONEDAS.map(m => <option key={m} value={m}>{MONEDA_SIMBOLO[m] ? `${MONEDA_SIMBOLO[m]} ${m}` : m}</option>)}
                </select>
              </Field>
              <Field label={t('proy_form_status')}>
                <select className={selectCls} value={form.estado} onChange={set('estado')}>
                  {ESTADOS_PROYECTO.map(s => <option key={s} value={s}>{t(`estado_${s}`)}</option>)}
                </select>
              </Field>
              <Field label={t('proy_form_start')} required>
                <input type="date" className={inputCls} value={form.fecha_inicio} onChange={set('fecha_inicio')} />
              </Field>
              <Field label={t('proy_form_end')}>
                <input type="date" className={inputCls} value={form.fecha_fin_estimada} onChange={set('fecha_fin_estimada')} />
              </Field>
            </div>

            <div className="pt-4" style={{ borderTop: '1px solid var(--bd)' }}>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--txt-3)' }}>
                {t('proy_profit_tax_section')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-3.5">
                <Field label={t('proy_profit_pct')}>
                  <input type="number" className={inputCls} value={form.utilidad_pct || ''} onChange={set('utilidad_pct')}
                    placeholder="0.00" min="0" max="100" step="0.01" />
                </Field>
                <Field label={t('proy_tax_pct')}>
                  <input type="number" className={inputCls} value={form.impuesto_pct || ''} onChange={set('impuesto_pct')}
                    placeholder="0.00" min="0" max="100" step="0.01" />
                </Field>
                <Field label={t('proy_tax_desc')} className="md:col-span-2">
                  <input className={inputCls} value={form.impuesto_descripcion || ''} onChange={set('impuesto_descripcion')}
                    placeholder={t('proy_tax_desc_ph')} />
                </Field>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 flex items-center justify-end gap-2"
            style={{ borderTop: '1px solid var(--bd)', background: 'var(--surface-2)' }}>
            <SecondaryBtn onClick={() => setFormOpen(false)}>{t('btn_cancel')}</SecondaryBtn>
            <PrimaryBtn onClick={save} disabled={!form.nombre || !form.moneda || !form.fecha_inicio}>
              {editing ? t('btn_save') : t('proy_new')}
            </PrimaryBtn>
          </div>
        </section>
      )}

      {proyectos.length > 0 && (
        <div className="grid gap-3.5 mb-4 m-stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <KpiCard label={isEs ? 'Proyectos' : 'Projects'} value={resumen.total}
            sub={`${resumen.completados} ${isEs ? 'completados' : 'completed'}`} icon={Icons.projects} tone="brand" />
          <KpiCard label={isEs ? 'En ejecución' : 'In progress'} value={resumen.enCurso}
            sub={isEs ? 'obras activas hoy' : 'jobs active today'} icon={Icons.clock} tone="info" />
          <KpiCard label={isEs ? 'Presupuesto total' : 'Total budget'} value={compacto(resumen.presupuesto, resumen.moneda)}
            sub={resumen.variasMonedas ? (isEs ? `Principal: ${resumen.moneda}` : `Main: ${resumen.moneda}`) : resumen.moneda}
            icon={Icons.financial} tone="ok" />
          <KpiCard label={isEs ? 'Fases registradas' : 'Phases logged'} value={fases.length}
            sub={`${fases.filter(f => f.estado === 'completada').length} ${isEs ? 'completadas' : 'completed'}`}
            icon={Icons.check} tone="accent" />
        </div>
      )}

      {proyectos.length > 0 && (
        <Toolbar>
          <SearchInput value={busqueda} onChange={setBusqueda}
            placeholder={isEs ? 'Buscar proyecto, cliente o código...' : 'Search project, client or code...'} width={280} />
          <div className="flex items-center gap-1.5 flex-wrap">
            {['todos', ...ESTADOS_PROYECTO].map(e => {
              const on = fEstado === e
              const n = conteoEstado(e)
              if (e !== 'todos' && n === 0) return null
              return (
                <button key={e} onClick={() => setFEstado(e)}
                  className="m-chip"
                  style={{
                    cursor: 'pointer',
                    background: on ? 'var(--brand)' : 'var(--surface)',
                    color: on ? '#fff' : 'var(--txt-2)',
                    borderColor: on ? 'transparent' : 'var(--bd)',
                  }}>
                  {e === 'todos' ? (isEs ? 'Todos' : 'All') : t(`estado_${e}`)}
                  <span style={{ opacity: 0.7 }}>{n}</span>
                </button>
              )
            })}
          </div>
          {(busqueda || fEstado !== 'todos') && (
            <button onClick={() => { setBusqueda(''); setFEstado('todos') }}
              className="text-xs font-semibold ml-auto" style={{ color: 'var(--brand)' }}>
              {isEs ? 'Limpiar filtros' : 'Clear filters'}
            </button>
          )}
        </Toolbar>
      )}

      {/* ══ LISTADO ══════════════════════════════════════════════ */}
      {proyectos.length === 0 ? (
        <Card padded={false}>
          <EmptyState icon={Icons.projects} title={t('proy_empty_title')}
            subtitle={t('proy_empty_sub')}
            action={puedeCrear ? t('proy_empty_action') : null}
            onAction={puedeCrear ? openAdd : null} />
        </Card>
      ) : filtrados.length === 0 ? (
        <Card padded={false}>
          <EmptyState icon={Icons.search}
            title={isEs ? 'Sin resultados' : 'No results'}
            subtitle={isEs ? 'Ajusta la búsqueda o el filtro de estado.' : 'Adjust your search or status filter.'} />
        </Card>
      ) : vista === 'cards' ? (
        <div className="grid gap-3.5 m-stagger" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(305px, 1fr))' }}>
          {filtrados.map(p => {
            const b       = calcBudgetTotal(p.id)
            const avance  = avanceFases(p.id)
            const dias    = diasRestantes(p)
            const cerrado = p.estado === 'completado' || p.estado === 'cancelado'
            return (
              <article key={p.id} className="m-card m-card-hover p-5 flex flex-col"
                style={{ opacity: cerrado ? 0.82 : 1 }}>
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md"
                    style={{ background: 'var(--surface-3)', color: 'var(--txt-3)' }}>
                    {p.project_code}
                  </span>
                  <Chip tone={ESTADO_TONE[p.estado] || 'neutral'} dot>{t(`estado_${p.estado}`) || p.estado}</Chip>
                </div>

                <h3 className="font-semibold text-[15px] leading-snug mb-1" style={{ color: 'var(--txt)' }}>
                  {p.nombre}
                </h3>
                {p.cliente_externo && (
                  <p className="text-[12.5px] mb-2" style={{ color: 'var(--txt-2)' }}>{p.cliente_externo}</p>
                )}

                <div className="flex items-center gap-1.5 text-[11.5px] mb-3.5" style={{ color: 'var(--txt-3)' }}>
                  <span className="w-3.5 h-3.5 inline-block">{Icons.projects}</span>
                  <span className="truncate">
                    {p.ciudad}{p.ciudad && (p.estado_usa || p.pais) ? ', ' : ''}{p.estado_usa || p.pais || '—'}
                  </span>
                  <span>·</span>
                  <span className="font-semibold">{p.moneda}</span>
                </div>

                {avance && (
                  <div className="mb-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-medium" style={{ color: 'var(--txt-3)' }}>
                        {isEs ? 'Avance por fases' : 'Phase progress'}
                      </span>
                      <span className="text-[11px] font-bold" style={{ color: 'var(--txt-2)' }}>
                        {avance.listas}/{avance.total}
                      </span>
                    </div>
                    <Progress value={avance.pct} tone={avance.pct >= 100 ? 'ok' : 'brand'} height={6} />
                  </div>
                )}

                <div className="rounded-xl px-3 py-2.5 mb-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--bd)' }}>
                  <p className="text-[10.5px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--txt-3)' }}>
                    {t('proy_budget_label')}
                  </p>
                  <p className="text-[15px] font-bold" style={{ color: 'var(--txt)', fontVariantNumeric: 'tabular-nums' }}>
                    {money(b, p.moneda)}
                  </p>
                </div>

                {dias != null && !cerrado && (
                  <p className="text-[11.5px] mb-3 flex items-center gap-1.5"
                    style={{ color: dias < 0 ? 'var(--danger)' : dias <= 15 ? 'var(--warn)' : 'var(--txt-3)' }}>
                    <span className="w-3.5 h-3.5 inline-block">{Icons.calendar}</span>
                    {dias < 0
                      ? (isEs ? `Vencido hace ${Math.abs(dias)} días` : `${Math.abs(dias)} days overdue`)
                      : (isEs ? `Faltan ${dias} días` : `${dias} days left`)}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-3 mt-auto" style={{ borderTop: '1px solid var(--bd)' }}>
                  <button onClick={() => setDetail(p.id)}
                    className="text-[12.5px] font-semibold flex-1 text-left flex items-center gap-1"
                    style={{ color: 'var(--brand)' }}>
                    {t('proy_detail')}
                    <span className="w-3.5 h-3.5 inline-block">{Icons.chevron}</span>
                  </button>
                  {puedeEditar && <IconBtn icon={Icons.edit} tip={t('btn_edit')} onClick={() => openEdit(p)} />}
                  {puedeEliminar && <IconBtn icon={Icons.trash} tip={t('btn_delete')} danger onClick={() => setConfirmDel(p.id)} />}
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th sortKey="project_code" sort={sort} onSort={onSort}>{isEs ? 'Código' : 'Code'}</Th>
              <Th sortKey="nombre" sort={sort} onSort={onSort}>{t('proy_form_name')}</Th>
              <Th sortKey="cliente_externo" sort={sort} onSort={onSort}>{t('lbl_client')}</Th>
              <Th sortKey="estado" sort={sort} onSort={onSort}>{t('lbl_status')}</Th>
              <Th sortKey="avance" sort={sort} onSort={onSort}>{isEs ? 'Avance' : 'Progress'}</Th>
              <Th sortKey="fecha_fin_estimada" sort={sort} onSort={onSort}>{t('proy_form_end')}</Th>
              <Th sortKey="presupuesto" sort={sort} onSort={onSort} align="right">{t('proy_budget_label')}</Th>
              <th style={{ width: 90 }} />
            </tr>
          </thead>
          <tbody>
            {filtrados.map(p => {
              const avance = avanceFases(p.id)
              return (
                <tr key={p.id}>
                  <td><span className="font-mono text-[11.5px]" style={{ color: 'var(--txt-3)' }}>{p.project_code}</span></td>
                  <td>
                    <button onClick={() => setDetail(p.id)} className="font-semibold text-left hover:underline"
                      style={{ color: 'var(--txt)' }}>
                      {p.nombre}
                    </button>
                    <p className="text-[11px]" style={{ color: 'var(--txt-3)' }}>
                      {p.ciudad}{p.ciudad && (p.estado_usa || p.pais) ? ', ' : ''}{p.estado_usa || p.pais}
                    </p>
                  </td>
                  <td>{p.cliente_externo || '—'}</td>
                  <td><Chip tone={ESTADO_TONE[p.estado] || 'neutral'} dot>{t(`estado_${p.estado}`) || p.estado}</Chip></td>
                  <td style={{ minWidth: 120 }}>
                    {avance ? (
                      <div className="flex items-center gap-2">
                        <Progress value={avance.pct} tone={avance.pct >= 100 ? 'ok' : 'brand'} height={5} className="flex-1" />
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--txt-3)' }}>
                          {avance.pct.toFixed(0)}%
                        </span>
                      </div>
                    ) : <span style={{ color: 'var(--txt-3)' }}>—</span>}
                  </td>
                  <td>{p.fecha_fin_estimada || '—'}</td>
                  <td className="m-num font-semibold">{money(calcBudgetTotal(p.id), p.moneda)}</td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      {puedeEditar && <IconBtn icon={Icons.edit} tip={t('btn_edit')} onClick={() => openEdit(p)} />}
                      {puedeEliminar && <IconBtn icon={Icons.trash} tip={t('btn_delete')} danger onClick={() => setConfirmDel(p.id)} />}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </TableWrap>
      )}

      {/* ══ PANEL DE DETALLE ═════════════════════════════════════ */}
      <Drawer
        open={!!detail && !!proyecto}
        onClose={() => setDetail(null)}
        title={proyecto?.nombre}
        subtitle={proyecto?.project_code}
        width={520}
        footer={
          <>
            <SecondaryBtn onClick={() => { setDetail(null); onNavigate('curvas') }}>{t('curva_title')}</SecondaryBtn>
            <PrimaryBtn onClick={() => { setDetail(null); onNavigate('presupuesto') }}>{t('pres_title')}</PrimaryBtn>
          </>
        }
      >
        {proyecto && (
          <>
            {/* Resumen superior */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--brand-soft)', border: '1px solid var(--bd)' }}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <Chip tone={ESTADO_TONE[proyecto.estado] || 'neutral'} dot>{t(`estado_${proyecto.estado}`) || proyecto.estado}</Chip>
                <span className="text-[11px] font-semibold" style={{ color: 'var(--txt-3)' }}>{proyecto.moneda}</span>
              </div>
              <p className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: 'var(--txt-3)' }}>
                {isEs ? 'Presupuesto total' : 'Total budget'}
              </p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--brand)', fontVariantNumeric: 'tabular-nums' }}>
                {money(budget, proyecto.moneda)}
              </p>
              {avanceFases(proyecto.id) && (
                <div className="mt-3">
                  <Progress value={avanceFases(proyecto.id).pct} tone="brand" height={6} />
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--txt-2)' }}>
                    {avanceFases(proyecto.id).listas}/{avanceFases(proyecto.id).total} {isEs ? 'fases completadas' : 'phases completed'}
                  </p>
                </div>
              )}
            </div>

            {/* Datos */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {[
                [t('lbl_client'),        proyecto.cliente_externo || '—'],
                [t('proy_form_city'),    proyecto.ciudad || '—'],
                [t('proy_form_country'), proyecto.pais || '—'],
                ...(proyecto.estado_usa ? [[t('proy_state_usa'), proyecto.estado_usa]] : []),
                [t('proy_form_start'),   proyecto.fecha_inicio || '—'],
                [t('proy_form_end'),     proyecto.fecha_fin_estimada || '—'],
                [isEs ? 'Pres. directo' : 'Direct budget',
                  money(calcGrandTotal(presupuesto.filter(b => b.proyecto_id === detail)), proyecto.moneda)],
                [isEs ? 'Pres. indirecto' : 'Indirect budget',
                  money(presupuesto_indirectos.filter(i => i.proyecto_id === detail)
                    .reduce((s, i) => s + parseFloat(i.monto_presupuestado || 0), 0), proyecto.moneda)],
                ...(proyecto.utilidad_pct ? [[t('proy_profit'), `${proyecto.utilidad_pct}%`]] : []),
                ...(proyecto.impuesto_pct ? [[t('proy_tax'), `${proyecto.impuesto_pct}% ${proyecto.impuesto_descripcion || ''}`]] : []),
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-[11px]" style={{ color: 'var(--txt-3)' }}>{k}</p>
                  <p className="text-[13px] font-medium mt-0.5" style={{ color: 'var(--txt)' }}>{v}</p>
                </div>
              ))}
            </div>

            {/* Fases */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[13px] font-semibold" style={{ color: 'var(--txt)' }}>{t('proy_fases_title')}</p>
                {puedeEditar && proyecto.estado !== 'completado' && proyecto.estado !== 'cancelado' && (
                  <TBtn icon={Icons.plus} onClick={() => setAddFase(!addFase)}>{t('proy_fase_add')}</TBtn>
                )}
              </div>

              {addFase && (
                <div className="rounded-xl p-3 mb-3 flex flex-col gap-2 m-fade-up"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--bd)' }}>
                  <input className={inputCls} placeholder={t('proy_fase_name') + ' *'} value={faseForm.nombre}
                    onChange={e => setFaseForm(f => ({ ...f, nombre: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" className={inputCls} value={faseForm.fecha_inicio}
                      onChange={e => setFaseForm(f => ({ ...f, fecha_inicio: e.target.value }))} />
                    <input type="date" className={inputCls} value={faseForm.fecha_fin}
                      onChange={e => setFaseForm(f => ({ ...f, fecha_fin: e.target.value }))} />
                  </div>
                  <div className="flex gap-2">
                    <PrimaryBtn size="sm" onClick={addFaseHandler} disabled={!faseForm.nombre}>{t('proy_fase_save')}</PrimaryBtn>
                    <SecondaryBtn size="sm" onClick={() => setAddFase(false)}>{t('btn_cancel')}</SecondaryBtn>
                  </div>
                </div>
              )}

              {proyFases.length === 0 ? (
                <EmptyState compact icon={Icons.calendar}
                  title={isEs ? 'Sin fases registradas' : 'No phases yet'} />
              ) : (
                <div className="flex flex-col gap-2">
                  {proyFases.map(f => {
                    const tone = f.estado === 'completada' ? 'ok' : f.estado === 'activa' ? 'info' : 'neutral'
                    return (
                      <div key={f.id} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--bd)' }}>
                        <div className="min-w-0 flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: TONES[tone].fg }} />
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium truncate" style={{ color: 'var(--txt)' }}>{f.nombre}</p>
                            <p className="text-[11px]" style={{ color: 'var(--txt-3)' }}>
                              {f.fecha_inicio || '?'} → {f.fecha_fin || '?'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {puedeEditar ? (
                            <select className="m-input" style={{ width: 'auto', padding: '4px 26px 4px 8px', fontSize: 11.5 }}
                              value={f.estado}
                              onChange={e => dispatch({ type: 'UPD_FASE', payload: { id: f.id, estado: e.target.value } })}>
                              {['pendiente','activa','completada'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          ) : (
                            <Chip tone={tone}>{f.estado}</Chip>
                          )}
                          {puedeEliminar && (
                            <IconBtn icon={Icons.x} danger tip={t('btn_delete')}
                              onClick={() => dispatch({ type: 'DEL_FASE', payload: f.id })} />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </Drawer>

      {/* ══ MODAL: no se puede eliminar ══════════════════════════ */}
      <Modal open={!!delError} onClose={() => setDelError(null)} width={470}
        title={t('proy_cant_delete')} subtitle={t('proy_cant_delete_body')}
        footer={
          <>
            <SecondaryBtn onClick={() => setDelError(null)}>{t('btn_close')}</SecondaryBtn>
            <PrimaryBtn onClick={() => {
              const proy = proyectos.find(p => p.id === delError.proyId)
              if (proy) { setForm({ ...proy, estado: 'cancelado' }); setEditing(proy.id); setFormOpen(true) }
              setDelError(null)
            }}>
              {t('proy_set_cancelled')}
            </PrimaryBtn>
          </>
        }>
        <div className="rounded-xl p-3.5 flex flex-col gap-1.5"
          style={{ background: 'var(--danger-soft)', border: '1px solid var(--bd)' }}>
          {delError?.items.map((item, i) => (
            <span key={i} className="text-[13px] flex items-center gap-2" style={{ color: 'var(--danger)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />
              {item}
            </span>
          ))}
        </div>
        <p className="text-[12px] mt-3" style={{ color: 'var(--txt-3)' }}>{t('proy_cant_delete_hint')}</p>
      </Modal>

      <Confirm open={!!confirmDel}
        title={t('btn_delete')}
        message={isEs
          ? '¿Estás seguro de que deseas eliminar este proyecto? Esta acción no se puede deshacer.'
          : 'Are you sure you want to delete this project? This action cannot be undone.'}
        confirmLabel={t('btn_delete')}
        cancelLabel={t('btn_cancel')}
        onConfirm={del}
        onCancel={() => setConfirmDel(null)} />
    </div>
  )
}
