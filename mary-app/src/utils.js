export const uuid = () => crypto.randomUUID()

// Mapa de países a moneda
export const PAIS_MONEDA = {
  'Argentina':             'ARS',
  'Belice':                'BZD',
  'Bolivia':               'BOB',
  'Brasil':                'BRL',
  'Canadá':                'CAD',
  'Chile':                 'CLP',
  'Colombia':              'COP',
  'Costa Rica':            'CRC',
  'Cuba':                  'CUP',
  'Ecuador':               'USD',
  'El Salvador':           'USD',
  'United States':         'USD',
  'Guatemala':             'GTQ',
  'Guyana':                'GYD',
  'Haití':                 'HTG',
  'Honduras':              'HNL',
  'Jamaica':               'JMD',
  'México':                'MXN',
  'Nicaragua':             'NIO',
  'Panamá':                'USD',
  'Paraguay':              'PYG',
  'Perú':                  'PEN',
  'República Dominicana':  'DOP',
  'Trinidad y Tobago':     'TTD',
  'Uruguay':               'UYU',
  'Venezuela':             'VES',
}

// Símbolo de moneda
export const MONEDA_SIMBOLO = {
  USD: '$',
  NIO: 'C$',
  COP: '$',
  GTQ: 'Q',
  PEN: 'S/',
  MXN: '$',
  CRC: '₡',
  HNL: 'L',
  DOP: 'RD$',
  BRL: 'R$',
  ARS: '$',
  CLP: '$',
  BOB: 'Bs.',
  PYG: '₲',
  UYU: '$U',
  CAD: 'CA$',
  VES: 'Bs.S',
  BZD: 'BZ$',
  CUP: '$',
  GYD: 'G$',
  HTG: 'G',
  JMD: 'J$',
  TTD: 'TT$',
}

// Monedas soportadas por Intl.NumberFormat
const MONEDAS_INTL = [
  'USD','NIO','COP','GTQ','PEN','MXN','CRC','HNL','DOP',
  'BRL','ARS','CLP','BOB','PYG','UYU','CAD','VES','BZD',
  'CUP','GYD','HTG','JMD','TTD',
]

// Formato de moneda: C$1,200.00 — usa el símbolo del mapa MONEDA_SIMBOLO
export const fmt = (n, moneda = 'USD') => {
  const currency = MONEDAS_INTL.includes(moneda) ? moneda : 'USD'
  const simbolo = MONEDA_SIMBOLO[currency] || currency
  const numero = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0)
  return `${simbolo} ${numero}`
}

// Formato de número: 1,200.00
export const fmtNum = (n) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0)

export const today = () => new Date().toISOString().split('T')[0]

export const genProjectCode = (proyectos) => {
  const year = new Date().getFullYear()
  const n = (proyectos || []).length + 1
  return `P-${year}-${String(n).padStart(3,'0')}`
}

export const genOCCode = (ocs) => {
  const year = new Date().getFullYear()
  const nums = (ocs || []).map(o => {
    const m = (o.oc_number || '').match(/(\d+)$/)
    return m ? parseInt(m[1]) : 0
  })
  const n = nums.length > 0 ? Math.max(...nums) + 1 : 1
  return `OC-${year}-${String(n).padStart(3,'0')}`
}

export const genBudgetCode = (items, tipo, parentId) => {
  // items ya viene filtrado por proyecto desde el store (byProject)
  if (tipo === 'etapa') {
    const n = items.filter(i => i.tipo === 'etapa').length + 1
    return String(n).padStart(2,'0')
  }
  if (tipo === 'sub_etapa') {
    const parent = items.find(i => i.id === parentId)
    const pc = parent?.code || '01'
    const n = items.filter(i => i.tipo === 'sub_etapa' && i.parent_id === parentId).length + 1
    return `${pc}.${String(n).padStart(2,'0')}`
  }
  if (tipo === 'actividad') {
    const parent = items.find(i => i.id === parentId)
    const pc = parent?.code || '01'
    const n = items.filter(i => i.tipo === 'actividad' && i.parent_id === parentId).length + 1
    return `${pc}.${String(n).padStart(3,'0')}`
  }
}

