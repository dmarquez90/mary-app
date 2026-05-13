import { useState, useContext } from 'react'
import { useStore } from '../store'
import { LangContext } from '../i18n'
import { usePermissions } from '../usePermissions'
import { today, MONEDAS, ESTADO_LABELS, calcGrandTotal } from '../utils'
import { Drawer, EmptyState, Badge, Field, PrimaryBtn, SecondaryBtn, TBtn, Confirm, Icons, inputCls, selectCls } from '../components'

const ESTADOS_PROYECTO = ['planificacion','en_ejecucion','pausado','completado','cancelado']

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
const empty = () => ({ nombre:'', cliente_externo:'', direccion:'', ciudad:'', pais:'', estado_usa:'', moneda:'USD', fecha_inicio:today(), fecha_fin_estimada:'', estado:'planificacion' })

export default function Proyectos({ onNavigate }) {
  const { state, dispatch } = useStore()
  const { t }               = useContext(LangContext)
  const { lang }            = useContext(LangContext)
  const { can }             = usePermissions()
  const isEs                = lang === 'ES'

  const { proyectos, presupuesto, fases, entradas, salidas, solicitudes,
    ordenes_compra, materiales_presupuestados, costos_directos,
    nominas, subcontratos, equipos, costos_indirectos } = state

  const [drawer, setDrawer]         = useState(false)
  const [form, setForm]             = useState(empty())
  const [editing, setEditing]       = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [detail, setDetail]         = useState(null)
  const [faseForm, setFaseForm]     = useState({ nombre:'', fecha_inicio:'', fecha_fin:'', estado:'pendiente' })
  const [addFase, setAddFase]       = useState(false)
  const [delError, setDelError]     = useState(null)

  const puedeCrear    = can('proyectos_crear')
  const puedeEditar   = can('proyectos_editar')
  const puedeEliminar = can('proyectos_eliminar')

  const set      = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const openAdd  = () => { setForm(empty()); setEditing(null); setDrawer(true) }
  const openEdit = (p) => { setForm({ ...p }); setEditing(p.id); setDrawer(true) }

  const save = () => {
    if (!form.nombre || !form.moneda || !form.fecha_inicio) return
    if (editing) {
      dispatch({ type: 'UPD_PROYECTO', payload: { ...form, id: editing } })
    } else {
      dispatch({ type: 'ADD_PROYECTO', payload: form })
    }
    setDrawer(false)
  }

  const del = () => {
    const id = confirmDel

    // Verificar datos relacionados
    const checks = {
      pres:    presupuesto.some(b => b.proyecto_id === id),
      ent:     entradas.some(e => e.proyecto_id === id),
      sal:     salidas.some(s => s.proyecto_id === id),
      sol:     solicitudes.some(s => s.proyecto_id === id),
      oc:      ordenes_compra.some(oc => oc.proyecto_id === id),
      matPres: (materiales_presupuestados || []).some(m => m.proyecto_id === id),
      dir:     costos_directos.some(c => c.proyecto_id === id),
      nom:     nominas.some(n => n.proyecto_id === id),
      sub:     subcontratos.some(s => s.proyecto_id === id),
      eq:      equipos.some(e => e.proyecto_id === id),
      ind:     costos_indirectos.some(c => c.proyecto_id === id),
    }

    const tieneDatos = Object.values(checks).some(Boolean)

    if (tieneDatos) {
      const labelsEs = {
        pres:    'Presupuesto',
        ent:     'Entradas de materiales',
        sal:     'Salidas de materiales',
        sol:     'Solicitudes de compra',
        oc:      'Órdenes de compra',
        matPres: 'Materiales presupuestados',
        dir:     'Costos directos',
        nom:     'Nómina / Planilla',
        sub:     'Subcontratos',
        eq:      'Equipos',
        ind:     'Costos indirectos',
      }
      const labelsEn = {
        pres:    'Budget',
        ent:     'Material entries',
        sal:     'Material exits',
        sol:     'Purchase requests',
        oc:      'Purchase orders',
        matPres: 'Budgeted materials',
        dir:     'Direct costs',
        nom:     'Payroll',
        sub:     'Subcontracts',
        eq:      'Equipment',
        ind:     'Indirect costs',
      }

      const labels = isEs ? labelsEs : labelsEn
      const items  = Object.entries(checks)
        .filter(([, v]) => v)
        .map(([k]) => labels[k])

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

  const proyecto  = proyectos.find(p => p.id === detail)
  const proyFases = fases.filter(f => f.proyecto_id === detail)
  const budget    = detail ? calcGrandTotal(presupuesto.filter(b => b.proyecto_id === detail)) : 0

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* MODAL ERROR ELIMINACIÓN */}
      {delError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-lg flex-shrink-0">🚫</div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">
                  {isEs ? 'No se puede eliminar este proyecto' : 'This project cannot be deleted'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isEs ? 'Tiene información registrada en los siguientes módulos:' : 'It has registered data in the following modules:'}
                </p>
              </div>
            </div>

            <ul className="bg-red-50 rounded-lg p-3 mb-4 flex flex-col gap-1">
              {delError.items.map((item, i) => (
                <li key={i} className="text-sm text-red-700 flex items-center gap-2">
                  <span className="text-red-400">•</span> {item}
                </li>
              ))}
            </ul>

            <p className="text-xs text-gray-500 mb-4">
              {isEs
                ? 'Elimina primero esos registros o cambia el estado del proyecto a "Cancelado" para archivarlo.'
                : 'Delete those records first or change the project status to "Cancelled" to archive it.'}
            </p>

            <div className="flex gap-2">
              <button onClick={() => setDelError(null)}
                className="flex-1 py-2.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                {isEs ? 'Cerrar' : 'Close'}
              </button>
              <button onClick={() => {
                const proy = proyectos.find(p => p.id === delError.proyId)
                if (proy) { setForm({ ...proy, estado: 'cancelado' }); setEditing(proy.id); setDrawer(true) }
                setDelError(null)
              }}
                className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg"
                style={{ background: '#1B3A6B' }}>
                {isEs ? 'Cambiar a Cancelado' : 'Set as Cancelled'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{t('proy_title')}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{t('proy_sub', { n: proyectos.length })}</p>
        </div>
        {puedeCrear && <PrimaryBtn onClick={openAdd}>{t('proy_new')}</PrimaryBtn>}
      </div>

      {proyectos.length === 0 ? (
        <EmptyState icon={Icons.projects} title={t('proy_empty_title')}
          subtitle={t('proy_empty_sub')}
          action={puedeCrear ? t('proy_empty_action') : null}
          onAction={puedeCrear ? openAdd : null} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {proyectos.map(p => {
            const b      = calcGrandTotal(presupuesto.filter(x => x.proyecto_id === p.id))
            const closed = p.estado === 'completado' || p.estado === 'cancelado'
            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-mono text-gray-400">{p.project_code}</span>
                  <Badge estado={p.estado} />
                </div>
                <h3 className="font-semibold text-gray-800 text-sm mb-1">{p.nombre}</h3>
                {p.cliente_externo && <p className="text-xs text-gray-500 mb-3">{p.cliente_externo}</p>}
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                  <span>{p.ciudad}{p.ciudad && (p.estado_usa||p.pais) ? ', ' : ''}{p.estado_usa || p.pais}</span>
                  {(p.ciudad || p.pais) && <span>·</span>}
                  <span>{p.moneda}</span>
                </div>
                <div className="text-xs text-gray-500 mb-4">
                  <span className="font-medium text-gray-700">{t('proy_budget_label')}: </span>
                  <span className="font-mono">{new Intl.NumberFormat('es',{style:'currency',currency:p.moneda,minimumFractionDigits:2}).format(b)}</span>
                </div>
                <div className="flex gap-2 pt-3 border-t border-gray-50">
                  <button onClick={() => setDetail(p.id)} className="flex-1 text-xs font-medium hover:underline text-left" style={{color:'#1B3A6B'}}>{t('proy_detail')} →</button>
                  {puedeEditar && <TBtn onClick={() => openEdit(p)}>{t('btn_edit')}</TBtn>}
                  {puedeEliminar && <TBtn danger onClick={() => setConfirmDel(p.id)}>{t('btn_delete')}</TBtn>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* PANEL DETALLE */}
      {detail && proyecto && (
        <div className="fixed inset-0 z-30 bg-black/20 flex justify-end" onClick={() => setDetail(null)}>
          <div className="w-full max-w-lg bg-white shadow-xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">{proyecto.nombre}</p>
                <p className="text-xs text-gray-400">{proyecto.project_code}</p>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="p-6 flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  [t('lbl_status'),        <Badge estado={proyecto.estado} />],
                  [t('lbl_currency'),      proyecto.moneda],
                  [t('lbl_client'),        proyecto.cliente_externo || '—'],
                  [t('proy_form_city'),    proyecto.ciudad || '—'],
                  [t('proy_form_start'),   proyecto.fecha_inicio],
                  [t('proy_form_end'),     proyecto.fecha_fin_estimada || '—'],
                  [isEs ? 'País' : 'Country', proyecto.pais || '—'],
                  ...(proyecto.estado_usa ? [[isEs ? 'Estado (EE.UU.)' : 'State (USA)', proyecto.estado_usa]] : []),
                  [t('proy_budget_label'), new Intl.NumberFormat('es',{style:'currency',currency:proyecto.moneda,minimumFractionDigits:2}).format(budget)],
                ].map(([k,v]) => (
                  <div key={k}>
                    <p className="text-xs text-gray-400">{k}</p>
                    <p className="text-sm font-medium text-gray-700">{v}</p>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">{t('proy_fases_title')}</p>
                  {puedeEditar && proyecto.estado !== 'completado' && proyecto.estado !== 'cancelado' && (
                    <TBtn onClick={() => setAddFase(!addFase)}>{t('proy_fase_add')}</TBtn>
                  )}
                </div>
                {addFase && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3 flex flex-col gap-2">
                    <input className={inputCls} placeholder={t('proy_fase_name') + ' *'} value={faseForm.nombre}
                      onChange={e => setFaseForm(f => ({...f, nombre:e.target.value}))} />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="date" className={inputCls} value={faseForm.fecha_inicio}
                        onChange={e => setFaseForm(f => ({...f, fecha_inicio:e.target.value}))} />
                      <input type="date" className={inputCls} value={faseForm.fecha_fin}
                        onChange={e => setFaseForm(f => ({...f, fecha_fin:e.target.value}))} />
                    </div>
                    <div className="flex gap-2">
                      <PrimaryBtn onClick={addFaseHandler} disabled={!faseForm.nombre}>{t('proy_fase_save')}</PrimaryBtn>
                      <SecondaryBtn onClick={() => setAddFase(false)}>{t('btn_cancel')}</SecondaryBtn>
                    </div>
                  </div>
                )}
                {proyFases.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">—</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {proyFases.map(f => (
                      <div key={f.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-gray-700">{f.nombre}</p>
                          <p className="text-xs text-gray-400">{f.fecha_inicio} → {f.fecha_fin || '?'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {puedeEditar ? (
                            <select className="text-xs border-0 bg-transparent text-gray-500 cursor-pointer"
                              value={f.estado}
                              onChange={e => dispatch({ type:'UPD_FASE', payload:{ id:f.id, estado:e.target.value } })}>
                              {['pendiente','activa','completada'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          ) : (
                            <span className="text-xs text-gray-500">{f.estado}</span>
                          )}
                          {puedeEliminar && (
                            <button onClick={() => dispatch({ type:'DEL_FASE', payload:f.id })}
                              className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <PrimaryBtn onClick={() => { setDetail(null); onNavigate('presupuesto') }}>{t('pres_title')} →</PrimaryBtn>
                <SecondaryBtn onClick={() => { setDetail(null); onNavigate('curvas') }}>{t('curva_title')} →</SecondaryBtn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER FORMULARIO */}
      <Drawer open={drawer} onClose={() => setDrawer(false)}
        title={editing ? t('proy_form_title_edit') : t('proy_form_title_new')} width={420}>
        <Field label={t('proy_form_name')} required>
          <input className={inputCls} value={form.nombre} onChange={set('nombre')} placeholder="Ej: Residencial Las Palmas" />
        </Field>
        <Field label={t('proy_form_client')}>
          <input className={inputCls} value={form.cliente_externo} onChange={set('cliente_externo')} placeholder="Ej: Constructora ABC" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('proy_form_city')}>
            <input className={inputCls} value={form.ciudad} onChange={set('ciudad')} placeholder="Sacramento" />
          </Field>
          <Field label={t('proy_form_country')}>
            <select className={selectCls} value={form.pais} onChange={e => {
              const val = e.target.value
              setForm(f => ({ ...f, pais: val, estado_usa: '' }))
            }}>
              <option value="">— {t('lbl_select')} —</option>
              {PAISES_AMERICA.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        </div>
        {form.pais === 'United States' && (
          <Field label={isEs ? 'Estado (EE.UU.)' : 'State (USA)'}>
            <select className={selectCls} value={form.estado_usa||''} onChange={set('estado_usa')}>
              <option value="">— {t('lbl_select')} —</option>
              {ESTADOS_USA.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        )}
        <Field label={t('proy_form_address')}>
          <input className={inputCls} value={form.direccion} onChange={set('direccion')} placeholder={t('proy_form_address')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('proy_form_currency')} required>
            <select className={selectCls} value={form.moneda} onChange={set('moneda')} disabled={!!editing}>
              {MONEDAS.map(m => <option key={m}>{m}</option>)}
            </select>
            {editing && <p className="text-xs text-amber-600 mt-1">{t('lbl_currency')}</p>}
          </Field>
          <Field label={t('proy_form_status')}>
            <select className={selectCls} value={form.estado} onChange={set('estado')}>
              {ESTADOS_PROYECTO.map(s => <option key={s} value={s}>{t(`estado_${s}`)}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('proy_form_start')} required>
            <input type="date" className={inputCls} value={form.fecha_inicio} onChange={set('fecha_inicio')} />
          </Field>
          <Field label={t('proy_form_end')}>
            <input type="date" className={inputCls} value={form.fecha_fin_estimada} onChange={set('fecha_fin_estimada')} />
          </Field>
        </div>
        <div className="flex gap-2 mt-auto pt-2">
          <SecondaryBtn onClick={() => setDrawer(false)} className="flex-1">{t('btn_cancel')}</SecondaryBtn>
          <PrimaryBtn onClick={save} disabled={!form.nombre || !form.moneda || !form.fecha_inicio} className="flex-1">
            {editing ? t('btn_save') : t('proy_new')}
          </PrimaryBtn>
        </div>
      </Drawer>

      <Confirm open={!!confirmDel}
        message={isEs
          ? '¿Estás seguro de que deseas eliminar este proyecto? Esta acción no se puede deshacer.'
          : 'Are you sure you want to delete this project? This action cannot be undone.'}
        onConfirm={del}
        onCancel={() => setConfirmDel(null)} />
    </div>
  )
}
