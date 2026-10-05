export const uuid = () => crypto.randomUUID()

// ── Redondeo contable a 2 decimales ──────────────────────────────────────────
// Usa el método "redondeo bancario" correcto (Math.round con compensación de
// floating-point). Siempre aplícalo al RESULTADO de cada multiplicación antes
// de acumular sumas.
// Ejemplo: r2(2.667) → 2.67   r2(1.344) → 1.34   2.67+1.34 = 4.01 ✓
export const r2 = (n) => {
  const v = parseFloat(n) || 0
  // toPrecision(15) quita el error binario (1.005*100 = 100.49999999999999 -> 100.5)
  // y el redondeo es simétrico para negativos (-2.675 -> -2.68)
  return Math.sign(v) * Math.round(Number((Math.abs(v) * 100).toPrecision(15))) / 100
}

// Número desde input/BD: '' / null / texto -> 0
const n0 = (v) => parseFloat(v) || 0
// Importe de una actividad: cantidad × (MO + materiales + equipos), redondeado
const importeActividad = (a) => r2(n0(a.cantidad) * (n0(a.costo_mo) + n0(a.costo_materiales) + n0(a.costo_equipos)))

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

// Etiquetas en inglés de los países. La CLAVE (y el valor guardado en BD) sigue
// siendo el nombre en español, que es la llave de PAIS_MONEDA; esto solo cambia
// lo que se muestra cuando el usuario trabaja en inglés.
export const PAIS_LABEL_EN = {
  'Belice':               'Belize',
  'Brasil':               'Brazil',
  'Canadá':               'Canada',
  'Haití':                'Haiti',
  'México':               'Mexico',
  'Panamá':               'Panama',
  'Perú':                 'Peru',
  'República Dominicana': 'Dominican Republic',
  'Trinidad y Tobago':    'Trinidad and Tobago',
  'España':               'Spain',
  'Otro':                 'Other',
}

// Las claves son mayormente en español; la de EE. UU. quedó en inglés.
const PAIS_LABEL_ES = { 'United States': 'Estados Unidos' }

// Nombres de país antiguos o en el otro idioma -> clave canónica
const PAIS_ALIAS = {
  'Estados Unidos': 'United States', 'Mexico': 'México', 'Panama': 'Panamá', 'Peru': 'Perú',
  'Spain': 'España', 'Other': 'Otro', 'Belize': 'Belice', 'Brazil': 'Brasil', 'Canada': 'Canadá',
  'Haiti': 'Haití', 'Dominican Republic': 'República Dominicana', 'Trinidad and Tobago': 'Trinidad y Tobago',
}
export const normalizarPais = (pais) => PAIS_ALIAS[pais] || pais

