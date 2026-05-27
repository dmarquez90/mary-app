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
  subcontratos_contratos: [], subcontratos_items: [],
  subcontratos_avaluos: [], subcontratos_avaluo_items: [],
  ordenes_cambio: [], ordenes_cambio_items: [],
  presupuesto_indirectos: [],
  avaluos_cliente: [], avaluos_cliente_items: [],
  notificaciones: [],
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
    case 'DEL_BUDGET': {
      // payload es array de ids (el item + todos sus descendientes)
      const idsToDelete = action.payload
      return { ...state, presupuesto: state.presupuesto.filter(b => !idsToDelete.includes(b.id)) }
    }
    case 'REFRESH_PRESUPUESTO': return {
      ...state,
      presupuesto: [
        ...state.presupuesto.filter(b => b.proyecto_id !== action.payload.proyectoId),
        ...action.payload.items
      ]
    }

    case 'ADD_MATERIAL':    return { ...state, materiales: [...state.materiales, action.payload] }
    case 'ADD_MATERIAL_CON_ENTRADA': return {
      ...state,
      materiales: [...state.materiales, action.payload.material],
      entradas:   [...state.entradas,   action.payload.entrada],
    }
    case 'UPD_MATERIAL':    return { ...state, materiales: state.materiales.map(m => m.id === action.payload.id ? { ...m, ...action.payload } : m) }
    case 'TOGGLE_MATERIAL': return { ...state, materiales: state.materiales.map(m => m.id === action.payload ? { ...m, activo: !m.activo } : m) }
    case 'DEL_MATERIAL':    return { ...state, materiales: state.materiales.filter(m => m.id !== action.payload) }

    case 'ADD_ENTRADA': return {
      ...state,
      entradas: [...state.entradas, action.payload],
      materiales: state.materiales.map(m =>
        m.id === action.payload.material_id
          ? { ...m, stock_actual: (parseFloat(m.stock_actual) || 0) + (parseFloat(action.payload.cantidad) || 0) }
          : m
      )
    }
    case 'UPD_ENTRADA': return { ...state, entradas: state.entradas.map(e => e.id === action.payload.id ? { ...e, ...action.payload } : e) }
    case 'DEL_ENTRADA': return {
      ...state,
      entradas: state.entradas.filter(e => e.id !== action.payload.id),
      materiales: state.materiales.map(m => m.id === action.payload.materialId
        ? { ...m, stock_actual: Math.max(0, parseFloat(m.stock_actual||0) - parseFloat(action.payload.cantidad||0)) } : m)
    }
    case 'DEL_ENTRADA_LOCAL': return { ...state, entradas: state.entradas.filter(e => e.id !== action.payload) }

    case 'ADD_SALIDA': return { ...state, salidas: [...state.salidas, action.payload] }
    case 'UPD_SALIDA': return { ...state, salidas: state.salidas.map(s => s.id === action.payload.id ? { ...s, ...action.payload } : s) }
    case 'DEL_SALIDA': return {
      ...state,
      salidas: state.salidas.filter(s => s.id !== action.payload.id),
      materiales: state.materiales.map(m => m.id === action.payload.materialId
        ? { ...m, stock_actual: parseFloat(m.stock_actual||0) + parseFloat(action.payload.cantidad||0) } : m)
    }
    case 'DEL_SALIDA_LOCAL': return { ...state, salidas: state.salidas.filter(s => s.id !== action.payload) }

    case 'ADD_SOLICITUD':
      return { ...state, solicitudes: [...state.solicitudes, action.payload.solicitud], solicitud_items: [...state.solicitud_items, ...action.payload.items] }
    case 'UPD_SOLICITUD_ESTADO':
      return { ...state, solicitudes: state.solicitudes.map(s => s.id === action.payload.id ? { ...s, estado: action.payload.estado } : s) }
    case 'REFRESH_SOLICITUDES':
      return { ...state, solicitudes: action.payload.solicitudes, solicitud_items: action.payload.items }
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

    case 'ADD_SC_CONTRATO': return {
      ...state,
      subcontratos_contratos: [...(state.subcontratos_contratos||[]), action.payload.contrato],
      subcontratos_items:     [...(state.subcontratos_items||[]), ...action.payload.items],
    }
    case 'DEL_SC_CONTRATO': return {
      ...state,
      subcontratos_contratos:    (state.subcontratos_contratos||[]).filter(s => s.id !== action.payload),
      subcontratos_items:        (state.subcontratos_items||[]).filter(i => i.subcontrato_id !== action.payload),
      subcontratos_avaluos:      (state.subcontratos_avaluos||[]).filter(a => a.subcontrato_id !== action.payload),
      subcontratos_avaluo_items: (state.subcontratos_avaluo_items||[]).filter(i => {
        const av = (state.subcontratos_avaluos||[]).find(a => a.id === i.avaluo_id)
        return av?.subcontrato_id !== action.payload
      }),
    }
    case 'ADD_SC_AVALUO': return {
      ...state,
      subcontratos_avaluos:      [...(state.subcontratos_avaluos||[]), action.payload.avaluo],
      subcontratos_avaluo_items: [...(state.subcontratos_avaluo_items||[]), ...action.payload.items],
    }
    case 'APROBAR_SC_AVALUO': return {
      ...state,
      subcontratos_avaluos: (state.subcontratos_avaluos||[]).map(a =>
        a.id === action.payload.avaluo.id ? { ...a, estado: 'aprobado' } : a),
      subcontratos_contratos: (state.subcontratos_contratos||[]).map(sc =>
        sc.id === action.payload.avaluo.subcontrato_id
          ? { ...sc, monto_pagado: (parseFloat(sc.monto_pagado||0) + parseFloat(action.payload.avaluo.monto_total||0)) }
          : sc),
      costos_directos: [...state.costos_directos, action.payload.costo],
    }

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

    case 'ADD_ORDEN_CAMBIO': return {
      ...state,
      ordenes_cambio:       [...(state.ordenes_cambio||[]),       action.payload.orden],
      ordenes_cambio_items: [...(state.ordenes_cambio_items||[]), ...action.payload.items],
    }
    case 'UPD_ORDEN_CAMBIO_ESTADO': return {
      ...state,
      ordenes_cambio: (state.ordenes_cambio||[]).map(o =>
        o.id === action.payload.id ? { ...o, estado: action.payload.estado } : o)
    }
    case 'DEL_ORDEN_CAMBIO': return {
      ...state,
      ordenes_cambio:       (state.ordenes_cambio||[]).filter(o => o.id !== action.payload),
      ordenes_cambio_items: (state.ordenes_cambio_items||[]).filter(i => i.oc_id !== action.payload),
    }

    case 'ADD_AVALUO_CLIENTE': return {
      ...state,
      avaluos_cliente:       [...(state.avaluos_cliente||[]),       action.payload.avaluo],
      avaluos_cliente_items: [...(state.avaluos_cliente_items||[]), ...action.payload.items],
    }
    case 'UPD_AVALUO_CLIENTE_ESTADO': return {
      ...state,
      avaluos_cliente: (state.avaluos_cliente||[]).map(a =>
        a.id === action.payload.id ? { ...a, estado: action.payload.estado } : a)
    }
    case 'DEL_AVALUO_CLIENTE': return {
      ...state,
      avaluos_cliente:       (state.avaluos_cliente||[]).filter(a => a.id !== action.payload),
      avaluos_cliente_items: (state.avaluos_cliente_items||[]).filter(i => i.avaluo_id !== action.payload),
    }

    case 'ADD_SOL_ELIM': return { ...state, solicitudes_eliminacion: [...state.solicitudes_eliminacion, action.payload] }
    case 'UPD_SOL_ELIM': return { ...state, solicitudes_eliminacion: state.solicitudes_eliminacion.map(s => s.id === action.payload.id ? { ...s, ...action.payload } : s) }
    case 'DEL_SOL_ELIM': return { ...state, solicitudes_eliminacion: state.solicitudes_eliminacion.filter(s => s.id !== action.payload) }

    case 'ADD_PRES_IND': return { ...state, presupuesto_indirectos: [...(state.presupuesto_indirectos||[]), action.payload] }
    case 'UPD_PRES_IND': return { ...state, presupuesto_indirectos: (state.presupuesto_indirectos||[]).map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p) }
    case 'DEL_PRES_IND': return { ...state, presupuesto_indirectos: (state.presupuesto_indirectos||[]).filter(p => p.id !== action.payload) }
    case 'REFRESH_PRES_IND': return { ...state, presupuesto_indirectos: action.payload }
