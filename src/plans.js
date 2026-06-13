// ─────────────────────────────────────────────────────────────
//  MARY — Configuración de Planes
//  Fuente única de verdad para precios, límites y acceso a módulos
// ─────────────────────────────────────────────────────────────

export const PLAN_IDS = {
  STARTER:    'starter',
  PRO:        'pro',
  ENTERPRISE: 'enterprise',
}

// Precios base mensuales (USD)
export const PLAN_PRECIOS = {
  starter:    29.99,
  pro:        49.99,
  enterprise: 69.99,
}

// Descuento por pago anual (5%)
export const DESCUENTO_ANUAL = 0.05

// Costo usuario adicional (solo Enterprise, siempre mes a mes)
export const PRECIO_USUARIO_ADICIONAL = 20.00

// Límites por plan
export const PLAN_LIMITES = {
  starter:    { max_usuarios: 1,    max_proyectos: 2,  usuarios_adicionales: false },
  pro:        { max_usuarios: 3,    max_proyectos: 5,  usuarios_adicionales: false },
  enterprise: { max_usuarios: 5,    max_proyectos: 10, usuarios_adicionales: true  },
  // max_usuarios en enterprise = usuarios base incluidos; pueden agregar más pagando
}

// Módulos exclusivos por plan
// Los módulos aquí listados solo están disponibles en los planes indicados
export const MODULOS_PRO_PLUS = ['ordenes_cambio', 'avaluos']

// Módulos exclusivos del plan Enterprise
export const MODULOS_ENTERPRISE = ['auditoria']

// Función helper: retorna true si el plan tiene acceso al módulo
export function planTieneModulo(plan, moduloId) {
  if (!plan) return false
  if (MODULOS_ENTERPRISE.includes(moduloId)) return plan === PLAN_IDS.ENTERPRISE
  if (!MODULOS_PRO_PLUS.includes(moduloId)) return true   // módulo disponible en todos los planes
  return plan === PLAN_IDS.PRO || plan === PLAN_IDS.ENTERPRISE
}

// Función helper: calcula precio mensual según ciclo de facturación
export function calcPrecio(plan, anual = false) {
  const base = PLAN_PRECIOS[plan] ?? 0
  if (!anual) return base
  return parseFloat((base * (1 - DESCUENTO_ANUAL)).toFixed(2))
}

// Función helper: calcula precio anual total (cobro único)
export function calcPrecioAnual(plan) {
  return parseFloat((calcPrecio(plan, true) * 12).toFixed(2))
}

// Metadata de planes para UI
export const PLAN_INFO = {
  starter: {
    nombre:       'Starter',
    precio_mes:   PLAN_PRECIOS.starter,
    max_usuarios: PLAN_LIMITES.starter.max_usuarios,
    max_proyectos:PLAN_LIMITES.starter.max_proyectos,
    color:        '#5F5E5A',
    bg:           '#F1EFE8',
  },
  pro: {
    nombre:       'Pro',
    precio_mes:   PLAN_PRECIOS.pro,
    max_usuarios: PLAN_LIMITES.pro.max_usuarios,
    max_proyectos:PLAN_LIMITES.pro.max_proyectos,
    color:        '#0C447C',
    bg:           '#E6F1FB',
  },
  enterprise: {
    nombre:       'Enterprise',
    precio_mes:   PLAN_PRECIOS.enterprise,
    max_usuarios: PLAN_LIMITES.enterprise.max_usuarios,
    max_proyectos:PLAN_LIMITES.enterprise.max_proyectos,
    color:        '#3C3489',
    bg:           '#EEEDFE',
  },
}
