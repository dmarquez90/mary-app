import { useState, useContext } from 'react'
import { useStore } from '../store'
import { useT } from '../i18n'
import { today, fmtNum, fmt } from '../utils'
import { Drawer, EmptyState, Field, PrimaryBtn, SecondaryBtn, TBtn, Icons, inputCls, selectCls } from '../components'
import { LangContext } from '../i18n'
import { usePermissions } from '../usePermissions'
import { useAuth } from '../auth'
import ImportarCatalogo from './ImportarCatalogo'

const emptyMat = () => ({ codigo:'', descripcion:'', categoria:'', unidad:'und', stock_actual:'0', stock_minimo:'0', ubicacion_bodega:'', precio_unitario:'' })
const emptyIn  = () => ({ proyecto_id:'', oc_id:'', material_id:'', cantidad:'', precio_unitario:'', numero_factura:'', proveedor:'', fecha_recepcion:today(), tipo_entrada:'compra_proyecto', impuesto_monto:'', impuesto_descripcion:'' })
const emptyOut = () => ({ proyecto_id:'', actividad_id:'', material_id:'', cantidad:'', fecha_salida:today(), tipo_salida:'uso_directo', origen_proyecto_id:'' })

const CATEGORIAS = [
  { key:'concreto',     es:'Concreto',     en:'Concrete',   color:'#6B7280' },
  { key:'acero',        es:'Acero',        en:'Steel',      color:'#374151' },
  { key:'madera',       es:'Madera',       en:'Wood',       color:'#92400E' },
  { key:'electrico',    es:'Electrico',    en:'Electrical', color:'#D97706' },
  { key:'plomeria',     es:'Plomeria',     en:'Plumbing',   color:'#2563EB' },
  { key:'acabados',     es:'Acabados',     en:'Finishes',   color:'#7C3AED' },
  { key:'herramientas', es:'Herramientas', en:'Tools',      color:'#DC2626' },
  { key:'equipos',      es:'Equipos',      en:'Equipment',  color:'#059669' },
  { key:'otros',        es:'Otros',        en:'Other',      color:'#9CA3AF' },
]

