import { createContext, useContext, useReducer, useEffect } from 'react'
import { supabase } from './supabase'
import { uuid, genProjectCode, genOCCode, genBudgetCode, today } from './utils'

const INIT = {
  proyectos: [], fases: [], presupuesto: [],
  materiales: [], entradas: [], salidas: [],
  solicitudes: [], solicitud_items: [], ordenes_compra: [], ordenes_compra_items: [],
  costos_directos: [], nominas: [], subcontratos: [],
  equipos: [], costos_indirectos: [],
  materiales_presupuestados: [],
  solicitudes_eliminacion: [],
  loaded: false
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_ALL': return { ...action.payload, loaded: true }
    case 'RESET':    return { ...INIT, loaded: true }

    case 'ADD_PROYECTO':  return { ...state, proyectos: [...state.proyectos, action.payload] }
    case 'UPD_PROYECTO':  return { ...state, proyectos: state.proyectos.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p) }
    case 'DEL_PROYECTO':  return { ...state, proyectos: state.proyectos.filter(p => p.id !== action.payload) }

    case 'ADD_FASE': return { ...state, fases: [...state.fases, action.payload] }
    case 'UPD_FASE': return { ...state, fases: state.fases.map(f => f.id === action.payload.id ? { ...f, ...action.payload } : f) }
    case 'DEL_FASE': return { ...state, fases: state.fases.filter(f => f.id !== action.payload) }

    case 'ADD_BUDGET': return { ...state, presupuesto: [...state.presupuesto, action.payload] }
    case 'UPD_BUDGET': return { ...state, presupuesto: state.presupuesto.map(b => b.id === action.payload.id ? { ...b, ...action.payload } : b) }
    case 'DEL_BUDGET': return { ...state, presupuesto: state.presupuesto.filter(b => b.id !== action.payload) }

    case 'ADD_MATERIAL':    return { ...state, materiales: [...state.materiales, action.payload] }
    case 'ADD_MATERIAL_CON_ENTRADA': return {
      ...state,
      materiales: [...state.materiales, action.payload.material],
      entradas:   [...state.entradas,   action.payload.entrada],
    }
    case 'UPD_MATERIAL':    return { ...state, materiales: state.materiales.map(m => m.id === action.payload.id ? { ...m, ...action.payload } : m) }
    case 'TOGGLE_MATERIAL': return { ...state, materiales: state.materiales.map(m => m.id === action.payload ? { ...m, activo: !m.activo } : m) }
    case 'DEL_MATERIAL':    return { ...state, materiales: state.materiales.filter(m => m.id !== action.payload) }

    case 'ADD_ENTRADA': return { ...state, entradas: [...state.entradas, action.payload] }
    case 'UPD_ENTRADA': return { ...state, entradas: state.entradas.map(e => e.id === action.payload.id ? { ...e, ...action.payload } : e) }
    case 'DEL_ENTRADA': return {
      ...state,
      entradas: state.entradas.filter(e => e.id !== action.payload.id),
      materiales: state.materiales.map(m => m.id === action.payload.materialId
        ? { ...m, stock_actual: Math.max(0, parseFloat(m.stock_actual||0) - parseFloat(action.payload.cantidad||0)) } : m)
    }
    case 'DEL_ENTRADA_LOCAL': return {
      ...state,
      entradas: state.entradas.filter(e => e.id !== action.payload)
    }

    case 'ADD_SALIDA': return { ...state, salidas: [...state.salidas, action.payload] }
    case 'UPD_SALIDA': return { ...state, salidas: state.salidas.map(s => s.id === action.payload.id ? { ...s, ...action.payload } : s) }
    case 'DEL_SALIDA': return {
      ...state,
      salidas: state.salidas.filter(s => s.id !== action.payload.id),
      materiales: state.materiales.map(m => m.id === action.payload.materialId
        ? { ...m, stock_actual: parseFloat(m.stock_actual||0) + parseFloat(action.payload.cantidad||0) } : m)
    }
    case 'DEL_SALIDA_LOCAL': return {
      ...state,
      salidas: state.salidas.filter(s => s.id !== action.payload)
    }

    case 'ADD_SOLICITUD':
      return { ...state, solicitudes: [...state.solicitudes, action.payload.solicitud], solicitud_items: [...state.solicitud_items, ...action.payload.items] }
    case 'UPD_SOLICITUD_ESTADO':
      return { ...state, solicitudes: state.solicitudes.map(s => s.id === action.payload.id ? { ...s, estado: action.payload.estado } : s) }
    case 'DEL_SOLICITUD':
      return {
        ...state,
        solicitudes: state.solicitudes.filter(s => s.id !== action.payload),
        solicitud_items: state.solicitud_items.filter(i => i.solicitud_id !== action.payload)
      }

    case 'ADD_OC':
      return {
        ...state,
        ordenes_compra: [...state.ordenes_compra, action.payload.oc],
        ordenes_compra_items: [...state.ordenes_compra_items, ...action.payload.items]
      }
    case 'UPD_OC_ESTADO':
      return { ...state, ordenes_compra: state.ordenes_compra.map(oc => oc.id === action.payload.id ? { ...oc, estado: action.payload.estado } : oc) }
    case 'DEL_OC':
      return {
        ...state,
        ordenes_compra: state.ordenes_compra.filter(oc => oc.id !== action.payload),
        ordenes_compra_items: state.ordenes_compra_items.filter(i => i.oc_id !== action.payload)
      }

    case 'ADD_COSTO_DIRECTO':   return { ...state, costos_directos: [...state.costos_directos, action.payload] }
    case 'UPD_COSTO_DIRECTO':   return { ...state, costos_directos: state.costos_directos.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c) }
    case 'DEL_COSTO_DIRECTO':   return { ...state, costos_directos: state.costos_directos.filter(c => c.id !== action.payload) }

    case 'ADD_NOMINA':          return { ...state, nominas: [...state.nominas, action.payload] }
    case 'UPD_NOMINA':          return { ...state, nominas: state.nominas.map(n => n.id === action.payload.id ? { ...n, ...action.payload } : n) }
    case 'DEL_NOMINA':          return { ...state, nominas: state.nominas.filter(n => n.id !== action.payload) }

    case 'ADD_SUBCONTRATO':     return { ...state, subcontratos: [...state.subcontratos, action.payload] }
    case 'UPD_SUBCONTRATO':     return { ...state, subcontratos: state.subcontratos.map(s => s.id === action.payload.id ? { ...s, ...action.payload } : s) }
    case 'DEL_SUBCONTRATO':     return { ...state, subcontratos: state.subcontratos.filter(s => s.id !== action.payload) }

    case 'ADD_EQUIPO':          return { ...state, equipos: [...state.equipos, action.payload] }
    case 'UPD_EQUIPO':          return { ...state, equipos: state.equipos.map(e => e.id === action.payload.id ? { ...e, ...action.payload } : e) }
    case 'DEL_EQUIPO':          return { ...state, equipos: state.equipos.filter(e => e.id !== action.payload) }

    case 'ADD_COSTO_INDIRECTO': return { ...state, costos_indirectos: [...state.costos_indirectos, action.payload] }
    case 'UPD_COSTO_INDIRECTO': return { ...state, costos_indirectos: state.costos_indirectos.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c) }
    case 'DEL_COSTO_INDIRECTO': return { ...state, costos_indirectos: state.costos_indirectos.filter(c => c.id !== action.payload) }

    case 'ADD_MAT_PRES': return { ...state, materiales_presupuestados: [...state.materiales_presupuestados, action.payload] }
    case 'UPD_MAT_PRES': return { ...state, materiales_presupuestados: state.materiales_presupuestados.map(m => m.id === action.payload.id ? { ...m, ...action.payload } : m) }
    case 'DEL_MAT_PRES': return { ...state, materiales_presupuestados: state.materiales_presupuestados.filter(m => m.id !== action.payload) }

    // SOLICITUDES DE ELIMINACIÓN
    case 'ADD_SOL_ELIM': return { ...state, solicitudes_eliminacion: [...state.solicitudes_eliminacion, action.payload] }
    case 'UPD_SOL_ELIM': return { ...state, solicitudes_eliminacion: state.solicitudes_eliminacion.map(s => s.id === action.payload.id ? { ...s, ...action.payload } : s) }

    default: return state
  }
}

