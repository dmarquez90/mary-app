import { useState, useContext } from 'react'
import { useStore } from '../store'
import { LangContext } from '../i18n'
import { today, MONEDAS, ESTADO_LABELS, calcGrandTotal } from '../utils'
import { Drawer, EmptyState, Badge, Field, PrimaryBtn, SecondaryBtn, TBtn, Confirm, Icons, inputCls, selectCls } from '../components'

const ESTADOS_PROYECTO = ['planificacion','en_ejecucion','pausado','completado','cancelado']
const empty = () => ({ nombre:'', cliente_externo:'', direccion:'', ciudad:'', pais:'', moneda:'USD', fecha_inicio:today(), fecha_fin_estimada:'', estado:'planificacion' })

export default function Proyectos({ onNavigate }) {
  const { state, dispatch } = useStore()
  const { t } = useContext(LangContext)
  const { proyectos, presupuesto, fases } = state
  const [drawer, setDrawer]       = useState(false)
  const [form, setForm]           = useState(empty())
  const [editing, setEditing]     = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [detail, setDetail]       = useState(null)
  const [faseForm, setFaseForm]   = useState({ nombre:'', fecha_inicio:'', fecha_fin:'', estado:'pendiente' })
  const [addFase, setAddFase]     = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
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

  const proyecto  = proyectos.find(p => p.id === detail)
  const proyFases = fases.filter(f => f.proyecto_id === detail)
  const budget    = detail ? calcGrandTotal(presupuesto.filter(b => b.proyecto_id === detail)) : 0

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{t('proy_title')}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{t('proy_sub', { n: proyectos.length })}</p>
        </div>
        <PrimaryBtn onClick={openAdd}>{t('proy_new')}</PrimaryBtn>
      </div>

      {proyectos.length === 0 ? (
        <EmptyState icon={Icons.projects} title={t('proy_empty_title')}
          subtitle={t('proy_empty_sub')} action={t('proy_empty_action')} onAction={openAdd} />
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
                  <span>{p.ciudad}{p.ciudad && p.pais ? ', ' : ''}{p.pais}</span>
                  {(p.ciudad || p.pais) && <span>·</span>}
                  <span>{p.moneda}</span>
                </div>
                <div className="text-xs text-gray-500 mb-4">
                  <span className="font-medium text-gray-700">{t('proy_budget_label')}: </span>
                  <span className="font-mono">{new Intl.NumberFormat('es',{style:'currency',currency:p.moneda,minimumFractionDigits:2}).format(b)}</span>
                </div>
                <div className="flex gap-2 pt-3 border-t border-gray-50">
                  <button onClick={() => setDetail(p.id)} className="flex-1 text-xs text-[#1D9E75] font-medium hover:underline text-left">{t('proy_detail')} →</button>
                  {!closed && <TBtn onClick={() => openEdit(p)}>{t('btn_edit')}</TBtn>}
                  <TBtn danger onClick={() => setConfirmDel(p.id)}>{t('btn_delete')}</TBtn>
                </div>
              </div>
            )
          })}
        </div>
      )}

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
                  [t('lbl_status'),         <Badge estado={proyecto.estado} />],
                  [t('lbl_currency'),       proyecto.moneda],
                  [t('lbl_client'),         proyecto.cliente_externo || '—'],
                  [t('proy_form_city'),     proyecto.ciudad || '—'],
                  [t('proy_form_start'),    proyecto.fecha_inicio],
                  [t('proy_form_end'),      proyecto.fecha_fin_estimada || '—'],
                  [t('proy_budget_label'),  new Intl.NumberFormat('es',{style:'currency',currency:proyecto.moneda,minimumFractionDigits:2}).format(budget)],
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
                  {proyecto.estado !== 'completado' && proyecto.estado !== 'cancelado' && (
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
                          <select className="text-xs border-0 bg-transparent text-gray-500 cursor-pointer"
                            value={f.estado}
                            onChange={e => dispatch({ type:'UPD_FASE', payload:{ id:f.id, estado:e.target.value } })}>
                            {['pendiente','activa','completada'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button onClick={() => dispatch({ type:'DEL_FASE', payload:f.id })}
                            className="text-gray-300 hover:text-red-400 text-xs">✕</button>
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
            <input className={inputCls} value={form.pais} onChange={set('pais')} placeholder="EE.UU." />
          </Field>
        </div>
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
              {ESTADOS_PROYECTO.map(s => <option key={s} value={s}>{ESTADO_LABELS[s]}</option>)}
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

      <Confirm open={!!confirmDel} message={t('proy_delete_confirm')}
        onConfirm={del} onCancel={() => setConfirmDel(null)} />
    </div>
  )
}