export const flatBudgetItems = (items) => {
  const stages = items.filter(i => i.tipo === 'etapa').sort((a,b) => a.code.localeCompare(b.code))
  const out = []
  stages.forEach(st => {
    out.push(st)
    // Sub-etapas bajo esta etapa
    const subEtapas = items
      .filter(i => i.tipo === 'sub_etapa' && i.parent_id === st.id)
      .sort((a,b) => a.code.localeCompare(b.code))
    subEtapas.forEach(ss => {
      out.push(ss)
      // Actividades bajo sub-etapa
      items.filter(i => i.tipo === 'actividad' && i.parent_id === ss.id)
        .sort((a,b) => a.code.localeCompare(b.code))
        .forEach(ac => out.push(ac))
    })
    // Actividades directamente bajo etapa (sin sub-etapa intermedia)
    items.filter(i => i.tipo === 'actividad' && i.parent_id === st.id)
      .sort((a,b) => a.code.localeCompare(b.code))
      .forEach(ac => out.push(ac))
  })
  return out
}

export const calcSubtotal = (items, id, tipo) => {
  if (tipo === 'sub_etapa') {
    return items.filter(i => i.tipo === 'actividad' && i.parent_id === id)
      .reduce((s, a) => s + (a.cantidad||0) * ((a.costo_mo||0)+(a.costo_materiales||0)+(a.costo_equipos||0)), 0)
  }
  if (tipo === 'etapa') {
    // Suma sub-etapas
    const subTotal = items.filter(i => i.tipo === 'sub_etapa' && i.parent_id === id)
      .reduce((s, ss) => s + calcSubtotal(items, ss.id, 'sub_etapa'), 0)
    // Suma actividades directas bajo etapa (sin sub-etapa intermedia)
    const directTotal = items.filter(i => i.tipo === 'actividad' && i.parent_id === id)
      .reduce((s, a) => s + (a.cantidad||0) * ((a.costo_mo||0)+(a.costo_materiales||0)+(a.costo_equipos||0)), 0)
    return subTotal + directTotal
  }
  return 0
}

export const calcGrandTotal = (items) => {
  const validIds = new Set(items.map(i => i.id))
  return items
    .filter(i => i.tipo === 'actividad' && validIds.has(i.parent_id))
    .reduce((s, a) => s + (a.cantidad||0) * ((a.costo_mo||0)+(a.costo_materiales||0)+(a.costo_equipos||0)), 0)
}

export const ESTADO_COLORS = {
  planificacion:          'bg-blue-100 text-blue-700',
  en_ejecucion:           'bg-green-100 text-green-700',
  pausado:                'bg-yellow-100 text-yellow-700',
  completado:             'bg-gray-100 text-gray-600',
  cancelado:              'bg-red-100 text-red-600',
  pendiente:              'bg-yellow-100 text-yellow-700',
  aprobada:               'bg-green-100 text-green-700',
  rechazada:              'bg-red-100 text-red-600',
  oc_generada:            'bg-blue-100 text-blue-700',
  borrador:               'bg-gray-100 text-gray-600',
  pendiente_aprobacion:   'bg-yellow-100 text-yellow-700',
  recibida_parcial:       'bg-blue-100 text-blue-700',
  recibida_total:         'bg-green-100 text-green-700',
  cancelada:              'bg-red-100 text-red-600',
  activo:                 'bg-green-100 text-green-700',
  // Nuevos estados de flujo de solicitud
  pendiente_bodega:        'bg-green-100 text-green-700',
  pendiente_oc:            'bg-amber-100 text-amber-700',
  dividida:                'bg-blue-100 text-blue-700',
  parcialmente_entregada:  'bg-indigo-100 text-indigo-700',
  completada:              'bg-gray-100 text-gray-600',
  anulada:                 'bg-red-100 text-red-600',
}