const Ctx = createContext(null)
export const useStore = () => useContext(Ctx)

export function StoreProvider({ children, tenantId }) {
  const [state, dispatch] = useReducer(reducer, INIT)

  useEffect(() => {
    if (!tenantId) return
    async function loadAll() {
      const tablasTenant = [
        'proyectos','fases','presupuesto','materiales','entradas','salidas',
        'solicitudes','solicitud_items','ordenes_compra','ordenes_compra_items',
        'costos_directos','nominas','subcontratos','equipos','costos_indirectos',
        'materiales_presupuestados','solicitudes_eliminacion'
      ]

      const tenantResults = await Promise.all(
        tablasTenant.map(t => supabase.from(t).select('*').eq('tenant_id', tenantId))
      )

      const payload = {}
      tablasTenant.forEach((t, i) => { payload[t] = tenantResults[i].data || [] })

      dispatch({ type: 'LOAD_ALL', payload })
    }
    loadAll()
  }, [tenantId])

  async function dbDispatch(action) {
    switch (action.type) {

      case 'ADD_PROYECTO': {
        const code = genProjectCode(state.proyectos)
        const item = { ...action.payload, id: uuid(), project_code: code, created_at: today(), tenant_id: tenantId }
        await supabase.from('proyectos').insert(item)
        dispatch({ type: 'ADD_PROYECTO', payload: item })
        break
      }
      case 'UPD_PROYECTO': {
        await supabase.from('proyectos').update(action.payload).eq('id', action.payload.id)
        dispatch(action)
        break
      }
      case 'DEL_PROYECTO': {
        await supabase.from('proyectos').delete().eq('id', action.payload)
        dispatch(action)
        break
      }

      case 'ADD_FASE': {
        const item = { ...action.payload, id: uuid(), created_at: today(), tenant_id: tenantId }
        await supabase.from('fases').insert(item)
        dispatch({ type: 'ADD_FASE', payload: item })
        break
      }
      case 'UPD_FASE': {
        await supabase.from('fases').update(action.payload).eq('id', action.payload.id)
        dispatch(action)
        break
      }
      case 'DEL_FASE': {
        await supabase.from('fases').delete().eq('id', action.payload)
        dispatch(action)
        break
      }

      case 'ADD_BUDGET': {
        const { proyectoId, ...rest } = action.payload
        const byProject = state.presupuesto.filter(b => b.proyecto_id === proyectoId)
        const code = genBudgetCode(byProject, rest.tipo, rest.parent_id)
        const item = { ...rest, id: uuid(), proyecto_id: proyectoId, code, created_at: today(), tenant_id: tenantId }
        await supabase.from('presupuesto').insert(item)
        dispatch({ type: 'ADD_BUDGET', payload: item })
        break
      }
      case 'UPD_BUDGET': {
        await supabase.from('presupuesto').update(action.payload).eq('id', action.payload.id)
        dispatch(action)
        break
      }
      case 'DEL_BUDGET': {
        await supabase.from('presupuesto').delete().eq('id', action.payload)
        dispatch(action)
        break
      }

      case 'ADD_MATERIAL_CON_ENTRADA': {
        const { material, entrada } = action.payload
        // Verificar código duplicado
        const existe = state.materiales.find(m => m.codigo === material.codigo && m.activo !== false)
        if (existe) { alert('Error: El código de material ya existe.'); return }
        const mat = { ...material, created_at: today(), tenant_id: tenantId }
        const ent = { ...entrada, id: uuid(), created_at: today(), tenant_id: tenantId }
        await supabase.from('materiales').insert(mat)
        await supabase.from('entradas').insert(ent)
        // Actualizar stock en Supabase
        await supabase.from('materiales').update({ stock_actual: mat.stock_actual })
          .eq('id', mat.id)
        dispatch({ type: 'ADD_MATERIAL_CON_ENTRADA', payload: { material: mat, entrada: ent } })
        break
      }
      case 'ADD_MATERIAL': {
        const existe = state.materiales.find(m => m.codigo === action.payload.codigo && m.activo !== false)
        if (existe) {
          alert('Error: El código de material ya existe.')
          return
        }
        const stockInicial = parseFloat(action.payload.stock_actual) || 0
        const item = { ...action.payload, id: action.payload.id || uuid(), stock_actual: stockInicial, created_at: today(), tenant_id: tenantId }
        await supabase.from('materiales').insert(item)
        dispatch({ type: 'ADD_MATERIAL', payload: item })

        // Registrar entrada automática si hay stock inicial
        if (stockInicial > 0) {
          const entrada = {
            id:              uuid(),
            material_id:     item.id,
            cantidad:        stockInicial,
            precio_unitario: parseFloat(action.payload.precio_unitario) || 0,
            numero_factura:  'STOCK-INICIAL',
            proveedor:       'Stock inicial',
            fecha_recepcion: today(),
            created_at:      today(),
            tenant_id:       tenantId,
          }
          await supabase.from('entradas').insert(entrada)
          dispatch({ type: 'ADD_ENTRADA', payload: entrada })
        }
        break
      }
      case 'UPD_MATERIAL': {
        await supabase.from('materiales').update(action.payload).eq('id', action.payload.id)
        dispatch(action)
        break
      }
      case 'TOGGLE_MATERIAL': {
        const m = state.materiales.find(m => m.id === action.payload)
        if (m) await supabase.from('materiales').update({ activo: !m.activo }).eq('id', m.id)
        dispatch(action)
        break
      }
      case 'DEL_MATERIAL': {
        await supabase.from('materiales').delete().eq('id', action.payload)
        dispatch(action)
        break
      }

      case 'ADD_ENTRADA': {
        const payload = { ...action.payload }
        if (!payload.oc_id) delete payload.oc_id
        if (!payload.proyecto_id) delete payload.proyecto_id
        const item = { ...payload, id: uuid(), created_at: today(), tenant_id: tenantId }
        await supabase.from('entradas').insert(item)
        const mat = state.materiales.find(m => m.id === item.material_id)
        if (mat) {
          const nuevoStock = (parseFloat(mat.stock_actual)||0) + (parseFloat(item.cantidad)||0)
          await supabase.from('materiales').update({ stock_actual: nuevoStock }).eq('id', mat.id)
          dispatch({ type: 'UPD_MATERIAL', payload: { ...mat, stock_actual: nuevoStock } })
        }
        dispatch({ type: 'ADD_ENTRADA', payload: item })
        break
      }
      case 'UPD_ENTRADA': {
        const { id, ...fields } = action.payload
        const entradaAnterior = state.entradas.find(e => e.id === id)
        const cantAnterior = parseFloat(entradaAnterior?.cantidad || 0)
        const cantNueva    = parseFloat(fields.cantidad || 0)
        const diferencia   = cantNueva - cantAnterior
        await supabase.from('entradas').update(fields).eq('id', id)
        if (diferencia !== 0) {
          const mat = state.materiales.find(m => m.id === (fields.material_id || entradaAnterior?.material_id))
          if (mat) {
            const nuevoStock = Math.max(0, (parseFloat(mat.stock_actual)||0) + diferencia)
            await supabase.from('materiales').update({ stock_actual: nuevoStock }).eq('id', mat.id)
            dispatch({ type: 'UPD_MATERIAL', payload: { ...mat, stock_actual: nuevoStock } })
          }
        }
        dispatch(action)
        break
      }
      case 'DEL_ENTRADA': {
        // Verificar salidas huérfanas antes de eliminar
        const salidasAfectadas = state.salidas.filter(s => s.material_id === action.payload.materialId)
        const otrasentradas    = state.entradas.filter(e => e.id !== action.payload.id && e.material_id === action.payload.materialId)
        const totalOtrasEntradas = otrasentradas.reduce((s,e) => s + parseFloat(e.cantidad||0), 0)
        const totalSalidas       = salidasAfectadas.reduce((s,e) => s + parseFloat(e.cantidad||0), 0)

        if (totalSalidas > totalOtrasEntradas) {
          // Eliminar salidas huérfanas automáticamente
          const salidasSinRespaldo = salidasAfectadas.slice()
          for (const sal of salidasSinRespaldo) {
            await supabase.from('salidas').delete().eq('id', sal.id)
            dispatch({ type: 'DEL_SALIDA_LOCAL', payload: sal.id })
          }
        }

        await supabase.from('entradas').delete().eq('id', action.payload.id)
        const mat = state.materiales.find(m => m.id === action.payload.materialId)
        const nuevoStock = Math.max(0, parseFloat(mat?.stock_actual||0) - parseFloat(action.payload.cantidad||0))
        if (mat) {
          await supabase.from('materiales').update({ stock_actual: nuevoStock }).eq('id', mat.id)
          dispatch({ type: 'UPD_MATERIAL', payload: { ...mat, stock_actual: nuevoStock } })
        }
        dispatch({ type: 'DEL_ENTRADA_LOCAL', payload: action.payload.id })
        break
      }

      case 'ADD_SALIDA': {
        const payload = { ...action.payload }
        if (!payload.proyecto_id) delete payload.proyecto_id
        if (!payload.actividad_id) delete payload.actividad_id
        const item = { ...payload, id: uuid(), created_at: today(), tenant_id: tenantId }
        await supabase.from('salidas').insert(item)
        const mat = state.materiales.find(m => m.id === item.material_id)
        if (mat) {
          const nuevoStock = Math.max(0, (parseFloat(mat.stock_actual)||0) - (parseFloat(item.cantidad)||0))
          await supabase.from('materiales').update({ stock_actual: nuevoStock }).eq('id', mat.id)
          dispatch({ type: 'UPD_MATERIAL', payload: { ...mat, stock_actual: nuevoStock } })
        }
        dispatch({ type: 'ADD_SALIDA', payload: item })

        // Auto-crear en materiales_presupuestados como adicional si no existe
        if (item.proyecto_id && item.material_id && item.actividad_id) {
          const yaExiste = state.materiales_presupuestados.some(mp =>
            mp.proyecto_id === item.proyecto_id &&
            mp.material_id === item.material_id &&
            mp.actividad_id === item.actividad_id
          )
          if (!yaExiste && mat) {
            const mpNuevo = {
              id:                    uuid(),
              proyecto_id:           item.proyecto_id,
              material_id:           item.material_id,
              nombre_libre:          mat.descripcion,
              unidad_libre:          mat.unidad,
              cantidad_presupuestada: 0,
              actividad_id:          item.actividad_id,
              es_adicional:          true,
              tenant_id:             tenantId,
              created_at:            today(),
            }
            await supabase.from('materiales_presupuestados').insert(mpNuevo)
            dispatch({ type: 'ADD_MAT_PRES', payload: mpNuevo })
          }
        }
        break
      }
      case 'UPD_SALIDA': {
        const { id, ...fields } = action.payload
        const salidaAnterior = state.salidas.find(s => s.id === id)
        const cantAnterior = parseFloat(salidaAnterior?.cantidad || 0)
        const cantNueva    = parseFloat(fields.cantidad || 0)
        const diferencia   = cantNueva - cantAnterior
        await supabase.from('salidas').update(fields).eq('id', id)
        if (diferencia !== 0) {
          const mat = state.materiales.find(m => m.id === (fields.material_id || salidaAnterior?.material_id))
          if (mat) {
            const nuevoStock = Math.max(0, (parseFloat(mat.stock_actual)||0) - diferencia)
            await supabase.from('materiales').update({ stock_actual: nuevoStock }).eq('id', mat.id)
            dispatch({ type: 'UPD_MATERIAL', payload: { ...mat, stock_actual: nuevoStock } })
          }
        }
        dispatch(action)
        break
      }
      case 'DEL_SALIDA': {
        await supabase.from('salidas').delete().eq('id', action.payload.id)
        const mat = state.materiales.find(m => m.id === action.payload.materialId)
        const nuevoStock = parseFloat(mat?.stock_actual||0) + parseFloat(action.payload.cantidad||0)
        if (mat) {
          await supabase.from('materiales').update({ stock_actual: nuevoStock }).eq('id', mat.id)
          dispatch({ type: 'UPD_MATERIAL', payload: { ...mat, stock_actual: nuevoStock } })
        }
        dispatch({ type: 'DEL_SALIDA_LOCAL', payload: action.payload.id })
        break
      }

      // ── SOLICITUDES DE ELIMINACIÓN ─────────────────────────────────────────
      case 'ADD_SOL_ELIM': {
        const item = {
          ...action.payload,
          id:         uuid(),
          estado:     'pendiente',
          created_at: today(),
          tenant_id:  tenantId,
        }
        await supabase.from('solicitudes_eliminacion').insert(item)
        dispatch({ type: 'ADD_SOL_ELIM', payload: item })
        break
      }
      case 'APROBAR_SOL_ELIM': {
        const sol = state.solicitudes_eliminacion.find(s => s.id === action.payload.id)
        if (!sol) break

        // Ejecutar la eliminación real
        if (sol.tipo === 'entrada') {
          await dbDispatch({ type: 'DEL_ENTRADA', payload: { id: sol.registro_id, materialId: sol.material_id, cantidad: sol.cantidad } })
        } else if (sol.tipo === 'salida') {
          await dbDispatch({ type: 'DEL_SALIDA', payload: { id: sol.registro_id, materialId: sol.material_id, cantidad: sol.cantidad } })
        }

        const upd = { estado: 'aprobada', comentario_admin: action.payload.comentario || '', reviewed_at: today(), reviewed_by: action.payload.reviewedBy }
        await supabase.from('solicitudes_eliminacion').update(upd).eq('id', sol.id)
        dispatch({ type: 'UPD_SOL_ELIM', payload: { id: sol.id, ...upd } })
        break
      }
      case 'RECHAZAR_SOL_ELIM': {
        const upd = { estado: 'rechazada', comentario_admin: action.payload.comentario || '', reviewed_at: today(), reviewed_by: action.payload.reviewedBy }
        await supabase.from('solicitudes_eliminacion').update(upd).eq('id', action.payload.id)
        dispatch({ type: 'UPD_SOL_ELIM', payload: { id: action.payload.id, ...upd } })
        break
      }

      case 'ADD_SOLICITUD': {
        const sol   = { ...action.payload.solicitud, id: uuid(), estado: 'pendiente', created_at: today(), tenant_id: tenantId }
        const items = (action.payload.items||[]).map(it => ({ ...it, id: uuid(), solicitud_id: sol.id, tenant_id: tenantId }))
        await supabase.from('solicitudes').insert(sol)
        if (items.length) await supabase.from('solicitud_items').insert(items)
        dispatch({ type: 'ADD_SOLICITUD', payload: { solicitud: sol, items } })
        break
      }
      case 'UPD_SOLICITUD_ESTADO': {
        await supabase.from('solicitudes').update({ estado: action.payload.estado }).eq('id', action.payload.id)
        dispatch(action)
        break
      }
      case 'DEL_SOLICITUD': {
        await supabase.from('solicitud_items').delete().eq('solicitud_id', action.payload)
        await supabase.from('solicitudes').delete().eq('id', action.payload)
        dispatch(action)
        break
      }

      case 'ADD_OC': {
        const oc_number   = genOCCode(state.ordenes_compra)
        const monto_total = (action.payload.items||[]).reduce((s, it) =>
          s + (parseFloat(it.cantidad||0) * parseFloat(it.precio_unitario||0)), 0)
        const oc = {
          id: uuid(), oc_number, estado: 'pendiente_aprobacion',
          created_at: today(), fecha_elaboracion: today(),
          solicitud_id: action.payload.solicitud_id,
          proyecto_id: action.payload.proyecto_id,
          proveedor: action.payload.proveedor,
          elaboro_nombre: action.payload.elaboro_nombre || '',
          elaboro_cargo: action.payload.elaboro_cargo || '',
          solicitante_nombre: action.payload.solicitante_nombre || '',
          solicitante_cargo: action.payload.solicitante_cargo || '',
          aprobador_nombre: action.payload.aprobador_nombre || '',
          aprobador_cargo: action.payload.aprobador_cargo || '',
          notas: action.payload.notas || '',
          monto_total, tenant_id: tenantId,
        }
        const ocItems = (action.payload.items||[]).map(it => ({
          id: uuid(), oc_id: oc.id,
          solicitud_item_id: it.solicitud_item_id || null,
          material_id: it.material_id,
          descripcion: it.descripcion || '',
          cantidad: parseFloat(it.cantidad||0),
          unidad: it.unidad || 'und',
          precio_unitario: parseFloat(it.precio_unitario||0),
          tenant_id: tenantId,
        }))
        await supabase.from('ordenes_compra').insert(oc)
        if (ocItems.length) await supabase.from('ordenes_compra_items').insert(ocItems)
        if (oc.solicitud_id) {
          await supabase.from('solicitudes').update({ estado: 'oc_generada' }).eq('id', oc.solicitud_id)
          dispatch({ type: 'UPD_SOLICITUD_ESTADO', payload: { id: oc.solicitud_id, estado: 'oc_generada' } })
        }
        dispatch({ type: 'ADD_OC', payload: { oc, items: ocItems } })
        break
      }
      case 'UPD_OC_ESTADO': {
        await supabase.from('ordenes_compra').update({ estado: action.payload.estado }).eq('id', action.payload.id)
        dispatch(action)
        break
      }
      case 'DEL_OC': {
        await supabase.from('ordenes_compra_items').delete().eq('oc_id', action.payload)
        await supabase.from('ordenes_compra').delete().eq('id', action.payload)
        dispatch(action)
        break
      }

      case 'ADD_COSTO_DIRECTO': {
        const { fecha, ...rest } = action.payload
        const item = { ...rest, id: uuid(), created_at: today(), tenant_id: tenantId }
        await supabase.from('costos_directos').insert(item)
        dispatch({ type: 'ADD_COSTO_DIRECTO', payload: item })
        break
      }
      case 'UPD_COSTO_DIRECTO': {
        const { id, ...fields } = action.payload
        await supabase.from('costos_directos').update(fields).eq('id', id)
        dispatch(action)
        break
      }
      case 'DEL_COSTO_DIRECTO': {
        await supabase.from('costos_directos').delete().eq('id', action.payload)
        dispatch(action)
        break
      }

      case 'ADD_NOMINA': {
        const { fecha, ...rest } = action.payload
        const item = { ...rest, id: uuid(), created_at: today(), tenant_id: tenantId }
        await supabase.from('nominas').insert(item)
        dispatch({ type: 'ADD_NOMINA', payload: item })
        break
      }
      case 'UPD_NOMINA': {
        const { id, ...fields } = action.payload
        await supabase.from('nominas').update(fields).eq('id', id)
        dispatch(action)
        break
      }
      case 'DEL_NOMINA': {
        await supabase.from('nominas').delete().eq('id', action.payload)
        dispatch(action)
        break
      }

      case 'ADD_SUBCONTRATO': {
        const { fecha, ...rest } = action.payload
        const item = { ...rest, id: uuid(), created_at: today(), tenant_id: tenantId }
        await supabase.from('subcontratos').insert(item)
        dispatch({ type: 'ADD_SUBCONTRATO', payload: item })
        break
      }
      case 'UPD_SUBCONTRATO': {
        await supabase.from('subcontratos').update(action.payload).eq('id', action.payload.id)
        dispatch(action)
        break
      }
      case 'DEL_SUBCONTRATO': {
        await supabase.from('subcontratos').delete().eq('id', action.payload)
        dispatch(action)
        break
      }

      case 'ADD_EQUIPO': {
        const { fecha, monto, ...rest } = action.payload
        const item = { ...rest, id: uuid(), created_at: today(), tenant_id: tenantId }
        await supabase.from('equipos').insert(item)
        dispatch({ type: 'ADD_EQUIPO', payload: item })
        break
      }
      case 'UPD_EQUIPO': {
        const { id, ...fields } = action.payload
        await supabase.from('equipos').update(fields).eq('id', id)
        dispatch(action)
        break
      }
      case 'DEL_EQUIPO': {
        await supabase.from('equipos').delete().eq('id', action.payload)
        dispatch(action)
        break
      }

      case 'ADD_COSTO_INDIRECTO': {
        const { fecha, ...rest } = action.payload
        const item = { ...rest, id: uuid(), created_at: today(), tenant_id: tenantId }
        await supabase.from('costos_indirectos').insert(item)
        dispatch({ type: 'ADD_COSTO_INDIRECTO', payload: item })
        break
      }
      case 'UPD_COSTO_INDIRECTO': {
        const { id, ...fields } = action.payload
        await supabase.from('costos_indirectos').update(fields).eq('id', id)
        dispatch(action)
        break
      }
      case 'DEL_COSTO_INDIRECTO': {
        await supabase.from('costos_indirectos').delete().eq('id', action.payload)
        dispatch(action)
        break
      }

      case 'ADD_MAT_PRES': {
        const item = {
          id: uuid(), created_at: today(), tenant_id: tenantId,
          proyecto_id: action.payload.proyecto_id,
          nombre_libre: action.payload.nombre_libre || '',
          unidad_libre: action.payload.unidad_libre || 'und',
          cantidad_presupuestada: parseFloat(action.payload.cantidad_presupuestada || 0),
          material_id: action.payload.material_id || null,
          actividad_id: action.payload.actividad_id || null,
          etapa_id: action.payload.etapa_id || null,
          sub_etapa_id: action.payload.sub_etapa_id || null,
          es_adicional: action.payload.es_adicional || false,
        }
        await supabase.from('materiales_presupuestados').insert(item)
        dispatch({ type: 'ADD_MAT_PRES', payload: item })
        break
      }
      case 'UPD_MAT_PRES': {
        const { id, ...fields } = action.payload
        const upd = {
          nombre_libre: fields.nombre_libre || '',
          unidad_libre: fields.unidad_libre || 'und',
          cantidad_presupuestada: parseFloat(fields.cantidad_presupuestada || 0),
          material_id: fields.material_id || null,
          actividad_id: fields.actividad_id || null,
          etapa_id: fields.etapa_id || null,
          sub_etapa_id: fields.sub_etapa_id || null,
          es_adicional: fields.es_adicional || false,
        }
        await supabase.from('materiales_presupuestados').update(upd).eq('id', id)
        dispatch({ type: 'UPD_MAT_PRES', payload: { ...upd, id } })
        break
      }
      case 'DEL_MAT_PRES': {
        await supabase.from('materiales_presupuestados').delete().eq('id', action.payload)
        dispatch(action)
        break
      }

      default: dispatch(action)
    }
  }

  return <Ctx.Provider value={{ state, dispatch: dbDispatch }}>{children}</Ctx.Provider>
}