case 'LOAD_TABLE':
  return { ...state, [action.payload.key]: action.payload.data }

    // NOTIFICACIONES
    case 'ADD_NOTIF':   return { ...state, notificaciones: [action.payload, ...(state.notificaciones||[])] }
    case 'MARK_NOTIF_READ': return { ...state, notificaciones: (state.notificaciones||[]).map(n => n.id === action.payload ? { ...n, leida: true } : n) }
    case 'MARK_ALL_NOTIF_READ': return { ...state, notificaciones: (state.notificaciones||[]).map(n => ({ ...n, leida: true })) }
    case 'LOAD_NOTIFS': return { ...state, notificaciones: action.payload }

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
        'materiales_presupuestados','solicitudes_eliminacion',
        'subcontratos_contratos','subcontratos_items',
        'subcontratos_avaluos','subcontratos_avaluo_items',
        'ordenes_cambio','ordenes_cambio_items',
        'avaluos_cliente','avaluos_cliente_items',
        'presupuesto_indirectos',
      ]
      const tenantResults = await Promise.all(
        tablasTenant.map(t => supabase.from(t).select('*').eq('tenant_id', tenantId))
      )
      const payload = {}
      tablasTenant.forEach((t, i) => { payload[t] = tenantResults[i].data || [] })
      dispatch({ type: 'LOAD_ALL', payload })

      // Cargar notificaciones del usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: notifs } = await supabase
          .from('notificaciones')
          .select('*')
          .eq('usuario_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)
        dispatch({ type: 'LOAD_NOTIFS', payload: notifs || [] })
      }
    }
    loadAll()
  }, [tenantId])

