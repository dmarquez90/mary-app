import { useState, useMemo } from 'react'
import { useStore } from '../store'
import { fmt, fmtNum, flatBudgetItems, calcSubtotal, calcGrandTotal, UNIDADES } from '../utils'
import { Drawer, EmptyState, Field, PrimaryBtn, SecondaryBtn, DangerBtn, TBtn, Confirm, SectionBox, Icons, inputCls, selectCls } from '../components'

const emptyForm = () => ({ tipo:'actividad', parent_id:'', descripcion:'', unidad:'m²', cantidad:'', costo_mo:'', costo_materiales:'', costo_equipos:'' })

export default function Presupuesto() {
  const { state, dispatch } = useStore()
  const { proyectos, presupuesto } = state
  const [proyId, setProyId] = useState(proyectos[0]?.id || '')
  const [drawer, setDrawer] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [editing, setEditing] = useState(null)
  const [selected, setSelected] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  const proy = proyectos.find(p => p.id === proyId)
  const items = useMemo(() => presupuesto.filter(b => b.proyecto_id === proyId), [presupuesto, proyId])
  const flat = useMemo(() => flatBudgetItems(items), [items])
  const closed = proy?.estado === 'completado' || proy?.estado === 'cancelado'

  const stages = items.filter(i => i.tipo === 'etapa')
  const substages = items.filter(i => i.tipo === 'sub_etapa')
  const grandTotal = calcGrandTotal(items)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const ucPreview = (parseFloat(form.costo_mo)||0) + (parseFloat(form.costo_materiales)||0) + (parseFloat(form.costo_equipos)||0)
  const tcPreview = (parseFloat(form.cantidad)||0) * ucPreview

  const openAdd = (tipo) => {
    const f = emptyForm()
    f.tipo = tipo
    // Pre-select parent from selected row
    if (selected) {
      const sel = items.find(i => i.id === selected)
      if (sel) {
        if (tipo === 'sub_etapa') f.parent_id = sel.tipo === 'etapa' ? sel.id : sel.tipo === 'sub_etapa' ? sel.parent_id : items.find(i=>i.id===sel.parent_id)?.parent_id || ''
        if (tipo === 'actividad') f.parent_id = sel.tipo === 'sub_etapa' ? sel.id : sel.tipo === 'actividad' ? sel.parent_id : ''
      }
    }
    setForm(f); setEditing(null); setDrawer(true)
  }

  const openEdit = () => {
    if (!selected) return
    const item = items.find(i => i.id === selected)
    if (!item) return
    setForm({ tipo: item.tipo, parent_id: item.parent_id || '', descripcion: item.descripcion, unidad: item.unidad || 'm²', cantidad: item.cantidad || '', costo_mo: item.costo_mo || '', costo_materiales: item.costo_materiales || '', costo_equipos: item.costo_equipos || '' })
    setEditing(selected); setDrawer(true)
  }

  const save = () => {
    if (!form.descripcion) return
    if (form.tipo !== 'etapa' && !form.parent_id) return
    if (editing) {
      dispatch({ type: 'UPD_BUDGET', payload: { id: editing, descripcion: form.descripcion, unidad: form.unidad, cantidad: parseFloat(form.cantidad)||0, costo_mo: parseFloat(form.costo_mo)||0, costo_materiales: parseFloat(form.costo_materiales)||0, costo_equipos: parseFloat(form.costo_equipos)||0 } })
    } else {
      dispatch({ type: 'ADD_BUDGET', payload: { proyectoId: proyId, tipo: form.tipo, parent_id: form.parent_id || null, descripcion: form.descripcion, unidad: form.unidad, cantidad: parseFloat(form.cantidad)||0, costo_mo: parseFloat(form.costo_mo)||0, costo_materiales: parseFloat(form.costo_materiales)||0, costo_equipos: parseFloat(form.costo_equipos)||0 } })
    }
    setDrawer(false); setSelected(null)
  }

  const del = () => {
    dispatch({ type: 'DEL_BUDGET', payload: confirmDel })
    setConfirmDel(null); setSelected(null)
  }

  const moneda = proy?.moneda || 'USD'

  return (
    <div className="p-6 max-w-full">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Presupuesto Maestro</h1>
          {proy && <p className="text-sm text-gray-400 mt-0.5">{proy.project_code} — {proy.nombre}</p>}
        </div>
        <div className="flex items-center gap-3">
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#1D9E75]" value={proyId} onChange={e => { setProyId(e.target.value); setSelected(null) }}>
            <option value="">— Seleccionar proyecto —</option>
            {proyectos.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>)}
          </select>
        </div>
      </div>

      {!proyId ? (
        <EmptyState icon={Icons.budget} title="Selecciona un proyecto" subtitle="Elige un proyecto del selector para ver su presupuesto" />
      ) : (
        <>
          {/* Toolbar */}
          <div className="bg-white border border-gray-100 rounded-xl mb-0 px-4 py-3 flex items-center gap-2 flex-wrap rounded-b-none border-b-0">
            <TBtn onClick={() => openAdd('etapa')} disabled={closed}>
              <span className="w-2 h-2 rounded-sm inline-block mr-1" style={{background:'#1D9E75'}}/>+ Etapa
            </TBtn>
            <TBtn onClick={() => openAdd('sub_etapa')} disabled={closed || stages.length === 0}>
              <span className="w-2 h-2 rounded-sm inline-block mr-1" style={{background:'#185FA5'}}/>+ Sub-Etapa
            </TBtn>
            <TBtn onClick={() => openAdd('actividad')} disabled={closed || substages.length === 0}>
              <span className="w-2 h-2 rounded-sm inline-block mr-1 bg-gray-400"/>+ Actividad
            </TBtn>
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <TBtn onClick={openEdit} disabled={!selected}>✎ Editar</TBtn>
            <TBtn danger onClick={() => selected && setConfirmDel(selected)} disabled={!selected}>✕ Eliminar</TBtn>
            <div className="ml-auto flex items-center gap-2 text-sm">
              <span className="text-gray-400 text-xs">Gran Total:</span>
              <span className="font-semibold font-mono text-sm" style={{color:'#1D9E75'}}>{fmt(grandTotal, moneda)}</span>
            </div>
          </div>

          {/* Table */}
          {flat.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl rounded-t-none py-16">
              <EmptyState icon={Icons.table} title="No hay presupuesto cargado"
                subtitle="Agrega la primera Etapa para comenzar" action="Agregar primera Etapa" onAction={() => openAdd('etapa')} />
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-xl rounded-t-none overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['ID','Descripción','Unidad','Cantidad','M.O. Unit.','Mat. Unit.','Eq./Trans.','Costo Unit.','Costo Total'].map((h, i) => (
                      <th key={h} className={`px-3 py-3 text-xs text-gray-500 whitespace-nowrap ${i >= 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {flat.map(item => {
                    const isEt = item.tipo === 'etapa', isSs = item.tipo === 'sub_etapa', isAc = item.tipo === 'actividad'
                    const uc = isAc ? (item.costo_mo||0)+(item.costo_materiales||0)+(item.costo_equipos||0) : 0
                    const tc = isAc ? (item.cantidad||0)*uc : calcSubtotal(items, item.id, item.tipo)
                    const sel = item.id === selected
                    return (
                      <tr key={item.id}
                        className={`border-b border-gray-50 cursor-pointer transition-colors
                          ${sel ? 'bg-blue-50' : isEt ? 'bg-gray-50/70 hover:bg-gray-100/50' : 'hover:bg-gray-50/50'}`}
                        onClick={() => setSelected(sel ? null : item.id)}
                      >
                        <td className="px-3 py-2.5">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-medium
                            ${isEt ? 'bg-green-100 text-green-700' : isSs ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                            {item.code}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 max-w-xs">
                          <span className={`text-sm ${isEt ? 'font-semibold text-gray-800' : isSs ? 'font-medium text-gray-700' : 'text-gray-600'}`}
                            style={{ paddingLeft: isAc ? 24 : isSs ? 12 : 0 }}>
                            {item.descripcion}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs text-gray-500">{isAc ? item.unidad : '—'}</td>
                        <td className="px-3 py-2.5 text-right text-xs font-mono text-gray-600">{isAc ? fmtNum(item.cantidad) : '—'}</td>
                        <td className="px-3 py-2.5 text-right text-xs font-mono text-gray-500">{isAc ? fmt(item.costo_mo, moneda) : '—'}</td>
                        <td className="px-3 py-2.5 text-right text-xs font-mono text-gray-500">{isAc ? fmt(item.costo_materiales, moneda) : '—'}</td>
                        <td className="px-3 py-2.5 text-right text-xs font-mono text-gray-500">{isAc ? fmt(item.costo_equipos, moneda) : '—'}</td>
                        <td className="px-3 py-2.5 text-right text-xs font-mono font-medium text-gray-700">{isAc ? fmt(uc, moneda) : '—'}</td>
                        <td className="px-3 py-2.5 text-right text-sm font-mono font-semibold"
                          style={{ color: isEt ? '#1D9E75' : isSs ? '#185FA5' : '#374151' }}>
                          {fmt(tc, moneda)}
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td colSpan={8} className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Presupuesto</td>
                    <td className="px-3 py-3 text-right text-sm font-bold font-mono" style={{color:'#1D9E75'}}>{fmt(grandTotal, moneda)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Drawer */}
      <Drawer open={drawer} onClose={() => setDrawer(false)}
        title={editing ? `Editar ${form.tipo === 'etapa' ? 'Etapa' : form.tipo === 'sub_etapa' ? 'Sub-Etapa' : 'Actividad'}` : `Agregar ${form.tipo === 'etapa' ? 'Etapa' : form.tipo === 'sub_etapa' ? 'Sub-Etapa' : 'Actividad'}`}
        width={380}>

        {form.tipo === 'sub_etapa' && !editing && (
          <Field label="Etapa padre" required>
            <select className={selectCls} value={form.parent_id} onChange={set('parent_id')}>
              <option value="">— Seleccionar —</option>
              {stages.map(s => <option key={s.id} value={s.id}>{s.code} — {s.descripcion}</option>)}
            </select>
          </Field>
        )}
        {form.tipo === 'actividad' && !editing && (
          <Field label="Sub-Etapa padre" required>
            <select className={selectCls} value={form.parent_id} onChange={set('parent_id')}>
              <option value="">— Seleccionar —</option>
              {substages.map(s => <option key={s.id} value={s.id}>{s.code} — {s.descripcion}</option>)}
            </select>
          </Field>
        )}

        <Field label="Descripción" required>
          <input className={inputCls} value={form.descripcion} onChange={set('descripcion')}
            placeholder={form.tipo === 'etapa' ? 'Ej: Obras Preliminares' : form.tipo === 'sub_etapa' ? 'Ej: Movimiento de Tierras' : 'Ej: Excavación manual'} />
        </Field>

        {form.tipo === 'actividad' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Unidad">
                <select className={selectCls} value={form.unidad} onChange={set('unidad')}>
                  {UNIDADES.map(u => <option key={u}>{u}</option>)}
                </select>
              </Field>
              <Field label="Cantidad">
                <input type="number" className={inputCls} value={form.cantidad} onChange={set('cantidad')} placeholder="0.00" min="0" step="0.01" />
              </Field>
            </div>
            <SectionBox title="Costo Unitario — Desglose">
              <Field label="Mano de Obra (por unidad)">
                <input type="number" className={inputCls} value={form.costo_mo} onChange={set('costo_mo')} placeholder="0.00" min="0" step="0.01" />
              </Field>
              <Field label="Materiales (por unidad)">
                <input type="number" className={inputCls} value={form.costo_materiales} onChange={set('costo_materiales')} placeholder="0.00" min="0" step="0.01" />
              </Field>
              <Field label="Equipo y Transporte (por unidad)">
                <input type="number" className={inputCls} value={form.costo_equipos} onChange={set('costo_equipos')} placeholder="0.00" min="0" step="0.01" />
              </Field>
              <div className="border-t border-gray-200 pt-2 mt-1 flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Costo Unitario</span>
                  <span className="font-mono font-medium">{fmt(ucPreview, moneda)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-gray-600">Costo Total</span>
                  <span className="font-mono" style={{color:'#1D9E75'}}>{fmt(tcPreview, moneda)}</span>
                </div>
              </div>
            </SectionBox>
          </>
        )}

        <div className="flex gap-2 mt-auto pt-2">
          <SecondaryBtn onClick={() => setDrawer(false)} className="flex-1">Cancelar</SecondaryBtn>
          <PrimaryBtn
            onClick={save}
            disabled={!form.descripcion || (form.tipo !== 'etapa' && !editing && !form.parent_id)}
            className="flex-1"
          >{editing ? 'Guardar' : 'Agregar'}</PrimaryBtn>
        </div>
      </Drawer>

      <Confirm open={!!confirmDel} message="¿Eliminar este elemento? Se eliminarán también todos sus elementos hijos."
        onConfirm={del} onCancel={() => setConfirmDel(null)} />
    </div>
  )
}
