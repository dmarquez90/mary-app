import { createContext, useContext, useReducer, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { uuid, genProjectCode, genOCCode, genBudgetCode, today, r2 } from './utils'

const INIT = {
  proyectos: [], fases: [], presupuesto: [],
  materiales: [], entradas: [], salidas: [],
  solicitudes: [], solicitud_items: [], ordenes_compra: [], ordenes_compra_items: [],
  costos_directos: [], nominas: [], subcontratos: [],
  equipos: [], equipos_ajustes: [], costos_indirectos: [],
  materiales_presupuestados: [],
  solicitudes_eliminacion: [],
  subcontratos_contratos: [], subcontratos_items: [],
  subcontratos_avaluos: [], subcontratos_avaluo_items: [],
  subcontratos_retenciones: [],
  ordenes_pago_retencion: [],
  ordenes_cambio: [], ordenes_cambio_items: [], ordenes_cambio_indirectos: [],
  presupuesto_indirectos: [],
  avaluos_cliente: [], avaluos_cliente_items: [],
  cajas_chicas: [], gastos_caja_chica: [], liquidaciones_caja_chica: [], reembolsos_personal: [],
  usuarios: [],
  notificaciones: [],
  loaded: false
}

// Convierte gastos de caja chica liquidados en costos_directos / costos_indirectos / equipos.
// Usado tanto en APROBAR_LIQUIDACION_CC como en el cierre con liquidación automática.
function buildCostosFromGastosCC(gastos, proyecto_id, tenantId) {
  const nuevosCostosDirectos   = []
  const nuevosCostosIndirectos = []
  const nuevosEquipos          = []
  for (const g of gastos) {
    const base = {
      id: uuid(), tenant_id: tenantId, proyecto_id,
      descripcion: `${g.descripcion} (Caja Chica)`, fecha: g.fecha, created_at: today(),
      impuesto_monto: parseFloat(g.impuesto_monto)||0, impuesto_descripcion: g.impuesto_descripcion||null,
    }
    if (g.tipo_costo === 'costos_indirectos') {
      nuevosCostosIndirectos.push({ ...base, monto: parseFloat(g.monto)||0, categoria: g.categoria_ind, subcategoria: g.subcategoria_ind })
    } else if (g.tipo_costo === 'equipos') {
      nuevosEquipos.push({ ...base, costo_total: parseFloat(g.monto)||0, tipo: 'alquiler', actividad_id: g.actividad_id||null })
    } else {
      nuevosCostosDirectos.push({ ...base, monto: parseFloat(g.monto)||0, tipo: 'caja_chica', numero_documento: g.numero_factura||null, actividad_id: g.actividad_id||null })
    }
  }
  return { nuevosCostosDirectos, nuevosCostosIndirectos, nuevosEquipos }
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
      subcontratos_retenciones: action.payload.retencion
        ? [...(state.subcontratos_retenciones||[]), action.payload.retencion]
        : (state.subcontratos_retenciones||[]),
    }

    case 'DEVOLVER_RETENCION': return {
      ...state,
      subcontratos_retenciones: (state.subcontratos_retenciones||[]).map(r =>
        r.id === action.payload.retencion.id
          ? { ...r, estado: 'devuelta', fecha_devolucion_real: action.payload.fecha, monto_devuelto: r.monto_retenido }
          : r),
    }

    case 'EMITIR_ORDEN_PAGO_RETENCION': return {
      ...state,
      ordenes_pago_retencion: [...(state.ordenes_pago_retencion||[]), action.payload.orden],
      subcontratos_retenciones: (state.subcontratos_retenciones||[]).map(r =>
        action.payload.retencion_ids.includes(r.id)
          ? { ...r, orden_pago_id: action.payload.orden.id, estado: 'devuelta', fecha_devolucion_real: action.payload.orden.fecha_orden, monto_devuelto: r.monto_retenido }
          : r),
    }

    case 'ADD_SUBCONTRATO':     return { ...state, subcontratos: [...state.subcontratos, action.payload] }
    case 'UPD_SUBCONTRATO':     return { ...state, subcontratos: state.subcontratos.map(s => s.id === action.payload.id ? { ...s, ...action.payload } : s) }
    case 'DEL_SUBCONTRATO':     return { ...state, subcontratos: state.subcontratos.filter(s => s.id !== action.payload) }

    case 'ADD_EQUIPO':          return { ...state, equipos: [...state.equipos, action.payload] }
    case 'UPD_EQUIPO':          return { ...state, equipos: state.equipos.map(e => e.id === action.payload.id ? { ...e, ...action.payload } : e) }
    case 'DEL_EQUIPO':          return { ...state, equipos: state.equipos.filter(e => e.id !== action.payload) }

    case 'ADD_AJUSTE_EQUIPO':   return { ...state, equipos_ajustes: [...state.equipos_ajustes, action.payload] }
    case 'UPD_AJUSTE_EQUIPO':   return { ...state, equipos_ajustes: state.equipos_ajustes.map(a => a.id === action.payload.id ? { ...a, ...action.payload } : a) }
    case 'DEL_AJUSTE_EQUIPO':   return { ...state, equipos_ajustes: state.equipos_ajustes.filter(a => a.id !== action.payload) }

    case 'ADD_COSTO_INDIRECTO': return { ...state, costos_indirectos: [...state.costos_indirectos, action.payload] }
    case 'UPD_COSTO_INDIRECTO': return { ...state, costos_indirectos: state.costos_indirectos.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c) }
    case 'DEL_COSTO_INDIRECTO': return { ...state, costos_indirectos: state.costos_indirectos.filter(c => c.id !== action.payload) }

    case 'ADD_MAT_PRES': return { ...state, materiales_presupuestados: [...state.materiales_presupuestados, action.payload] }
    case 'UPD_MAT_PRES': return { ...state, materiales_presupuestados: state.materiales_presupuestados.map(m => m.id === action.payload.id ? { ...m, ...action.payload } : m) }
    case 'DEL_MAT_PRES': return { ...state, materiales_presupuestados: state.materiales_presupuestados.filter(m => m.id !== action.payload) }

    case 'ADD_ORDEN_CAMBIO': return {
      ...state,
      ordenes_cambio:             [...(state.ordenes_cambio||[]),             action.payload.orden],
      ordenes_cambio_items:       [...(state.ordenes_cambio_items||[]),       ...action.payload.items],
      ordenes_cambio_indirectos:  [...(state.ordenes_cambio_indirectos||[]),  ...action.payload.indirectos],
    }
    case 'UPD_ORDEN_CAMBIO_ESTADO': return {
      ...state,
      ordenes_cambio: (state.ordenes_cambio||[]).map(o =>
        o.id === action.payload.id ? { ...o, estado: action.payload.estado } : o)
    }
    // Carga/refresca los items de una OC específica en el estado local
    case 'LOAD_OC_ITEMS': return {
      ...state,
      ordenes_cambio_items: [
        ...(state.ordenes_cambio_items||[]).filter(i => i.oc_id !== action.payload.oc_id),
        ...action.payload.items,
      ],
      ordenes_cambio_indirectos: [
        ...(state.ordenes_cambio_indirectos||[]).filter(i => i.oc_id !== action.payload.oc_id),
        ...action.payload.indirectos,
      ],
    }
    case 'DEL_ORDEN_CAMBIO': return {
      ...state,
      ordenes_cambio:            (state.ordenes_cambio||[]).filter(o => o.id !== action.payload),
      ordenes_cambio_items:      (state.ordenes_cambio_items||[]).filter(i => i.oc_id !== action.payload),
      ordenes_cambio_indirectos: (state.ordenes_cambio_indirectos||[]).filter(i => i.oc_id !== action.payload),
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

    // ── CAJA CHICA (v1.1) ──────────────────────────────────────────────
    case 'ADD_CAJA_CHICA': return { ...state, cajas_chicas: [...state.cajas_chicas, action.payload] }
    case 'APROBAR_CAJA_CHICA': return { ...state, cajas_chicas: state.cajas_chicas.map(c => c.id === action.payload.id ? { ...c, estado:'activa', saldo_actual: action.payload.saldo_actual } : c) }
    case 'RECHAZAR_CAJA_CHICA': return { ...state, cajas_chicas: state.cajas_chicas.map(c => c.id === action.payload ? { ...c, estado:'rechazada' } : c) }
    case 'UPD_CAJA_CHICA': return { ...state, cajas_chicas: state.cajas_chicas.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c) }
    case 'ADD_GASTO_CC': return {
      ...state,
      gastos_caja_chica: [...state.gastos_caja_chica, action.payload.gasto],
      cajas_chicas: state.cajas_chicas.map(c => c.id === action.payload.gasto.caja_id ? { ...c, saldo_actual: action.payload.nuevoSaldo } : c),
    }
    case 'DEL_GASTO_CC': return {
      ...state,
      gastos_caja_chica: state.gastos_caja_chica.filter(g => g.id !== action.payload.gastoId),
      cajas_chicas: state.cajas_chicas.map(c => c.id === action.payload.cajaId ? { ...c, saldo_actual: action.payload.nuevoSaldo } : c),
    }
    case 'ADD_LIQUIDACION_CC': return {
      ...state,
      liquidaciones_caja_chica: [...state.liquidaciones_caja_chica, action.payload.liquidacion],
      gastos_caja_chica: state.gastos_caja_chica.map(g => action.payload.gastoIds.includes(g.id) ? { ...g, liquidacion_id: action.payload.liquidacion.id } : g),
      reembolsos_personal: action.payload.reembolso ? [...state.reembolsos_personal, action.payload.reembolso] : state.reembolsos_personal,
    }
    case 'RECHAZAR_LIQUIDACION_CC': return {
      ...state,
      liquidaciones_caja_chica: state.liquidaciones_caja_chica.map(l => l.id === action.payload.liquidacionId ? { ...l, estado: 'rechazada' } : l),
      gastos_caja_chica: state.gastos_caja_chica.map(g => g.liquidacion_id === action.payload.liquidacionId ? { ...g, liquidacion_id: null } : g),
      reembolsos_personal: state.reembolsos_personal.filter(r => r.liquidacion_id !== action.payload.liquidacionId),
    }
    case 'APROBAR_LIQUIDACION_CC': return {
      ...state,
      liquidaciones_caja_chica: state.liquidaciones_caja_chica.map(l => l.id === action.payload.liquidacion.id ? action.payload.liquidacion : l),
      cajas_chicas: state.cajas_chicas.map(c => c.id === action.payload.liquidacion.caja_id ? { ...c, saldo_actual: action.payload.nuevoSaldo } : c),
      costos_directos:   [...state.costos_directos,   ...action.payload.nuevosCostosDirectos],
      costos_indirectos: [...state.costos_indirectos, ...action.payload.nuevosCostosIndirectos],
      equipos:           [...state.equipos,           ...action.payload.nuevosEquipos],
    }
    case 'PAGAR_REEMBOLSO_CC': return {
      ...state,
      reembolsos_personal: state.reembolsos_personal.map(r => r.id === action.payload.id ? { ...r, estado:'pagado', fecha_pago: action.payload.fecha_pago } : r),
    }
    case 'CERRAR_CAJA_CHICA': {
      const p = action.payload
      let next = {
        ...state,
        cajas_chicas: state.cajas_chicas.map(c => c.id === p.cajaId ? { ...c, estado: 'cerrada', saldo_actual: p.saldoFinal } : c),
      }
      if (p.liquidacionAuto) {
        next = {
          ...next,
          liquidaciones_caja_chica: [...next.liquidaciones_caja_chica, p.liquidacionAuto],
          gastos_caja_chica: next.gastos_caja_chica.map(g => p.gastoIds.includes(g.id) ? { ...g, liquidacion_id: p.liquidacionAuto.id } : g),
          reembolsos_personal: p.reembolsoAuto ? [...next.reembolsos_personal, p.reembolsoAuto] : next.reembolsos_personal,
          costos_directos:   [...next.costos_directos,   ...p.nuevosCostosDirectos],
          costos_indirectos: [...next.costos_indirectos, ...p.nuevosCostosIndirectos],
          equipos:           [...next.equipos,           ...p.nuevosEquipos],
        }
      }
      return next
    }
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