export const ESTADO_LABELS = {
  planificacion:          'Planificación',
  en_ejecucion:           'En Ejecución',
  pausado:                'Pausado',
  completado:             'Completado',
  cancelado:              'Cancelado',
  pendiente:              'Pendiente',
  aprobada:               'Aprobada',
  rechazada:              'Rechazada',
  oc_generada:            'OC Generada',
  borrador:               'Borrador',
  pendiente_aprobacion:   'Pend. Aprobación',
  recibida_parcial:       'Recibida Parcial',
  recibida_total:         'Recibida Total',
  cancelada:              'Cancelada',
  activo:                 'Activo',
  completado_sub:         'Completado',
  // Nuevos estados de flujo de solicitud
  pendiente_bodega:        'En Bodega',
  pendiente_oc:            'Pend. OC',
  dividida:                'Dividida',
  parcialmente_entregada:  'Parcial',
  completada:              'Completada',
  anulada:                 'Anulada',
}

export const MONEDAS = [
  'USD','NIO','COP','GTQ','PEN','MXN','CRC','HNL',
  'DOP','BRL','ARS','CLP','BOB','PYG','UYU','CAD',
]

// Configuración de unidades con labels bilingües
// value = lo que se guarda en BD (símbolo estándar)
// es    = label en español
// en    = label en inglés
export const UNIDADES_CONFIG = [
  { value: 'm²',   es: 'm² — metro cuadrado',   en: 'm² — square meter'    },
  { value: 'm³',   es: 'm³ — metro cúbico',     en: 'm³ — cubic meter'     },
  { value: 'm',    es: 'm — metro',              en: 'm — meter'             },
  { value: 'ml',   es: 'ml — metro lineal',      en: 'ml — linear meter'     },
  { value: 'kg',   es: 'kg — kilogramo',          en: 'kg — kilogram'         },
  { value: 'ton',  es: 'ton — tonelada métrica',  en: 'ton — metric ton'      },
  { value: 'und',  es: 'und — unidad',            en: 'und — unit'            },
  { value: 'gal',  es: 'gal — galón',             en: 'gal — gallon'          },
  { value: 'h',    es: 'h — hora',                en: 'h — hour'              },
  { value: 'day',  es: 'day — día',              en: 'day — day'             },
  { value: 'wk',   es: 'wk — semana',             en: 'wk — week'             },
  { value: 'mo',   es: 'mo — mes',                en: 'mo — month'            },
  { value: 'lot',  es: 'lot — lote',              en: 'lot — lot'             },
  { value: 'load', es: 'load — viaje',            en: 'load — load'           },
  { value: '%',    es: '% — porcentaje',          en: '% — percentage'        },
  { value: 'lb',   es: 'lb — libra',              en: 'lb — pound'            },
  { value: 'ft²',  es: 'ft² — pie cuadrado',      en: 'ft² — square foot'    },
  { value: 'LF',   es: 'LF — pie lineal',         en: 'LF — linear foot'     },
]

// Mapa rápido: valor antiguo → nuevo valor (para mostrar unidades guardadas antes del cambio)
export const UNIDADES_LEGADO = {
  'pie²': 'ft²', 'gl': 'gal', 'hr': 'h',
  'día': 'day', 'semana': 'wk', 'mes': 'mo',
  'lote': 'lot', 'viaje': 'load',
}

// Valores del array (para compatibilidad con código existente)
export const UNIDADES = UNIDADES_CONFIG.map(u => u.value)

// Obtiene el label de una unidad según el idioma ('ES' | 'EN')
// Acepta tanto valores nuevos como legados
export const getUnitLabel = (value, lang = 'ES') => {
  const normalized = UNIDADES_LEGADO[value] || value
  const cfg = UNIDADES_CONFIG.find(u => u.value === normalized)
  if (!cfg) return value
  return lang === 'ES' ? cfg.es : cfg.en
}
