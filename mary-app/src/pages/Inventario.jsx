import { useState } from 'react'
import { useStore } from '../store'
import { today, fmtNum, fmt } from '../utils'
import { Drawer, EmptyState, Badge, Field, PrimaryBtn, SecondaryBtn, TBtn, Confirm, Icons, inputCls, selectCls } from '../components'

const emptyMat = () => ({ codigo:'', descripcion:'', unidad:'und', stock_actual:'0', stock_minimo:'0', ubicacion_bodega:'' })
const emptyIn = () => ({ proyecto_id:'', oc_id:'', material_id:'', cantidad:'', precio_unitario:'', numero_factura:'', proveedor:'', fecha_recepcion:today() })
const emptyOut = () => ({ proyecto_id:'', actividad_id:'', material_id:'', cantidad:'', fecha_salida:today() })

const TABS = ['Catálogo','Entradas','Salidas','Movimientos']

export default function Inventario() {
  const { state, dispatch } = useStore()
  const { materiales, entradas, salidas, proyectos, presupuesto, ordenes_compra } = state
  const [tab, setTab] = useState(0)
  const [drawer, setDrawer] = useState(null) // 'mat'|'in'|'out'
  const [form, setForm] = useState({})
  const [editMat, setEditMat] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const activos = materiales.filter(m => m.activo !== false)
  const criticos = activos.filter(m => parseFloat(m.stock_actual||0) <= parseFloat(m.stock_minimo||0))
  const ocAprobadas = ordenes_compra.filter(oc => oc.estado === 'aprobada' || oc.estado === 'recibida_parcial')

  const selectedMat = materiales.find(m => m.id === form.material_id)
  const stockDisp = selectedMat ? parseFloat(selectedMat.stock_actual||0) : 0
  const qtyOut = parseFloat(form.cantidad||0)
  const stockAlerta = drawer === 'out' && qtyOut > stockDisp

  const actividades = presupuesto.filter(b => b.proyecto_id === form.proyecto_id && b.tipo === 'actividad')

  const saveMat = () => {
    if (!form.codigo || !form.descripcion) return
    if (editMat) {
      dispatch({ type:'UPD_MATERIAL', payload:{ ...form, id:editMat } })
    } else {
      dispatch({ type:'ADD_MATERIAL', payload:form })
    }
    setDrawer(null)
  }

  const saveIn = () => {
    if (!form.material_id || !form.cantidad || !form.fecha_recepcion) return
    dispatch({ type:'ADD_ENTRADA', payload:form })
    setDrawer(null)
  }

  const saveOut = () => {
    if (!form.material_id || !form.cantidad || !form.proyecto_id) return
    if (stockAlerta) return
    dispatch({ type:'ADD_SALIDA', payload:form })
    setDrawer(null)
  }

  const allMovs = [
    ...entradas.map(e => ({ ...e, mov:'entrada', fecha: e.fecha_recepcion })),
    ...salidas.map(s => ({ ...s, mov:'salida', fecha: s.fecha_salida })),
  ].sort((a,b) => new Date(b.fecha) - new Date(a.fecha))

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Inventario & Bodega</h1>
          <p className="text-sm text-gray-400 mt-0.5">{activos.length} materiales · {criticos.length > 0 && <span className="text-red-500">{criticos.length} con stock crítico</span>}</p>
        </div>
        <div className="flex gap-2">
          {tab === 0 && <PrimaryBtn onClick={() => { setForm(emptyMat()); setEditMat(null); setDrawer('mat') }}>+ Material</PrimaryBtn>}
          {tab === 1 && <PrimaryBtn onClick={() => { setForm(emptyIn()); setDrawer('in') }}>+ Registrar Entrada</PrimaryBtn>}
          {tab === 2 && <PrimaryBtn onClick={() => { setForm(emptyOut()); setDrawer('out') }}>+ Registrar Salida</PrimaryBtn>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-5">
        {TABS.map((t,i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px
              ${tab === i ? 'border-[#1D9E75] text-[#1D9E75]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* CATÁLOGO */}
      {tab === 0 && (
        activos.length === 0 ? (
          <EmptyState icon={Icons.inventory} title="No hay materiales en el catálogo"
            action="Agregar primer material" onAction={() => { setForm(emptyMat()); setEditMat(null); setDrawer('mat') }} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                {['Código','Descripción','Unidad','Stock Actual','Stock Mín.','Ubicación','Estado',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {materiales.filter(m => m.activo !== false).map(m => {
                  const crit = parseFloat(m.stock_actual||0) <= parseFloat(m.stock_minimo||0)
                  return (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{m.codigo}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{m.descripcion}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{m.unidad}</td>
                      <td className="px-4 py-3 text-sm font-mono font-medium" style={{ color: crit ? '#ef4444' : '#1D9E75' }}>
                        {fmtNum(m.stock_actual)} {crit && <span className="text-xs">⚠</span>}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-500">{fmtNum(m.stock_minimo)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{m.ubicacion_bodega || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${crit ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                          {crit ? 'Crítico' : 'Normal'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <TBtn onClick={() => { setForm({...m}); setEditMat(m.id); setDrawer('mat') }}>Editar</TBtn>
                          <TBtn danger onClick={() => dispatch({ type:'TOGGLE_MATERIAL', payload:m.id })}>Desactivar</TBtn>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ENTRADAS */}
      {tab === 1 && (
        entradas.length === 0 ? (
          <EmptyState icon={Icons.inventory} title="No hay entradas registradas"
            action="Registrar primera entrada" onAction={() => { setForm(emptyIn()); setDrawer('in') }} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                {['Fecha','Material','Cantidad','Precio Unit.','Factura','Proveedor','Proyecto'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[...entradas].reverse().map(e => {
                  const mat = materiales.find(m => m.id === e.material_id)
                  const proy = proyectos.find(p => p.id === e.proyecto_id)
                  return (
                    <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs text-gray-500">{e.fecha_recepcion}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{mat?.descripcion || '—'}</td>
                      <td className="px-4 py-3 text-sm font-mono text-[#1D9E75]">+{fmtNum(e.cantidad)} {mat?.unidad}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">{fmt(e.precio_unitario, proy?.moneda)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{e.numero_factura || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{e.proveedor || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{proy?.project_code || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* SALIDAS */}
      {tab === 2 && (
        salidas.length === 0 ? (
          <EmptyState icon={Icons.inventory} title="No hay salidas registradas"
            action="Registrar primera salida" onAction={() => { setForm(emptyOut()); setDrawer('out') }} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                {['Fecha','Material','Cantidad','Proyecto','Actividad'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[...salidas].reverse().map(s => {
                  const mat = materiales.find(m => m.id === s.material_id)
                  const proy = proyectos.find(p => p.id === s.proyecto_id)
                  const act = presupuesto.find(b => b.id === s.actividad_id)
                  return (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs text-gray-500">{s.fecha_salida}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{mat?.descripcion || '—'}</td>
                      <td className="px-4 py-3 text-sm font-mono text-red-500">-{fmtNum(s.cantidad)} {mat?.unidad}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{proy?.project_code || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{act ? `${act.code} — ${act.descripcion}` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* MOVIMIENTOS */}
      {tab === 3 && (
        allMovs.length === 0 ? (
          <EmptyState icon={Icons.inventory} title="Sin movimientos registrados" />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                {['Tipo','Fecha','Material','Cantidad','Detalle'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {allMovs.map(m => {
                  const mat = materiales.find(x => x.id === m.material_id)
                  return (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.mov === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {m.mov === 'entrada' ? '↓ Entrada' : '↑ Salida'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{m.fecha}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{mat?.descripcion || '—'}</td>
                      <td className="px-4 py-3 text-sm font-mono font-medium" style={{ color: m.mov === 'entrada' ? '#1D9E75' : '#ef4444' }}>
                        {m.mov === 'entrada' ? '+' : '-'}{fmtNum(m.cantidad)} {mat?.unidad}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {m.mov === 'entrada' ? (m.proveedor || m.numero_factura || '—') : proyectos.find(p=>p.id===m.proyecto_id)?.project_code || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* DRAWER MATERIAL */}
      <Drawer open={drawer === 'mat'} onClose={() => setDrawer(null)} title={editMat ? 'Editar Material' : 'Nuevo Material'} width={380}>
        <Field label="Código" required><input className={inputCls} value={form.codigo||''} onChange={set('codigo')} placeholder="MAT-001" /></Field>
        <Field label="Descripción" required><input className={inputCls} value={form.descripcion||''} onChange={set('descripcion')} placeholder="Ej: Cemento Portland" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unidad"><input className={inputCls} value={form.unidad||''} onChange={set('unidad')} placeholder="und" /></Field>
          <Field label="Ubicación en bodega"><input className={inputCls} value={form.ubicacion_bodega||''} onChange={set('ubicacion_bodega')} placeholder="Estante A-1" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Stock inicial"><input type="number" className={inputCls} value={form.stock_actual||''} onChange={set('stock_actual')} placeholder="0" min="0" step="0.01" /></Field>
          <Field label="Stock mínimo"><input type="number" className={inputCls} value={form.stock_minimo||''} onChange={set('stock_minimo')} placeholder="0" min="0" step="0.01" /></Field>
        </div>
        <div className="flex gap-2 mt-auto pt-2">
          <SecondaryBtn onClick={() => setDrawer(null)} className="flex-1">Cancelar</SecondaryBtn>
          <PrimaryBtn onClick={saveMat} disabled={!form.codigo||!form.descripcion} className="flex-1">Guardar</PrimaryBtn>
        </div>
      </Drawer>

      {/* DRAWER ENTRADA */}
      <Drawer open={drawer === 'in'} onClose={() => setDrawer(null)} title="Registrar Entrada a Bodega" width={400}>
        <Field label="Material" required>
          <select className={selectCls} value={form.material_id||''} onChange={set('material_id')}>
            <option value="">— Seleccionar —</option>
            {activos.map(m => <option key={m.id} value={m.id}>{m.codigo} — {m.descripcion}</option>)}
          </select>
        </Field>
        <Field label="Orden de Compra vinculada">
          <select className={selectCls} value={form.oc_id||''} onChange={set('oc_id')}>
            <option value="">— Sin OC —</option>
            {ocAprobadas.map(oc => <option key={oc.id} value={oc.id}>{oc.oc_number} — {oc.proveedor || 'Sin proveedor'}</option>)}
          </select>
        </Field>
        <Field label="Proyecto">
          <select className={selectCls} value={form.proyecto_id||''} onChange={set('proyecto_id')}>
            <option value="">— Seleccionar —</option>
            {proyectos.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cantidad" required><input type="number" className={inputCls} value={form.cantidad||''} onChange={set('cantidad')} placeholder="0.00" min="0" step="0.01" /></Field>
          <Field label="Precio unitario" required><input type="number" className={inputCls} value={form.precio_unitario||''} onChange={set('precio_unitario')} placeholder="0.00" min="0" step="0.01" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="N° Factura"><input className={inputCls} value={form.numero_factura||''} onChange={set('numero_factura')} placeholder="FAC-0001" /></Field>
          <Field label="Proveedor"><input className={inputCls} value={form.proveedor||''} onChange={set('proveedor')} placeholder="Nombre del proveedor" /></Field>
        </div>
        <Field label="Fecha de recepción" required><input type="date" className={inputCls} value={form.fecha_recepcion||today()} onChange={set('fecha_recepcion')} /></Field>
        <div className="flex gap-2 mt-auto pt-2">
          <SecondaryBtn onClick={() => setDrawer(null)} className="flex-1">Cancelar</SecondaryBtn>
          <PrimaryBtn onClick={saveIn} disabled={!form.material_id||!form.cantidad} className="flex-1">Registrar Entrada</PrimaryBtn>
        </div>
      </Drawer>

      {/* DRAWER SALIDA */}
      <Drawer open={drawer === 'out'} onClose={() => setDrawer(null)} title="Registrar Salida de Bodega" width={400}>
        <Field label="Proyecto" required>
          <select className={selectCls} value={form.proyecto_id||''} onChange={e => setForm(f => ({...f, proyecto_id: e.target.value, actividad_id: ''}))}>
            <option value="">— Seleccionar —</option>
            {proyectos.filter(p => p.estado !== 'completado' && p.estado !== 'cancelado').map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>)}
          </select>
        </Field>
        <Field label="Actividad del presupuesto">
          <select className={selectCls} value={form.actividad_id||''} onChange={set('actividad_id')}>
            <option value="">— Seleccionar —</option>
            {actividades.map(a => <option key={a.id} value={a.id}>{a.code} — {a.descripcion}</option>)}
          </select>
        </Field>
        <Field label="Material" required>
          <select className={selectCls} value={form.material_id||''} onChange={set('material_id')}>
            <option value="">— Seleccionar —</option>
            {activos.map(m => <option key={m.id} value={m.id}>{m.codigo} — {m.descripcion} (stock: {fmtNum(m.stock_actual)} {m.unidad})</option>)}
          </select>
        </Field>
        <Field label="Cantidad" required>
          <input type="number" className={inputCls} value={form.cantidad||''} onChange={set('cantidad')} placeholder="0.00" min="0" step="0.01" />
          {stockAlerta && <p className="text-xs text-red-500 mt-1">⚠ La cantidad supera el stock disponible ({fmtNum(stockDisp)})</p>}
        </Field>
        <Field label="Fecha de salida" required><input type="date" className={inputCls} value={form.fecha_salida||today()} onChange={set('fecha_salida')} /></Field>
        <div className="flex gap-2 mt-auto pt-2">
          <SecondaryBtn onClick={() => setDrawer(null)} className="flex-1">Cancelar</SecondaryBtn>
          <PrimaryBtn onClick={saveOut} disabled={!form.material_id||!form.cantidad||!form.proyecto_id||stockAlerta} className="flex-1">Registrar Salida</PrimaryBtn>
        </div>
      </Drawer>
    </div>
  )
}
