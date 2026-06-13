// ─────────────────────────────────────────────────────────────
//  MARY — Categorías y subcategorías de Costos Indirectos
//  Fuente única de verdad, usada por Presupuesto (presupuesto de
//  indirectos), Financiero (registro de gastos / caja chica) y
//  Reportes (presupuestado vs ejecutado por categoría).
// ─────────────────────────────────────────────────────────────

export const CATEGORIAS_IND = {
  'Administración de obra': {
    es: 'Administración de obra',
    en: 'Project Administration',
    subs: {
      es: ['Personal administrativo de obra','Papelería, impresiones, comunicaciones','Seguridad e higiene industrial'],
      en: ['Administrative staff','Stationery, printing, communications','Safety and industrial hygiene'],
    }
  },
  'Instalaciones y servicios generales': {
    es: 'Instalaciones y servicios generales',
    en: 'Facilities & General Services',
    subs: {
      es: ['Oficina, bodegas, casetas','Baños portátiles','Energía eléctrica temporal','Agua, internet, vigilancia','Señalización y control de accesos'],
      en: ['Office, warehouses, booths','Portable restrooms','Temporary electrical power','Water, internet, security','Signage and access control'],
    }
  },
  'Seguros, fianzas y garantías': {
    es: 'Seguros, fianzas y garantías',
    en: 'Insurance, Bonds & Guarantees',
    subs: {
      es: ['Seguro de obra','Seguro de responsabilidad civil','Fianzas de cumplimiento y anticipo'],
      en: ['Construction insurance','Civil liability insurance','Performance and advance bonds'],
    }
  },
  'Servicios profesionales y legales': {
    es: 'Servicios profesionales y legales',
    en: 'Professional & Legal Services',
    subs: {
      es: ['Licencias','Permisos','Consultorías'],
      en: ['Licenses','Permits','Consultancies'],
    }
  },
  'Caja Chica': {
    es: 'Caja Chica',
    en: 'Petty Cash',
    subs: {
      es: ['Fondo asignado'],
      en: ['Allocated fund'],
    }
  },
}

export const CAT_KEYS = Object.keys(CATEGORIAS_IND)

// Helper: lista de subcategorías de una categoría en el idioma indicado
export function getSubcategorias(categoriaKey, lang = 'ES') {
  const cat = CATEGORIAS_IND[categoriaKey]
  if (!cat) return []
  return lang === 'ES' ? cat.subs.es : cat.subs.en
}

// Helper: label legible de una categoría en el idioma indicado
export function getCategoriaLabel(categoriaKey, lang = 'ES') {
  const cat = CATEGORIAS_IND[categoriaKey]
  if (!cat) return categoriaKey
  return lang === 'ES' ? cat.es : cat.en
}