// ── REALTIME LISTENERS ──────────────────────────────────────────────
useEffect(() => {
  if (!tenantId) return

  const REALTIME_TABLES = [
    'proyectos', 'fases', 'presupuesto', 'presupuesto_indirectos',
    'materiales', 'entradas', 'salidas',
    'solicitudes', 'solicitud_items',
    'ordenes_compra', 'ordenes_compra_items',
    'costos_directos', 'nominas', 'subcontratos', 'equipos', 'costos_indirectos',
    'materiales_presupuestados', 'solicitudes_eliminacion',
    'subcontratos_contratos', 'subcontratos_items',
    'subcontratos_avaluos', 'subcontratos_avaluo_items',
    'ordenes_cambio', 'ordenes_cambio_items',
    'avaluos_cliente', 'avaluos_cliente_items',
  ]

  const channels = REALTIME_TABLES.map(table =>
    supabase
      .channel(`rt_${table}_${tenantId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter: `tenant_id=eq.${tenantId}`,
      }, async () => {
        const { data } = await supabase.from(table).select('*').eq('tenant_id', tenantId)
        dispatch({ type: 'LOAD_TABLE', payload: { key: table, data: data || [] } })
      })
      .subscribe()
  )

  // Realtime notificaciones: .on() SIEMPRE antes de .subscribe()
  // La variable cancelled evita condicion de carrera en StrictMode/hot-reload
  let notifChannel = null
  let cancelled = false

  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user || cancelled) return
    notifChannel = supabase
      .channel(`rt_notificaciones_${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notificaciones',
        filter: `usuario_id=eq.${user.id}`,
      }, (payload) => {
        dispatch({ type: 'ADD_NOTIF', payload: payload.new })
      })
      .subscribe()
  })

  return () => {
    cancelled = true
    channels.forEach(ch => supabase.removeChannel(ch))
    if (notifChannel) supabase.removeChannel(notifChannel)
  }
}, [tenantId])
  async function dbDispatch(action) {

    // ── Helper: enviar notificación a usuarios del tenant ──────────────
    async function notify({ tipo, titulo, mensaje, modulo, referencia_id, roles }) {
      try {
        // Obtener usuarios del tenant que tengan los roles indicados
        let query = supabase.from('usuarios').select('id').eq('tenant_id', tenantId).eq('activo', true)
        if (roles?.length) query = query.in('rol', roles)
        const { data: usuarios } = await query
        if (!usuarios?.length) return
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        // No notificar al propio usuario que hace la acción
        const targets = usuarios.filter(u => u.id !== currentUser?.id)
        if (!targets.length) return
        const notifs = targets.map(u => ({
          tenant_id: tenantId,
          usuario_id: u.id,
          tipo, titulo, mensaje, modulo,
          referencia_id: referencia_id || null,
          leida: false,
        }))
        await supabase.from('notificaciones').insert(notifs)
      } catch (e) { console.error('notify error:', e) }
    }

    // ── Helper: notificar a un usuario específico por ID ──────────────
    async function notifyUser({ usuario_id, tipo, titulo, mensaje, modulo, referencia_id }) {
      if (!usuario_id) return
      try {
        await supabase.from('notificaciones').insert({
          tenant_id: tenantId,
          usuario_id,
          tipo, titulo, mensaje, modulo,
          referencia_id: referencia_id || null,
          leida: false,
        })
      } catch (e) { console.error('notifyUser error:', e) }
    }

    switch (action.type) {

      case 'ADD_PRES_IND': {
        const item = { ...action.payload, id: uuid(), created_at: today(), tenant_id: tenantId }
        await supabase.from('presupuesto_indirectos').insert(item)
        dispatch({ type: 'ADD_PRES_IND', payload: item })
        break
      }
      case 'UPD_PRES_IND': {
        const { id, ...fields } = action.payload
        await supabase.from('presupuesto_indirectos').update(fields).eq('id', id)
        dispatch({ type: 'UPD_PRES_IND', payload: action.payload })
        break
      }
      case 'DEL_PRES_IND': {
        await supabase.from('presupuesto_indirectos').delete().eq('id', action.payload)
        dispatch({ type: 'DEL_PRES_IND', payload: action.payload })
        break
      }
      case 'REFRESH_PRES_IND': {
        const { data } = await supabase.from('presupuesto_indirectos').select('*').eq('proyecto_id', action.payload).eq('tenant_id', tenantId)
        dispatch({ type: 'REFRESH_PRES_IND', payload: data || [] })
        break
      }

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
        const pid = action.payload
        await supabase.from('presupuesto').delete().eq('proyecto_id', pid)
        await supabase.from('presupuesto_indirectos').delete().eq('proyecto_id', pid)
        await supabase.from('fases').delete().eq('proyecto_id', pid)
        await supabase.from('materiales_presupuestados').delete().eq('proyecto_id', pid)
        await supabase.from('salidas').delete().eq('proyecto_id', pid)
        await supabase.from('entradas').delete().eq('proyecto_id', pid)
        await supabase.from('costos_directos').delete().eq('proyecto_id', pid)
        await supabase.from('nominas').delete().eq('proyecto_id', pid)
        await supabase.from('subcontratos').delete().eq('proyecto_id', pid)
        await supabase.from('equipos').delete().eq('proyecto_id', pid)
        await supabase.from('costos_indirectos').delete().eq('proyecto_id', pid)
        const { data: sols } = await supabase.from('solicitudes').select('id').eq('proyecto_id', pid)
        if (sols?.length) {
          await supabase.from('solicitud_items').delete().in('solicitud_id', sols.map(s => s.id))
          await supabase.from('solicitudes').delete().eq('proyecto_id', pid)
        }
        const { data: ocs } = await supabase.from('ordenes_compra').select('id').eq('proyecto_id', pid)
        if (ocs?.length) {
          await supabase.from('ordenes_compra_items').delete().in('oc_id', ocs.map(o => o.id))
          await supabase.from('ordenes_compra').delete().eq('proyecto_id', pid)
        }
        const { data: ocsC } = await supabase.from('ordenes_cambio').select('id').eq('proyecto_id', pid)
        if (ocsC?.length) {
          await supabase.from('ordenes_cambio_items').delete().in('oc_id', ocsC.map(o => o.id))
          await supabase.from('ordenes_cambio').delete().eq('proyecto_id', pid)
        }
        const { data: scs } = await supabase.from('subcontratos_contratos').select('id').eq('proyecto_id', pid)
        if (scs?.length) {
          const scIds = scs.map(s => s.id)
          const { data: avs } = await supabase.from('subcontratos_avaluos').select('id').in('subcontrato_id', scIds)
          if (avs?.length) await supabase.from('subcontratos_avaluo_items').delete().in('avaluo_id', avs.map(a => a.id))
          await supabase.from('subcontratos_avaluos').delete().in('subcontrato_id', scIds)
          await supabase.from('subcontratos_items').delete().in('subcontrato_id', scIds)
          await supabase.from('subcontratos_contratos').delete().eq('proyecto_id', pid)
        }
        const { data: avsCli } = await supabase.from('avaluos_cliente').select('id').eq('proyecto_id', pid)
        if (avsCli?.length) {
          await supabase.from('avaluos_cliente_items').delete().in('avaluo_id', avsCli.map(a => a.id))
          await supabase.from('avaluos_cliente').delete().eq('proyecto_id', pid)
        }
        await supabase.from('proyectos').delete().eq('id', pid)
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
        const item = { ...rest, id: rest.id || uuid(), proyecto_id: proyectoId, code, created_at: today(), tenant_id: tenantId }
        await supabase.from('presupuesto').insert(item)
        dispatch({ type: 'ADD_BUDGET', payload: item })
        break
      }
      case 'REFRESH_PRESUPUESTO': {
        const { data } = await supabase
          .from('presupuesto').select('*')
          .eq('proyecto_id', action.payload.proyectoId)
          .eq('tenant_id', tenantId)

        const allItems = data || []
        const validIds = new Set(allItems.map(i => i.id))
        const huerfanos = allItems
          .filter(i => i.parent_id !== null && !validIds.has(i.parent_id))
          .map(i => i.id)

        if (huerfanos.length > 0) {
          await supabase.from('presupuesto').delete().in('id', huerfanos)
          await supabase.from('materiales_presupuestados').delete().in('actividad_id', huerfanos)
        }

        const itemsLimpios = allItems.filter(i => !huerfanos.includes(i.id))
        dispatch({ type: 'REFRESH_PRESUPUESTO', payload: { proyectoId: action.payload.proyectoId, items: itemsLimpios } })
        break
      }
      case 'UPD_BUDGET': {
        await supabase.from('presupuesto').update(action.payload).eq('id', action.payload.id)
        dispatch(action)
        break
      }
      case 'DEL_BUDGET': {
        const itemId  = action.payload
        const allItems = state.presupuesto
        const item = allItems.find(b => b.id === itemId)
        if (!item) break

        // Recopilar IDs a eliminar: el item + todos sus descendientes
        const idsToDelete = [itemId]

        if (item.tipo === 'etapa') {
          const subEtapas = allItems.filter(b => b.parent_id === itemId && b.tipo === 'sub_etapa')
          subEtapas.forEach(se => {
            idsToDelete.push(se.id)
            allItems.filter(b => b.parent_id === se.id && b.tipo === 'actividad')
              .forEach(a => idsToDelete.push(a.id))
          })
          // Actividades colgadas directamente de la etapa
          allItems.filter(b => b.parent_id === itemId && b.tipo === 'actividad')
            .forEach(a => idsToDelete.push(a.id))
        } else if (item.tipo === 'sub_etapa') {
          allItems.filter(b => b.parent_id === itemId && b.tipo === 'actividad')
            .forEach(a => idsToDelete.push(a.id))
        }

        // Eliminar en Supabase
        await supabase.from('presupuesto').delete().in('id', idsToDelete)
        // Limpiar materiales presupuestados vinculados a las actividades eliminadas
        await supabase.from('materiales_presupuestados').delete().in('actividad_id', idsToDelete)

        dispatch({ type: 'DEL_BUDGET', payload: idsToDelete })
        break
      }

      case 'ADD_MATERIAL_CON_ENTRADA': {
        const { material, entrada } = action.payload
        const existe = state.materiales.find(m => m.codigo === material.codigo && m.activo !== false)
        if (existe) { alert('Error: El código de material ya existe.'); return }
        const cleanMat = {
          ...Object.fromEntries(Object.entries(material).filter(([k]) => !k.startsWith('_'))),
          created_at: today(), tenant_id: tenantId,
          stock_actual:    parseFloat(material.stock_actual)    || 0,
          stock_minimo:    parseFloat(material.stock_minimo)    || 0,
          precio_unitario: parseFloat(material.precio_unitario) || 0,
        }
        const cleanEnt = {
          ...Object.fromEntries(Object.entries(entrada).filter(([k]) => !k.startsWith('_'))),
          id: uuid(), created_at: today(), tenant_id: tenantId,
          cantidad:        parseFloat(entrada.cantidad)        || 0,
          precio_unitario: parseFloat(entrada.precio_unitario) || 0,
          proyecto_id:     entrada.proyecto_id || null,
          oc_id:           entrada.oc_id       || null,
        }
        const { error: eM } = await supabase.from('materiales').insert(cleanMat)
        if (eM) { console.error('ADD_MATERIAL_CON_ENTRADA — materiales:', JSON.stringify(eM)); break }
        const { error: eE } = await supabase.from('entradas').insert(cleanEnt)
        if (eE) console.error('ADD_MATERIAL_CON_ENTRADA — entradas:', JSON.stringify(eE))
        await supabase.from('materiales').update({ stock_actual: cleanMat.stock_actual }).eq('id', cleanMat.id)
        dispatch({ type: 'ADD_MATERIAL_CON_ENTRADA', payload: { material: cleanMat, entrada: cleanEnt } })
        break
      }
      case 'ADD_MATERIAL': {
        const existe = state.materiales.find(m => m.codigo === action.payload.codigo && m.activo !== false)
        if (existe) { alert('Error: El código de material ya existe.'); return }
        const stockInicial = parseFloat(action.payload.stock_actual) || 0
        const cleanP = Object.fromEntries(Object.entries(action.payload).filter(([k]) => !k.startsWith('_')))
        const item = {
          ...cleanP, id: cleanP.id || uuid(),
          stock_actual: stockInicial, stock_minimo: parseFloat(cleanP.stock_minimo) || 0,
          precio_unitario: parseFloat(cleanP.precio_unitario) || 0,
          created_at: today(), tenant_id: tenantId,
        }
        const { error: eM } = await supabase.from('materiales').insert(item)
        if (eM) { console.error('ADD_MATERIAL — materiales:', JSON.stringify(eM)); break }
        dispatch({ type: 'ADD_MATERIAL', payload: item })
        if (stockInicial > 0) {
          const entrada = {
            id: uuid(), material_id: item.id, cantidad: stockInicial,
            precio_unitario: parseFloat(cleanP.precio_unitario) || 0,
            numero_factura: 'STOCK-INICIAL', proveedor: 'Stock inicial',
            fecha_recepcion: today(), created_at: today(), tenant_id: tenantId,
          }
          const { error: eE } = await supabase.from('entradas').insert(entrada)
          if (eE) console.error('ADD_MATERIAL — entradas stock inicial:', JSON.stringify(eE))
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
        const payload = Object.fromEntries(Object.entries(action.payload).filter(([k]) => !k.startsWith('_')))
        const item = {
          ...payload, id: uuid(), created_at: today(), tenant_id: tenantId,
          cantidad: parseFloat(payload.cantidad) || 0,
          precio_unitario: parseFloat(payload.precio_unitario) || 0,
          oc_id: payload.oc_id || null,
          proyecto_id: payload.proyecto_id || null,
        }
        if (!item.oc_id)       delete item.oc_id
        if (!item.proyecto_id) delete item.proyecto_id
        const { error: eE } = await supabase.from('entradas').insert(item)
        if (eE) { console.error('ADD_ENTRADA — entradas:', JSON.stringify(eE)); break }
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
        const diferencia = parseFloat(fields.cantidad || 0) - parseFloat(entradaAnterior?.cantidad || 0)
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
        const salidasAfectadas   = state.salidas.filter(s => s.material_id === action.payload.materialId)
        const otrasentradas      = state.entradas.filter(e => e.id !== action.payload.id && e.material_id === action.payload.materialId)
        const totalOtrasEntradas = otrasentradas.reduce((s,e) => s + parseFloat(e.cantidad||0), 0)
        const totalSalidas       = salidasAfectadas.reduce((s,e) => s + parseFloat(e.cantidad||0), 0)
        if (totalSalidas > totalOtrasEntradas) {
          for (const sal of salidasAfectadas) {
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
        const payload = Object.fromEntries(Object.entries(action.payload).filter(([k]) => !k.startsWith('_')))
        if (!payload.proyecto_id)        delete payload.proyecto_id
        if (!payload.actividad_id)       delete payload.actividad_id
        if (!payload.origen_proyecto_id) delete payload.origen_proyecto_id
        const item = { ...payload, id: uuid(), created_at: today(), tenant_id: tenantId }
        const { error: eS } = await supabase.from('salidas').insert(item)
        if (eS) { console.error('ADD_SALIDA — salidas:', eS, item); break }
        const mat = state.materiales.find(m => m.id === item.material_id)
        if (mat) {
          const nuevoStock = Math.max(0, (parseFloat(mat.stock_actual)||0) - (parseFloat(item.cantidad)||0))
          await supabase.from('materiales').update({ stock_actual: nuevoStock }).eq('id', mat.id)
          dispatch({ type: 'UPD_MATERIAL', payload: { ...mat, stock_actual: nuevoStock } })
        }
        dispatch({ type: 'ADD_SALIDA', payload: item })
        if (item.proyecto_id && item.material_id && item.actividad_id) {
          const yaExiste = state.materiales_presupuestados.some(mp =>
            mp.proyecto_id === item.proyecto_id && mp.material_id === item.material_id && mp.actividad_id === item.actividad_id
          )
          if (!yaExiste && mat) {
            const mpNuevo = {
              id: uuid(), proyecto_id: item.proyecto_id, material_id: item.material_id,
              nombre_libre: mat.descripcion, unidad_libre: mat.unidad,
              cantidad_presupuestada: 0, actividad_id: item.actividad_id,
              es_adicional: true, tenant_id: tenantId, created_at: today(),
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
        const diferencia = parseFloat(fields.cantidad || 0) - parseFloat(salidaAnterior?.cantidad || 0)
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

      case 'ADD_SOL_ELIM': {
        const item = { ...action.payload, id: uuid(), estado: 'pendiente', created_at: today(), tenant_id: tenantId }
        await supabase.from('solicitudes_eliminacion').insert(item)
        dispatch({ type: 'ADD_SOL_ELIM', payload: item })
        await notify({
          tipo: 'solicitud',
          titulo: '⚠️ Solicitud de eliminación pendiente',
          mensaje: `${action.payload.solicitante_nombre || 'Un usuario'} solicita eliminar ${action.payload.tipo === 'entrada' ? 'una entrada' : 'una salida'} de "${action.payload.material_desc || 'material'}". Justificación: ${action.payload.justificacion || '—'}`,
          modulo: 'inventario',
          referencia_id: item.id,
          roles: ['client_admin', 'coordinador', 'gerente'],
        })
        break
      }
      case 'APROBAR_SOL_ELIM': {
        const sol = state.solicitudes_eliminacion.find(s => s.id === action.payload.id)
        if (!sol) break

        try {
          if (sol.tipo === 'entrada') {
            // Eliminar la entrada si existe en el store
            const existeLocal = state.entradas.find(e => e.id === sol.registro_id)
            if (existeLocal) {
              await dbDispatch({ type: 'DEL_ENTRADA', payload: { id: sol.registro_id, materialId: sol.material_id, cantidad: sol.cantidad } })
            } else {
              // El registro ya no está en el store — actualizar stock directamente en Supabase
              const { data: entradaDB } = await supabase.from('entradas').select('id').eq('id', sol.registro_id).single()
              if (entradaDB) {
                // La entrada existe en DB pero no en store — eliminarla y ajustar stock
                await supabase.from('entradas').delete().eq('id', sol.registro_id)
              }
              // Ajustar stock del material independientemente
              const { data: mat } = await supabase.from('materiales').select('stock_actual').eq('id', sol.material_id).single()
              if (mat) {
                const nuevoStock = Math.max(0, parseFloat(mat.stock_actual || 0) - parseFloat(sol.cantidad || 0))
                await supabase.from('materiales').update({ stock_actual: nuevoStock }).eq('id', sol.material_id)
                // Actualizar el store local también
                const matLocal = state.materiales.find(m => m.id === sol.material_id)
                if (matLocal) dispatch({ type: 'UPD_MATERIAL', payload: { ...matLocal, stock_actual: nuevoStock } })
              }
            }
          } else if (sol.tipo === 'salida') {
            const existeLocal = state.salidas.find(s => s.id === sol.registro_id)
            if (existeLocal) {
              await dbDispatch({ type: 'DEL_SALIDA', payload: { id: sol.registro_id, materialId: sol.material_id, cantidad: sol.cantidad } })
            } else {
              // La salida ya no está en el store — ajustar stock directamente
              const { data: salidaDB } = await supabase.from('salidas').select('id').eq('id', sol.registro_id).single()
              if (salidaDB) await supabase.from('salidas').delete().eq('id', sol.registro_id)
              const { data: mat } = await supabase.from('materiales').select('stock_actual').eq('id', sol.material_id).single()
              if (mat) {
                const nuevoStock = parseFloat(mat.stock_actual || 0) + parseFloat(sol.cantidad || 0)
                await supabase.from('materiales').update({ stock_actual: nuevoStock }).eq('id', sol.material_id)
                const matLocal = state.materiales.find(m => m.id === sol.material_id)
                if (matLocal) dispatch({ type: 'UPD_MATERIAL', payload: { ...matLocal, stock_actual: nuevoStock } })
              }
            }
          }
        } catch (e) { console.warn('Error al procesar eliminación:', e.message) }

        // Siempre actualizar el estado de la solicitud — primero local, luego DB
        const upd = { estado: 'aprobada', comentario_admin: action.payload.comentario || '', reviewed_at: today(), reviewed_by: action.payload.reviewedBy }
        dispatch({ type: 'UPD_SOL_ELIM', payload: { id: sol.id, ...upd } })
        await supabase.from('solicitudes_eliminacion').update(upd).eq('id', sol.id)
        // Notificar al usuario específico que elaboró la solicitud
        await notifyUser({
          usuario_id: sol.solicitante_id,
          tipo: 'aprobacion',
          titulo: '✅ Solicitud de eliminación aprobada',
          mensaje: `Tu solicitud de eliminar ${sol.tipo === 'entrada' ? 'una entrada' : 'una salida'} de "${sol.material_desc}" fue aprobada.${action.payload.comentario ? ' Comentario: ' + action.payload.comentario : ''}`,
          modulo: 'inventario',
          referencia_id: sol.id,
        })
        break
      }
      case 'RECHAZAR_SOL_ELIM': {
        const sol2 = state.solicitudes_eliminacion.find(s => s.id === action.payload.id)
        const upd = { estado: 'rechazada', comentario_admin: action.payload.comentario || '', reviewed_at: today(), reviewed_by: action.payload.reviewedBy }
        dispatch({ type: 'UPD_SOL_ELIM', payload: { id: action.payload.id, ...upd } })
        await supabase.from('solicitudes_eliminacion').update(upd).eq('id', action.payload.id)
        // Notificar al usuario específico que elaboró la solicitud
        await notifyUser({
          usuario_id: sol2?.solicitante_id,
          tipo: 'rechazo',
          titulo: '❌ Solicitud de eliminación rechazada',
          mensaje: `Tu solicitud de eliminar "${sol2?.material_desc || 'material'}" fue rechazada.${action.payload.comentario ? ' Motivo: ' + action.payload.comentario : ''}`,
          modulo: 'inventario',
          referencia_id: action.payload.id,
        })
        break
      }

      case 'DEL_SOL_ELIM': {
        // Eliminar solicitud de eliminación del historial (solo aprobadas/rechazadas)
        const solDel = state.solicitudes_eliminacion.find(s => s.id === action.payload)
        if (!solDel || solDel.estado === 'pendiente') break
        await supabase.from('solicitudes_eliminacion').delete().eq('id', action.payload)
        dispatch({ type: 'DEL_SOL_ELIM', payload: action.payload })
        break
      }

      case 'ADD_SOLICITUD': {
        const sol   = { ...action.payload.solicitud, id: uuid(), estado: 'pendiente', created_at: today(), tenant_id: tenantId }
        const items = (action.payload.items||[]).map(it => ({ ...it, id: uuid(), solicitud_id: sol.id, tenant_id: tenantId }))
        const { error: solError } = await supabase.from('solicitudes').insert(sol)
        if (solError) { console.error('Error al insertar solicitud:', solError); break }
        if (items.length) {
          const { error: itemsError } = await supabase.from('solicitud_items').insert(items)
          if (itemsError) console.error('Error al insertar solicitud_items:', itemsError, items)
        }
        dispatch({ type: 'ADD_SOLICITUD', payload: { solicitud: sol, items } })
        // Notificar a gerentes y coordinadores
        await notify({
          tipo: 'solicitud',
          titulo: '📋 Nueva solicitud de compra',
          mensaje: `Proyecto: ${sol.proyecto_id ? (action.payload.proyecto_nombre || '') : ''}`,
          modulo: 'compras',
          referencia_id: sol.id,
          roles: ['client_admin', 'coordinador', 'gerente'],
        })
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
      case 'REFRESH_SOLICITUDES': {
        const [{ data: sols }, { data: items }] = await Promise.all([
          supabase.from('solicitudes').select('*').eq('tenant_id', tenantId),
          supabase.from('solicitud_items').select('*').eq('tenant_id', tenantId),
        ])
        dispatch({ type: 'REFRESH_SOLICITUDES', payload: { solicitudes: sols || [], items: items || [] } })
        break
      }

      case 'ADD_OC': {
        const oc_number   = genOCCode(state.ordenes_compra)
        const monto_total = parseFloat(action.payload.monto_total || 0) ||
          (action.payload.items||[]).reduce((s, it) => s + (parseFloat(it.cantidad||0) * parseFloat(it.precio_unitario||0)), 0)
        const oc = {
          id: uuid(), oc_number, estado: 'pendiente_aprobacion',
          created_at: today(), fecha_elaboracion: today(),
          solicitud_id:       action.payload.solicitud_id,
          proyecto_id:        action.payload.proyecto_id,
          proveedor:          action.payload.proveedor,
          elaboro_nombre:     action.payload.elaboro_nombre     || '',
          elaboro_cargo:      action.payload.elaboro_cargo      || '',
          solicitante_nombre: action.payload.solicitante_nombre || '',
          solicitante_cargo:  action.payload.solicitante_cargo  || '',
          aprobador_nombre:   action.payload.aprobador_nombre   || '',
          aprobador_cargo:    action.payload.aprobador_cargo    || '',
          notas:              action.payload.notas              || '',
          condiciones_pago:   action.payload.condiciones_pago   || 'contado',
          moneda:             action.payload.moneda             || 'USD',
          impuesto_pct:       parseFloat(action.payload.impuesto_pct   || 0),
          subtotal:           parseFloat(action.payload.subtotal       || 0),
          impuesto_monto:     parseFloat(action.payload.impuesto_monto || 0),
          monto_total, tenant_id: tenantId,
        }
        const ocItems = (action.payload.items||[]).map(it => {
          const impPct = parseFloat(it.impuesto_pct !== '' && it.impuesto_pct !== undefined ? it.impuesto_pct : (action.payload.impuesto_pct||0))
          const subtotal = parseFloat(it.cantidad||0) * parseFloat(it.precio_unitario||0)
          return {
            id: uuid(), oc_id: oc.id,
            solicitud_item_id: it.solicitud_item_id || it.id || null,
            material_id:       it.material_id || null,
            descripcion:       it.descripcion || '',
            codigo:            it.codigo      || '',
            cantidad:          parseFloat(it.cantidad||0),
            unidad:            it.unidad || 'und',
            precio_unitario:   parseFloat(it.precio_unitario||0),
            subtotal, impuesto_pct: impPct,
            impuesto_monto:    subtotal * (impPct / 100),
            total:             subtotal * (1 + impPct / 100),
            tenant_id:         tenantId,
          }
        })
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
        // Notificar según estado
        if (action.payload.estado === 'aprobada') {
          const oc = action.payload
          await notify({
            tipo: 'aprobacion',
            titulo: '✅ Orden de Compra aprobada',
            mensaje: `La OC ha sido aprobada y está lista para recibir materiales.`,
            modulo: 'compras',
            referencia_id: oc.id,
            roles: ['residente', 'bodeguero', 'coordinador'],
          })
        } else if (action.payload.estado === 'rechazada') {
          await notify({
            tipo: 'rechazo',
            titulo: '❌ Orden de Compra rechazada',
            mensaje: `La OC fue rechazada. Revisa los detalles.`,
            modulo: 'compras',
            referencia_id: action.payload.id,
            roles: ['residente', 'coordinador'],
          })
        }
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

      case 'ADD_SC_CONTRATO': {
        const sc = { ...action.payload.contrato, id: uuid(), created_at: today(), tenant_id: tenantId }
        const items = action.payload.items.map(it => ({ ...it, id: uuid(), subcontrato_id: sc.id, created_at: today(), tenant_id: tenantId }))
        await supabase.from('subcontratos_contratos').insert(sc)
        if (items.length) await supabase.from('subcontratos_items').insert(items)
        dispatch({ type: 'ADD_SC_CONTRATO', payload: { contrato: sc, items } })
        break
      }
      case 'DEL_SC_CONTRATO': {
        const pid = action.payload
        const { data: avs } = await supabase.from('subcontratos_avaluos').select('id').eq('subcontrato_id', pid)
        if (avs?.length) await supabase.from('subcontratos_avaluo_items').delete().in('avaluo_id', avs.map(a=>a.id))
        await supabase.from('subcontratos_avaluos').delete().eq('subcontrato_id', pid)
        await supabase.from('subcontratos_items').delete().eq('subcontrato_id', pid)
        await supabase.from('subcontratos_contratos').delete().eq('id', pid)
        dispatch({ type: 'DEL_SC_CONTRATO', payload: pid })
        break
      }
      case 'ADD_SC_AVALUO': {
        const av  = { ...action.payload.avaluo, id: uuid(), created_at: today(), tenant_id: tenantId }
        const avi = action.payload.items.map(it => ({ ...it, id: uuid(), avaluo_id: av.id, created_at: today(), tenant_id: tenantId }))
        await supabase.from('subcontratos_avaluos').insert(av)
        if (avi.length) await supabase.from('subcontratos_avaluo_items').insert(avi)
        dispatch({ type: 'ADD_SC_AVALUO', payload: { avaluo: av, items: avi } })
        break
      }
      case 'APROBAR_SC_AVALUO': {
        const av       = action.payload.avaluo
        const contrato = action.payload.contrato
        await supabase.from('subcontratos_avaluos').update({ estado: 'aprobado' }).eq('id', av.id)
        const nuevoPagado = parseFloat(contrato.monto_pagado||0) + parseFloat(av.monto_total||0)
        await supabase.from('subcontratos_contratos').update({ monto_pagado: nuevoPagado }).eq('id', contrato.id)
        const costo = {
          id: uuid(), proyecto_id: contrato.proyecto_id, categoria: 'Subcontratos',
          descripcion: `Avalúo #${av.numero} — ${contrato.subcontratista}`,
          proveedor: contrato.subcontratista, monto: parseFloat(av.monto_total||0),
          fecha: av.fecha_elaboracion || today(), referencia: `SC-AV-${av.numero}`,
          created_at: today(), tenant_id: tenantId,
        }
        await supabase.from('costos_directos').insert(costo)
        dispatch({ type: 'APROBAR_SC_AVALUO', payload: { avaluo: av, contrato, costo } })
        await notify({
          tipo: 'aprobacion',
          titulo: '✅ Avalúo de subcontrato aprobado',
          mensaje: `Avalúo #${av.numero} de ${contrato.subcontratista} fue aprobado.`,
          modulo: 'financiero',
          referencia_id: av.id,
          roles: ['client_admin', 'gerente', 'contador'],
        })
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
          proyecto_id:            action.payload.proyecto_id            || null,
          nombre_libre:           action.payload.nombre_libre           || '',
          unidad_libre:           action.payload.unidad_libre           || 'und',
          cantidad_presupuestada: parseFloat(action.payload.cantidad_presupuestada) || 0,
          material_id:            action.payload.material_id            || null,
          actividad_id:           action.payload.actividad_id           || null,
          etapa_id:               action.payload.etapa_id               || null,
          sub_etapa_id:           action.payload.sub_etapa_id           || null,
          es_adicional:           action.payload.es_adicional           || false,
          costo_unitario:         parseFloat(action.payload.costo_unitario) || 0,
        }
        const { error: eMP } = await supabase.from('materiales_presupuestados').insert(item)
        if (eMP) { console.error('ADD_MAT_PRES:', JSON.stringify(eMP)); break }
        dispatch({ type: 'ADD_MAT_PRES', payload: item })
        break
      }
      case 'UPD_MAT_PRES': {
        const { id, ...fields } = action.payload
        const upd = {
          nombre_libre:           fields.nombre_libre  || '',
          unidad_libre:           fields.unidad_libre  || 'und',
          cantidad_presupuestada: parseFloat(fields.cantidad_presupuestada || 0),
          material_id:            fields.material_id   || null,
          actividad_id:           fields.actividad_id  || null,
          etapa_id:               fields.etapa_id      || null,
          sub_etapa_id:           fields.sub_etapa_id  || null,
          es_adicional:           fields.es_adicional  || false,
          costo_unitario:         parseFloat(fields.costo_unitario || 0),
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

      case 'ADD_ORDEN_CAMBIO': {
        const orden = { ...action.payload.orden, id: uuid(), estado: 'pendiente', created_at: today(), tenant_id: tenantId }
        const items = (action.payload.items||[]).map(it => ({ ...it, id: uuid(), oc_id: orden.id, created_at: today(), tenant_id: tenantId }))
        await supabase.from('ordenes_cambio').insert(orden)
        if (items.length) await supabase.from('ordenes_cambio_items').insert(items)
        dispatch({ type: 'ADD_ORDEN_CAMBIO', payload: { orden, items } })
        break
      }
      case 'UPD_ORDEN_CAMBIO_ESTADO': {
        await supabase.from('ordenes_cambio').update({ estado: action.payload.estado }).eq('id', action.payload.id)
        dispatch(action)
        if (action.payload.estado === 'aprobada') {
          await notify({
            tipo: 'aprobacion',
            titulo: '✅ Orden de Cambio aprobada',
            mensaje: `La orden de cambio fue aprobada.`,
            modulo: 'ordenes_cambio',
            referencia_id: action.payload.id,
            roles: ['residente', 'coordinador', 'contador'],
          })
        } else if (action.payload.estado === 'rechazada') {
          await notify({
            tipo: 'rechazo',
            titulo: '❌ Orden de Cambio rechazada',
            mensaje: `La orden de cambio fue rechazada.`,
            modulo: 'ordenes_cambio',
            referencia_id: action.payload.id,
            roles: ['residente', 'coordinador'],
          })
        } else if (action.payload.estado === 'presentada') {
          await notify({
            tipo: 'info',
            titulo: '📤 Orden de Cambio presentada al cliente',
            mensaje: `Una orden de cambio fue presentada al cliente para aprobación.`,
            modulo: 'ordenes_cambio',
            referencia_id: action.payload.id,
            roles: ['client_admin', 'gerente'],
          })
        }
        break
      }
      case 'DEL_ORDEN_CAMBIO': {
        await supabase.from('ordenes_cambio_items').delete().eq('oc_id', action.payload)
        await supabase.from('ordenes_cambio').delete().eq('id', action.payload)
        dispatch(action)
        break
      }

      case 'ADD_AVALUO_CLIENTE': {
        const av  = { ...action.payload.avaluo, id: uuid(), estado: 'borrador', created_at: today(), tenant_id: tenantId }
        const avi = (action.payload.items||[]).map(it => ({ ...it, id: uuid(), avaluo_id: av.id, created_at: today(), tenant_id: tenantId }))
        await supabase.from('avaluos_cliente').insert(av)
        if (avi.length) await supabase.from('avaluos_cliente_items').insert(avi)
        dispatch({ type: 'ADD_AVALUO_CLIENTE', payload: { avaluo: av, items: avi } })
        break
      }
      case 'UPD_AVALUO_CLIENTE_ESTADO': {
        await supabase.from('avaluos_cliente').update({ estado: action.payload.estado }).eq('id', action.payload.id)
        dispatch(action)
        if (action.payload.estado === 'aprobado') {
          await notify({
            tipo: 'aprobacion',
            titulo: '✅ Avalúo aprobado',
            mensaje: `El avalúo de cliente fue aprobado.`,
            modulo: 'financiero',
            referencia_id: action.payload.id,
            roles: ['residente', 'coordinador', 'contador'],
          })
        } else if (action.payload.estado === 'rechazado') {
          await notify({
            tipo: 'rechazo',
            titulo: '❌ Avalúo rechazado',
            mensaje: `El avalúo fue rechazado. Requiere correcciones.`,
            modulo: 'financiero',
            referencia_id: action.payload.id,
            roles: ['residente', 'coordinador'],
          })
        }
        break
      }
      case 'DEL_AVALUO_CLIENTE': {
        await supabase.from('avaluos_cliente_items').delete().eq('avaluo_id', action.payload)
        await supabase.from('avaluos_cliente').delete().eq('id', action.payload)
        dispatch(action)
        break
      }

      case 'MARK_NOTIF_READ': {
        await supabase.from('notificaciones').update({ leida: true }).eq('id', action.payload)
        dispatch(action)
        break
      }
      case 'MARK_ALL_NOTIF_READ': {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) await supabase.from('notificaciones').update({ leida: true }).eq('usuario_id', user.id).eq('leida', false)
        dispatch(action)
        break
      }

      default: dispatch(action)
    }
  }

  return <Ctx.Provider value={{ state, dispatch: dbDispatch }}>{children}</Ctx.Provider>
}
