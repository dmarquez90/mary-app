import { useAuth } from './auth'
import { planTieneModulo } from './plans'
import { useSubscription } from './subscriptionContext'

const MATRIX = {
  dashboard:          { client_admin: true,  coordinador: true,  gerente: true,  residente: true,  bodeguero: true,  contador: true,  lectura: true  },
  proyectos_ver:      { client_admin: true,  coordinador: true,  gerente: true,  residente: 'own', bodeguero: 'own', contador: true,  lectura: true  },
  proyectos_crear:    { client_admin: true,  coordinador: true,  gerente: false, residente: false, bodeguero: false, contador: false, lectura: false },
  proyectos_editar:   { client_admin: true,  coordinador: true,  gerente: false, residente: false, bodeguero: false, contador: false, lectura: false },
  proyectos_eliminar: { client_admin: true,  coordinador: true,  gerente: false, residente: false, bodeguero: false, contador: false, lectura: false },
  presupuesto_ver:    { client_admin: true,  coordinador: true,  gerente: true,  residente: false, bodeguero: false, contador: true,  lectura: true  },
  presupuesto_editar: { client_admin: true,  coordinador: true,  gerente: true,  residente: false, bodeguero: false, contador: false, lectura: false },
  inventario_ver:     { client_admin: true,  coordinador: false, gerente: true,  residente: false, bodeguero: true,  contador: true,  lectura: true  },
  inventario_editar:  { client_admin: true,  coordinador: false, gerente: false, residente: false, bodeguero: true,  contador: false, lectura: false },
  mat_pres_ver:       { client_admin: true,  coordinador: true,  gerente: true,  residente: false, bodeguero: false, contador: true,  lectura: true  },
  mat_pres_editar:    { client_admin: true,  coordinador: true,  gerente: false, residente: false, bodeguero: false, contador: false, lectura: false },
  compras_ver:        { client_admin: true,  coordinador: true,  gerente: true,  residente: true,  bodeguero: true,  contador: true,  lectura: true  },
  solicitud_crear:    { client_admin: true,  coordinador: true,  gerente: false, residente: true,  bodeguero: false, contador: false, lectura: false },
  oc_crear:           { client_admin: true,  coordinador: false, gerente: true,  residente: false, bodeguero: false, contador: false, lectura: false },
  oc_aprobar:         { client_admin: true,  coordinador: false, gerente: 'cond',residente: false, bodeguero: false, contador: false, lectura: false },
  financiero_ver:     { client_admin: true,  coordinador: false, gerente: true,  residente: true,  bodeguero: false, contador: true,  lectura: true  },
  financiero_editar:  { client_admin: true,  coordinador: false, gerente: true, residente: true,  bodeguero: false, contador: true,  lectura: false },
  curvas_ver:         { client_admin: true,  coordinador: true,  gerente: true,  residente: false, bodeguero: false, contador: true,  lectura: true  },
  configuracion:      { client_admin: true,  coordinador: false, gerente: false, residente: false, bodeguero: false, contador: false, lectura: false },
  reportes_ver:       { client_admin: true,  coordinador: true,  gerente: true,  residente: false, bodeguero: false, contador: true,  lectura: false },
  // Módulos Pro+
  ordenes_cambio_ver:  { client_admin: true,  coordinador: true,  gerente: true,  residente: false, bodeguero: false, contador: true,  lectura: true  },
  ordenes_cambio_editar:{ client_admin: true, coordinador: true,  gerente: true,  residente: true,  bodeguero: false, contador: false, lectura: false },
  avaluos_ver:         { client_admin: true,  coordinador: true,  gerente: true,  residente: true,  bodeguero: false, contador: true,  lectura: true  },
  avaluos_editar:      { client_admin: true,  coordinador: true,  gerente: false, residente: true,  bodeguero: false, contador: false, lectura: false },
}

export const NAV_PERMISOS = {
  super_admin:  ['dashboard','proyectos','presupuesto','inventario','mat_pres','compras','ordenes_cambio','avaluos','financiero','curvas','reportes','chat'],
  client_admin: ['dashboard','proyectos','presupuesto','inventario','mat_pres','compras','ordenes_cambio','avaluos','financiero','curvas','reportes','chat'],
  coordinador:  ['dashboard','proyectos','presupuesto','mat_pres','compras','ordenes_cambio','reportes','chat'],
  gerente:      ['dashboard','proyectos','presupuesto','compras','ordenes_cambio','avaluos','financiero','curvas','reportes','chat'],
  residente:    ['dashboard','compras','ordenes_cambio','avaluos','financiero','chat'],
  bodeguero:    ['dashboard','inventario','compras','chat'],
  contador:     ['dashboard','proyectos','presupuesto','financiero','curvas','reportes','chat'],
  lectura:      ['dashboard','proyectos','presupuesto','inventario','compras','financiero','curvas','chat'],
}

