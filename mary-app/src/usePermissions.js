import { useAuth } from './auth'

// Matriz de permisos por módulo y rol
// true = acceso completo, 'view' = solo lectura, false = sin acceso
const MATRIX = {
  //                    client_admin  coordinador  gerente   residente  bodeguero  contador   lectura
  dashboard:          { client_admin: true,  coordinador: true,  gerente: true,  residente: true,  bodeguero: true,  contador: true,  lectura: true  },

  // PROYECTOS
  proyectos_ver:      { client_admin: true,  coordinador: true,  gerente: true,  residente: 'own', bodeguero: 'own', contador: true,  lectura: true  },
  proyectos_crear:    { client_admin: true,  coordinador: true,  gerente: false, residente: false, bodeguero: false, contador: false, lectura: false },
  proyectos_editar:   { client_admin: true,  coordinador: true,  gerente: false, residente: false, bodeguero: false, contador: false, lectura: false },
  proyectos_eliminar: { client_admin: true,  coordinador: true,  gerente: false, residente: false, bodeguero: false, contador: false, lectura: false },

  // PRESUPUESTO
  presupuesto_ver:    { client_admin: true,  coordinador: true,  gerente: true,  residente: false, bodeguero: false, contador: true,  lectura: true  },
  presupuesto_editar: { client_admin: true,  coordinador: true,  gerente: true,  residente: false, bodeguero: false, contador: false, lectura: false },

  // INVENTARIO
  inventario_ver:     { client_admin: true,  coordinador: false, gerente: true,  residente: false, bodeguero: true,  contador: true,  lectura: true  },
  inventario_editar:  { client_admin: true,  coordinador: false, gerente: false, residente: false, bodeguero: true,  contador: false, lectura: false },

  // MATERIALES PRESUPUESTADOS
  mat_pres_ver:       { client_admin: true,  coordinador: true,  gerente: true,  residente: false, bodeguero: false, contador: true,  lectura: true  },
  mat_pres_editar:    { client_admin: true,  coordinador: true,  gerente: false, residente: false, bodeguero: false, contador: false, lectura: false },

  // COMPRAS
  compras_ver:        { client_admin: true,  coordinador: true,  gerente: true,  residente: true,  bodeguero: true,  contador: true,  lectura: true  },
  solicitud_crear:    { client_admin: true,  coordinador: true,  gerente: false, residente: true,  bodeguero: false, contador: false, lectura: false },
  oc_crear:           { client_admin: true,  coordinador: false, gerente: true,  residente: false, bodeguero: false, contador: false, lectura: false },
  oc_aprobar:         { client_admin: true,  coordinador: false, gerente: 'cond',residente: false, bodeguero: false, contador: false, lectura: false },

  // FINANCIERO
  financiero_ver:     { client_admin: true,  coordinador: false, gerente: true,  residente: true,  bodeguero: false, contador: true,  lectura: true  },
  financiero_editar:  { client_admin: true,  coordinador: false, gerente: false, residente: true,  bodeguero: false, contador: true,  lectura: false },

  // CURVA S
  curvas_ver:         { client_admin: true,  coordinador: true,  gerente: true,  residente: false, bodeguero: false, contador: true,  lectura: true  },

  // CONFIGURACIÓN USUARIOS
  configuracion:      { client_admin: true,  coordinador: false, gerente: false, residente: false, bodeguero: false, contador: false, lectura: false },
}

// Módulos visibles en el sidebar por rol
export const NAV_PERMISOS = {
  super_admin:  ['dashboard','proyectos','presupuesto','inventario','mat_pres','compras','financiero','curvas'],
  client_admin: ['dashboard','proyectos','presupuesto','inventario','mat_pres','compras','financiero','curvas'],
  coordinador:  ['dashboard','proyectos','presupuesto','mat_pres','compras'],
  gerente:      ['dashboard','proyectos','presupuesto','compras','financiero','curvas'],
  residente:    ['dashboard','compras','financiero'],
  bodeguero:    ['dashboard','inventario','compras'],
  contador:     ['dashboard','proyectos','presupuesto','financiero','curvas'],
  lectura:      ['dashboard','proyectos','presupuesto','inventario','compras','financiero','curvas'],
}

export function usePermissions() {
  const { perfil } = useAuth()
  const rol = perfil?.rol || 'lectura'

  const can = (permiso) => {
    if (rol === 'super_admin') return true
    const row = MATRIX[permiso]
    if (!row) return false
    const val = row[rol]
    return val === true || val === 'own' || val === 'cond'
  }

  const canView = (modulo) => {
    if (rol === 'super_admin') return true
    const permisoVer = `${modulo}_ver`
    const row = MATRIX[permisoVer]
    if (!row) return true // si no hay restricción definida, permitir
    const val = row[rol]
    return val === true || val === 'own'
  }

  const canEdit = (modulo) => {
    if (rol === 'super_admin') return true
    const permisoEditar = `${modulo}_editar`
    const row = MATRIX[permisoEditar]
    if (!row) return false
    return row[rol] === true
  }

  const navVisible = (id) => {
    if (rol === 'super_admin') return true
    const modulos = NAV_PERMISOS[rol] || []
    return modulos.includes(id)
  }

  return { can, canView, canEdit, navVisible, rol }
}
