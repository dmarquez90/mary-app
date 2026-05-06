import { useAuth } from './auth'

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
  financiero_editar:  { client_admin: true,  coordinador: false, gerente: false, residente: true,  bodeguero: false, contador: true,  lectura: false },

  curvas_ver:         { client_admin: true,  coordinador: true,  gerente: true,  residente: false, bodeguero: false, contador: true,  lectura: true  },

  configuracion:      { client_admin: true,  coordinador: false, gerente: false, residente: false, bodeguero: false, contador: false, lectura: false },

  reportes_ver:       { client_admin: true,  coordinador: true,  gerente: true,  residente: false, bodeguero: false, contador: true,  lectura: false },
}

export const NAV_PERMISOS = {
  super_admin:  ['dashboard','proyectos','presupuesto','inventario','mat_pres','compras','financiero','curvas','reportes'],
  client_admin: ['dashboard','proyectos','presupuesto','inventario','mat_pres','compras','financiero','curvas','reportes'],
  coordinador:  ['dashboard','proyectos','presupuesto','mat_pres','compras','reportes'],
  gerente:      ['dashboard','proyectos','presupuesto','compras','financiero','curvas','reportes'],
  residente:    ['dashboard','compras','financiero'],
  bodeguero:    ['dashboard','inventario','compras'],
  contador:     ['dashboard','proyectos','presupuesto','financiero','curvas','reportes'],
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
    if (!row) return true
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
