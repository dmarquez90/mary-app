import { createContext, useContext, useReducer, useEffect } from 'react'
import { supabase } from './supabase'
import { uuid, genProjectCode, genOCCode, genBudgetCode, today } from './utils'

const INIT = {
  proyectos: [], fases: [], presupuesto: [],
  materiales: [], entradas: [], salidas: [],
  solicitudes: [], solicitud_items: [], ordenes_compra: [],
  costos_directos: [], nominas: [], subcontratos: [],
  equipos: [], costos_indirectos: [], loaded: false
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_ALL': return { ...action.payload, loaded: true }
    case 'RESET': return { ...INIT, loaded: true }
    case 'ADD_PROYECTO':
      return { ...state, proyectos: [...state.proyectos, action.payload] }
    case 'UPD_PROYECTO':
      return { ...state, proyectos: state.proyectos.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p) }
    case 'DEL_PROYECTO':
      return { ...state, proyectos: state.proyectos.filter(p => p.id !== action.payload) }
    case 'ADD_FASE':
      return { ...state, fases: [...state.fases, action.payload] }
    case 'UPD_FASE':
      return { ...state, fases: state.fases.map(f => f.id === action.payload.id ? { ...f, ...action.payload } : f) }
    case 'DEL_FASE':
      return { ...state, fases: state.fases.filter(f => f.id !== action.payload) }
    case 'ADD_BUDGET':
      return { ...state, presupuesto: [...state.presupuesto, action.payload] }
    case 'UPD_BUDGET':
      return { ...state, presupuesto: state.presupuesto.map(b => b.id === action.payload.id ? { ...b, ...action.payload } : b) }
    case 'DEL_BUDGET':
      return { ...state, presupuesto: state.presupuesto.filter(b => b.id !== action.payload) }
    case 'ADD_MATERIAL':
      return { ...state, materiales: [...state.materiales, action.payload] }
    case 'UPD_MATERIAL':
      return { ...state, materiales: state.materiales.map(m => m.id === action.payload.id ? { ...m, ...action.payload } : m) }
    case 'TOGGLE_MATERIAL':
      return { ...state, materiales: state.materiales.map(m => m.id === action.payload ? { ...m, activo: !m.activo } : m) }
    case 'ADD_ENTRADA':
      return { ...state, entradas: [...state.entradas, action.payload] }
    case 'ADD_SALIDA':
      return { ...state, salidas: [...state.salidas, action.payload] }
    case 'ADD_SOLICITUD':
      return { ...state, solicitudes: [...state.solicitudes, action.payload.solicitud], solicitud_items: [...state.solicitud_items, ...action.payload.items] }
    case 'UPD_SOLICITUD_ESTADO':
      return { ...state, solicitudes: state.solicitudes.map(s => s.id === action.payload.id ? { ...s, estado: action.payload.estado } : s) }
    case 'ADD_OC':
      return { ...state, ordenes_compra: [...state.ordenes_compra, action.payload] }
    case 'UPD_OC_ESTADO':
      return { ...state, ordenes_compra: state.ordenes_compra.map(oc => oc.id === action.payload.id ? { ...oc, estado: action.payload.estado } : oc) }
    case 'ADD_COSTO_DIRECTO':
      return { ...state, costos_directos: [...state.costos_directos, action.payload] }
    case 'ADD_NOMINA':
      return { ...state, nominas: [...state.nominas, action.payload] }
    case 'ADD_SUBCONTRATO':
      return { ...state, subcontratos: [...state.subcontratos, action.payload] }
    case 'UPD_SUBCONTRATO':
      return { ...state, subcontratos: state.subcontratos.map(s => s.id === action.payload.id ? { ...s, ...action.payload } : s) }
    case 'ADD_EQUIPO':
      return { ...state, equipos: [...state.equipos, action.payload] }
    case 'ADD_COSTO_INDIRECTO':
      return { ...state, costos_indirectos: [...state.costos_indirectos, action.payload] }
    default: return state
  }
}

const Ctx = createContext(null)
export const useStore = () => useContext(Ctx)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INIT)

  useEffect(() => {
    async function loadAll() {
      const tables = ['proyectos','fases','presupuesto','materiales','entradas','salidas','solicitudes','solicitud_items','ordenes_compra','costos_directos','nominas','subcontratos','equipos','costos_indirectos']
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
      case 'ADD_ENTRADA': {
        const payload = { ...action.payload }
  if (!payload.oc_id) delete payload.oc_id
  if (!payload.proyecto_id) delete payload.proyecto_id
  const item = { ...payload, id: uuid(), created_at: today() }
  await supabase.from('entradas').insert(item)
        const mat = state.materiales.find(m => m.id === item.material_id)
        if (mat) await supabase.from('materiales').update({ stock_actual: (mat.stock_actual||0) + (parseFloat(item.cantidad)||0) }).eq('id', mat.id)
        dispatch({ type: 'ADD_ENTRADA', payload: item })
        break
      }
      case 'ADD_SALIDA': {
        const item = { ...action.payload, id: uuid(), created_at: today() }
        await supabase.from('salidas').insert(item)
        const mat = state.materiales.find(m => m.id === item.material_id)
        if (mat) await supabase.from('materiales').update({ stock_actual: Math.max(0, (mat.stock_actual||0) - (parseFloat(item.cantidad)||0)) }).eq('id', mat.id)
        dispatch({ type: 'ADD_SALIDA', payload: item })
        break
      }
      case 'ADD_SOLICITUD': {
        const sol = { ...action.payload.solicitud, id: uuid(), estado: 'pendiente', created_at: today() }
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
      default: dispatch(action)
    }
  }

  return <Ctx.Provider value={{ state, dispatch: dbDispatch }}>{children}</Ctx.Provider>
}