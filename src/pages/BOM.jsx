import { useT } from '../i18n'
import { useState, useMemo } from 'react'
import { useStore } from '../store'
import { today, UNIDADES, fmtNum } from '../utils'
import { Drawer, EmptyState, Field, PrimaryBtn, SecondaryBtn, DangerBtn, TBtn, Confirm, Icons, inputCls, selectCls } from '../components'

const emptyBom = () => ({ material_id: '', descripcion: '', unidad: 'und', cantidad_planificada: '' })
const emptyMat = () => ({ codigo: '', descripcion: '', unidad: 'und', stock_actual: '0', stock_minimo: '0' })

export default function BOM({ onNavigate }) {
  const t = useT()
  const { state, dispatch } = useStore()
  const { proyectos, bom, materiales, solicitudes, solicitud_items } = state

  const [proyId, setProyId] = useState(proyectos[0]?.id || '')
  const [drawer, setDrawer] = useState(null) // 'bom' | 'newmat'
  const [form, setForm] = useState(emptyBom())
  const [matForm, setMatForm] = useState(emptyMat())
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [search, setSearch] = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const setM = k => e => setMatForm(f => ({ ...f, [k]: e.target.value }))

  const proy = proyectos.find(p => p.id === proyId)
  const bomItems = useMemo(() => bom.filter(b => b.proyecto_id === proyId), [bom, proyId])
  const activosMat = materiales.filter(m => m.activo !== false)

  // Cantidad ya solicitada por material (bom_item_id)
  const solicitadoPorBom = useMemo(() => {
    const map = {}
    solicitud_items.forEach(si => {
      if (si.bom_item_id) {
        map[si.bom_item_id] = (map[si.bom_item_id] || 0) + (parseFloat(si.cantidad) || 0)
      }
    })
    return map
  }, [solicitud_items])

  const filtered = bomItems.filter(b => {
    const q = search.toLowerCase()
    const mat = materiales.find(m => m.id === b.material_id)
    return !q || b.descripcion.toLowerCase().includes(q) || (mat?.codigo || '').toLowerCase().includes(q)
  })

  const openAdd = () => {
    setForm(emptyBom())
    setEditing(null)
    setDrawer('bom')
  }

  const openEdit = (item) => {
    setForm({
      material_id: item.material_id || '',
      descripcion: item.descripcion,
      unidad: item.unidad,
      cantidad_planificada: item.cantidad_planificada,
    })
    setEditing(item.id)
    setDrawer('bom')
  }

  const saveBom = () => {
    if (!form.descripcion || !form.cantidad_planificada) return
    if (editing) {
      dispatch({ type: 'UPD_BOM_ITEM', payload: { id: editing, ...form, cantidad_planificada: parseFloat(form.cantidad_planificada) || 0 } })
    } else {
      dispatch({ type: 'ADD_BOM_ITEM', payload: { proyecto_id: proyId, ...form, cantidad_planificada: parseFloat(form.cantidad_planificada) || 0 } })
    }
    setDrawer(null)
  }

  const saveNewMat = () => {
    if (!matForm.codigo || !matForm.descripcion) return
    dispatch({ type: 'ADD_MATERIAL', payload: matForm })
    // Buscar el material recién creado para pre-seleccionarlo
    const codigo = matForm.codigo
    setMatForm(emptyMat())
    setDrawer('bom')
    // Pequeño delay para que el store actualice
    setTimeout(() => {
      const nuevo = state.materiales.find(m => m.codigo === codigo)
      if (nuevo) setForm(f => ({ ...f, material_id: nuevo.id, descripcion: matForm.descripcion, unidad: matForm.unidad }))
    }, 50)
  }

  const del = () => {
    dispatch({ type: 'DEL_BOM_ITEM', payload: confirm })
    setConfirm(null)
  }

  // Al seleccionar un material del catálogo, auto-llenar descripción y unidad
  const onSelectMaterial = (matId) => {
    const mat = materiales.find(m => m.id === matId)
    if (mat) {
      setForm(f => ({ ...f, material_id: matId, descripcion: f.descripcion || mat.descripcion, unidad: mat.unidad }))
    } else {
      setForm(f => ({ ...f, material_id: matId }))
    }
  }

  const pct = (bomId, planificado) => {
    const sol = solicitadoPorBom[bomId] || 0
    if (!planificado) return 0
    return Math.min(100, Math.round((sol / planificado) * 100))
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Lista de Materiales Presupuestados</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {proy ? `${proy.project_code} — ${proy.nombre}` : t('bom_select_project')}
            {proyId && <span className="ml-2">· {bomItems.length} ítem(s)</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#1D9E75]"
            value={proyId}
            onChange={e => { setProyId(e.target.value); setSearch('') }}
          >
            <option value="">— Seleccionar proyecto —</option>
            {proyectos.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>)}
          </select>
          {proyId && (
            <PrimaryBtn onClick={openAdd}>+ Agregar Material</PrimaryBtn>
          )}
        </div>
      </div>

      {!proyId ? (
        <EmptyState icon={Icons.inventory} title="Selecciona un proyecto" subtitle="Elige un proyecto para ver o cargar su lista de materiales" />
      ) : bomItems.length === 0 ? (
        <EmptyState
          icon={Icons.inventory}
          title="No hay materiales cargados"
          subtitle="Agrega los materiales planificados para este proyecto"
          action="+ Agregar primer material"
          onAction={openAdd}
        />
      ) : (
        <>
          {/* Buscador */}
          <div className="mb-4">
            <input
              className={inputCls + ' max-w-xs'}
              placeholder="Buscar por código o descripción..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Código catálogo', 'Descripción', 'Unidad', 'Cant. planificada', 'Cant. solicitada', 'Avance', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const mat = materiales.find(m => m.id === item.material_id)
                  const solicitado = solicitadoPorBom[item.id] || 0
                  const p = pct(item.id, item.cantidad_planificada)
                  const sobreasignado = solicitado > item.cantidad_planificada
                  return (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs font-mono text-gray-400">
                        {mat ? mat.codigo : <span className="text-amber-500 italic">Sin vincular</span>}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.descripcion}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{item.unidad}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{fmtNum(item.cantidad_planificada)}</td>
                      <td className="px-4 py-3 text-sm font-mono" style={{ color: sobreasignado ? '#ef4444' : '#374151' }}>
                        {fmtNum(solicitado)}
                        {sobreasignado && <span className="ml-1 text-xs text-red-500">↑ excede</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${p}%`, background: sobreasignado ? '#ef4444' : p >= 80 ? '#f59e0b' : '#1D9E75' }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{p}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <TBtn onClick={() => openEdit(item)}>Editar</TBtn>
                          <TBtn danger onClick={() => setConfirm(item.id)}>Eliminar</TBtn>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Leyenda */}
          <p className="text-xs text-gray-400 mt-3">
            La columna <strong>Cant. solicitada</strong> suma todas las solicitudes de compra vinculadas a cada material de esta lista.
            Si una solicitud supera la cantidad planificada, se marca en rojo.
          </p>
        </>
      )}

      {/* DRAWER: Agregar / editar material BOM */}
      <Drawer open={drawer === 'bom'} onClose={() => setDrawer(null)} title={editing ? t('bom_form_title_edit') : t('bom_form_title_add')} width={420}>
        <Field label="Vincular a catálogo de materiales">
          <select
            className={selectCls}
            value={form.material_id || ''}
            onChange={e => onSelectMaterial(e.target.value)}
          >
            <option value="">— Sin vincular / buscar luego —</option>
            {activosMat.map(m => (
              <option key={m.id} value={m.id}>{m.codigo} — {m.descripcion}</option>
            ))}
          </select>
        </Field>

        <div className="flex items-center gap-2">
          <div className="flex-1 border-t border-gray-100" />
          <span className="text-xs text-gray-400 whitespace-nowrap">o crea uno nuevo en el catálogo</span>
          <div className="flex-1 border-t border-gray-100" />
        </div>

        <button
          onClick={() => { setMatForm(emptyMat()); setDrawer('newmat') }}
          className="w-full text-center text-xs text-[#1D9E75] hover:underline py-1"
        >
          + Crear nuevo material en catálogo
        </button>

        <div className="border-t border-gray-100 pt-3 flex flex-col gap-3">
          <Field label="Descripción en esta lista" required>
            <input
              className={inputCls}
              value={form.descripcion}
              onChange={set('descripcion')}
              placeholder="Ej: Cemento Portland tipo I"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unidad de medida" required>
              <select className={selectCls} value={form.unidad} onChange={set('unidad')}>
                {UNIDADES.map(u => <option key={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="Cantidad planificada" required>
              <input
                type="number"
                className={inputCls}
                value={form.cantidad_planificada}
                onChange={set('cantidad_planificada')}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </Field>
          </div>
        </div>

        <div className="flex gap-2 mt-auto pt-2">
          <SecondaryBtn onClick={() => setDrawer(null)} className="flex-1">Cancelar</SecondaryBtn>
          <PrimaryBtn
            onClick={saveBom}
            disabled={!form.descripcion || !form.cantidad_planificada}
            className="flex-1"
          >
            {editing ? t('bom_form_save_edit') : t('bom_form_save')}
          </PrimaryBtn>
        </div>
      </Drawer>

      {/* DRAWER: Crear nuevo material en catálogo */}
      <Drawer open={drawer === 'newmat'} onClose={() => setDrawer('bom')} title="Crear material en catálogo" width={400}>
        <p className="text-xs text-gray-400 bg-blue-50 border border-blue-100 rounded-lg p-3">
          Este material se creará en el catálogo general de inventario y quedará disponible para vincularse a cualquier proyecto.
        </p>
        <Field label="Código" required>
          <input className={inputCls} value={matForm.codigo} onChange={setM('codigo')} placeholder="Ej: MAT-042" />
        </Field>
        <Field label="Descripción" required>
          <input className={inputCls} value={matForm.descripcion} onChange={setM('descripcion')} placeholder="Ej: Cemento Portland tipo I" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unidad">
            <select className={selectCls} value={matForm.unidad} onChange={setM('unidad')}>
              {UNIDADES.map(u => <option key={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="Stock mínimo">
            <input type="number" className={inputCls} value={matForm.stock_minimo} onChange={setM('stock_minimo')} placeholder="0" min="0" />
          </Field>
        </div>
        <div className="flex gap-2 mt-auto pt-2">
          <SecondaryBtn onClick={() => setDrawer('bom')} className="flex-1">Volver</SecondaryBtn>
          <PrimaryBtn onClick={saveNewMat} disabled={!matForm.codigo || !matForm.descripcion} className="flex-1">
            Crear material
          </PrimaryBtn>
        </div>
      </Drawer>

      <Confirm
        open={!!confirm}
        message="¿Eliminar este material de la lista? Las solicitudes ya generadas no se afectan."
        onConfirm={del}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