export function StoreProvider({ children, tenantId, rol }) {
  const [state, dispatch] = useReducer(reducer, INIT)

  // ── Avisos de error visibles al usuario (antes solo iban a console.error) ──
  const [avisos, setAvisos] = useState([])
  function avisar(mensaje) {
    const id = uuid()
    setAvisos(prev => [...prev, { id, mensaje }])
    setTimeout(() => setAvisos(prev => prev.filter(a => a.id !== id)), 8000)
  }

  useEffect(() => {
    if (!tenantId) return
    async function loadAll() {
      const tablasTenant = [
        'proyectos','fases','presupuesto','materiales','entradas','salidas',
        'solicitudes','solicitud_items','ordenes_compra','ordenes_compra_items',
        'costos_directos','nominas','subcontratos','equipos','equipos_ajustes','costos_indirectos',
        'materiales_presupuestados','solicitudes_eliminacion',
        'subcontratos_contratos','subcontratos_items',
        'subcontratos_avaluos','subcontratos_avaluo_items',
        'subcontratos_retenciones',
        'ordenes_pago_retencion',
        'ordenes_cambio','ordenes_cambio_items','ordenes_cambio_indirectos',
        'avaluos_cliente','avaluos_cliente_items',
        'presupuesto_indirectos',
        'cajas_chicas','gastos_caja_chica','liquidaciones_caja_chica','reembolsos_personal',
        'usuarios',
      ]
      const tenantResults = await Promise.all(
        tablasTenant.map(t => supabase.from(t).select('*').eq('tenant_id', tenantId))
      )
      const payload = {}
      const tablasFallidas = []
      tablasTenant.forEach((t, i) => {
        const { data, error } = tenantResults[i]
        if (error) { console.error(`loadAll — ${t}:`, error); tablasFallidas.push(t) }
        payload[t] = data || []
      })
      dispatch({ type: 'LOAD_ALL', payload })
      // Antes, un error de carga en cualquier tabla se tragaba silenciosamente
      // (payload quedaba en []), mostrando el módulo como "vacío" sin explicación.
      if (tablasFallidas.length) {
        avisar(`No se pudieron cargar algunos datos, recarga la página / Some data failed to load, please reload: ${tablasFallidas.join(', ')}`)
      }

      // Cargar notificaciones del usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: notifs, error: eNotifs } = await supabase
          .from('notificaciones')
          .select('*')
          .eq('usuario_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)
        if (eNotifs) console.error('loadAll — notificaciones:', eNotifs)
        dispatch({ type: 'LOAD_NOTIFS', payload: notifs || [] })
      }
    }
    loadAll()
  }, [tenantId])

// ── REALTIME LISTENERS ──────────────────────────────────────────────
useEffect(() => {
  if (!tenantId) return

  // Tablas donde el filtro tenant_id funciona para todos los eventos (INSERT/UPDATE/DELETE)
  const REALTIME_TABLES = [
    'proyectos', 'fases', 'presupuesto', 'presupuesto_indirectos',
    'materiales', 'entradas', 'salidas',
    'solicitudes', 'solicitud_items',
    'ordenes_compra', 'ordenes_compra_items',
    'costos_directos', 'nominas', 'subcontratos', 'equipos', 'equipos_ajustes', 'costos_indirectos',
    'solicitudes_eliminacion',
    'subcontratos_contratos', 'subcontratos_items',
    'subcontratos_avaluos', 'subcontratos_avaluo_items',
    'subcontratos_retenciones',
    'ordenes_pago_retencion',
    'ordenes_cambio', 'ordenes_cambio_items', 'ordenes_cambio_indirectos',
    'avaluos_cliente', 'avaluos_cliente_items',
    'materiales_presupuestados',
    'cajas_chicas', 'gastos_caja_chica', 'liquidaciones_caja_chica', 'reembolsos_personal',
    'usuarios',
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
        const { data, error } = await supabase.from(table).select('*').eq('tenant_id', tenantId)
        // Antes: en error, `data` es undefined y se despachaba `data: []`,
        // vaciando de la vista datos que sí existen en la base. Ahora, si falla
        // el refetch, se deja el estado local intacto y solo se avisa.
        if (error) { console.error(`realtime refetch — ${table}:`, error); avisar(`No se pudo actualizar ${table} en tiempo real / Realtime update failed for ${table}`); return }
        dispatch({ type: 'LOAD_TABLE', payload: { key: table, data } })
      })
      .subscribe()
  )

  // ── Listener especial para entradas y salidas ────────────────────
  // El filtro tenant_id NO funciona para DELETE en Supabase Realtime
  // (la fila ya no existe cuando el evento llega). Se escuchan DOS canales:
  // uno filtrado para INSERT/UPDATE, y uno sin filtro para DELETE
  // que recarga la tabla completa del tenant.
  const TABLES_WITH_DELETE = ['entradas', 'salidas', 'materiales_presupuestados', 'solicitudes', 'solicitud_items', 'equipos', 'gastos_caja_chica']
  const deleteChannels = TABLES_WITH_DELETE.flatMap(table => [
    // Canal filtrado para INSERT y UPDATE
    supabase
      .channel(`rt_${table}_iupd_${tenantId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table,
        filter: `tenant_id=eq.${tenantId}`,
      }, async () => {
        const { data, error } = await supabase.from(table).select('*').eq('tenant_id', tenantId)
        // Antes: en error, `data` es undefined y se despachaba `data: []`,
        // vaciando de la vista datos que sí existen en la base. Ahora, si falla
        // el refetch, se deja el estado local intacto y solo se avisa.
        if (error) { console.error(`realtime refetch — ${table}:`, error); avisar(`No se pudo actualizar ${table} en tiempo real / Realtime update failed for ${table}`); return }
        dispatch({ type: 'LOAD_TABLE', payload: { key: table, data } })
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table,
        filter: `tenant_id=eq.${tenantId}`,
      }, async () => {
        const { data, error } = await supabase.from(table).select('*').eq('tenant_id', tenantId)
        // Antes: en error, `data` es undefined y se despachaba `data: []`,
        // vaciando de la vista datos que sí existen en la base. Ahora, si falla
        // el refetch, se deja el estado local intacto y solo se avisa.
        if (error) { console.error(`realtime refetch — ${table}:`, error); avisar(`No se pudo actualizar ${table} en tiempo real / Realtime update failed for ${table}`); return }
        dispatch({ type: 'LOAD_TABLE', payload: { key: table, data } })
      })
      .subscribe(),
    // Canal sin filtro para DELETE — recarga la tabla del tenant
    supabase
      .channel(`rt_${table}_del_${tenantId}`)
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table,
      }, async () => {
        const { data, error } = await supabase.from(table).select('*').eq('tenant_id', tenantId)
        // Antes: en error, `data` es undefined y se despachaba `data: []`,
        // vaciando de la vista datos que sí existen en la base. Ahora, si falla
        // el refetch, se deja el estado local intacto y solo se avisa.
        if (error) { console.error(`realtime refetch — ${table}:`, error); avisar(`No se pudo actualizar ${table} en tiempo real / Realtime update failed for ${table}`); return }
        dispatch({ type: 'LOAD_TABLE', payload: { key: table, data } })
      })
      .subscribe(),
  ])

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
    deleteChannels.forEach(ch => supabase.removeChannel(ch))
    if (notifChannel) supabase.removeChannel(notifChannel)
  }
}, [tenantId])
  async function dbDispatch(action) {

    // ── Helper: enviar notificación a usuarios del tenant ──────────────
    async function notify({ tipo, titulo, mensaje, modulo, referencia_id, roles }) {
      try {
        // Obtener usuarios del tenant que tengan los roles indicados
        let usuariosTenant = []
        const rolesNormales = (roles || []).filter(r => r !== 'super_admin')
        if (rolesNormales.length) {
          let query = supabase.from('usuarios').select('id').eq('tenant_id', tenantId).eq('activo', true).in('rol', rolesNormales)
          const { data } = await query
          usuariosTenant = data || []
        }

        // Si roles incluye super_admin, buscarlo en toda la tabla (sin filtro tenant)
        let superAdmins = []
        if (roles?.includes('super_admin')) {
          const { data: sas } = await supabase.from('usuarios').select('id').eq('rol', 'super_admin').eq('activo', true)
          superAdmins = sas || []
        }

        // Combinar targets sin duplicados
        const allIds = new Set([...(usuariosTenant||[]).map(u=>u.id), ...superAdmins.map(u=>u.id)])
        if (!allIds.size) return

        const { data: { user: currentUser } } = await supabase.auth.getUser()
        // No notificar al propio usuario que hace la acción
        const targets = [...allIds].filter(id => id !== currentUser?.id)
        if (!targets.length) return
        const notifs = targets.map(uid => ({
          tenant_id: tenantId,
          usuario_id: uid,
          tipo, titulo, mensaje, modulo,
          referencia_id: referencia_id || null,
          leida: false,
        }))
        await sbThrow(supabase.from('notificaciones').insert(notifs))
      } catch (e) { console.error('notify error:', e) }
    }

    // ── Helper: notificar a un usuario específico por ID ──────────────
    async function notifyUser({ usuario_id, tipo, titulo, mensaje, modulo, referencia_id }) {
      if (!usuario_id) return
      try {
        await sbThrow(supabase.from('notificaciones').insert({
          tenant_id: tenantId,
          usuario_id,
          tipo, titulo, mensaje, modulo,
          referencia_id: referencia_id || null,
          leida: false,
        }))
      } catch (e) { console.error('notifyUser error:', e) }
    }

    // ── Auditoría (v1.2): registra toda acción de escritura del usuario ──
    const AUDIT_SKIP = new Set([
      'LOAD_ALL','LOAD_NOTIFS','LOAD_OC_ITEMS','LOAD_TABLE','FETCH_OC_ITEMS',
      'REFRESH_PRESUPUESTO','REFRESH_PRES_IND','REFRESH_SOLICITUDES','RESET',
      'MARK_NOTIF_READ','MARK_ALL_NOTIF_READ','ADD_NOTIF',
      'DEL_ENTRADA_LOCAL','DEL_SALIDA_LOCAL',
    ])
    if (!AUDIT_SKIP.has(action.type)) {
      try {
        const { data: { user: auditUser } } = await supabase.auth.getUser()
        const usuarioActual = (state.usuarios||[]).find(u => u.id === auditUser?.id)
        const p = action.payload
        const proyectoId = (p && typeof p === 'object')
          ? (p.proyecto_id || p.proyecto?.id || p.contrato?.proyecto_id || p.liquidacion?.proyecto_id || null)
          : null
        await sbThrow(supabase.from('auditoria_log').insert({
          tenant_id: tenantId,
          usuario_id: auditUser?.id || null,
          usuario_nombre: usuarioActual?.nombre || usuarioActual?.email || null,
          usuario_rol: usuarioActual?.rol || rol || null,
          accion: action.type,
          proyecto_id: proyectoId,
          payload: p ?? null,
        }))
      } catch (e) { console.error('auditoria_log error:', e) }
    }

    // ── Helper: ejecuta una promesa de Supabase y lanza si vino con error ──
    // Antes, la mayoría de los insert/update/delete no revisaban `error`, así que
    // una escritura fallida (RLS, red, constraint) se trataba como éxito y el
    // estado local se actualizaba igual — el usuario veía "guardado" sin que
    // nada se hubiera persistido. sbThrow() aborta el case (sin llegar al
    // dispatch local) y el catch de más abajo avisa al usuario.
    async function sbThrow(promise) {
      const { error } = await promise
      if (error) throw error
      return true
    }

    try {
    switch (action.type) {

      case 'ADD_PRES_IND': {
        const item = { ...action.payload, id: uuid(), created_at: today(), tenant_id: tenantId }
        await sbThrow(supabase.from('presupuesto_indirectos').insert(item))
        dispatch({ type: 'ADD_PRES_IND', payload: item })
        break
      }
      case 'UPD_PRES_IND': {
        const { id, ...fields } = action.payload
        await sbThrow(supabase.from('presupuesto_indirectos').update(fields).eq('id', id))
        dispatch({ type: 'UPD_PRES_IND', payload: action.payload })
        break
      }
      case 'DEL_PRES_IND': {
        const item = state.presupuesto_indirectos.find(p => p.id === action.payload)
        if (item && (item.categoria === 'Caja Chica' || item.categoria === 'Petty Cash')) {
          const cajaActiva = state.cajas_chicas.find(c => c.proyecto_id === item.proyecto_id && c.estado === 'activa')
          if (cajaActiva) { console.warn('[MARY] DEL_PRES_IND bloqueado — caja chica activa en el proyecto'); break }
        }
        await sbThrow(supabase.from('presupuesto_indirectos').delete().eq('id', action.payload))
        dispatch({ type: 'DEL_PRES_IND', payload: action.payload })
        break
      }
      case 'REFRESH_PRES_IND': {
        const { data } = await supabase.from('presupuesto_indirectos').select('*').eq('proyecto_id', action.payload).eq('tenant_id', tenantId)
        dispatch({ type: 'REFRESH_PRES_IND', payload: data || [] })
        break
      }

      // ── CAJA CHICA (v1.1) ────────────────────────────────────────────
      case 'ADD_CAJA_CHICA': {
        // Solo client_admin/super_admin pueden abrir el fondo directamente (queda 'activa').
        // El gerente puede solicitarlo, pero queda 'pendiente_aprobacion' hasta que el admin lo apruebe.
        const directo = ['client_admin','super_admin'].includes(rol)
        const monto = parseFloat(action.payload.monto_asignado)||0
        const item = {
          ...action.payload, id: uuid(), created_at: today(), tenant_id: tenantId,
          estado: directo ? 'activa' : 'pendiente_aprobacion',
          saldo_actual: directo ? monto : 0,
        }
        const { error } = await supabase.from('cajas_chicas').insert(item)
        if (error) { console.error('ADD_CAJA_CHICA:', JSON.stringify(error)); break }
        dispatch({ type: 'ADD_CAJA_CHICA', payload: item })
        break
      }
      case 'APROBAR_CAJA_CHICA': {
        const caja = state.cajas_chicas.find(c => c.id === action.payload)
        if (!caja) break
        const saldo_actual = parseFloat(caja.monto_asignado)||0
        await sbThrow(supabase.from('cajas_chicas').update({ estado:'activa', saldo_actual }).eq('id', caja.id))
        dispatch({ type:'APROBAR_CAJA_CHICA', payload: { id: caja.id, saldo_actual } })
        break
      }
      case 'RECHAZAR_CAJA_CHICA': {
        await sbThrow(supabase.from('cajas_chicas').update({ estado:'rechazada' }).eq('id', action.payload))
        dispatch({ type:'RECHAZAR_CAJA_CHICA', payload: action.payload })
        break
      }
      case 'ADD_GASTO_CC': {
        const caja = state.cajas_chicas.find(c => c.id === action.payload.caja_id)
        if (!caja) break
        const monto = parseFloat(action.payload.monto)||0
        const pagoPropio = !!action.payload.pago_propio
        // Si el gasto fue pagado de fondos de la caja, descuenta el saldo (puede quedar negativo = sobregiro).
        // Si fue pagado del bolsillo del responsable, no afecta el saldo de la caja.
        const nuevoSaldo = pagoPropio ? parseFloat(caja.saldo_actual||0) : r2(parseFloat(caja.saldo_actual||0) - monto)
        const gasto = { ...action.payload, pago_propio: pagoPropio, id: uuid(), created_at: today(), tenant_id: tenantId, liquidacion_id: null }
        const { error: eG } = await supabase.from('gastos_caja_chica').insert(gasto)
        if (eG) { console.error('ADD_GASTO_CC — gasto:', JSON.stringify(eG)); break }
        if (!pagoPropio) {
          const { error: eC } = await supabase.from('cajas_chicas').update({ saldo_actual: nuevoSaldo }).eq('id', caja.id)
          if (eC) console.error('ADD_GASTO_CC — caja:', JSON.stringify(eC))
        }
        dispatch({ type: 'ADD_GASTO_CC', payload: { gasto, nuevoSaldo } })
        break
      }
      case 'DEL_GASTO_CC': {
        const gasto = state.gastos_caja_chica.find(g => g.id === action.payload)
        if (!gasto) break
        const caja = state.cajas_chicas.find(c => c.id === gasto.caja_id)
        const nuevoSaldo = gasto.pago_propio ? parseFloat(caja?.saldo_actual||0) : r2(parseFloat(caja?.saldo_actual||0) + parseFloat(gasto.monto||0))
        await sbThrow(supabase.from('gastos_caja_chica').delete().eq('id', gasto.id))
        if (caja && !gasto.pago_propio) await sbThrow(supabase.from('cajas_chicas').update({ saldo_actual: nuevoSaldo }).eq('id', caja.id))
        dispatch({ type: 'DEL_GASTO_CC', payload: { gastoId: gasto.id, cajaId: caja?.id, nuevoSaldo } })
        break
      }
      case 'ADD_LIQUIDACION_CC': {
        const { caja_id, proyecto_id, gastoIds, usuarioId } = action.payload
        const caja = state.cajas_chicas.find(c => c.id === caja_id)
        if (!caja) break
        const gastos = state.gastos_caja_chica.filter(g => gastoIds.includes(g.id))
        const totalGastos = r2(gastos.reduce((s,g) => s + (parseFloat(g.monto)||0), 0))
        // Reposición: gastos pagados con fondos de la caja (la empresa repone el total, incluso si excede el monto_asignado).
        // Reembolso personal: gastos que el responsable pagó de su bolsillo (se le debe aparte, no afecta la caja).
        const reposicion    = r2(gastos.filter(g => !g.pago_propio).reduce((s,g) => s + (parseFloat(g.monto)||0), 0))
        const reembolsoMonto = r2(gastos.filter(g => g.pago_propio).reduce((s,g) => s + (parseFloat(g.monto)||0), 0))

        const liquidacion = {
          id: uuid(), tenant_id: tenantId, caja_id, proyecto_id,
          fecha: today(), total_gastos: totalGastos, reposicion, reembolso_personal: reembolsoMonto,
          estado: 'pendiente', created_at: today(),
        }
        const { error: eL } = await supabase.from('liquidaciones_caja_chica').insert(liquidacion)
        if (eL) { console.error('ADD_LIQUIDACION_CC — liquidacion:', JSON.stringify(eL)); break }

        const { error: eG } = await supabase.from('gastos_caja_chica').update({ liquidacion_id: liquidacion.id }).in('id', gastoIds)
        if (eG) console.error('ADD_LIQUIDACION_CC — gastos:', JSON.stringify(eG))

        let reembolso = null
        if (reembolsoMonto > 0) {
          reembolso = { id: uuid(), tenant_id: tenantId, liquidacion_id: liquidacion.id, proyecto_id, usuario_id: usuarioId, monto: reembolsoMonto, estado: 'pendiente', created_at: today() }
          const { error: eR } = await supabase.from('reembolsos_personal').insert(reembolso)
          if (eR) console.error('ADD_LIQUIDACION_CC — reembolso:', JSON.stringify(eR))
        }
        dispatch({ type: 'ADD_LIQUIDACION_CC', payload: { liquidacion, gastoIds, reembolso } })
        break
      }
      case 'RECHAZAR_LIQUIDACION_CC': {
        const liquidacionId = action.payload
        await sbThrow(supabase.from('liquidaciones_caja_chica').update({ estado: 'rechazada' }).eq('id', liquidacionId))
        await sbThrow(supabase.from('gastos_caja_chica').update({ liquidacion_id: null }).eq('liquidacion_id', liquidacionId))
        await sbThrow(supabase.from('reembolsos_personal').delete().eq('liquidacion_id', liquidacionId))
        dispatch({ type: 'RECHAZAR_LIQUIDACION_CC', payload: { liquidacionId } })
        break
      }
      case 'APROBAR_LIQUIDACION_CC': {
        const { liquidacionId, usuarioId } = action.payload
        const liquidacion = state.liquidaciones_caja_chica.find(l => l.id === liquidacionId)
        if (!liquidacion) break
        const caja   = state.cajas_chicas.find(c => c.id === liquidacion.caja_id)
        const gastos = state.gastos_caja_chica.filter(g => g.liquidacion_id === liquidacionId)

        const { nuevosCostosDirectos, nuevosCostosIndirectos, nuevosEquipos } = buildCostosFromGastosCC(gastos, liquidacion.proyecto_id, tenantId)
        if (nuevosCostosDirectos.length)   { const { error } = await supabase.from('costos_directos').insert(nuevosCostosDirectos);   if (error) console.error('APROBAR_LIQUIDACION_CC — costos_directos:', JSON.stringify(error)) }
        if (nuevosCostosIndirectos.length) { const { error } = await supabase.from('costos_indirectos').insert(nuevosCostosIndirectos); if (error) console.error('APROBAR_LIQUIDACION_CC — costos_indirectos:', JSON.stringify(error)) }
        if (nuevosEquipos.length)          { const { error } = await supabase.from('equipos').insert(nuevosEquipos);          if (error) console.error('APROBAR_LIQUIDACION_CC — equipos:', JSON.stringify(error)) }

        // La reposición devuelve a la caja exactamente lo gastado con sus fondos (corrige el sobregiro si lo hubo).
        // El reembolso personal NO toca el saldo de la caja: es deuda de la empresa hacia el responsable, pagada aparte.
        const nuevoSaldo = r2(parseFloat(caja?.saldo_actual||0) + parseFloat(liquidacion.reposicion||0))
        const liquidacionAprobada = { ...liquidacion, estado: 'aprobada', aprobado_por: usuarioId || null, fecha_aprobacion: today() }
        await sbThrow(supabase.from('liquidaciones_caja_chica').update({ estado: 'aprobada', aprobado_por: liquidacionAprobada.aprobado_por, fecha_aprobacion: liquidacionAprobada.fecha_aprobacion }).eq('id', liquidacionId))
        if (caja) await sbThrow(supabase.from('cajas_chicas').update({ saldo_actual: nuevoSaldo }).eq('id', caja.id))

        dispatch({ type: 'APROBAR_LIQUIDACION_CC', payload: { liquidacion: liquidacionAprobada, nuevoSaldo, nuevosCostosDirectos, nuevosCostosIndirectos, nuevosEquipos } })
        break
      }
      case 'PAGAR_REEMBOLSO_CC': {
        const fecha_pago = today()
        await sbThrow(supabase.from('reembolsos_personal').update({ estado:'pagado', fecha_pago }).eq('id', action.payload))
        dispatch({ type: 'PAGAR_REEMBOLSO_CC', payload: { id: action.payload, fecha_pago } })
        break
      }
      case 'CERRAR_CAJA_CHICA': {
        // Solo client_admin/super_admin. Si hay gastos pendientes de liquidar, se liquidan
        // y aprueban automáticamente antes de cerrar la caja.
        if (!['client_admin','super_admin'].includes(rol)) break
        const caja = state.cajas_chicas.find(c => c.id === action.payload.cajaId)
        if (!caja) break
        const pendientes = state.gastos_caja_chica.filter(g => g.caja_id === caja.id && !g.liquidacion_id)

        let saldoFinal = parseFloat(caja.saldo_actual||0)
        let liquidacionAuto = null, reembolsoAuto = null, gastoIds = []
        let nuevosCostosDirectos = [], nuevosCostosIndirectos = [], nuevosEquipos = []

        if (pendientes.length > 0) {
          gastoIds = pendientes.map(g => g.id)
          const totalGastos    = r2(pendientes.reduce((s,g) => s + (parseFloat(g.monto)||0), 0))
          const reposicion     = r2(pendientes.filter(g => !g.pago_propio).reduce((s,g) => s + (parseFloat(g.monto)||0), 0))
          const reembolsoMonto = r2(pendientes.filter(g =>  g.pago_propio).reduce((s,g) => s + (parseFloat(g.monto)||0), 0))

          liquidacionAuto = {
            id: uuid(), tenant_id: tenantId, caja_id: caja.id, proyecto_id: caja.proyecto_id,
            fecha: today(), total_gastos: totalGastos, reposicion, reembolso_personal: reembolsoMonto,
            estado: 'aprobada', aprobado_por: action.payload.usuarioId || null, fecha_aprobacion: today(), created_at: today(),
          }
          const { error: eL } = await supabase.from('liquidaciones_caja_chica').insert(liquidacionAuto)
          if (eL) { console.error('CERRAR_CAJA_CHICA — liquidacion:', JSON.stringify(eL)); break }

          const { error: eG } = await supabase.from('gastos_caja_chica').update({ liquidacion_id: liquidacionAuto.id }).in('id', gastoIds)
          if (eG) console.error('CERRAR_CAJA_CHICA — gastos:', JSON.stringify(eG))

          if (reembolsoMonto > 0) {
            reembolsoAuto = { id: uuid(), tenant_id: tenantId, liquidacion_id: liquidacionAuto.id, proyecto_id: caja.proyecto_id, usuario_id: action.payload.usuarioId || caja.responsable_id, monto: reembolsoMonto, estado: 'pendiente', created_at: today() }
            const { error: eR } = await supabase.from('reembolsos_personal').insert(reembolsoAuto)
            if (eR) console.error('CERRAR_CAJA_CHICA — reembolso:', JSON.stringify(eR))
          }

          const built = buildCostosFromGastosCC(pendientes, caja.proyecto_id, tenantId)
          nuevosCostosDirectos   = built.nuevosCostosDirectos
          nuevosCostosIndirectos = built.nuevosCostosIndirectos
          nuevosEquipos          = built.nuevosEquipos
          if (nuevosCostosDirectos.length)   { const { error } = await supabase.from('costos_directos').insert(nuevosCostosDirectos);     if (error) console.error('CERRAR_CAJA_CHICA — costos_directos:', JSON.stringify(error)) }
          if (nuevosCostosIndirectos.length) { const { error } = await supabase.from('costos_indirectos').insert(nuevosCostosIndirectos); if (error) console.error('CERRAR_CAJA_CHICA — costos_indirectos:', JSON.stringify(error)) }
          if (nuevosEquipos.length)          { const { error } = await supabase.from('equipos').insert(nuevosEquipos);                    if (error) console.error('CERRAR_CAJA_CHICA — equipos:', JSON.stringify(error)) }

          saldoFinal = r2(saldoFinal + reposicion)
        }

        const { error: eC } = await supabase.from('cajas_chicas').update({ estado: 'cerrada', saldo_actual: saldoFinal }).eq('id', caja.id)
        if (eC) { console.error('CERRAR_CAJA_CHICA — caja:', JSON.stringify(eC)); break }

        dispatch({ type: 'CERRAR_CAJA_CHICA', payload: {
          cajaId: caja.id, saldoFinal, liquidacionAuto, reembolsoAuto, gastoIds,
          nuevosCostosDirectos, nuevosCostosIndirectos, nuevosEquipos,
        }})
        break
      }

      case 'ADD_PROYECTO': {
        const code = genProjectCode(state.proyectos)
        const item = {
          ...action.payload, id: uuid(), project_code: code, created_at: today(), tenant_id: tenantId,
          utilidad_pct: parseFloat(action.payload.utilidad_pct) || 0,
          impuesto_pct: parseFloat(action.payload.impuesto_pct) || 0,
          fecha_fin_estimada: action.payload.fecha_fin_estimada || null,
        }
        const { error } = await supabase.from('proyectos').insert(item)
        if (error) { console.error('ADD_PROYECTO:', JSON.stringify(error)); break }
        dispatch({ type: 'ADD_PROYECTO', payload: item })
        break
      }
      case 'UPD_PROYECTO': {
        const fields = {
          ...action.payload,
          utilidad_pct: parseFloat(action.payload.utilidad_pct) || 0,
          impuesto_pct: parseFloat(action.payload.impuesto_pct) || 0,
          fecha_fin_estimada: action.payload.fecha_fin_estimada || null,
        }
        const { error } = await supabase.from('proyectos').update(fields).eq('id', fields.id)
        if (error) { console.error('UPD_PROYECTO:', JSON.stringify(error)); break }
        dispatch({ type: 'UPD_PROYECTO', payload: fields })
        break
      }
      case 'DEL_PROYECTO': {
        const pid = action.payload
        await sbThrow(supabase.from('presupuesto').delete().eq('proyecto_id', pid))
        await sbThrow(supabase.from('presupuesto_indirectos').delete().eq('proyecto_id', pid))
        await sbThrow(supabase.from('fases').delete().eq('proyecto_id', pid))
        await sbThrow(supabase.from('materiales_presupuestados').delete().eq('proyecto_id', pid))
        await sbThrow(supabase.from('salidas').delete().eq('proyecto_id', pid))
        await sbThrow(supabase.from('entradas').delete().eq('proyecto_id', pid))
        await sbThrow(supabase.from('costos_directos').delete().eq('proyecto_id', pid))
        await sbThrow(supabase.from('nominas').delete().eq('proyecto_id', pid))
        await sbThrow(supabase.from('subcontratos').delete().eq('proyecto_id', pid))
        await sbThrow(supabase.from('equipos').delete().eq('proyecto_id', pid))
        await sbThrow(supabase.from('costos_indirectos').delete().eq('proyecto_id', pid))
        await sbThrow(supabase.from('usuario_proyecto').delete().eq('proyecto_id', pid))
        const { data: sols } = await supabase.from('solicitudes').select('id').eq('proyecto_id', pid)
        if (sols?.length) {
          await sbThrow(supabase.from('solicitud_items').delete().in('solicitud_id', sols.map(s => s.id)))
          await sbThrow(supabase.from('solicitudes').delete().eq('proyecto_id', pid))
        }
        const { data: ocs } = await supabase.from('ordenes_compra').select('id').eq('proyecto_id', pid)
        if (ocs?.length) {
          await sbThrow(supabase.from('ordenes_compra_items').delete().in('oc_id', ocs.map(o => o.id)))
          await sbThrow(supabase.from('ordenes_compra').delete().eq('proyecto_id', pid))
        }
        const { data: ocsC } = await supabase.from('ordenes_cambio').select('id').eq('proyecto_id', pid)
        if (ocsC?.length) {
          await sbThrow(supabase.from('ordenes_cambio_items').delete().in('oc_id', ocsC.map(o => o.id)))
          await sbThrow(supabase.from('ordenes_cambio').delete().eq('proyecto_id', pid))
        }
        // ── Retenciones y órdenes de pago de retención (FK NO ACTION — deben
        // borrarse ANTES de subcontratos_avaluos / subcontratos_contratos / proyectos) ──
        await sbThrow(supabase.from('subcontratos_retenciones').delete().eq('proyecto_id', pid))
        await sbThrow(supabase.from('ordenes_pago_retencion').delete().eq('proyecto_id', pid))
        const { data: scs } = await supabase.from('subcontratos_contratos').select('id').eq('proyecto_id', pid)
        if (scs?.length) {
          const scIds = scs.map(s => s.id)
          const { data: avs } = await supabase.from('subcontratos_avaluos').select('id').in('subcontrato_id', scIds)
          if (avs?.length) {
            const avIds = avs.map(a => a.id)
            await sbThrow(supabase.from('subcontratos_retenciones').delete().in('avaluo_id', avIds))
            await sbThrow(supabase.from('subcontratos_avaluo_items').delete().in('avaluo_id', avIds))
          }
          await sbThrow(supabase.from('subcontratos_retenciones').delete().in('subcontrato_id', scIds))
          await sbThrow(supabase.from('subcontratos_avaluos').delete().in('subcontrato_id', scIds))
          await sbThrow(supabase.from('subcontratos_items').delete().in('subcontrato_id', scIds))
          await sbThrow(supabase.from('subcontratos_contratos').delete().eq('proyecto_id', pid))
        }
        const { data: avsCli } = await supabase.from('avaluos_cliente').select('id').eq('proyecto_id', pid)
        if (avsCli?.length) {
          await sbThrow(supabase.from('avaluos_cliente_items').delete().in('avaluo_id', avsCli.map(a => a.id)))
          await sbThrow(supabase.from('avaluos_cliente').delete().eq('proyecto_id', pid))
        }
        // ── Caja Chica (v1.1) — reembolsos_personal.proyecto_id es NO ACTION,
        // se borra explícito; gastos_caja_chica / liquidaciones_caja_chica /
        // reembolsos_personal (via liquidacion_id) caen en cascada al borrar cajas_chicas ──
        await sbThrow(supabase.from('reembolsos_personal').delete().eq('proyecto_id', pid))
        await sbThrow(supabase.from('cajas_chicas').delete().eq('proyecto_id', pid))
        // ── Log de auditoría (v1.2) — proyecto_id es NO ACTION ──
        await sbThrow(supabase.from('auditoria_log').delete().eq('proyecto_id', pid))
        const { error: eP } = await supabase.from('proyectos').delete().eq('id', pid)
        if (eP) {
          console.error('DEL_PROYECTO — proyectos:', JSON.stringify(eP))
          alert(`No se pudo eliminar el proyecto / Could not delete project: ${eP.message}`)
          break
        }
        dispatch(action)
        break
      }

      case 'ADD_FASE': {
        const item = { ...action.payload, id: uuid(), created_at: today(), tenant_id: tenantId }
        await sbThrow(supabase.from('fases').insert(item))
        dispatch({ type: 'ADD_FASE', payload: item })
        break
      }
      case 'UPD_FASE': {
        await sbThrow(supabase.from('fases').update(action.payload).eq('id', action.payload.id))
        dispatch(action)
        break
      }
      case 'DEL_FASE': {
        await sbThrow(supabase.from('fases').delete().eq('id', action.payload))
        dispatch(action)
        break
      }

      case 'ADD_BUDGET': {
        const { proyectoId, ...rest } = action.payload
        // Si el payload ya trae code pre-calculado (ej: import masivo), respetarlo.
        // Esto evita la race condition del import donde genBudgetCode ve 0 hermanos
        // porque el state local todavia no se actualizo entre dispatches secuenciales.
        const byProject = state.presupuesto.filter(b => b.proyecto_id === proyectoId)
        const code = rest.code || genBudgetCode(byProject, rest.tipo, rest.parent_id)
        const item = { ...rest, id: rest.id || uuid(), proyecto_id: proyectoId, code, created_at: today(), tenant_id: tenantId }
        await sbThrow(supabase.from('presupuesto').insert(item))
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
          await sbThrow(supabase.from('presupuesto').delete().in('id', huerfanos))
          await sbThrow(supabase.from('materiales_presupuestados').delete().in('actividad_id', huerfanos))
        }

        const itemsLimpios = allItems.filter(i => !huerfanos.includes(i.id))
        dispatch({ type: 'REFRESH_PRESUPUESTO', payload: { proyectoId: action.payload.proyectoId, items: itemsLimpios } })
        break
      }
      case 'UPD_BUDGET': {
        await sbThrow(supabase.from('presupuesto').update(action.payload).eq('id', action.payload.id))
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
        await sbThrow(supabase.from('presupuesto').delete().in('id', idsToDelete))
        // Limpiar materiales presupuestados vinculados a las actividades eliminadas
        await sbThrow(supabase.from('materiales_presupuestados').delete().in('actividad_id', idsToDelete))

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
        await sbThrow(supabase.from('materiales').update({ stock_actual: cleanMat.stock_actual }).eq('id', cleanMat.id))
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
        await sbThrow(supabase.from('materiales').update(action.payload).eq('id', action.payload.id))
        dispatch(action)
        break
      }
      case 'TOGGLE_MATERIAL': {
        const m = state.materiales.find(m => m.id === action.payload)
        if (m) await sbThrow(supabase.from('materiales').update({ activo: !m.activo }).eq('id', m.id))
        dispatch(action)
        break
      }
      case 'DEL_MATERIAL': {
        await sbThrow(supabase.from('materiales').delete().eq('id', action.payload))
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
          await sbThrow(supabase.from('materiales').update({ stock_actual: nuevoStock }).eq('id', mat.id))
          dispatch({ type: 'UPD_MATERIAL', payload: { ...mat, stock_actual: nuevoStock } })
        }
        dispatch({ type: 'ADD_ENTRADA', payload: item })
        break
      }
      case 'UPD_ENTRADA': {
        const { id, ...fields } = action.payload
        const entradaAnterior = state.entradas.find(e => e.id === id)
        const diferencia = parseFloat(fields.cantidad || 0) - parseFloat(entradaAnterior?.cantidad || 0)
        await sbThrow(supabase.from('entradas').update(fields).eq('id', id))
        if (diferencia !== 0) {
          const mat = state.materiales.find(m => m.id === (fields.material_id || entradaAnterior?.material_id))
          if (mat) {
            const nuevoStock = Math.max(0, (parseFloat(mat.stock_actual)||0) + diferencia)
            await sbThrow(supabase.from('materiales').update({ stock_actual: nuevoStock }).eq('id', mat.id))
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
            await sbThrow(supabase.from('salidas').delete().eq('id', sal.id))
            dispatch({ type: 'DEL_SALIDA_LOCAL', payload: sal.id })
          }
        }
        await sbThrow(supabase.from('entradas').delete().eq('id', action.payload.id))
        const mat = state.materiales.find(m => m.id === action.payload.materialId)
        const nuevoStock = Math.max(0, parseFloat(mat?.stock_actual||0) - parseFloat(action.payload.cantidad||0))
        if (mat) {
          await sbThrow(supabase.from('materiales').update({ stock_actual: nuevoStock }).eq('id', mat.id))
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
          await sbThrow(supabase.from('materiales').update({ stock_actual: nuevoStock }).eq('id', mat.id))
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
            await sbThrow(supabase.from('materiales_presupuestados').insert(mpNuevo))
            dispatch({ type: 'ADD_MAT_PRES', payload: mpNuevo })
          }
        }
        break
      }
      case 'UPD_SALIDA': {
        const { id, ...fields } = action.payload
        const salidaAnterior = state.salidas.find(s => s.id === id)
        const diferencia = parseFloat(fields.cantidad || 0) - parseFloat(salidaAnterior?.cantidad || 0)
        await sbThrow(supabase.from('salidas').update(fields).eq('id', id))
        if (diferencia !== 0) {
          const mat = state.materiales.find(m => m.id === (fields.material_id || salidaAnterior?.material_id))
          if (mat) {
            const nuevoStock = Math.max(0, (parseFloat(mat.stock_actual)||0) - diferencia)
            await sbThrow(supabase.from('materiales').update({ stock_actual: nuevoStock }).eq('id', mat.id))
            dispatch({ type: 'UPD_MATERIAL', payload: { ...mat, stock_actual: nuevoStock } })
          }
        }
        dispatch(action)
        break
      }
      case 'DEL_SALIDA': {
        await sbThrow(supabase.from('salidas').delete().eq('id', action.payload.id))
        const mat = state.materiales.find(m => m.id === action.payload.materialId)
        const nuevoStock = parseFloat(mat?.stock_actual||0) + parseFloat(action.payload.cantidad||0)
        if (mat) {
          await sbThrow(supabase.from('materiales').update({ stock_actual: nuevoStock }).eq('id', mat.id))
          dispatch({ type: 'UPD_MATERIAL', payload: { ...mat, stock_actual: nuevoStock } })
        }
        dispatch({ type: 'DEL_SALIDA_LOCAL', payload: action.payload.id })
        break
      }

      case 'ADD_SOL_ELIM': {
        const item = { ...action.payload, id: uuid(), estado: 'pendiente', created_at: today(), tenant_id: tenantId }
        await sbThrow(supabase.from('solicitudes_eliminacion').insert(item))
        dispatch({ type: 'ADD_SOL_ELIM', payload: item })
        const solicitante = action.payload.solicitante_nombre || 'A user'
        const tipoES = action.payload.tipo === 'entrada' ? 'una entrada' : 'una salida'
        const tipoEN = action.payload.tipo === 'entrada' ? 'an entry' : 'an exit'
        const material = action.payload.material_desc || 'material'
        const just = action.payload.justificacion || '—'
        await notify({
          tipo: 'solicitud',
          titulo: `⚠️ Deletion request / Solicitud de eliminación`,
          mensaje: `${solicitante} requested to delete ${tipoEN} of "${material}" | solicitó eliminar ${tipoES} de "${material}". ${just}`,
          modulo: 'inventario',
          referencia_id: item.id,
          roles: ['client_admin', 'coordinador', 'gerente', 'super_admin'],
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
                await sbThrow(supabase.from('entradas').delete().eq('id', sol.registro_id))
              }
              // Ajustar stock del material independientemente
              const { data: mat } = await supabase.from('materiales').select('stock_actual').eq('id', sol.material_id).single()
              if (mat) {
                const nuevoStock = Math.max(0, parseFloat(mat.stock_actual || 0) - parseFloat(sol.cantidad || 0))
                await sbThrow(supabase.from('materiales').update({ stock_actual: nuevoStock }).eq('id', sol.material_id))
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
              if (salidaDB) await sbThrow(supabase.from('salidas').delete().eq('id', sol.registro_id))
              const { data: mat } = await supabase.from('materiales').select('stock_actual').eq('id', sol.material_id).single()
              if (mat) {
                const nuevoStock = parseFloat(mat.stock_actual || 0) + parseFloat(sol.cantidad || 0)
                await sbThrow(supabase.from('materiales').update({ stock_actual: nuevoStock }).eq('id', sol.material_id))
                const matLocal = state.materiales.find(m => m.id === sol.material_id)
                if (matLocal) dispatch({ type: 'UPD_MATERIAL', payload: { ...matLocal, stock_actual: nuevoStock } })
              }
            }
          }
        } catch (e) { console.warn('Error al procesar eliminación:', e.message) }

        // Siempre actualizar el estado de la solicitud — primero local, luego DB
        const upd = { estado: 'aprobada', comentario_admin: action.payload.comentario || '', reviewed_at: today(), reviewed_by: action.payload.reviewedBy }
        dispatch({ type: 'UPD_SOL_ELIM', payload: { id: sol.id, ...upd } })
        await sbThrow(supabase.from('solicitudes_eliminacion').update(upd).eq('id', sol.id))
        const tipoAprobEN = sol.tipo === 'entrada' ? 'an entry' : 'an exit'
        const tipoAprobES = sol.tipo === 'entrada' ? 'una entrada' : 'una salida'
        const comentAprobEN = action.payload.comentario ? ' Comment: ' + action.payload.comentario : ''
        const comentAprobES = action.payload.comentario ? ' Comentario: ' + action.payload.comentario : ''
        // Notificar al usuario específico que elaboró la solicitud
        await notifyUser({
          usuario_id: sol.solicitante_id,
          tipo: 'aprobacion',
          titulo: '✅ Deletion request approved / Solicitud aprobada',
          mensaje: `Your request to delete ${tipoAprobEN} of "${sol.material_desc}" was approved.${comentAprobEN} | Tu solicitud de eliminar ${tipoAprobES} de "${sol.material_desc}" fue aprobada.${comentAprobES}`,
          modulo: 'inventario',
          referencia_id: sol.id,
        })
        break
      }
      case 'RECHAZAR_SOL_ELIM': {
        const sol2 = state.solicitudes_eliminacion.find(s => s.id === action.payload.id)
        const upd = { estado: 'rechazada', comentario_admin: action.payload.comentario || '', reviewed_at: today(), reviewed_by: action.payload.reviewedBy }
        dispatch({ type: 'UPD_SOL_ELIM', payload: { id: action.payload.id, ...upd } })
        await sbThrow(supabase.from('solicitudes_eliminacion').update(upd).eq('id', action.payload.id))
        const motivoEN = action.payload.comentario ? ' Reason: ' + action.payload.comentario : ''
        const motivoES = action.payload.comentario ? ' Motivo: ' + action.payload.comentario : ''
        // Notificar al usuario específico que elaboró la solicitud
        await notifyUser({
          usuario_id: sol2?.solicitante_id,
          tipo: 'rechazo',
          titulo: '❌ Deletion request rejected / Solicitud rechazada',
          mensaje: `Your request to delete "${sol2?.material_desc || 'material'}" was rejected.${motivoEN} | Tu solicitud de eliminar "${sol2?.material_desc || 'material'}" fue rechazada.${motivoES}`,
          modulo: 'inventario',
          referencia_id: action.payload.id,
        })
        break
      }

      case 'DEL_SOL_ELIM': {
        // Eliminar solicitud de eliminación del historial (solo aprobadas/rechazadas)
        const solDel = state.solicitudes_eliminacion.find(s => s.id === action.payload)
        if (!solDel || solDel.estado === 'pendiente') break
        await sbThrow(supabase.from('solicitudes_eliminacion').delete().eq('id', action.payload))
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
        await sbThrow(supabase.from('solicitudes').update({ estado: action.payload.estado }).eq('id', action.payload.id))
        dispatch(action)
        // Notificar al bodeguero y admin cuando hay material listo para despachar
        if (action.payload.estado === 'pendiente_bodega' || action.payload.estado === 'dividida') {
          const folio    = action.payload.folio || ''
          const proyecto = action.payload.proyecto_nombre || ''
          const esDividida = action.payload.estado === 'dividida'
          await notify({
            tipo:          'despacho',
            titulo:        '📦 Material listo para despachar',
            mensaje:       `${folio ? `Solicitud ${folio}` : 'Una solicitud'}${proyecto ? ` — ${proyecto}` : ''}: ${esDividida ? 'parte del material está en bodega y debe despacharse' : 'el material está en bodega y debe despacharse'}. Ve a Inventario → Salidas.`,
            modulo:        'inventario',
            referencia_id: action.payload.id,
            roles:         ['bodeguero', 'client_admin'],
          })
        }
        break
      }
      case 'DEL_SOLICITUD': {
        await sbThrow(supabase.from('solicitud_items').delete().eq('solicitud_id', action.payload))
        await sbThrow(supabase.from('solicitudes').delete().eq('id', action.payload))
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
        // Solo client_admin, gerente y super_admin pueden crear OC
        const rolesOC = ['super_admin', 'client_admin', 'gerente']
        if (!rolesOC.includes(rol)) {
          console.warn('[MARY] ADD_OC bloqueado — rol sin permiso:', rol)
          break
        }
        const oc_number   = genOCCode(state.ordenes_compra)
        const monto_total = parseFloat(action.payload.monto_total || 0) ||
          (action.payload.items||[]).reduce((s, it) => s + r2(parseFloat(it.cantidad||0) * parseFloat(it.precio_unitario||0)), 0)
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
          const subtotal = r2(parseFloat(it.cantidad||0) * parseFloat(it.precio_unitario||0))
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
            impuesto_monto:    r2(subtotal * (impPct / 100)),
            total:             r2(subtotal * (1 + impPct / 100)),
            // Campos de equipo alquilado
            tipo_item:         it.tipo_item         || 'material',
            eq_tipo_propiedad: it.eq_tipo_propiedad || null,
            eq_fecha_inicio:   it.eq_fecha_inicio   || null,
            eq_fecha_fin:      it.eq_fecha_fin       || null,
            eq_dias_uso:       it.eq_dias_uso        ? parseFloat(it.eq_dias_uso) : null,
            actividad_id:      it.actividad_id       || null,
            tenant_id:         tenantId,
          }
        })
        const { error: ocErr } = await supabase.from('ordenes_compra').insert(oc)
        if (ocErr) {
          console.error('[MARY] ADD_OC — insert ordenes_compra:', JSON.stringify(ocErr))
          break
        }
        if (ocItems.length) {
          const { error: ocItemsErr } = await supabase.from('ordenes_compra_items').insert(ocItems)
          if (ocItemsErr) console.error('[MARY] ADD_OC — insert ordenes_compra_items:', JSON.stringify(ocItemsErr))
        }
        if (oc.solicitud_id) {
          await sbThrow(supabase.from('solicitudes').update({ estado: 'oc_generada' }).eq('id', oc.solicitud_id))
          dispatch({ type: 'UPD_SOLICITUD_ESTADO', payload: { id: oc.solicitud_id, estado: 'oc_generada' } })
        }
        dispatch({ type: 'ADD_OC', payload: { oc, items: ocItems } })
        break
      }
      case 'UPD_OC_ESTADO': {
        // Solo client_admin y super_admin pueden aprobar/rechazar OC
        // gerente solo si tiene permiso condicional (oc_aprobar: 'cond')
        // Solo client_admin, gerente y super_admin pueden aprobar/rechazar OC
        const rolesAprobar = ['super_admin', 'client_admin', 'gerente']
        if (!rolesAprobar.includes(rol)) {
          console.warn('[MARY] UPD_OC_ESTADO bloqueado — rol sin permiso:', rol)
          break
        }
        await sbThrow(supabase.from('ordenes_compra').update({ estado: action.payload.estado }).eq('id', action.payload.id))
        dispatch(action)

        if (action.payload.estado === 'aprobada') {
          const oc = action.payload

          // ── Registrar automáticamente equipos alquilados en Financiero ──
          const ocItems = state.ordenes_compra_items.filter(i => i.oc_id === oc.id)
          const itemsEquipo = ocItems.filter(i => i.tipo_item === 'equipo_alquilado')

          if (itemsEquipo.length > 0) {
            for (const it of itemsEquipo) {
              // Verificar si el ítem está en materiales_presupuestados del proyecto
              const ocRecord  = state.ordenes_compra.find(o => o.id === oc.id)
              const proyId    = ocRecord?.proyecto_id || null

              // Buscar el mat_pres correspondiente: por material_id o por nombre_libre == descripcion
              const matPres = proyId
                ? state.materiales_presupuestados.find(mp =>
                    mp.proyecto_id === proyId && (
                      (it.material_id && mp.material_id === it.material_id) ||
                      (!it.material_id && mp.nombre_libre?.toLowerCase().trim() === (it.descripcion || '').toLowerCase().trim())
                    )
                  )
                : null

              const esPres   = !!matPres
              const matPresId = matPres?.id || null

              // Calcular días si tiene fechas
              let diasUso = parseFloat(it.eq_dias_uso || 0)
              if (!diasUso && it.eq_fecha_inicio && it.eq_fecha_fin) {
                const ini = new Date(it.eq_fecha_inicio)
                const fin = new Date(it.eq_fecha_fin)
                diasUso   = Math.max(1, Math.ceil((fin - ini) / (1000 * 60 * 60 * 24)) + 1)
              }

              const tarifaDiaria = parseFloat(it.precio_unitario || 0)
              const costoTotal   = diasUso > 0 && tarifaDiaria > 0
                ? r2(diasUso * tarifaDiaria)
                : r2(parseFloat(it.cantidad || 0) * tarifaDiaria)

              const nuevoEquipo = {
                id:                   uuid(),
                tenant_id:            tenantId,
                proyecto_id:          proyId,
                descripcion:          it.descripcion || '',
                tipo:                 it.eq_tipo_propiedad === 'propio_empresa' ? 'propio' : 'alquiler',
                tarifa_diaria:        tarifaDiaria,
                dias_uso:             diasUso || parseFloat(it.cantidad || 0),
                costo_total:          costoTotal,
                actividad_id:         it.actividad_id || null,
                origen_oc_id:         oc.id,
                origen_solicitud_id:  ocRecord?.solicitud_id || null,
                es_presupuestado:     esPres,
                mat_pres_id:          matPresId,
                estado_equipo:        'activo',
                eq_fecha_inicio:      it.eq_fecha_inicio || null,
                eq_fecha_fin:         it.eq_fecha_fin    || null,
                created_at:           today(),
              }

              const { error: eqErr } = await supabase.from('equipos').insert(nuevoEquipo)
              if (!eqErr) {
                dispatch({ type: 'ADD_EQUIPO', payload: nuevoEquipo })
              }
            }
          }

          // Notificación de OC aprobada
          await notify({
            tipo:         'aprobacion',
            titulo:       '✅ Orden de Compra aprobada',
            mensaje:      `La OC ha sido aprobada y está lista para recibir materiales.${itemsEquipo.length > 0 ? ` Los equipos han sido registrados en Financiero.` : ''}`,
            modulo:       'compras',
            referencia_id: oc.id,
            roles:        ['residente', 'bodeguero', 'coordinador'],
          })

        } else if (action.payload.estado === 'rechazada') {
          await notify({
            tipo:         'rechazo',
            titulo:       '❌ Orden de Compra rechazada',
            mensaje:      `La OC fue rechazada. Revisa los detalles.`,
            modulo:       'compras',
            referencia_id: action.payload.id,
            roles:        ['residente', 'coordinador'],
          })
        }
        break
      }
      case 'DEL_OC': {
        await sbThrow(supabase.from('ordenes_compra_items').delete().eq('oc_id', action.payload))
        await sbThrow(supabase.from('ordenes_compra').delete().eq('id', action.payload))
        dispatch(action)
        break
      }

      case 'ADD_COSTO_DIRECTO': {
        const { fecha, ...rest } = action.payload
        const item = { ...rest, id: uuid(), created_at: today(), tenant_id: tenantId }
        await sbThrow(supabase.from('costos_directos').insert(item))
        dispatch({ type: 'ADD_COSTO_DIRECTO', payload: item })
        break
      }
      case 'UPD_COSTO_DIRECTO': {
        const { id, ...fields } = action.payload
        await sbThrow(supabase.from('costos_directos').update(fields).eq('id', id))
        dispatch(action)
        break
      }
      case 'DEL_COSTO_DIRECTO': {
        await sbThrow(supabase.from('costos_directos').delete().eq('id', action.payload))
        dispatch(action)
        break
      }

      case 'ADD_NOMINA': {
        const { fecha, ...rest } = action.payload
        const item = { ...rest, id: uuid(), created_at: today(), tenant_id: tenantId }
        await sbThrow(supabase.from('nominas').insert(item))
        dispatch({ type: 'ADD_NOMINA', payload: item })
        break
      }
      case 'UPD_NOMINA': {
        const { id, ...fields } = action.payload
        await sbThrow(supabase.from('nominas').update(fields).eq('id', id))
        dispatch(action)
        break
      }
      case 'DEL_NOMINA': {
        await sbThrow(supabase.from('nominas').delete().eq('id', action.payload))
        dispatch(action)
        break
      }

      case 'ADD_SC_CONTRATO': {
        const sc = { ...action.payload.contrato, id: uuid(), created_at: today(), tenant_id: tenantId }
        const items = action.payload.items.map(it => ({ ...it, id: uuid(), subcontrato_id: sc.id, created_at: today(), tenant_id: tenantId }))
        await sbThrow(supabase.from('subcontratos_contratos').insert(sc))
        if (items.length) await sbThrow(supabase.from('subcontratos_items').insert(items))
        dispatch({ type: 'ADD_SC_CONTRATO', payload: { contrato: sc, items } })
        break
      }
      case 'DEL_SC_CONTRATO': {
        const pid = action.payload
        const { data: avs } = await supabase.from('subcontratos_avaluos').select('id').eq('subcontrato_id', pid)
        if (avs?.length) await sbThrow(supabase.from('subcontratos_avaluo_items').delete().in('avaluo_id', avs.map(a=>a.id)))
        await sbThrow(supabase.from('subcontratos_avaluos').delete().eq('subcontrato_id', pid))
        await sbThrow(supabase.from('subcontratos_items').delete().eq('subcontrato_id', pid))
        await sbThrow(supabase.from('subcontratos_contratos').delete().eq('id', pid))
        dispatch({ type: 'DEL_SC_CONTRATO', payload: pid })
        break
      }
      case 'ADD_SC_AVALUO': {
        const av  = { ...action.payload.avaluo, id: uuid(), created_at: today(), tenant_id: tenantId }
        const avi = action.payload.items.map(it => ({ ...it, id: uuid(), avaluo_id: av.id, created_at: today(), tenant_id: tenantId }))
        await sbThrow(supabase.from('subcontratos_avaluos').insert(av))
        if (avi.length) await sbThrow(supabase.from('subcontratos_avaluo_items').insert(avi))
        dispatch({ type: 'ADD_SC_AVALUO', payload: { avaluo: av, items: avi } })
        break
      }
      case 'APROBAR_SC_AVALUO': {
        const av       = action.payload.avaluo
        const contrato = action.payload.contrato
        await sbThrow(supabase.from('subcontratos_avaluos').update({ estado: 'aprobado' }).eq('id', av.id))
        const nuevoPagado = parseFloat(contrato.monto_pagado||0) + parseFloat(av.monto_total||0)
        await sbThrow(supabase.from('subcontratos_contratos').update({ monto_pagado: nuevoPagado }).eq('id', contrato.id))
        const costo = {
          id: uuid(), proyecto_id: contrato.proyecto_id, categoria: 'Subcontratos',
          tipo: 'subcontrato',
          descripcion: `Avalúo #${av.numero} — ${contrato.subcontratista}`,
          proveedor: contrato.subcontratista, monto: parseFloat(av.monto_total||0),
          fecha: av.fecha_elaboracion || today(), referencia: `SC-AV-${av.numero}`,
          created_at: today(), tenant_id: tenantId,
        }
        await sbThrow(supabase.from('costos_directos').insert(costo))
        // ── Crear registro de retención si el avalúo tiene retención ──
        let retencion = null
        const montoRetenido = parseFloat(av.retencion_monto||0)
        if (montoRetenido > 0) {
          // Calcular fecha estimada de devolución
          const fechaBase  = av.fecha_elaboracion || today()
          const plazoMeses = parseInt(contrato.plazo_garantia_meses || 6)
          const fechaEst   = new Date(fechaBase)
          fechaEst.setMonth(fechaEst.getMonth() + plazoMeses)
          const fechaEstStr = fechaEst.toISOString().split('T')[0]
          retencion = {
            id:                   uuid(),
            tenant_id:            tenantId,
            subcontrato_id:       contrato.id,
            avaluo_id:            av.id,
            proyecto_id:          contrato.proyecto_id,
            subcontratista:       contrato.subcontratista,
            monto_retenido:       montoRetenido,
            retencion_pct:        parseFloat(av.retencion_pct||0),
            fecha_retencion:      fechaBase,
            plazo_garantia_meses: plazoMeses,
            fecha_devolucion_est: fechaEstStr,
            numero_avaluo:        av.numero,
            estado:               'retenida',
            monto_devuelto:       0,
            created_at:           today(),
          }
          await sbThrow(supabase.from('subcontratos_retenciones').insert(retencion))
        }
        dispatch({ type: 'APROBAR_SC_AVALUO', payload: { avaluo: av, contrato, costo, retencion } })
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

      case 'DEVOLVER_RETENCION': {
        const ret      = action.payload.retencion
        const fecha    = today()
        const { data: { user } } = await supabase.auth.getUser()
        await sbThrow(supabase.from('subcontratos_retenciones').update({
          estado:               'devuelta',
          fecha_devolucion_real: fecha,
          monto_devuelto:        ret.monto_retenido,
          liberado_por:          user?.id || null,
        }).eq('id', ret.id))
        dispatch({ type: 'DEVOLVER_RETENCION', payload: { retencion: ret, fecha } })
        break
      }

      case 'EMITIR_ORDEN_PAGO_RETENCION': {
        const { subcontrato, retenciones, proyecto_id, notas } = action.payload
        const { data: { user } } = await supabase.auth.getUser()
        // Generar número de orden: OPR-{año}-{secuencia}
        const { count } = await supabase
          .from('ordenes_pago_retencion')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
        const secuencia  = String((count || 0) + 1).padStart(4, '0')
        const numeroOrden = `OPR-${new Date().getFullYear()}-${secuencia}`
        const montoTotal  = retenciones.reduce((s, r) => s + parseFloat(r.monto_retenido||0), 0)
        const orden = {
          id:             uuid(),
          tenant_id:      tenantId,
          proyecto_id,
          subcontrato_id: subcontrato.id,
          subcontratista: subcontrato.subcontratista,
          numero_orden:   numeroOrden,
          monto_total:    montoTotal,
          cantidad_avaluos: retenciones.length,
          fecha_orden:    today(),
          estado:         'emitida',
          notas:          notas || '',
          creado_por:     user?.id || null,
          created_at:     today(),
        }
        await sbThrow(supabase.from('ordenes_pago_retencion').insert(orden))
        // Vincular retenciones a la orden y marcarlas como devueltas
        const retencionIds = retenciones.map(r => r.id)
        await sbThrow(supabase.from('subcontratos_retenciones')
          .update({
            orden_pago_id:         orden.id,
            estado:                'devuelta',
            fecha_devolucion_real: today(),
            monto_devuelto:        null, // Se actualiza por registro individual abajo
            liberado_por:          user?.id || null,
          })
          .in('id', retencionIds))
        // Actualizar monto_devuelto individualmente
        for (const r of retenciones) {
          await sbThrow(supabase.from('subcontratos_retenciones')
            .update({ monto_devuelto: r.monto_retenido })
            .eq('id', r.id))
        }
        dispatch({ type: 'EMITIR_ORDEN_PAGO_RETENCION', payload: { orden, retencion_ids: retencionIds } })
        break
      }

      case 'ADD_SUBCONTRATO': {
        const { fecha, ...rest } = action.payload
        const item = { ...rest, id: uuid(), created_at: today(), tenant_id: tenantId }
        await sbThrow(supabase.from('subcontratos').insert(item))
        dispatch({ type: 'ADD_SUBCONTRATO', payload: item })
        break
      }
      case 'UPD_SUBCONTRATO': {
        await sbThrow(supabase.from('subcontratos').update(action.payload).eq('id', action.payload.id))
        dispatch(action)
        break
      }
      case 'DEL_SUBCONTRATO': {
        await sbThrow(supabase.from('subcontratos').delete().eq('id', action.payload))
        dispatch(action)
        break
      }

      case 'ADD_EQUIPO': {
        const { fecha, monto, ...rest } = action.payload
        const item = { ...rest, id: uuid(), created_at: today(), tenant_id: tenantId }
        await sbThrow(supabase.from('equipos').insert(item))
        dispatch({ type: 'ADD_EQUIPO', payload: item })
        break
      }
      case 'UPD_EQUIPO': {
        const { id, ...fields } = action.payload
        await sbThrow(supabase.from('equipos').update(fields).eq('id', id))
        dispatch(action)
        break
      }
      case 'DEL_EQUIPO': {
        await sbThrow(supabase.from('equipos').delete().eq('id', action.payload))
        dispatch(action)
        break
      }

      // ── AJUSTES DE EQUIPO ─────────────────────────────────────────
      case 'ADD_AJUSTE_EQUIPO': {
        // Cualquier usuario con acceso puede crear — requiere aprobación
        const { solicitado_por, solicitado_nombre, ...ajusteRest } = action.payload
        const ajuste = {
          ...ajusteRest,
          id:               uuid(),
          tenant_id:        tenantId,
          estado:           'pendiente',
          solicitado_por:   solicitado_por   || null,
          solicitado_nombre: solicitado_nombre || '',
          fecha_solicitud:  new Date().toISOString(),
          created_at:       new Date().toISOString(),
        }
        const { error } = await supabase.from('equipos_ajustes').insert(ajuste)
        if (!error) dispatch({ type: 'ADD_AJUSTE_EQUIPO', payload: ajuste })
        break
      }

      case 'UPD_AJUSTE_EQUIPO': {
        // Solo Admin/Gerente pueden aprobar o rechazar
        const { id, estado, aprobado_por, aprobado_nombre } = action.payload
        const upd = {
          estado,
          aprobado_por:    aprobado_por    || null,
          aprobado_nombre: aprobado_nombre || '',
          fecha_aprobacion: new Date().toISOString(),
        }
        await sbThrow(supabase.from('equipos_ajustes').update(upd).eq('id', id))
        dispatch({ type: 'UPD_AJUSTE_EQUIPO', payload: { id, ...upd } })

        // Si se aprueba — actualizar el equipo con el costo/días reales
        if (estado === 'aprobado') {
          const ajuste  = state.equipos_ajustes.find(a => a.id === id)
          if (ajuste) {
            const equipoUpd = {
              id:            ajuste.equipo_id,
              dias_uso:      ajuste.dias_ajustados,
              costo_total:   ajuste.costo_ajustado,
              dias_reales:   ajuste.dias_ajustados,
              costo_real:    ajuste.costo_ajustado,
              eq_fecha_fin:  ajuste.fecha_fin_ajustada || null,
              estado_equipo: ajuste.tipo_ajuste === 'extension'
                ? 'ajustado'
                : 'cerrado_parcial',
              motivo_ajuste: ajuste.motivo,
            }
            await sbThrow(supabase.from('equipos').update({
              dias_uso:      equipoUpd.dias_uso,
              costo_total:   equipoUpd.costo_total,
              dias_reales:   equipoUpd.dias_reales,
              costo_real:    equipoUpd.costo_real,
              eq_fecha_fin:  equipoUpd.eq_fecha_fin,
              estado_equipo: equipoUpd.estado_equipo,
              motivo_ajuste: equipoUpd.motivo_ajuste,
            }).eq('id', ajuste.equipo_id))
            dispatch({ type: 'UPD_EQUIPO', payload: equipoUpd })

            // Si es cierre parcial — marcar OC origen como cerrada_parcial
            if (ajuste.tipo_ajuste === 'cierre_parcial') {
              const equipo = state.equipos.find(e => e.id === ajuste.equipo_id)
              if (equipo?.origen_oc_id) {
                await sbThrow(supabase.from('ordenes_compra')
                  .update({ estado: 'cerrada_parcial' })
                  .eq('id', equipo.origen_oc_id))
                dispatch({ type: 'UPD_OC_ESTADO', payload: { id: equipo.origen_oc_id, estado: 'cerrada_parcial' } })
              }
            }
          }
        }
        break
      }

      case 'ADD_COSTO_INDIRECTO': {
        const { fecha, ...rest } = action.payload
        const item = { ...rest, id: uuid(), created_at: today(), tenant_id: tenantId }
        await sbThrow(supabase.from('costos_indirectos').insert(item))
        dispatch({ type: 'ADD_COSTO_INDIRECTO', payload: item })
        break
      }
      case 'UPD_COSTO_INDIRECTO': {
        const { id, ...fields } = action.payload
        await sbThrow(supabase.from('costos_indirectos').update(fields).eq('id', id))
        dispatch(action)
        break
      }
      case 'DEL_COSTO_INDIRECTO': {
        await sbThrow(supabase.from('costos_indirectos').delete().eq('id', action.payload))
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
        await sbThrow(supabase.from('materiales_presupuestados').update(upd).eq('id', id))
        dispatch({ type: 'UPD_MAT_PRES', payload: { ...upd, id } })
        break
      }
      case 'DEL_MAT_PRES': {
        await sbThrow(supabase.from('materiales_presupuestados').delete().eq('id', action.payload))
        dispatch(action)
        break
      }

      case 'ADD_ORDEN_CAMBIO': {
        const orden      = { ...action.payload.orden, id: uuid(), estado: 'borrador', created_at: today(), tenant_id: tenantId }
        const items      = (action.payload.items||[]).map(it => ({ ...it, id: uuid(), oc_id: orden.id, created_at: today(), tenant_id: tenantId }))
        const indirectos = (action.payload.indirectos||[])
          .filter(i => parseFloat(i.ajuste||0) !== 0)
          .map(i => ({ ...i, id: uuid(), oc_id: orden.id, created_at: today(), tenant_id: tenantId }))

        // Dispatch primero para UI inmediata
        dispatch({ type: 'ADD_ORDEN_CAMBIO', payload: { orden, items, indirectos } })

        const { error: errOrden } = await supabase.from('ordenes_cambio').insert(orden)
        if (errOrden) { console.error('ordenes_cambio insert error:', errOrden); break }

        if (items.length) {
          const dbItems = items.map(({ ...it }) => ({
            ...it,
            actividad_id:  it.actividad_id || null,
            parent_id:     it.parent_id || null,
            diferencia:    parseFloat(it.cantidad_nueva||0) - parseFloat(it.cantidad_original||0),
            monto_cambio:  r2((parseFloat(it.cantidad_nueva||0) - parseFloat(it.cantidad_original||0)) * parseFloat(it.precio_unitario||0)),
          }))
          const { error: errItems } = await supabase.from('ordenes_cambio_items').insert(dbItems)
          if (errItems) console.error('ordenes_cambio_items insert error:', errItems)
        }

        if (indirectos.length) {
          const { error: errInds } = await supabase.from('ordenes_cambio_indirectos').insert(indirectos)
          if (errInds) console.error('ordenes_cambio_indirectos insert error:', errInds)
        }
        break
      }
      case 'FETCH_OC_ITEMS': {
        const { data: items } = await supabase
          .from('ordenes_cambio_items').select('*').eq('oc_id', action.payload)
        const { data: indirectos } = await supabase
          .from('ordenes_cambio_indirectos').select('*').eq('oc_id', action.payload)
        dispatch({
          type: 'LOAD_OC_ITEMS',
          payload: { oc_id: action.payload, items: items||[], indirectos: indirectos||[] }
        })
        break
      }

      case 'UPD_ORDEN_CAMBIO_ESTADO': {
        await sbThrow(supabase.from('ordenes_cambio').update({ estado: action.payload.estado }).eq('id', action.payload.id))
        dispatch(action)

        // ── PROPAGACIÓN AL APROBAR ─────────────────────────────────────────
        if (action.payload.estado === 'aprobada') {

          // 1. Obtener la OC y sus items
          const { data: ocData } = await supabase
            .from('ordenes_cambio').select('*').eq('id', action.payload.id).single()
          const { data: ocItems } = await supabase
            .from('ordenes_cambio_items').select('*').eq('oc_id', action.payload.id)
          const { data: ocIndsRaw } = await supabase
            .from('ordenes_cambio_indirectos').select('*').eq('oc_id', action.payload.id)

          // Cargar items e indirectos en el estado local de inmediato
          dispatch({
            type: 'LOAD_OC_ITEMS',
            payload: {
              oc_id:      action.payload.id,
              items:      ocItems || [],
              indirectos: ocIndsRaw || [],
            }
          })

          if (ocData && ocItems?.length) {
            const proyId = ocData.proyecto_id

            // 2. Actividades NUEVAS → INSERT en presupuesto
            const nuevas = ocItems.filter(it => it.tipo === 'nueva')
            for (const it of nuevas) {
              // Obtener items del presupuesto para construir código bajo el parent
              const { data: presExist } = await supabase
                .from('presupuesto').select('id,tipo,code,parent_id')
                .eq('proyecto_id', proyId).eq('tenant_id', tenantId)
              const presItems  = presExist || []
              const parent     = presItems.find(p => p.id === it.parent_id)
              const parentCode = parent?.code || '00'
              // Contar actividades existentes bajo ese parent para el siguiente número
              const siblingsCount = presItems.filter(p => p.tipo === 'actividad' && p.parent_id === it.parent_id).length
              const newCode = `${parentCode}.${String(siblingsCount + 1).padStart(3,'0')}`

              const newAct = {
                id:               uuid(),
                tenant_id:        tenantId,
                proyecto_id:      proyId,
                tipo:             'actividad',
                code:             newCode,
                descripcion:      it.descripcion,
                unidad:           it.unidad || 'und',
                cantidad:         parseFloat(it.cantidad_nueva || 0),
                costo_mo:         parseFloat(it.costo_mo || 0),
                costo_materiales: parseFloat(it.costo_materiales || 0),
                costo_equipos:    parseFloat(it.costo_equipos || 0),
                parent_id:        it.parent_id || null,
                origen_oc_id:     action.payload.id,
                created_at:       today(),
              }
              await sbThrow(supabase.from('presupuesto').insert(newAct))
              dispatch({ type: 'ADD_BUDGET', payload: newAct })
            }

            // 3. Actividades EXISTENTES → UPDATE cantidad en presupuesto
            const existentes = ocItems.filter(it => it.tipo === 'existente' && it.actividad_id)
            for (const it of existentes) {
              const cantNueva = parseFloat(it.cantidad_nueva || 0)
              await sbThrow(supabase
                .from('presupuesto').update({ cantidad: cantNueva }).eq('id', it.actividad_id))
              dispatch({ type: 'UPD_BUDGET', payload: { id: it.actividad_id, cantidad: cantNueva } })
            }

            // 4. Aplicar ajustes de costos indirectos registrados en la OC
            const ocInds = ocIndsRaw || []

            if (ocInds?.length) {
              for (const ind of ocInds) {
                const indActual = state.presupuesto_indirectos?.find(p => p.id === ind.ind_id)
                if (!indActual) continue
                const montoNuevo = r2(parseFloat(indActual.monto_presupuestado||0) + parseFloat(ind.ajuste||0))
                await sbThrow(supabase
                  .from('presupuesto_indirectos').update({ monto_presupuestado: montoNuevo }).eq('id', ind.ind_id))
                dispatch({ type: 'UPD_PRES_IND', payload: { id: ind.ind_id, monto_presupuestado: montoNuevo } })
              }
            }
          }

          await notify({
            tipo: 'aprobacion',
            titulo: '✅ Orden de Cambio aprobada',
            mensaje: `La orden de cambio fue aprobada y aplicada al presupuesto.`,
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
        await sbThrow(supabase.from('ordenes_cambio_indirectos').delete().eq('oc_id', action.payload))
        await sbThrow(supabase.from('ordenes_cambio_items').delete().eq('oc_id', action.payload))
        await sbThrow(supabase.from('ordenes_cambio').delete().eq('id', action.payload))
        dispatch(action)
        break
      }

      case 'ADD_AVALUO_CLIENTE': {
        const av  = { ...action.payload.avaluo, id: uuid(), estado: 'borrador', created_at: today(), tenant_id: tenantId }
        const avi = (action.payload.items||[]).map(it => ({ ...it, id: uuid(), avaluo_id: av.id, created_at: today(), tenant_id: tenantId }))
        await sbThrow(supabase.from('avaluos_cliente').insert(av))
        if (avi.length) await sbThrow(supabase.from('avaluos_cliente_items').insert(avi))
        dispatch({ type: 'ADD_AVALUO_CLIENTE', payload: { avaluo: av, items: avi } })
        break
      }
      case 'UPD_AVALUO_CLIENTE_ESTADO': {
        await sbThrow(supabase.from('avaluos_cliente').update({ estado: action.payload.estado }).eq('id', action.payload.id))
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
        await sbThrow(supabase.from('avaluos_cliente_items').delete().eq('avaluo_id', action.payload))
        await sbThrow(supabase.from('avaluos_cliente').delete().eq('id', action.payload))
        dispatch(action)
        break
      }

      case 'MARK_NOTIF_READ': {
        await sbThrow(supabase.from('notificaciones').update({ leida: true }).eq('id', action.payload))
        dispatch(action)
        break
      }
      case 'MARK_ALL_NOTIF_READ': {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) await sbThrow(supabase.from('notificaciones').update({ leida: true }).eq('usuario_id', user.id).eq('leida', false))
        dispatch(action)
        break
      }

      default: dispatch(action)
    }
    } catch (err) {
      console.error(`[dbDispatch:${action.type}]`, err)
      avisar(`No se pudo completar la acción / Action could not be completed: ${err?.message || action.type}`)
    }
  }

  return (
    <Ctx.Provider value={{ state, dispatch: dbDispatch }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
        {avisos.map(a => (
          <div key={a.id}
            className="flex items-start gap-2 px-4 py-3 rounded-lg shadow-lg text-sm"
            style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B' }}>
            <span>⚠</span>
            <span className="flex-1">{a.mensaje}</span>
            <button onClick={() => setAvisos(prev => prev.filter(x => x.id !== a.id))}
              className="text-xs opacity-60 hover:opacity-100">✕</button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