export const MODULOS_PERMISOS = [
  { id: 'proyectos',      label_es: 'Proyectos',           label_en: 'Projects',           tieneEditar: true  },
  { id: 'presupuesto',    label_es: 'Presupuesto',         label_en: 'Budget',             tieneEditar: true  },
  { id: 'inventario',     label_es: 'Inventario',          label_en: 'Inventory',          tieneEditar: true  },
  { id: 'mat_pres',       label_es: 'Mat. Presupuestados', label_en: 'Budgeted Materials', tieneEditar: true  },
  { id: 'compras',        label_es: 'Compras / OC',        label_en: 'Purchases / PO',     tieneEditar: true  },
  { id: 'ordenes_cambio', label_es: 'Órdenes de Cambio',  label_en: 'Change Orders',      tieneEditar: true,  planRequerido: 'pro' },
  { id: 'avaluos',        label_es: 'Avalúos',             label_en: 'Valuations',         tieneEditar: true,  planRequerido: 'pro' },
  { id: 'financiero',     label_es: 'Financiero',          label_en: 'Financial',          tieneEditar: true  },
  { id: 'curvas',         label_es: 'Curva S',             label_en: 'S Curve',            tieneEditar: false },
  { id: 'reportes',       label_es: 'Reportes',            label_en: 'Reports',            tieneEditar: false },
]

const PERMISO_A_MODULO = {
  proyectos_ver:        ['proyectos','ver'],      proyectos_crear:       ['proyectos','editar'],
  proyectos_editar:     ['proyectos','editar'],   proyectos_eliminar:    ['proyectos','editar'],
  presupuesto_ver:      ['presupuesto','ver'],    presupuesto_editar:    ['presupuesto','editar'],
  inventario_ver:       ['inventario','ver'],     inventario_editar:     ['inventario','editar'],
  mat_pres_ver:         ['mat_pres','ver'],       mat_pres_editar:       ['mat_pres','editar'],
  compras_ver:          ['compras','ver'],        solicitud_crear:       ['compras','editar'],
  oc_crear:             ['compras','editar'],     oc_aprobar:            ['compras','editar'],
  financiero_ver:       ['financiero','ver'],     financiero_editar:     ['financiero','editar'],
  curvas_ver:           ['curvas','ver'],
  reportes_ver:         ['reportes','ver'],
  configuracion:        ['configuracion','ver'],
  ordenes_cambio_ver:   ['ordenes_cambio','ver'], ordenes_cambio_editar: ['ordenes_cambio','editar'],
  avaluos_ver:          ['avaluos','ver'],        avaluos_editar:        ['avaluos','editar'],
}

export function usePermissions() {
  const { perfil, plan, isSuperAdmin } = useAuth()
  const rol = perfil?.rol || 'lectura'
  const permisosCuston       = perfil?.permisos_custom || null
  const proyectosPermitidos  = perfil?.proyectos_permitidos || null
  const { isReadOnly }       = useSubscription()

  // ── Control por ROL ───────────────────────────────────────────────
  // Permisos de edición bloqueados en modo lectura (suscripción vencida)
  const EDIT_PERMISOS = ['proyectos_crear','proyectos_editar','proyectos_eliminar',
    'presupuesto_editar','inventario_editar','mat_pres_editar','solicitud_crear',
    'oc_crear','oc_aprobar','financiero_editar','ordenes_cambio_editar','avaluos_editar']

  const can = (permiso) => {
    if (isReadOnly && EDIT_PERMISOS.includes(permiso)) return false
    if (rol === 'super_admin') return true
    if (permisosCuston) {
      const mapped = PERMISO_A_MODULO[permiso]
      if (mapped) {
        const [modulo, tipo] = mapped
        if (permisosCuston[modulo] !== undefined) return permisosCuston[modulo][tipo] === true
      }
    }
    const row = MATRIX[permiso]
    if (!row) return false
    const val = row[rol]
    return val === true || val === 'own' || val === 'cond'
  }

  const canView = (modulo) => {
    if (rol === 'super_admin') return true
    if (permisosCuston?.[modulo] !== undefined) return permisosCuston[modulo].ver === true
    const row = MATRIX[`${modulo}_ver`]
    if (!row) return true
    const val = row[rol]
    return val === true || val === 'own'
  }

  const canEdit = (modulo) => {
    if (isReadOnly) return false
    if (rol === 'super_admin') return true
    if (permisosCuston?.[modulo] !== undefined) return permisosCuston[modulo].editar === true
    const row = MATRIX[`${modulo}_editar`]
    if (!row) return false
    return row[rol] === true
  }

  // ── Control por PLAN ──────────────────────────────────────────────
  // Retorna true si el plan del tenant incluye el módulo
  const canUsePlan = (moduloId) => {
    if (isSuperAdmin) return true
    return planTieneModulo(plan, moduloId)
  }

  // ── Visibilidad en nav ────────────────────────────────────────────
  // Los módulos Pro+ siguen apareciendo en el nav aunque el plan no los incluya,
  // pero con un badge "Pro+" y bloqueados al intentar usarlos.
  const navVisible = (id) => {
    if (rol === 'super_admin') return true
    if (permisosCuston?.[id] !== undefined) return permisosCuston[id].ver === true
    const modulos = NAV_PERMISOS[rol] || []
    return modulos.includes(id)
  }

  const canViewProject = (proyectoId) => {
    if (rol === 'super_admin' || rol === 'client_admin') return true
    if (!proyectosPermitidos || proyectosPermitidos.length === 0) return true
    return proyectosPermitidos.includes(proyectoId)
  }

  return { can, canView, canEdit, canUsePlan, navVisible, canViewProject, rol }
}
