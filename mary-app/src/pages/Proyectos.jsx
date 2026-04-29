import { useState } from 'react'
import { useStore } from '../store'
import { today, MONEDAS, ESTADO_LABELS, ESTADO_COLORS, calcGrandTotal } from '../utils'
import { Drawer, EmptyState, Badge, Field, PrimaryBtn, SecondaryBtn, DangerBtn, TBtn, Confirm, Icons, inputCls, selectCls } from '../components'

const ESTADOS_PROYECTO = ['planificacion','en_ejecucion','pausado','completado','cancelado']

const empty = () => ({ nombre:'', cliente_externo:'', direccion:'', ciudad:'', pais:'', moneda:'USD', fecha_inicio:today(), fecha_fin_estimada:'', estado:'planificacion' })

export default function Proyectos({ onNavigate }) {
  const { state, dispatch } = useStore()
  const { proyectos, presupuesto, fases } = state
  const [drawer, setDrawer] = useState(false)
  const [form, setForm] = useState(empty())
  const [editing, setEditing] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [detail, setDetail] = useState(null)
  const [faseForm, setFaseForm] = useState({ nombre:'', fecha_inicio:'', fecha_fin:'', estado:'pendiente' })
  const [addFase, setAddFase] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const openAdd = () => { setForm(empty()); setEditing(null); setDrawer(true) }
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
    dispatch({ type: 'DEL_PROYECTO', payload: confirmDel })
    setConfirmDel(null)
    if (detail === confirmDel) setDetail(null)
  }

  const addFaseHandler = () => {
    if (!faseForm.nombre) return
    dispatch({ type: 'ADD_FASE', payload: { ...faseForm, proyecto_id: detail } })
    setFaseForm({ nombre:'', fecha_inicio:'', fecha_fin:'', estado:'pendiente' })
    setAddFase(false)
  }

  const proyecto = proyectos.find(p => p.id === detail)
  const proyFases = fases.filter(f => f.proyecto_id === detail)
  const budget = detail ? calcGrandTotal(presupuesto.filter(b => b.proyecto_id === detail)) : 0

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Proyectos</h1>
          <p className="text-sm text-gray-400 mt-0.5">{proyectos.length} proyecto(s) registrado(s)</p>
        </div>
        <PrimaryBtn onClick={openAdd}>+ Nuevo Proyecto</PrimaryBtn>
      </div>

      {proyectos.length === 0 ? (
        <EmptyState icon={Icons.projects} title="No hay proyectos registrados"
          subtitle="Crea tu primer proyecto para comenzar" action="Crear primer proyecto" onAction={openAdd} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {proyectos.map(p => {
            const b = calcGrandTotal(presupuesto.filter(x => x.proyecto_id === p.id))
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
                  <span>{p.ciudad}{p.ciudad && p.pais ? ', ' : ''}{p.pais}</span>
                  {(p.ciudad || p.pais) && <span>·</span>}
                  <span>{p.moneda}</span>
                </div>
                <div className="text-xs text-gray-500 mb-4">
                  <span className="font-medium text-gray-700">Presupuesto: </span>
                  <span className="font-mono">{new Intl.NumberFormat('es',{style:'currency',currency:p.moneda,minimumFractionDigits:2}).format(b)}</span>
                </div>
                <div className="flex gap-2 pt-3 border-t border-gray-50">
                  <button onClick={() => setDetail(p.id)} className="flex-1 text-xs text-[#1D9E75] font-medium hover:underline text-left">Ver detalle →</button>
                  {!closed && <TBtn onClick={() => openEdit(p)}>Editar</TBtn>}
                  <TBtn danger onClick={() => setConfirmDel(p.id)}>Eliminar</TBtn>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail panel */}
      {detail && proyecto && (
        <div className="fixed inset-0 z-30 bg-black/20 flex justify-end" onClick={() => setDetail(null)}>
          <div className="w-full max-w-lg bg-white shadow-xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">{proyecto.nombre}</p>
                <p className="text-xs text-gray-400">{proyecto.project_code}</p>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-6 flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Estado', <Badge estado={proyecto.estado} />],
                  ['Moneda', proyecto.moneda],
                  ['Cliente', proyecto.cliente_externo || '—'],
                  ['Ciudad', proyecto.ciudad || '—'],
                  ['Inicio', proyecto.fecha_inicio],
                  ['Fin est.', proyecto.fecha_fin_estimada || '—'],
                  ['Presupuesto', new Intl.NumberFormat('es',{style:'currency',currency:proyecto.moneda,minimumFractionDigits:2}).format(budget)],
                ].map(([k,v]) => (
                  <div key={k}>
                    <p className="text-xs text-gray-400">{k}</p>
                    <p className="text-sm font-medium text-gray-700">{v}</p>
                  </div>
                ))}
              </div>

              {/* Fases */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">Fases del Proyecto</p>
                  {proyecto.estado !== 'completado' && proyecto.estado !== 'cancelado' && (
                    <TBtn onClick={() => setAddFase(!addFase)}>+ Agregar fase</TBtn>
                  )}
                </div>
                {addFase && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3 flex flex-col gap-2">
                    <input className={inputCls} placeholder="Nombre de la fase *" value={faseForm.nombre} onChange={e => setFaseForm(f => ({...f, nombre:e.target.value}))} />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="date" className={inputCls} value={faseForm.fecha_inicio} onChange={e => setFaseForm(f => ({...f, fecha_inicio:e.target.value}))} />
                      <input type="date" className={inputCls} value={faseForm.fecha_fin} onChange={e => setFaseForm(f => ({...f, fecha_fin:e.target.value}))} />
                    </div>
                    <div className="flex gap-2">
                      <PrimaryBtn onClick={addFaseHandler} disabled={!faseForm.nombre}>Guardar</PrimaryBtn>
                      <SecondaryBtn onClick={() => setAddFase(false)}>Cancelar</SecondaryBtn>
                    </div>
                  </div>
                )}
                {proyFases.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">No hay fases registradas</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {proyFases.map(f => (
                      <div key={f.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-gray-700">{f.nombre}</p>
                          <p className="text-xs text-gray-400">{f.fecha_inicio} → {f.fecha_fin || '?'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select className="text-xs border-0 bg-transparent text-gray-500 cursor-pointer"
                            value={f.estado}
                            onChange={e => dispatch({ type:'UPD_FASE', payload:{ id:f.id, estado:e.target.value } })}>
                            {['pendiente','activa','completada'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button onClick={() => dispatch({ type:'DEL_FASE', payload:f.id })} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <PrimaryBtn onClick={() => { setDetail(null); onNavigate('presupuesto') }}>Ver Presupuesto →</PrimaryBtn>
                <SecondaryBtn onClick={() => { setDetail(null); onNavigate('curvas') }}>Curva S →</SecondaryBtn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Drawer */}
      <Drawer open={drawer} onClose={() => setDrawer(false)} title={editing ? 'Editar Proyecto' : 'Nuevo Proyecto'} width={420}>
        <Field label="Nombre del proyecto" required>
          <input className={inputCls} value={form.nombre} onChange={set('nombre')} placeholder="Ej: Residencial Las Palmas" />
        </Field>
        <Field label="Cliente / Dueño de la obra">
          <input className={inputCls} value={form.cliente_externo} onChange={set('cliente_externo')} placeholder="Ej: Constructora ABC" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ciudad">
            <input className={inputCls} value={form.ciudad} onChange={set('ciudad')} placeholder="Sacramento" />
          </Field>
          <Field label="País">
            <input className={inputCls} value={form.pais} onChange={set('pais')} placeholder="EE.UU." />
          </Field>
        </div>
        <Field label="Dirección">
          <input className={inputCls} value={form.direccion} onChange={set('direccion')} placeholder="Dirección del proyecto" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Moneda" required>
            <select className={selectCls} value={form.moneda} onChange={set('moneda')} disabled={!!editing}>
              {MONEDAS.map(m => <option key={m}>{m}</option>)}
            </select>
            {editing && <p className="text-xs text-amber-600 mt-1">La moneda no puede cambiarse</p>}
          </Field>
          <Field label="Estado">
            <select className={selectCls} value={form.estado} onChange={set('estado')}>
              {ESTADOS_PROYECTO.map(s => <option key={s} value={s}>{ESTADO_LABELS[s]}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha de inicio" required>
            <input type="date" className={inputCls} value={form.fecha_inicio} onChange={set('fecha_inicio')} />
          </Field>
          <Field label="Fecha fin estimada">
            <input type="date" className={inputCls} value={form.fecha_fin_estimada} onChange={set('fecha_fin_estimada')} />
          </Field>
        </div>
        <div className="flex gap-2 mt-auto pt-2">
          <SecondaryBtn onClick={() => setDrawer(false)} className="flex-1">Cancelar</SecondaryBtn>
          <PrimaryBtn onClick={save} disabled={!form.nombre || !form.moneda || !form.fecha_inicio} className="flex-1">
            {editing ? 'Guardar cambios' : 'Crear proyecto'}
          </PrimaryBtn>
        </div>
      </Drawer>

      <Confirm open={!!confirmDel} message="¿Eliminar este proyecto? Se eliminarán también su presupuesto y fases asociadas."
        onConfirm={del} onCancel={() => setConfirmDel(null)} />
    </div>
  )
}