// Etiqueta legible de un país según el idioma ('ES' | 'EN')
export const getPaisLabel = (pais, lang = 'ES') => {
  const k = normalizarPais(pais)
  return lang === 'ES' ? (PAIS_LABEL_ES[k] || k) : (PAIS_LABEL_EN[k] || k)
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

// Fecha de HOY en la zona horaria del usuario (YYYY-MM-DD). toISOString() da la fecha
// UTC: en América, por la tarde/noche, devolvía el día siguiente.
export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Siguiente número = mayor existente + 1 (contar filas repetía códigos tras borrar)
const siguienteNumero = (codigos, regex) => {
  const nums = codigos.map(c => { const m = String(c || '').match(regex); return m ? parseInt(m[1], 10) : 0 })
  return (nums.length ? Math.max(0, ...nums) : 0) + 1
}

export const genProjectCode = (proyectos) => {
  const year = new Date().getFullYear()
  const n = siguienteNumero((proyectos || []).map(p => p.project_code || p.code), new RegExp('^P-' + year + '-(\\d+)$'))
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
  const ultimoSegmento = /\.?(\d+)$/
  if (tipo === 'etapa') {
    const n = siguienteNumero(items.filter(i => i.tipo === 'etapa').map(i => i.code), /^(\d+)$/)
    return String(n).padStart(2,'0')
  }
  if (tipo === 'sub_etapa') {
    const parent = items.find(i => i.id === parentId)
    const pc = parent?.code || '01'
    const n = siguienteNumero(items.filter(i => i.tipo === 'sub_etapa' && i.parent_id === parentId).map(i => i.code), ultimoSegmento)
    return `${pc}.${String(n).padStart(2,'0')}`
  }
  if (tipo === 'actividad') {
    const parent = items.find(i => i.id === parentId)
    const pc = parent?.code || '01'
    const n = siguienteNumero(items.filter(i => i.tipo === 'actividad' && i.parent_id === parentId).map(i => i.code), ultimoSegmento)
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
    return r2(items.filter(i => i.tipo === 'actividad' && i.parent_id === id)
      .reduce((s, a) => s + importeActividad(a), 0))
  }
  if (tipo === 'etapa') {
    // Suma sub-etapas
    const subTotal = items.filter(i => i.tipo === 'sub_etapa' && i.parent_id === id)
      .reduce((s, ss) => s + calcSubtotal(items, ss.id, 'sub_etapa'), 0)
    // Suma actividades directas bajo etapa (sin sub-etapa intermedia)
    const directTotal = items.filter(i => i.tipo === 'actividad' && i.parent_id === id)
      .reduce((s, a) => s + importeActividad(a), 0)
    return r2(subTotal + directTotal)
  }
  return 0
}

// Solo cuenta actividades visibles en la tabla del presupuesto: colgadas de una
// etapa, o de una sub-etapa cuya etapa existe (igual que flatBudgetItems).
export const calcGrandTotal = (items) => {
  const etapas    = new Set(items.filter(i => i.tipo === 'etapa').map(i => i.id))
  const subEtapas = new Set(items.filter(i => i.tipo === 'sub_etapa' && etapas.has(i.parent_id)).map(i => i.id))
  return r2(items
    .filter(i => i.tipo === 'actividad' && (etapas.has(i.parent_id) || subEtapas.has(i.parent_id)))
    .reduce((s, a) => s + importeActividad(a), 0))
}

// Costo indirecto presupuestado de un proyecto.
// - Si el proyecto tiene indirecto_pct > 0: total = % × costo directo. Las filas de
//   presupuesto_indirectos son una distribución opcional de ese total.
// - Si no: el total es la suma de las filas (comportamiento anterior).
export const calcIndirectos = (proy, directo, inds = []) => {
  const asignado = r2(inds.reduce((s, p) => s + parseFloat(p.monto_presupuestado || 0), 0))
  const pct      = parseFloat(proy?.indirecto_pct || 0)
  const modo     = pct > 0 ? 'pct' : 'monto'
  // Con % definido, la bolsa = % × costo directo y se recalcula sola.
  // Sin %, el total es simplemente lo asignado (comportamiento heredado).
  const total    = modo === 'pct' ? r2((directo || 0) * pct / 100) : asignado

  const disponible    = r2(total - asignado)
  const pctAsignado   = total > 0 ? (asignado / total) * 100 : 0
  const pctDisponible = total > 0 ? (disponible / total) * 100 : 0

  // Baseline congelado al iniciar ejecución (null mientras se planifica).
  const pctOriginal   = proy?.indirecto_pct_original
  const totalOriginal = (pctOriginal !== null && pctOriginal !== undefined)
    ? r2((directo || 0) * parseFloat(pctOriginal) / 100)
    : null

  return {
    modo, pct, total, asignado, disponible,
    pctAsignado, pctDisponible,
    sobregiro: disponible < 0,
    pctOriginal: pctOriginal ?? null,
    totalOriginal,
  }
}

// Monto de una categoría expresado como % de la bolsa, y viceversa.
export const montoDesdePct = (pct, bolsa) => r2((parseFloat(pct) || 0) * (bolsa || 0) / 100)
// Sin redondear a 2 decimales: así monto -> % -> monto conserva el monto exacto.
// Para mostrar el % en pantalla, redondear con r2().
export const pctDesdeMonto = (monto, bolsa) =>
  (bolsa || 0) > 0 ? Math.round((parseFloat(monto) || 0) * 100 / bolsa * 1e10) / 1e10 : 0

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
  pendiente_bodega:        'En Bodega',
  pendiente_oc:            'Pend. OC',
  dividida:                'Dividida',
  parcialmente_entregada:  'Parcial',
  completada:              'Completada',
  anulada:                 'Anulada',
}

