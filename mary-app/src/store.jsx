import { createContext, useContext, useReducer, useEffect } from 'react'
import { supabase } from './supabase'
import { uuid, genProjectCode, genOCCode, genBudgetCode, today } from './utils'

const INIT = {
  proyectos: [], fases: [], presupuesto: [],
  materiales: [], entradas: [], salidas: [],
  solicitudes: [], solicitud_items: [], ordenes_compra: [],
  costos_directos: [], nominas: [], subcontratos: [],
  equipos: [], costos_indirectos: [],
  materiales_presupuestados: [],
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
    case 'UPD_MATERIAL':    return { ...state, materiales: state.materiales.map(m => m.id === action.payload.id ? { ...m, ...action.payload } : m) }
    case 'TOGGLE_MATERIAL': return { ...state, materiales: state.materiales.map(m => m.id === action.payload ? { ...m, activo: !m.activo } : m) }
    case 'DEL_MATERIAL':    return { ...state, materiales: state.materiales.filter(m => m.id !== action.payload) }

    case 'ADD_ENTRADA': return { ...state, entradas: [...state.entradas, action.payload] }
    case 'UPD_ENTRADA': return { ...state, entradas: state.entradas.map(e => e.id === action.payload.id ? { ...e, ...action.payload } : e) }
    case 'DEL_ENTRADA': return {
      ...state,
      entradas: state.entradas.filter(e => e.id !== action.payload.id),
      materiales: state.materiales.map(m => m.id === action.payload.materialId
        ? { ...m, stock_actual: Math.max(0, (m.stock_actual||0) - action.payload.cantidad) } : m)
    }

    case 'ADD_SALIDA': return { ...state, salidas: [...state.salidas, action.payload] }
    case 'UPD_SALIDA': return { ...state, salidas: state.salidas.map(s => s.id === action.payload.id ? { ...s, ...action.payload } : s) }
    case 'DEL_SALIDA': return {
      ...state,
      salidas: state.salidas.filter(s => s.id !== action.payload.id),
      materiales: state.materiales.map(m => m.id === action.payload.materialId
        ? { ...m, stock_actual: (m.stock_actual||0) + action.payload.cantidad } : m)
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

    case 'ADD_OC':        return { ...state, ordenes_compra: [...state.ordenes_compra, action.payload] }
    case 'UPD_OC_ESTADO': return { ...state, ordenes_compra: state.ordenes_compra.map(oc => oc.id === action.payload.id ? { ...oc, estado: action.payload.estado } : oc) }
    case 'DEL_OC':        return { ...state, ordenes_compra: state.ordenes_compra.filter(oc => oc.id !== action.payload) }

    case 'ADD_COSTO_DIRECTO':   return { ...state, costos_directos: [...state.costos_directos, action.payload] }
    case 'ADD_NOMINA':          return { ...state, nominas: [...state.nominas, action.payload] }
    case 'ADD_SUBCONTRATO':     return { ...state, subcontratos: [...state.subcontratos, action.payload] }
    case 'UPD_SUBCONTRATO':     return { ...state, subcontratos: state.subcontratos.map(s => s.id === action.payload.id ? { ...s, ...action.payload } : s) }
    case 'ADD_EQUIPO':          return { ...state, equipos: [...state.equipos, action.payload] }
    case 'ADD_COSTO_INDIRECTO': return { ...state, costos_indirectos: [...state.costos_indirectos, action.payload] }

    case 'ADD_MAT_PRES': return { ...state, materiales_presupuestados: [...state.materiales_presupuestados, action.payload] }
    case 'UPD_MAT_PRES': return { ...state, materiales_presupuestados: state.materiales_presupuestados.map(m => m.id === action.payload.id ? { ...m, ...action.payload } : m) }
    case 'DEL_MAT_PRES': return { ...state, materiales_presupuestados: state.materiales_presupuestados.filter(m => m.id !== action.payload) }

    default: return state
  }
}

