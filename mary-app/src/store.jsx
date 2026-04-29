import { createContext, useContext, useReducer, useEffect } from 'react'
import { uuid, genProjectCode, genOCCode, genBudgetCode, today } from './utils'

const STORAGE_KEY = 'mary_erp_v1'

const INIT = {
  proyectos: [], fases: [], presupuesto: [],
  materiales: [], entradas: [], salidas: [],
  solicitudes: [], solicitud_items: [], ordenes_compra: [],
  costos_directos: [], nominas: [], subcontratos: [],
  equipos: [], costos_indirectos: [],
}

function loadState() {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : INIT }
  catch { return INIT }
}

function reducer(state, action) {
  switch (action.type) {
    case 'RESET': return INIT
    // ---------- PROYECTOS ----------
    case 'ADD_PROYECTO': {
      const code = genProjectCode(state.proyectos)
      const item = { ...action.payload, id: uuid(), project_code: code, created_at: today() }
      return { ...state, proyectos: [...state.proyectos, item] }
    }
    case 'UPD_PROYECTO':
      return { ...state, proyectos: state.proyectos.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p) }
    case 'DEL_PROYECTO': {
      const id = action.payload
      return {
        ...state,
        proyectos: state.proyectos.filter(p => p.id !== id),
        fases: state.fases.filter(f => f.proyecto_id !== id),
        presupuesto: state.presupuesto.filter(b => b.proyecto_id !== id),
      }
    }
    // ---------- FASES ----------
    case 'ADD_FASE':
      return { ...state, fases: [...state.fases, { ...action.payload, id: uuid(), created_at: today() }] }
    case 'UPD_FASE':
      return { ...state, fases: state.fases.map(f => f.id === action.payload.id ? { ...f, ...action.payload } : f) }
    case 'DEL_FASE':
      return { ...state, fases: state.fases.filter(f => f.id !== action.payload) }
    // ---------- PRESUPUESTO ----------
    case 'ADD_BUDGET': {
      const { proyectoId, ...rest } = action.payload
      const byProject = state.presupuesto.filter(b => b.proyecto_id === proyectoId)
      const code = genBudgetCode(byProject, rest.tipo, rest.parent_id)
      const item = { ...rest, id: uuid(), proyecto_id: proyectoId, code, created_at: today() }
      return { ...state, presupuesto: [...state.presupuesto, item] }
    }
    case 'UPD_BUDGET':
      return { ...state, presupuesto: state.presupuesto.map(b => b.id === action.payload.id ? { ...b, ...action.payload } : b) }
    case 'DEL_BUDGET': {
      const toDelete = new Set()
      const collect = (id) => {
        toDelete.add(id)
        state.presupuesto.filter(b => b.parent_id === id).forEach(c => collect(c.id))
      }
      collect(action.payload)
      return { ...state, presupuesto: state.presupuesto.filter(b => !toDelete.has(b.id)) }
    }
    // ---------- MATERIALES ----------
    case 'ADD_MATERIAL':
      return { ...state, materiales: [...state.materiales, { ...action.payload, id: uuid(), stock_actual: parseFloat(action.payload.stock_actual)||0, created_at: today() }] }
    case 'UPD_MATERIAL':
      return { ...state, materiales: state.materiales.map(m => m.id === action.payload.id ? { ...m, ...action.payload } : m) }
    case 'TOGGLE_MATERIAL':
      return { ...state, materiales: state.materiales.map(m => m.id === action.payload ? { ...m, activo: !m.activo } : m) }
    // ---------- ENTRADAS BODEGA ----------
    case 'ADD_ENTRADA': {
      const e = { ...action.payload, id: uuid(), created_at: today() }
      const qty = parseFloat(e.cantidad) || 0
      return {
        ...state,
        entradas: [...state.entradas, e],
        materiales: state.materiales.map(m => m.id === e.material_id ? { ...m, stock_actual: (m.stock_actual||0) + qty } : m),
        ordenes_compra: state.ordenes_compra.map(oc => {
          if (oc.id !== e.oc_id) return oc
          const totalRecibido = [...state.entradas, e].filter(en => en.oc_id === oc.id).reduce((s, en) => s + (parseFloat(en.cantidad)||0), 0)
          const totalOC = (state.solicitud_items.filter(si => si.solicitud_id === oc.solicitud_id).reduce((s, si) => s + (parseFloat(si.cantidad)||0), 0)) || 999
          return { ...oc, estado: totalRecibido >= totalOC ? 'recibida_total' : 'recibida_parcial' }
        })
      }
    }
    // ---------- SALIDAS BODEGA ----------
    case 'ADD_SALIDA': {
      const s = { ...action.payload, id: uuid(), created_at: today() }
      const qty = parseFloat(s.cantidad) || 0
      return {
        ...state,
        salidas: [...state.salidas, s],
        materiales: state.materiales.map(m => m.id === s.material_id ? { ...m, stock_actual: Math.max(0, (m.stock_actual||0) - qty) } : m)
      }
    }
    // ---------- SOLICITUDES ----------
    case 'ADD_SOLICITUD': {
      const sol = { ...action.payload.solicitud, id: uuid(), estado: 'pendiente', created_at: today() }
      const items = (action.payload.items || []).map(it => ({ ...it, id: uuid(), solicitud_id: sol.id }))
      return { ...state, solicitudes: [...state.solicitudes, sol], solicitud_items: [...state.solicitud_items, ...items] }
    }
    case 'UPD_SOLICITUD_ESTADO': {
      const { id, estado } = action.payload
      return { ...state, solicitudes: state.solicitudes.map(s => s.id === id ? { ...s, estado } : s) }
    }
    // ---------- ORDENES DE COMPRA ----------
    case 'ADD_OC': {
      const oc_number = genOCCode(state.ordenes_compra)
      const oc = { ...action.payload, id: uuid(), oc_number, estado: 'pendiente_aprobacion', created_at: today() }
      const solId = oc.solicitud_id
      return {
        ...state,
        ordenes_compra: [...state.ordenes_compra, oc],
        solicitudes: state.solicitudes.map(s => s.id === solId ? { ...s, estado: 'oc_generada' } : s)
      }
    }
    case 'UPD_OC_ESTADO':
      return { ...state, ordenes_compra: state.ordenes_compra.map(oc => oc.id === action.payload.id ? { ...oc, estado: action.payload.estado, fecha_aprobacion: action.payload.estado === 'aprobada' ? today() : oc.fecha_aprobacion } : oc) }
    // ---------- FINANCIERO ----------
    case 'ADD_COSTO_DIRECTO':
      return { ...state, costos_directos: [...state.costos_directos, { ...action.payload, id: uuid(), created_at: today() }] }
    case 'ADD_NOMINA':
      return { ...state, nominas: [...state.nominas, { ...action.payload, id: uuid(), created_at: today() }] }
    case 'ADD_SUBCONTRATO':
      return { ...state, subcontratos: [...state.subcontratos, { ...action.payload, id: uuid(), created_at: today() }] }
    case 'UPD_SUBCONTRATO':
      return { ...state, subcontratos: state.subcontratos.map(s => s.id === action.payload.id ? { ...s, ...action.payload } : s) }
    case 'ADD_EQUIPO':
      return { ...state, equipos: [...state.equipos, { ...action.payload, id: uuid(), created_at: today() }] }
    case 'ADD_COSTO_INDIRECTO':
      return { ...state, costos_indirectos: [...state.costos_indirectos, { ...action.payload, id: uuid(), created_at: today() }] }
    default: return state
  }
}

const Ctx = createContext(null)
export const useStore = () => useContext(Ctx)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, loadState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>
}