export const ESTADO_LABELS_EN = {
  planificacion:          'Planning',
  en_ejecucion:           'In Progress',
  pausado:                'On Hold',
  completado:             'Completed',
  cancelado:              'Cancelled',
  pendiente:              'Pending',
  aprobada:               'Approved',
  rechazada:              'Rejected',
  oc_generada:            'PO Generated',
  borrador:               'Draft',
  pendiente_aprobacion:   'Pend. Approval',
  recibida_parcial:       'Partial Receipt',
  recibida_total:         'Fully Received',
  cancelada:              'Cancelled',
  activo:                 'Active',
  completado_sub:         'Completed',
  pendiente_bodega:        'In Warehouse',
  pendiente_oc:            'Pend. PO',
  dividida:                'Split',
  parcialmente_entregada:  'Partial',
  completada:              'Completed',
  anulada:                 'Voided',
}

// Obtiene el label de un estado según el idioma
export const getEstadoLabel = (estado, lang = 'ES') => {
  if (!estado) return ''
  const labels = lang === 'ES' ? ESTADO_LABELS : ESTADO_LABELS_EN
  return labels[estado] || estado
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
  { value: 'ft³',  es: 'ft³ — pie cúbico',        en: 'ft³ — cubic foot'     },
  { value: 'yd³',  es: 'yd³ — yarda cúbica',      en: 'yd³ — cubic yard'     },
  { value: 'ft',   es: 'ft — pie',                en: 'ft — foot'            },
  { value: 'in',   es: 'in — pulgada',            en: 'in — inch'            },
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

// ── Costo de materiales consumidos (FIFO) ────────────────────────────────────
// Cada salida consume las capas de entradas de su material en orden de llegada
// (fecha_recepcion, luego registrado_en) y su costo es lo que consumió de cada capa.
// Es el mismo criterio del valor de inventario del Dashboard, así que costo
// consumido + valor en bodega = total comprado.
// Las salidas "sin costo" (sobrante transferido / reserva general, costo_cargo = 0)
// consumen stock pero no cargan costo al proyecto.
// Si se acaban las capas, el excedente se valora al último precio conocido
// (o al precio de catálogo si el material no tiene entradas).
export const salidaSinCosto = (s) =>
  ['sobrante_transferido', 'uso_general'].includes(s?.tipo_salida) || s?.costo_cargo === 0

export const costosSalidasFIFO = (entradas = [], salidas = [], materiales = []) => {
  // Orden: fecha del movimiento, luego instante de registro (registrado_en) y created_at
  // (un movimiento recién creado aún sin registrado_en cuenta como el más reciente)
  const orden = (fecha, m) => `${fecha || ''}|${m.registrado_en || '9999'}|${m.created_at || ''}`
  const capas = {}
  ;[...entradas]
    .sort((a, b) => orden(a.fecha_recepcion, a).localeCompare(orden(b.fecha_recepcion, b)))
    .forEach(e => {
      ;(capas[e.material_id] ||= []).push({
        cant: parseFloat(e.cantidad) || 0, precio: parseFloat(e.precio_unitario) || 0,
      })
    })
  const precioCatalogo = Object.fromEntries(materiales.map(m => [m.id, parseFloat(m.precio_unitario) || 0]))
  const costos = {}
  ;[...salidas]
    .sort((a, b) => orden(a.fecha_salida, a).localeCompare(orden(b.fecha_salida, b)))
    .forEach(s => {
      const cola = capas[s.material_id] || []
      let pendiente = parseFloat(s.cantidad) || 0
      let costo = 0
      let ultimoPrecio = precioCatalogo[s.material_id] || 0
      for (const capa of cola) {
        if (pendiente <= 0) break
        if (capa.cant <= 0) { ultimoPrecio = capa.precio; continue }
        const toma = Math.min(capa.cant, pendiente)
        costo += toma * capa.precio
        capa.cant -= toma
        pendiente -= toma
        ultimoPrecio = capa.precio
      }
      if (pendiente > 0) costo += pendiente * (cola.length ? cola[cola.length - 1].precio : ultimoPrecio)
      costos[s.id] = salidaSinCosto(s) ? 0 : r2(costo)
    })
  return costos
}

// ── Fechas ───────────────────────────────────────────────────────────────────
// Una fecha sin hora ('2026-10-04') con new Date() se interpreta como medianoche
// UTC y en América se muestra como el día anterior. fechaLocal la interpreta
// como fecha local; los timestamps completos se dejan igual.
export const fechaLocal = (v) => {
  if (!v) return null
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(v)
}
export const localeDe = (lang) => (lang === 'ES' ? 'es' : 'en-US')
export const fmtFecha = (v, lang = 'ES', opts) => {
  const d = fechaLocal(v)
  return d && !isNaN(d) ? d.toLocaleDateString(localeDe(lang), opts) : '—'
}