const Ctx = createContext(null)
export const useStore = () => useContext(Ctx)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INIT)

  useEffect(() => {
    async function loadAll() {
      const tables = [
        'proyectos','fases','presupuesto','materiales','entradas','salidas',
        'solicitudes','solicitud_items','ordenes_compra','costos_directos',
        'nominas','subcontratos','equipos','costos_indirectos',
        'materiales_presupuestados'
      ]
      const results = await Promise.all(tables.map(t => supabase.from(t).select('*')))
      const payload = {}
      tables.forEach((t, i) => { payload[t] = results[i].data || [] })
      dispatch({ type: 'LOAD_ALL', payload })
    }
    loadAll()
  }, [])

  async function dbDispatch(action) {
    switch (action.type) {

      case 'ADD_PROYECTO': {
        const code = genProjectCode(state.proyectos)
        const item = { ...action.payload, id: uuid(), project_code: code, created_at: today() }
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
        const item = { ...action.payload, id: uuid(), created_at: today() }
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
        const item = { ...rest, id: uuid(), proyecto_id: proyectoId, code, created_at: today() }
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

      case 'ADD_MATERIAL': {
        const existe = state.materiales.find(m => m.codigo === action.payload.codigo && m.activo !== false)
        if (existe) {
          alert('Error: El código de material ya existe.')
          return
        }
        const item = { ...action.payload, id: uuid(), stock_actual: parseFloat(action.payload.stock_actual)||0, created_at: today() }
        await supabase.from('materiales').insert(item)
        dispatch({ type: 'ADD_MATERIAL', payload: item })
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
        const item = { ...payload, id: uuid(), created_at: today() }
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
        await supabase.from('entradas').delete().eq('id', action.payload.id)
        const mat = state.materiales.find(m => m.id === action.payload.materialId)
        if (mat) {
          const nuevoStock = Math.max(0, (parseFloat(mat.stock_actual)||0) - action.payload.cantidad)
          await supabase.from('materiales').update({ stock_actual: nuevoStock }).eq('id', mat.id)
          dispatch({ type: 'UPD_MATERIAL', payload: { ...mat, stock_actual: nuevoStock } })
        }
        dispatch(action)
        break
      }

      case 'ADD_SALIDA': {
        const payload = { ...action.payload }
        if (!payload.proyecto_id) delete payload.proyecto_id
        if (!payload.actividad_id) delete payload.actividad_id
        const item = { ...payload, id: uuid(), created_at: today() }
        await supabase.from('salidas').insert(item)
        const mat = state.materiales.find(m => m.id === item.material_id)
        if (mat) {
          const nuevoStock = Math.max(0, (parseFloat(mat.stock_actual)||0) - (parseFloat(item.cantidad)||0))
          await supabase.from('materiales').update({ stock_actual: nuevoStock }).eq('id', mat.id)
          dispatch({ type: 'UPD_MATERIAL', payload: { ...mat, stock_actual: nuevoStock } })
        }
        dispatch({ type: 'ADD_SALIDA', payload: item })
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
        if (mat) {
          const nuevoStock = (parseFloat(mat.stock_actual)||0) + action.payload.cantidad
          await supabase.from('materiales').update({ stock_actual: nuevoStock }).eq('id', mat.id)
          dispatch({ type: 'UPD_MATERIAL', payload: { ...mat, stock_actual: nuevoStock } })
        }
        dispatch(action)
        break
      }

      case 'ADD_SOLICITUD': {
        const sol   = { ...action.payload.solicitud, id: uuid(), estado: 'pendiente', created_at: today() }
        const items = (action.payload.items||[]).map(it => ({ ...it, id: uuid(), solicitud_id: sol.id }))
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
        const oc_number = genOCCode(state.ordenes_compra)
        const item = { ...action.payload, id: uuid(), oc_number, estado: 'pendiente_aprobacion', created_at: today() }
        await supabase.from('ordenes_compra').insert(item)
        await supabase.from('solicitudes').update({ estado: 'oc_generada' }).eq('id', item.solicitud_id)
        dispatch({ type: 'ADD_OC', payload: item })
        break
      }
      case 'UPD_OC_ESTADO': {
        await supabase.from('ordenes_compra').update({ estado: action.payload.estado }).eq('id', action.payload.id)
        dispatch(action)
        break
      }
      case 'DEL_OC': {
        await supabase.from('ordenes_compra').delete().eq('id', action.payload)
        dispatch(action)
        break
      }

      case 'ADD_COSTO_DIRECTO': {
        const item = { ...action.payload, id: uuid(), created_at: today() }
        await supabase.from('costos_directos').insert(item)
        dispatch({ type: 'ADD_COSTO_DIRECTO', payload: item })
        break
      }
      case 'ADD_NOMINA': {
        const item = { ...action.payload, id: uuid(), created_at: today() }
        await supabase.from('nominas').insert(item)
        dispatch({ type: 'ADD_NOMINA', payload: item })
        break
      }
      case 'ADD_SUBCONTRATO': {
        const item = { ...action.payload, id: uuid(), created_at: today() }
        await supabase.from('subcontratos').insert(item)
        dispatch({ type: 'ADD_SUBCONTRATO', payload: item })
        break
      }
      case 'UPD_SUBCONTRATO': {
        await supabase.from('subcontratos').update(action.payload).eq('id', action.payload.id)
        dispatch(action)
        break
      }
      case 'ADD_EQUIPO': {
        const item = { ...action.payload, id: uuid(), created_at: today() }
        await supabase.from('equipos').insert(item)
        dispatch({ type: 'ADD_EQUIPO', payload: item })
        break
      }
      case 'ADD_COSTO_INDIRECTO': {
        const item = { ...action.payload, id: uuid(), created_at: today() }
        await supabase.from('costos_indirectos').insert(item)
        dispatch({ type: 'ADD_COSTO_INDIRECTO', payload: item })
        break
      }

      case 'ADD_MAT_PRES': {
        const item = { ...action.payload, id: uuid(), created_at: today() }
        await supabase.from('materiales_presupuestados').insert(item)
        dispatch({ type: 'ADD_MAT_PRES', payload: item })
        break
      }
      case 'UPD_MAT_PRES': {
        const { id, ...fields } = action.payload
        await supabase.from('materiales_presupuestados').update(fields).eq('id', id)
        dispatch(action)
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