function ModalJustificacion({ open, onClose, onConfirm, tipo, isEs }) {
  const [justificacion, setJustificacion] = useState('')
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-lg">!</div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">
              {isEs ? 'Solicitud de eliminacion' : 'Deletion request'}
            </p>
            <p className="text-xs text-gray-400">
              {isEs ? `Tipo: ${tipo === 'entrada' ? 'Entrada de material' : 'Salida de material'}` : `Type: ${tipo === 'entrada' ? 'Material entry' : 'Material exit'}`}
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          {isEs
            ? 'Esta accion requiere aprobacion del administrador. Por favor explica el motivo de esta eliminacion.'
            : 'This action requires administrator approval. Please explain the reason for this deletion.'}
        </p>
        <textarea
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B] resize-none"
          rows={4}
          placeholder={isEs ? 'Escribe aqui la justificacion...' : 'Write the justification here...'}
          value={justificacion}
          onChange={e => setJustificacion(e.target.value)}
        />
        <div className="flex gap-2 mt-4">
          <button onClick={() => { setJustificacion(''); onClose() }}
            className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            {isEs ? 'Cancelar' : 'Cancel'}
          </button>
          <button
            disabled={!justificacion.trim()}
            onClick={() => { onConfirm(justificacion); setJustificacion('') }}
            className="flex-1 px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-40"
            style={{ background: '#1B3A6B' }}>
            {isEs ? 'Enviar solicitud' : 'Send request'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Inventario() {
  const { state, dispatch } = useStore()
  const t = useT()
  const { can, rol } = usePermissions()
  const { perfil } = useAuth()
  const { lang } = useContext(LangContext)
  const isEs = lang === 'ES'
  const { materiales, entradas, salidas, proyectos, presupuesto, ordenes_compra, solicitudes = [], solicitud_items = [], ordenes_compra_items = [], solicitudes_eliminacion = [] } = state

  const [tab, setTab]             = useState(0)
  const [drawer, setDrawer]       = useState(null)
  const [form, setForm]           = useState({})
  const [editMat, setEditMat]     = useState(null)
  const [catFilter, setCatFilter] = useState('')
  const [search, setSearch]       = useState('')
  const [searchOut, setSearchOut] = useState('')  // busqueda en drawer de salidas
  const [modalElim, setModalElim] = useState(null)

  const esBodeguero  = rol === 'bodeguero'
  const puedeEditar  = can('inventario_editar')

  const TABS = [t('inv_tab_catalog'), t('inv_tab_entries'), t('inv_tab_exits'), t('inv_tab_movements')]
  const set  = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const activos    = materiales.filter(m => m.activo !== false)
  const inactivos  = materiales.filter(m => m.activo === false)  // NUEVO: materiales inactivos

  const activosFiltrados = activos
    .filter(m => !catFilter || m.categoria === catFilter)
    .filter(m => !search || m.descripcion?.toLowerCase().includes(search.toLowerCase()) || m.codigo?.toLowerCase().includes(search.toLowerCase()))

  // Materiales filtrados para el drawer de salidas
  const activosFiltradosSalida = activos.filter(m =>
    !searchOut ||
    m.descripcion?.toLowerCase().includes(searchOut.toLowerCase()) ||
    m.codigo?.toLowerCase().includes(searchOut.toLowerCase())
  )

  const criticos    = activos.filter(m => parseFloat(m.stock_actual||0) < parseFloat(m.stock_minimo||0))
  const ocAprobadas = ordenes_compra.filter(oc => oc.estado === 'aprobada' || oc.estado === 'recibida_parcial')

  const selectedMat = materiales.find(m => m.id === form.material_id)
  const stockDisp   = selectedMat ? parseFloat(selectedMat.stock_actual||0) : 0
  const qtyOut      = parseFloat(form.cantidad||0)
  const stockAlerta = drawer === 'out' && qtyOut > stockDisp
  const actividades = presupuesto.filter(b => b.proyecto_id === form.proyecto_id && b.tipo === 'actividad')

  const saveMat = () => {
    if (!form.codigo || !form.descripcion) return
    if (editMat) dispatch({ type:'UPD_MATERIAL', payload:{ ...form, id:editMat } })
    else         dispatch({ type:'ADD_MATERIAL', payload:form })
    setDrawer(null)
  }

  const delMat = (m) => {
    const tieneMovs = entradas.some(e => e.material_id === m.id) || salidas.some(s => s.material_id === m.id)
    if (tieneMovs) {
      alert(isEs
        ? `No se puede eliminar "${m.descripcion}" porque tiene movimientos registrados.\nUsa "Desactivar" en su lugar.`
        : `Cannot delete "${m.descripcion}" because it has recorded movements.\nUse "Deactivate" instead.`)
      return
    }
    if (!window.confirm(isEs
      ? `Eliminar el material "${m.descripcion}"? Esta accion no se puede deshacer.`
      : `Delete material "${m.descripcion}"? This action cannot be undone.`)) return
    dispatch({ type:'DEL_MATERIAL', payload: m.id })
  }

  const delEntrada = (e) => {
    const mat = materiales.find(m => m.id === e.material_id)
    if (esBodeguero) {
      const tienePendiente = solicitudes_eliminacion.some(
        x => x.registro_id === e.id && x.estado === 'pendiente'
      )
      if (tienePendiente) {
        alert(isEs
          ? 'Ya existe una solicitud de eliminacion pendiente para este registro. Espera la respuesta del administrador.'
          : 'A deletion request is already pending for this record. Please wait for the administrator\'s response.')
        return
      }
      setModalElim({ tipo: 'entrada', registro: e, mat })
    } else {
      const salidasAfectadas = salidas.filter(s => s.material_id === e.material_id)
      const otrasEntradas    = entradas.filter(x => x.id !== e.id && x.material_id === e.material_id)
      const totalOtras       = otrasEntradas.reduce((s,x) => s + parseFloat(x.cantidad||0), 0)
      const totalSalidas     = salidasAfectadas.reduce((s,x) => s + parseFloat(x.cantidad||0), 0)
      let mensaje = isEs
        ? `Eliminar esta entrada?\nSe descontaran ${fmtNum(e.cantidad)} ${mat?.unidad || ''} del stock de "${mat?.descripcion || ''}".`
        : `Delete this entry?\n${fmtNum(e.cantidad)} ${mat?.unidad || ''} will be deducted from "${mat?.descripcion || ''}" stock.`
      if (totalSalidas > totalOtras) {
        mensaje += isEs
          ? `\n\nADVERTENCIA: Hay ${salidasAfectadas.length} salida(s) registradas que quedaran sin respaldo. Se eliminaran automaticamente.`
          : `\n\nWARNING: There are ${salidasAfectadas.length} recorded exit(s) that will be left unsupported. They will be automatically deleted.`
      }
      if (!window.confirm(mensaje)) return
      dispatch({ type:'DEL_ENTRADA', payload:{ id: e.id, materialId: e.material_id, cantidad: parseFloat(e.cantidad||0) } })
    }
  }

  const delSalida = (s) => {
    const mat = materiales.find(m => m.id === s.material_id)
    if (esBodeguero) {
      const tienePendiente = solicitudes_eliminacion.some(
        x => x.registro_id === s.id && x.estado === 'pendiente'
      )
      if (tienePendiente) {
        alert(isEs
          ? 'Ya existe una solicitud de eliminacion pendiente para este registro. Espera la respuesta del administrador.'
          : 'A deletion request is already pending for this record. Please wait for the administrator\'s response.')
        return
      }
      setModalElim({ tipo: 'salida', registro: s, mat })
    } else {
      if (!window.confirm(isEs
        ? `Eliminar esta salida?\nSe devolvaran ${fmtNum(s.cantidad)} ${mat?.unidad || ''} al stock de "${mat?.descripcion || ''}".`
        : `Delete this exit?\n${fmtNum(s.cantidad)} ${mat?.unidad || ''} will be returned to "${mat?.descripcion || ''}" stock.`)) return
      dispatch({ type:'DEL_SALIDA', payload:{ id: s.id, materialId: s.material_id, cantidad: parseFloat(s.cantidad||0) } })
    }
  }

  const confirmarSolicitudElim = (justificacion) => {
    if (!modalElim) return
    const { tipo, registro, mat } = modalElim
    dispatch({
      type: 'ADD_SOL_ELIM',
      payload: {
        solicitante_id:     perfil?.id,
        solicitante_nombre: perfil?.nombre,
        tipo,
        registro_id:        registro.id,
        material_id:        registro.material_id,
        material_desc:      mat?.descripcion || '---',
        cantidad:           parseFloat(registro.cantidad||0),
        justificacion,
      }
    })
    setModalElim(null)
    alert(isEs
      ? 'Solicitud enviada. El administrador recibira una notificacion para aprobar o rechazar.'
      : 'Request sent. The administrator will receive a notification to approve or reject.')
  }

  const allMovs = [
    ...entradas.map(e => ({ ...e, mov:'entrada', fecha: e.fecha_recepcion })),
    ...salidas.map(s => ({ ...s, mov:'salida',   fecha: s.fecha_salida })),
  ].sort((a,b) => new Date(b.fecha) - new Date(a.fecha))

  const saveIn = async () => {
    if ((!form.material_id && !form._material_nuevo) || !form.cantidad || !form.fecha_recepcion) return
    const tipoEntrada = !form.proyecto_id ? 'compra_general' : (form.tipo_entrada || 'compra_proyecto')
    if (form._material_nuevo && form._mat_codigo) {
      const nuevoId = crypto.randomUUID()
      const cantidad = parseFloat(form.cantidad || 0)
      const precio   = parseFloat(form.precio_unitario || 0)
      await dispatch({
        type: 'ADD_MATERIAL_CON_ENTRADA',
        payload: {
          material: {
            id:               nuevoId,
            codigo:           form._mat_codigo,
            descripcion:      form._mat_nombre || form._oc_item_desc || '',
            unidad:           form._mat_unidad || 'und',
            stock_actual:     cantidad,
            stock_minimo:     parseFloat(form._mat_stock_min || 0),
            ubicacion_bodega: '',
            categoria:        '',
            precio_unitario:  precio,
            activo:           true,
          },
          entrada: {
            material_id:     nuevoId,
            proyecto_id:     form.proyecto_id || null,
            oc_id:           form.oc_id || null,
            cantidad,
            precio_unitario: precio,
            numero_factura:  form.numero_factura || '',
            proveedor:       form.proveedor || '',
            fecha_recepcion: form.fecha_recepcion,
            tipo_entrada:    tipoEntrada,
            impuesto_monto:       parseFloat(form.impuesto_monto || 0),
            impuesto_descripcion: form.impuesto_descripcion || '',
          }
        }
      })
    } else {
      dispatch({ type: 'ADD_ENTRADA', payload: {
        ...form,
        material_id:  form.material_id,
        proyecto_id:  form.proyecto_id || null,
        tipo_entrada: tipoEntrada,
        impuesto_monto:       parseFloat(form.impuesto_monto || 0),
        impuesto_descripcion: form.impuesto_descripcion || '',
      }})
    }
    setDrawer(null)
  }

  const saveOut = () => {
    if (!form.material_id || !form.cantidad || !form.proyecto_id) return
    if (stockAlerta) return
    dispatch({ type:'ADD_SALIDA', payload: {
      ...form,
      tipo_salida:        form.tipo_salida || 'uso_directo',
      origen_proyecto_id: form.tipo_salida === 'sobrante_transferido' ? (form.origen_proyecto_id || null) : null,
      costo_cargo:        form.tipo_salida === 'uso_directo' ? null : 0,
    }})
    setSearchOut('')
    setDrawer(null)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">

      <ModalJustificacion
        open={!!modalElim}
        onClose={() => setModalElim(null)}
        onConfirm={confirmarSolicitudElim}
        tipo={modalElim?.tipo}
        isEs={isEs}
      />

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{t('inv_title')}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {t('inv_sub', { n: activos.length })}
            {criticos.length > 0 && <span className="text-red-500 ml-1">· {t('inv_critical', { n: criticos.length })}</span>}
          </p>
        </div>
        {puedeEditar && (
          <div className="flex gap-2">
            {tab === 0 && <PrimaryBtn onClick={() => { setForm(emptyMat()); setEditMat(null); setDrawer('mat') }}>{t('inv_add_material')}</PrimaryBtn>}
            {tab === 1 && <PrimaryBtn onClick={() => { setForm(emptyIn()); setDrawer('in') }}>{t('inv_add_entry')}</PrimaryBtn>}
            {tab === 2 && <PrimaryBtn onClick={() => { setForm(emptyOut()); setSearchOut(''); setDrawer('out') }}>{t('inv_add_exit')}</PrimaryBtn>}
          </div>
        )}
      </div>

      <div className="flex border-b border-gray-200 mb-5">
        {TABS.map((label, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px
              ${tab===i ? 'border-[#1B3A6B] text-[#1B3A6B]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── CATALOGO ── */}
      {tab === 0 && (
        <div>
          {puedeEditar && <ImportarCatalogo onDone={() => setCatFilter('')} />}

          {activos.length === 0 ? (
            <div className="mt-4">
              <EmptyState icon={Icons.inventory} title={t('inv_empty_catalog')}
                action={puedeEditar ? t('inv_add_material') : null}
                onAction={puedeEditar ? () => { setForm(emptyMat()); setEditMat(null); setDrawer('mat') } : null} />
            </div>
          ) : (
            <div className="mt-4">
              <div className="mb-4">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-[#1B3A6B]"
                    placeholder={isEs ? 'Buscar por nombre o codigo...' : 'Search by name or code...'}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">x</button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={() => setCatFilter('')}
                  className="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
                  style={!catFilter ? { background:'#1B3A6B', color:'#fff', borderColor:'#1B3A6B' } : { background:'#fff', color:'#6B7280', borderColor:'#D1D5DB' }}>
                  {isEs ? 'Todos' : 'All'}
                </button>
                {CATEGORIAS.filter(c => activos.some(m => m.categoria === c.key)).map(c => (
                  <button key={c.key} onClick={() => setCatFilter(catFilter === c.key ? '' : c.key)}
                    className="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
                    style={catFilter === c.key ? { background:c.color, color:'#fff', borderColor:c.color } : { background:'#fff', color:c.color, borderColor:c.color }}>
                    {isEs ? c.es : c.en}
                  </button>
                ))}
              </div>

              {activosFiltrados.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                  <p className="text-sm text-gray-400">{isEs ? 'No se encontraron materiales' : 'No materials found'}</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="bg-gray-50 border-b border-gray-100">
                      {[
                        t('inv_col_code'), t('inv_col_desc'),
                        isEs ? 'Categoria' : 'Category',
                        t('inv_col_unit'), t('inv_col_stock'), t('inv_col_min'),
                        isEs ? 'Precio' : 'Price',
                        isEs ? 'Total' : 'Total',
                        t('inv_col_location'), t('inv_col_status'),
                        puedeEditar ? '' : null
                      ].filter(h => h !== null).map((h,i) => (
                        <th key={i} className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {activosFiltrados.map(m => {
                        const crit = parseFloat(m.stock_actual||0) < parseFloat(m.stock_minimo||0)
                        const cat  = CATEGORIAS.find(c => c.key === m.categoria)
                        return (
                          <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="px-4 py-3 text-xs font-mono text-gray-500">{m.codigo}</td>
                            <td className="px-4 py-3 text-sm text-gray-800" style={{minWidth:200}}>{m.descripcion}</td>
                            <td className="px-4 py-3">
                              {cat
                                ? <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ background: cat.color }}>{isEs ? cat.es : cat.en}</span>
                                : <span className="text-xs text-gray-300">---</span>}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">{m.unidad}</td>
                            <td className="px-4 py-3 text-sm font-mono font-medium" style={{ color: crit ? '#ef4444' : '#1D9E75' }}>
                              {fmtNum(m.stock_actual)} {crit && <span className="text-xs">!</span>}
                            </td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-500">{fmtNum(m.stock_minimo)}</td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-600">
                              {(() => {
                                const entsM = entradas.filter(e => e.material_id === m.id)
                                if (entsM.length > 0) {
                                  const totalCant = entsM.reduce((s,e) => s + parseFloat(e.cantidad||0), 0)
                                  const totalVal  = entsM.reduce((s,e) => s + parseFloat(e.cantidad||0) * parseFloat(e.precio_unitario||0), 0)
                                  const prom = totalCant > 0 ? totalVal / totalCant : 0
                                  return prom > 0 ? `${fmt(prom, m.moneda || 'USD')}` : '---'
                                }
                                return m.precio_unitario > 0 ? fmt(m.precio_unitario, 'USD') : '---'
                              })()}
                            </td>
                            <td className="px-4 py-3 text-sm font-mono font-semibold" style={{color:"#1B3A6B", minWidth:120}}>
                              {(() => {
                                const entsM = entradas.filter(e => e.material_id === m.id)
                                const precio = entsM.length > 0
                                  ? entsM.reduce((s,e) => s + parseFloat(e.cantidad||0)*parseFloat(e.precio_unitario||0), 0) / entsM.reduce((s,e) => s + parseFloat(e.cantidad||0), 0)
                                  : parseFloat(m.precio_unitario||0)
                                const total = parseFloat(m.stock_actual||0) * precio
                                return total > 0 ? fmt(total, 'USD') : '---'
                              })()}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">{m.ubicacion_bodega || '---'}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${crit ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                                {crit ? t('inv_critical_badge') : t('inv_ok')}
                              </span>
                            </td>
                            {puedeEditar && (
                              <td className="px-4 py-3">
                                <div className="flex gap-1">
                                  <TBtn onClick={() => { setForm({...m}); setEditMat(m.id); setDrawer('mat') }}>{t('btn_edit')}</TBtn>
                                  <TBtn danger onClick={() => dispatch({ type:'TOGGLE_MATERIAL', payload:m.id })}>{t('inv_deactivate')}</TBtn>
                                  <TBtn danger onClick={() => delMat(m)}>{isEs ? 'Eliminar' : 'Delete'}</TBtn>
                                </div>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── MATERIALES INACTIVOS ── */}
              {inactivos.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    {isEs ? `${inactivos.length} material(es) inactivo(s)` : `${inactivos.length} inactive material(s)`}
                  </p>
                  <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto opacity-70">
                    <table className="w-full">
                      <tbody>
                        {inactivos.map(m => {
                          const cat = CATEGORIAS.find(c => c.key === m.categoria)
                          return (
                            <tr key={m.id} className="border-b border-gray-50">
                              <td className="px-4 py-2 text-xs font-mono text-gray-400">{m.codigo}</td>
                              <td className="px-4 py-2 text-sm text-gray-400">{m.descripcion}</td>
                              <td className="px-4 py-2 text-xs text-gray-400">
                                {cat ? (isEs ? cat.es : cat.en) : '---'}
                              </td>
                              <td className="px-4 py-2 text-xs text-gray-400">{m.unidad}</td>
                              <td className="px-4 py-2 text-xs font-mono text-gray-400">{fmtNum(m.stock_actual)}</td>
                              <td className="px-4 py-2">
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">
                                  {isEs ? 'Inactivo' : 'Inactive'}
                                </span>
                              </td>
                              {puedeEditar && (
                                <td className="px-4 py-2">
                                  <div className="flex gap-1">
                                    <TBtn onClick={() => dispatch({ type:'TOGGLE_MATERIAL', payload:m.id })}>
                                      {isEs ? 'Activar' : 'Activate'}
                                    </TBtn>
                                    <TBtn onClick={() => { setForm({...m}); setEditMat(m.id); setDrawer('mat') }}>
                                      {t('btn_edit')}
                                    </TBtn>
                                    <TBtn danger onClick={() => delMat(m)}>
                                      {isEs ? 'Eliminar' : 'Delete'}
                                    </TBtn>
                                  </div>
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── ENTRADAS ── */}
      {tab === 1 && (
        entradas.length === 0 ? (
          <EmptyState icon={Icons.inventory} title={t('inv_empty_entries')}
            action={puedeEditar ? t('inv_add_entry') : null}
            onAction={puedeEditar ? () => { setForm(emptyIn()); setDrawer('in') } : null} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                {[
                  t('inv_col_date'), t('inv_col_material'), t('inv_col_qty'),
                  t('inv_col_price'), isEs ? 'Impuesto' : 'Tax', t('inv_col_invoice'), t('inv_col_supplier'),
                  t('inv_col_project'), isEs ? 'Tipo' : 'Type',
                  puedeEditar ? '' : null
                ].filter(h => h !== null).map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[...entradas].reverse().map(e => {
                  const mat  = materiales.find(m => m.id === e.material_id)
                  const proy = proyectos.find(p => p.id === e.proyecto_id)
                  const esStockInicial = e.numero_factura === 'STOCK-INICIAL'
                  return (
                    <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs text-gray-500">{e.fecha_recepcion}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{mat?.descripcion || '---'}</td>
                      <td className="px-4 py-3 text-sm font-mono text-[#1D9E75]">+{fmtNum(e.cantidad)} {mat?.unidad}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">{fmt(e.precio_unitario, proy?.moneda)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {parseFloat(e.impuesto_monto||0) > 0
                          ? <span title={e.impuesto_descripcion||''}>{fmt(e.impuesto_monto, proy?.moneda)}</span>
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {esStockInicial
                          ? <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{isEs ? 'Stock inicial' : 'Initial stock'}</span>
                          : e.numero_factura || '---'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{e.proveedor || '---'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {proy?.project_code || <span className="text-amber-600 font-medium">{isEs ? 'Sin proyecto' : 'No project'}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const tipo = e.tipo_entrada || 'compra_proyecto'
                          const cfg = {
                            compra_proyecto:   { label: isEs ? 'Compra proyecto' : 'Project purchase', cls: 'bg-blue-100 text-blue-700' },
                            compra_general:    { label: isEs ? 'Reserva general' : 'General reserve',  cls: 'bg-amber-100 text-amber-700' },
                            sobrante_proyecto: { label: isEs ? 'Sobrante' : 'Surplus',                 cls: 'bg-purple-100 text-purple-700' },
                            devolucion:        { label: isEs ? 'Devolucion' : 'Return',                cls: 'bg-gray-100 text-gray-600' },
                          }
                          const c = cfg[tipo] || cfg.compra_proyecto
                          return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.cls}`}>{c.label}</span>
                        })()}
                      </td>
                      {puedeEditar && (
                        <td className="px-4 py-3">
                          {esBodeguero ? (() => {
                            const tienePendiente = solicitudes_eliminacion.some(
                              x => x.registro_id === e.id && x.estado === 'pendiente'
                            )
                            return tienePendiente
                              ? <span className="text-xs px-2 py-1 rounded-lg bg-amber-100 text-amber-700 font-medium">
                                  {isEs ? 'Solicitud pendiente' : 'Request pending'}
                                </span>
                              : <TBtn danger onClick={() => delEntrada(e)}>
                                  {isEs ? 'Solicitar eliminacion' : 'Request deletion'}
                                </TBtn>
                          })() : (
                            <TBtn danger onClick={() => delEntrada(e)}>
                              {isEs ? 'Eliminar' : 'Delete'}
                            </TBtn>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── SALIDAS ── */}
      {tab === 2 && (
        salidas.length === 0 ? (
          <EmptyState icon={Icons.inventory} title={t('inv_empty_exits')}
            action={puedeEditar ? t('inv_add_exit') : null}
            onAction={puedeEditar ? () => { setForm(emptyOut()); setSearchOut(''); setDrawer('out') } : null} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                {[
                  t('inv_col_date'), t('inv_col_material'), t('inv_col_qty'),
                  t('inv_col_project'), t('inv_col_activity'),
                  isEs ? 'Tipo' : 'Type',
                  puedeEditar ? '' : null
                ].filter(h => h !== null).map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[...salidas].reverse().map(s => {
                  const mat  = materiales.find(m => m.id === s.material_id)
                  const proy = proyectos.find(p => p.id === s.proyecto_id)
                  const act  = presupuesto.find(b => b.id === s.actividad_id)
                  return (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs text-gray-500">{s.fecha_salida}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{mat?.descripcion || '---'}</td>
                      <td className="px-4 py-3 text-sm font-mono text-red-500">-{fmtNum(s.cantidad)} {mat?.unidad}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{proy?.project_code || '---'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{act ? `${act.code} --- ${act.descripcion}` : '---'}</td>
                      <td className="px-4 py-3">
                        {(() => {
                          const tipo = s.tipo_salida || 'uso_directo'
                          const origenProy = proyectos.find(p => p.id === s.origen_proyecto_id)
                          const cfg = {
                            uso_directo:         { label: isEs ? 'Uso directo' : 'Direct use',     cls: 'bg-blue-100 text-blue-700' },
                            sobrante_transferido: { label: isEs ? `Sobrante${origenProy ? ` (${origenProy.project_code})` : ''}` : `Surplus${origenProy ? ` (${origenProy.project_code})` : ''}`, cls: 'bg-purple-100 text-purple-700' },
                            uso_general:         { label: isEs ? 'Reserva general' : 'General reserve', cls: 'bg-amber-100 text-amber-700' },
                          }
                          const c = cfg[tipo] || cfg.uso_directo
                          return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.cls}`}>{c.label}</span>
                        })()}
                      </td>
                      {puedeEditar && (
                        <td className="px-4 py-3">
                          {esBodeguero ? (() => {
                            const tienePendiente = solicitudes_eliminacion.some(
                              x => x.registro_id === s.id && x.estado === 'pendiente'
                            )
                            return tienePendiente
                              ? <span className="text-xs px-2 py-1 rounded-lg bg-amber-100 text-amber-700 font-medium">
                                  {isEs ? 'Solicitud pendiente' : 'Request pending'}
                                </span>
                              : <TBtn danger onClick={() => delSalida(s)}>
                                  {isEs ? 'Solicitar eliminacion' : 'Request deletion'}
                                </TBtn>
                          })() : (
                            <TBtn danger onClick={() => delSalida(s)}>
                              {isEs ? 'Eliminar' : 'Delete'}
                            </TBtn>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── MOVIMIENTOS ── */}
      {tab === 3 && (
        allMovs.length === 0 ? (
          <EmptyState icon={Icons.inventory} title={t('inv_empty_movements')} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                {[t('inv_col_type'),t('inv_col_date'),t('inv_col_material'),t('inv_col_qty'),t('inv_col_detail')].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {allMovs.map(m => {
                  const mat = materiales.find(x => x.id === m.material_id)
                  return (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.mov==='entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {m.mov==='entrada' ? `+ ${t('inv_entry')}` : `- ${t('inv_exit')}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{m.fecha}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{mat?.descripcion || '---'}</td>
                      <td className="px-4 py-3 text-sm font-mono font-medium" style={{ color: m.mov==='entrada' ? '#1D9E75' : '#ef4444' }}>
                        {m.mov==='entrada' ? '+' : '-'}{fmtNum(m.cantidad)} {mat?.unidad}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {m.mov==='entrada' ? (m.proveedor || m.numero_factura || '---') : proyectos.find(p=>p.id===m.proyecto_id)?.project_code || '---'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── DRAWERS ── */}
      {puedeEditar && <>
        <Drawer open={drawer==='mat'} onClose={() => setDrawer(null)} title={editMat ? t('inv_form_mat_title_edit') : t('inv_form_mat_title')} width={380}>
          <Field label={t('inv_form_code')} required><input className={inputCls} value={form.codigo||''} onChange={set('codigo')} placeholder="MAT-001" /></Field>
          <Field label={t('inv_form_desc')} required><input className={inputCls} value={form.descripcion||''} onChange={set('descripcion')} placeholder="Ej: Cemento Portland" /></Field>
          <Field label={isEs ? 'Categoria' : 'Category'}>
            <select className={selectCls} value={form.categoria||''} onChange={set('categoria')}>
              <option value="">{t('lbl_select')}</option>
              {CATEGORIAS.map(c => <option key={c.key} value={c.key}>{isEs ? c.es : c.en}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('inv_form_unit')}><input className={inputCls} value={form.unidad||''} onChange={set('unidad')} placeholder="und" /></Field>
            <Field label={t('inv_form_location')}><input className={inputCls} value={form.ubicacion_bodega||''} onChange={set('ubicacion_bodega')} placeholder="Estante A-1" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('inv_form_stock')}><input type="number" className={inputCls} value={form.stock_actual||''} onChange={set('stock_actual')} placeholder="0" min="0" step="0.01" /></Field>
            <Field label={t('inv_form_min')}><input type="number" className={inputCls} value={form.stock_minimo||''} onChange={set('stock_minimo')} placeholder="0" min="0" step="0.01" /></Field>
          </div>
          {!editMat && parseFloat(form.stock_actual) > 0 && (
            <Field label={isEs ? 'Precio unitario (stock inicial)' : 'Unit price (initial stock)'}>
              <input type="number" className={inputCls} value={form.precio_unitario||''} onChange={set('precio_unitario')} placeholder="0.00" min="0" step="0.01" />
              <p className="text-xs text-blue-500 mt-1">{isEs ? 'Se registrara una entrada automatica por el stock inicial.' : 'An automatic entry will be registered for the initial stock.'}</p>
            </Field>
          )}
          <div className="flex gap-2 mt-auto pt-2">
            <SecondaryBtn onClick={() => setDrawer(null)} className="flex-1">{t('btn_cancel')}</SecondaryBtn>
            <PrimaryBtn onClick={saveMat} disabled={!form.codigo||!form.descripcion} className="flex-1">{t('btn_save')}</PrimaryBtn>
          </div>
        </Drawer>

        <Drawer open={drawer==='in'} onClose={() => setDrawer(null)} title={t('inv_form_entry_title')} width={440}>
          <Field label={t('inv_form_oc')}>
            <select className={selectCls} value={form.oc_id||''} onChange={e => {
              const ocId = e.target.value
              setForm(f => ({ ...f, oc_id: ocId, material_id: '', proyecto_id: '' }))
            }}>
              <option value="">{t('inv_no_oc')}</option>
              {ocAprobadas.map(oc => {
                const proy = proyectos.find(p => p.id === oc.proyecto_id)
                return <option key={oc.id} value={oc.id}>{oc.oc_number} --- {oc.proveedor || '---'} ({proy?.project_code || '---'})</option>
              })}
            </select>
          </Field>

          {form.oc_id && (() => {
            const oc = ordenes_compra.find(o => o.id === form.oc_id)
            const ocItems = ordenes_compra_items.filter(i => i.oc_id === form.oc_id)
            const solItems_ = oc ? solicitud_items.filter(i => i.solicitud_id === oc.solicitud_id) : []
            const itemsOC = ocItems.length > 0 ? ocItems : solItems_
            return itemsOC.length > 0 ? (
              <div className="border border-blue-100 rounded-xl p-3 bg-blue-50/30">
                <p className="text-xs font-semibold text-gray-500 mb-2">
                  {isEs ? 'Materiales de la OC --- selecciona cual estas recibiendo' : 'OC materials --- select which one you are receiving'}
                </p>
                <div className="flex flex-col gap-1.5">
                  {itemsOC.map((it, idx) => {
                    const matExistente = materiales.find(m => m.id === it.material_id)
                    const nombre = matExistente?.descripcion || it.descripcion || `Material #${idx+1}`
                    const seleccionado = form.material_id === it.material_id && form._oc_item_id === it.id
                    return (
                      <button key={it.id} onClick={() => setForm(f => ({
                        ...f,
                        material_id: it.material_id || '',
                        proyecto_id: oc?.proyecto_id || '',
                        _oc_item_id: it.id,
                        _oc_item_desc: nombre,
                        _oc_item_unidad: it.unidad || 'und',
                        _material_nuevo: !matExistente,
                        _mat_nombre: nombre,
                        _mat_unidad: it.unidad || 'und',
                      }))}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${seleccionado ? 'border-[#1B3A6B] bg-[#EEF2F7] text-[#1B3A6B]' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{nombre}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{it.cantidad} {it.unidad}</span>
                            {!matExistente && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{isEs ? 'Crear en catalogo' : 'Create in catalog'}</span>}
                            {matExistente  && <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">{isEs ? 'En catalogo' : 'In catalog'}</span>}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null
          })()}

          {form._material_nuevo && (
            <div className="border border-amber-200 rounded-xl p-3 bg-amber-50/30">
              <p className="text-xs font-semibold text-amber-700 mb-2">
                {isEs ? 'Este material no existe en el catalogo. Se creara automaticamente.' : 'This material is not in the catalog. It will be created automatically.'}
              </p>
              <div className="flex flex-col gap-2">
                <Field label={isEs ? 'Codigo para el catalogo' : 'Catalog code'} required>
                  <input className={inputCls} value={form._mat_codigo||''} onChange={e => setForm(f => ({...f, _mat_codigo: e.target.value}))} placeholder="Ej: BLQ-6" />
                </Field>
                <Field label={isEs ? 'Nombre en catalogo' : 'Catalog name'}>
                  <input className={inputCls} value={form._mat_nombre||''} onChange={e => setForm(f => ({...f, _mat_nombre: e.target.value}))} />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label={isEs ? 'Unidad' : 'Unit'}>
                    <input className={inputCls} value={form._mat_unidad||'und'} onChange={e => setForm(f => ({...f, _mat_unidad: e.target.value}))} />
                  </Field>
                  <Field label={isEs ? 'Stock minimo' : 'Min. stock'}>
                    <input type="number" className={inputCls} value={form._mat_stock_min||'0'} onChange={e => setForm(f => ({...f, _mat_stock_min: e.target.value}))} placeholder="0" />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {!form.oc_id && (
            <Field label={t('inv_form_material')} required>
              <select className={selectCls} value={form.material_id||''} onChange={set('material_id')}>
                <option value="">{t('lbl_select')}</option>
                {activos.map(m => <option key={m.id} value={m.id}>{m.codigo} --- {m.descripcion}</option>)}
              </select>
            </Field>
          )}

          <Field label={t('inv_form_project')}>
            <select className={selectCls} value={form.proyecto_id||''} onChange={set('proyecto_id')}>
              <option value="">{isEs ? '--- Sin proyecto (compra general / reserva) ---' : '--- No project (general purchase / reserve) ---'}</option>
              {proyectos.map(p => <option key={p.id} value={p.id}>{p.project_code} --- {p.nombre}</option>)}
            </select>
            {!form.proyecto_id && (
              <p className="text-xs text-amber-600 mt-1">
                {isEs ? 'Sin proyecto: se registrara como compra general disponible para cualquier proyecto.' : 'No project: will be recorded as general stock available for any project.'}
              </p>
            )}
          </Field>

          {form.proyecto_id && (
            <Field label={isEs ? 'Tipo de entrada' : 'Entry type'}>
              <select className={selectCls} value={form.tipo_entrada||'compra_proyecto'} onChange={set('tipo_entrada')}>
                <option value="compra_proyecto">{isEs ? 'Compra para este proyecto (OC)' : 'Purchase for this project (PO)'}</option>
                <option value="sobrante_proyecto">{isEs ? 'Sobrante de otro proyecto' : 'Surplus from another project'}</option>
                <option value="devolucion">{isEs ? 'Devolucion desde campo' : 'Return from field'}</option>
              </select>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('inv_form_qty')} required>
              <input type="number" className={inputCls} value={form.cantidad||''} onChange={set('cantidad')} placeholder="0.00" min="0" step="0.01" />
            </Field>
            <Field label={t('inv_form_price')} required>
              <input type="number" className={inputCls} value={form.precio_unitario||''} onChange={set('precio_unitario')} placeholder="0.00" min="0" step="0.01" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('inv_form_invoice')}>
              <input className={inputCls} value={form.numero_factura||''} onChange={set('numero_factura')} placeholder="FAC-0001" />
            </Field>
            <Field label={t('inv_form_supplier')}>
              <input className={inputCls} value={form.proveedor||''} onChange={set('proveedor')} placeholder={t('inv_form_supplier')} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={isEs ? 'Impuesto pagado ($)' : 'Tax paid ($)'}>
              <input type="number" className={inputCls} value={form.impuesto_monto||''} onChange={set('impuesto_monto')} placeholder="0.00" min="0" step="0.01" />
            </Field>
            <Field label={isEs ? 'Descripción del impuesto' : 'Tax description'}>
              <input className={inputCls} value={form.impuesto_descripcion||''} onChange={set('impuesto_descripcion')} placeholder={isEs ? 'IVA 15%, Sales Tax...' : 'VAT 15%, Sales Tax...'} />
            </Field>
          </div>
          <Field label={t('inv_form_date')} required>
            <input type="date" className={inputCls} value={form.fecha_recepcion||today()} onChange={set('fecha_recepcion')} />
          </Field>
          <div className="flex gap-2 mt-auto pt-2">
            <SecondaryBtn onClick={() => setDrawer(null)} className="flex-1">{t('btn_cancel')}</SecondaryBtn>
            <PrimaryBtn onClick={saveIn}
              disabled={(!form.material_id && !form._material_nuevo) || !form.cantidad || (form._material_nuevo && !form._mat_codigo)}
              className="flex-1">{t('inv_add_entry')}</PrimaryBtn>
          </div>
        </Drawer>

        <Drawer open={drawer==='out'} onClose={() => { setSearchOut(''); setDrawer(null) }} title={t('inv_form_exit_title')} width={400}>
          <Field label={t('inv_form_exit_project')} required>
            <select className={selectCls} value={form.proyecto_id||''} onChange={e => setForm(f => ({...f, proyecto_id:e.target.value, actividad_id:''}))}>
              <option value="">{t('lbl_select')}</option>
              {proyectos.filter(p => p.estado!=='completado'&&p.estado!=='cancelado').map(p => <option key={p.id} value={p.id}>{p.project_code} --- {p.nombre}</option>)}
            </select>
          </Field>
          <Field label={t('inv_form_exit_activity')}>
            <select className={selectCls} value={form.actividad_id||''} onChange={set('actividad_id')}>
              <option value="">{t('lbl_select')}</option>
              {actividades.map(a => <option key={a.id} value={a.id}>{a.code} --- {a.descripcion}</option>)}
            </select>
          </Field>

          {/* ── BUSQUEDA DE MATERIAL EN SALIDAS ── */}
          <Field label={isEs ? 'Buscar material' : 'Search material'}>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                className={`${inputCls} pl-8`}
                placeholder={isEs ? 'Codigo o nombre...' : 'Code or name...'}
                value={searchOut}
                onChange={e => { setSearchOut(e.target.value); setForm(f => ({...f, material_id:''})) }}
              />
              {searchOut && (
                <button onClick={() => setSearchOut('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">x</button>
              )}
            </div>
          </Field>

          <Field label={t('inv_form_exit_material')} required>
            <select className={selectCls} value={form.material_id||''} onChange={set('material_id')}>
              <option value="">{t('lbl_select')}</option>
              {activosFiltradosSalida.map(m => (
                <option key={m.id} value={m.id}>{m.codigo} --- {m.descripcion} (stock: {fmtNum(m.stock_actual)} {m.unidad})</option>
              ))}
            </select>
            {searchOut && activosFiltradosSalida.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">{isEs ? 'No se encontraron materiales con ese criterio.' : 'No materials found with that search.'}</p>
            )}
          </Field>

          <Field label={isEs ? 'Tipo de salida' : 'Exit type'}>
            <select className={selectCls} value={form.tipo_salida||'uso_directo'} onChange={set('tipo_salida')}>
              <option value="uso_directo">{isEs ? 'Uso directo en proyecto (costo normal)' : 'Direct use in project (normal cost)'}</option>
              <option value="sobrante_transferido">{isEs ? 'Sobrante de otro proyecto (sin costo)' : 'Surplus from another project (no cost)'}</option>
              <option value="uso_general">{isEs ? 'Uso de reserva general (sin costo)' : 'Use from general reserve (no cost)'}</option>
            </select>
          </Field>
          {form.tipo_salida === 'sobrante_transferido' && (
            <Field label={isEs ? 'Proyecto origen del sobrante' : 'Source project of surplus'}>
              <select className={selectCls} value={form.origen_proyecto_id||''} onChange={set('origen_proyecto_id')}>
                <option value="">{t('lbl_select')}</option>
                {proyectos.filter(p => p.id !== form.proyecto_id).map(p => <option key={p.id} value={p.id}>{p.project_code} --- {p.nombre}</option>)}
              </select>
              <p className="text-xs text-blue-600 mt-1">
                {isEs ? 'El costo permanece en el proyecto origen. Este proyecto no sera cargado.' : 'Cost stays in the source project. This project will not be charged.'}
              </p>
            </Field>
          )}
          {form.tipo_salida === 'uso_general' && (
            <p className="text-xs text-blue-600 px-1">
              {isEs ? 'Material proveniente de reserva general. No se cargara costo a este proyecto.' : 'Material from general reserve. No cost will be charged to this project.'}
            </p>
          )}
          <Field label={t('inv_form_exit_qty')} required>
            <input type="number" className={inputCls} value={form.cantidad||''} onChange={set('cantidad')} placeholder="0.00" min="0" step="0.01" />
            {stockAlerta && <p className="text-xs text-red-500 mt-1">{t('inv_stock_warning', { n: fmtNum(stockDisp) })}</p>}
          </Field>
          <Field label={t('inv_form_exit_date')} required>
            <input type="date" className={inputCls} value={form.fecha_salida||today()} onChange={set('fecha_salida')} />
          </Field>
          <div className="flex gap-2 mt-auto pt-2">
            <SecondaryBtn onClick={() => { setSearchOut(''); setDrawer(null) }} className="flex-1">{t('btn_cancel')}</SecondaryBtn>
            <PrimaryBtn onClick={saveOut} disabled={!form.material_id||!form.cantidad||!form.proyecto_id||stockAlerta} className="flex-1">{t('inv_add_exit')}</PrimaryBtn>
          </div>
        </Drawer>
      </>}
    </div>
  )
}
