import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import maryLogo from '../assets/mary-logo.png'

const BRAND       = '#1B3A6B'
const BRAND_LIGHT = '#2E5FA3'
const BRAND_DARK  = '#122848'

const ROLES  = ['client_admin','coordinador','gerente','residente','bodeguero','contador','lectura']
const PLANES = ['starter','pro','enterprise']

const PLAN_LIMITS = {
  starter:    { max_usuarios: 5,   max_proyectos: 2   },
  pro:        { max_usuarios: 15,  max_proyectos: 10  },
  enterprise: { max_usuarios: 999, max_proyectos: 999 },
}

const PLAN_COLORS = {
  starter:    'bg-gray-100 text-gray-600',
  pro:        'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
}

const ROL_COLORS = {
  super_admin:  'bg-red-100 text-red-700',
  client_admin: 'bg-amber-100 text-amber-700',
  gerente:      'bg-blue-100 text-blue-700',
  coordinador:  'bg-cyan-100 text-cyan-700',
  residente:    'bg-green-100 text-green-700',
  bodeguero:    'bg-orange-100 text-orange-700',
  contador:     'bg-violet-100 text-violet-700',
  lectura:      'bg-gray-100 text-gray-500',
}

const inputCls  = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B]'
const selectCls = inputCls

export default function Admin() {
  const { perfil, logout } = useAuth()

  const [lang, setLangState] = useState(() => localStorage.getItem('mary_lang') || 'ES')
  const isEs = lang === 'ES'

  useEffect(() => {
    const handler = () => setLangState(localStorage.getItem('mary_lang') || 'ES')
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const toggleLang = () => {
    const next = lang === 'ES' ? 'EN' : 'ES'
    localStorage.setItem('mary_lang', next)
    setLangState(next)
  }

  const T = {
    title:            isEs ? 'Panel de Administración' : 'Administration Panel',
    subtitle:         isEs ? 'Super Admin · MPS' : 'Super Admin · MPS',
    backToMary:       isEs ? '← Volver a MARY' : '← Back to MARY',
    signOut:          isEs ? 'Cerrar sesión' : 'Sign out',
    companies:        isEs ? 'Empresas' : 'Companies',
    users:            isEs ? 'Usuarios' : 'Users',
    newCompany:       isEs ? '+ Nueva empresa' : '+ New company',
    newUser:          isEs ? '+ Nuevo usuario' : '+ New user',
    companiesReg:     isEs ? 'Empresas registradas' : 'Registered companies',
    totalUsers:       isEs ? 'Usuarios totales' : 'Total users',
    entPlans:         isEs ? 'Planes enterprise' : 'Enterprise plans',
    active:           isEs ? 'activas' : 'active',
    activeU:          isEs ? 'activos' : 'active',
    activeLabel:      isEs ? 'Activo' : 'Active',
    inactiveLabel:    isEs ? 'Inactivo' : 'Inactive',
    company:          isEs ? 'Empresa' : 'Company',
    planCol:          isEs ? 'Plan' : 'Plan',
    usersCol:         isEs ? 'Usuarios' : 'Users',
    maxProjects:      isEs ? 'Proyectos máx.' : 'Max projects',
    statusCol:        isEs ? 'Estado' : 'Status',
    createdCol:       isEs ? 'Creada' : 'Created',
    actionsCol:       isEs ? 'Acciones' : 'Actions',
    nameCol:          isEs ? 'Nombre' : 'Name',
    emailCol:         'Email',
    companyCol:       isEs ? 'Empresa' : 'Company',
    roleCol:          isEs ? 'Rol' : 'Role',
    lastAccess:       isEs ? 'Último acceso' : 'Last access',
    edit:             isEs ? 'Editar' : 'Edit',
    deactivate:       isEs ? 'Desactivar' : 'Deactivate',
    activate:         isEs ? 'Activar' : 'Activate',
    delete:           isEs ? 'Eliminar' : 'Delete',
    cancel:           isEs ? 'Cancelar' : 'Cancel',
    save:             isEs ? 'Guardar' : 'Save',
    saving:           isEs ? 'Guardando...' : 'Saving...',
    deleting:         isEs ? 'Eliminando...' : 'Deleting...',
    loading:          isEs ? 'Cargando...' : 'Loading...',
    confirm:          isEs ? 'Confirmar' : 'Confirm',
    confirmTitle:     isEs ? '¿Confirmar acción?' : 'Confirm action?',
    confirmDelCompany:isEs ? 'Eliminar empresa permanentemente' : 'Permanently delete company',
    confirmDelUser:   isEs ? 'Eliminar usuario permanentemente' : 'Permanently delete user',
    newCompanyTitle:  isEs ? 'Nueva empresa' : 'New company',
    editCompanyTitle: isEs ? 'Editar empresa' : 'Edit company',
    companyName:      isEs ? 'Nombre de la empresa' : 'Company name',
    companyNamePh:    isEs ? 'Constructora XYZ S.A.' : 'XYZ Construction Inc.',
    selectPlan:       isEs ? '— Seleccionar —' : '— Select —',
    limitLabel:       isEs ? 'Límite' : 'Limit',
    usersLimit:       isEs ? 'usuarios' : 'users',
    projectsLimit:    isEs ? 'proyectos' : 'projects',
    stateLabel:       isEs ? 'Estado' : 'Status',
    newUserTitle:     isEs ? 'Nuevo usuario' : 'New user',
    editUserTitle:    isEs ? 'Editar usuario' : 'Edit user',
    fullName:         isEs ? 'Nombre completo' : 'Full name',
    tempPass:         isEs ? 'Contraseña temporal' : 'Temporary password',
    tempPassHint:     isEs ? 'Si dejas vacío se envía email de activación al usuario.' : 'Leave empty to send an activation email.',
    selectCompany:    isEs ? '— Seleccionar empresa —' : '— Select company —',
    selectRole:       isEs ? '— Seleccionar rol —' : '— Select role —',
    emailLocked:      isEs ? 'El email no se puede modificar.' : 'Email cannot be modified.',
    role_client_admin: isEs ? 'Administrador' : 'Administrator',
    role_coordinador:  isEs ? 'Coordinador' : 'Coordinator',
    role_gerente:      isEs ? 'Gerente' : 'Manager',
    role_residente:    isEs ? 'Residente' : 'Site Supervisor',
    role_bodeguero:    isEs ? 'Bodeguero' : 'Warehouse',
    role_contador:     isEs ? 'Contador' : 'Accountant',
    role_lectura:      isEs ? 'Solo Lectura' : 'Read Only',
    role_super_admin:  'Super Admin',
    plan_starter:     'Starter',
    plan_pro:         'Pro',
    plan_enterprise:  'Enterprise',
    registered:       isEs ? 'empresa(s) registrada(s)' : 'registered company(ies)',
    registeredU:      isEs ? 'usuario(s) registrado(s)' : 'registered user(s)',
  }

  const [tab, setTab]           = useState('tenants')
  const [tenants, setTenants]   = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading]   = useState(true)
  const [drawer, setDrawer]     = useState(null)
  const [form, setForm]         = useState({})
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [confirmDel, setConfirmDel] = useState(null) // { msg, action, isDangerous }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    const [{ data: t }, { data: u }] = await Promise.all([
      supabase.from('tenants').select('*').order('fecha_creacion', { ascending: false }),
      supabase.from('usuarios').select('*, tenants(nombre_empresa)').order('nombre'),
    ])
    setTenants(t || [])
    setUsuarios(u || [])
    setLoading(false)
  }

  const showSuccess = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  const saveTenant = async () => {
    if (!form.nombre_empresa || !form.plan) return
    setSaving(true); setError('')
    try {
      const limits = PLAN_LIMITS[form.plan]
      if (form.id) {
        await supabase.from('tenants').update({
          nombre_empresa: form.nombre_empresa,
          plan:           form.plan,
          max_usuarios:   limits.max_usuarios,
          max_proyectos:  limits.max_proyectos,
          activo:         form.activo,
        }).eq('id', form.id)
        showSuccess(isEs ? 'Empresa actualizada.' : 'Company updated.')
      } else {
        await supabase.from('tenants').insert({
          nombre_empresa: form.nombre_empresa,
          plan:           form.plan,
          max_usuarios:   limits.max_usuarios,
          max_proyectos:  limits.max_proyectos,
          activo:         true,
        })
        showSuccess(isEs ? 'Empresa creada.' : 'Company created.')
      }
      await loadAll(); setDrawer(null)
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  const toggleTenant = async (t) => {
    await supabase.from('tenants').update({ activo: !t.activo }).eq('id', t.id)
    await loadAll()
  }

  // ── ELIMINAR EMPRESA Y TODOS SUS DATOS ───────────────────────────────────
  const deleteTenant = async (tenantId) => {
    setDeleting(true)
    try {
      // 1. Obtener todos los proyectos del tenant
      const { data: proyectos } = await supabase.from('proyectos').select('id').eq('tenant_id', tenantId)
      const pids = (proyectos || []).map(p => p.id)

      if (pids.length > 0) {
        // 2. Eliminar árbol completo de cada proyecto
        for (const pid of pids) {
          // Subcontratos
          const { data: scs } = await supabase.from('subcontratos_contratos').select('id').eq('proyecto_id', pid)
          if (scs?.length) {
            const scIds = scs.map(s => s.id)
            const { data: avs } = await supabase.from('subcontratos_avaluos').select('id').in('subcontrato_id', scIds)
            if (avs?.length) await supabase.from('subcontratos_avaluo_items').delete().in('avaluo_id', avs.map(a => a.id))
            await supabase.from('subcontratos_avaluos').delete().in('subcontrato_id', scIds)
            await supabase.from('subcontratos_items').delete().in('subcontrato_id', scIds)
            await supabase.from('subcontratos_contratos').delete().eq('proyecto_id', pid)
          }
          // Avalúos cliente
          const { data: avsCli } = await supabase.from('avaluos_cliente').select('id').eq('proyecto_id', pid)
          if (avsCli?.length) {
            await supabase.from('avaluos_cliente_items').delete().in('avaluo_id', avsCli.map(a => a.id))
            await supabase.from('avaluos_cliente').delete().eq('proyecto_id', pid)
          }
          // Órdenes de cambio
          const { data: ocsC } = await supabase.from('ordenes_cambio').select('id').eq('proyecto_id', pid)
          if (ocsC?.length) {
            await supabase.from('ordenes_cambio_items').delete().in('oc_id', ocsC.map(o => o.id))
            await supabase.from('ordenes_cambio').delete().eq('proyecto_id', pid)
          }
          // Órdenes de compra
          const { data: ocs } = await supabase.from('ordenes_compra').select('id').eq('proyecto_id', pid)
          if (ocs?.length) {
            await supabase.from('ordenes_compra_items').delete().in('oc_id', ocs.map(o => o.id))
            await supabase.from('ordenes_compra').delete().eq('proyecto_id', pid)
          }
          // Solicitudes
          const { data: sols } = await supabase.from('solicitudes').select('id').eq('proyecto_id', pid)
          if (sols?.length) {
            await supabase.from('solicitud_items').delete().in('solicitud_id', sols.map(s => s.id))
            await supabase.from('solicitudes').delete().eq('proyecto_id', pid)
          }
          // Resto
          await supabase.from('materiales_presupuestados').delete().eq('proyecto_id', pid)
          await supabase.from('costos_directos').delete().eq('proyecto_id', pid)
          await supabase.from('costos_indirectos').delete().eq('proyecto_id', pid)
          await supabase.from('nominas').delete().eq('proyecto_id', pid)
          await supabase.from('equipos').delete().eq('proyecto_id', pid)
          await supabase.from('subcontratos').delete().eq('proyecto_id', pid)
          await supabase.from('salidas').delete().eq('proyecto_id', pid)
          await supabase.from('entradas').delete().eq('proyecto_id', pid)
          await supabase.from('presupuesto').delete().eq('proyecto_id', pid)
          await supabase.from('fases').delete().eq('proyecto_id', pid)
        }
        // 3. Eliminar proyectos
        await supabase.from('proyectos').delete().eq('tenant_id', tenantId)
      }

      // 4. Eliminar materiales del tenant
      await supabase.from('materiales').delete().eq('tenant_id', tenantId)

      // 5. Eliminar solicitudes de eliminación
      await supabase.from('solicitudes_eliminacion').delete().eq('tenant_id', tenantId)

      // 6. Eliminar usuarios del tenant
      await supabase.from('usuarios').delete().eq('tenant_id', tenantId)

      // 7. Eliminar tenant
      await supabase.from('tenants').delete().eq('id', tenantId)

      showSuccess(isEs ? 'Empresa eliminada permanentemente.' : 'Company permanently deleted.')
      await loadAll()
    } catch (e) {
      setError(e.message)
    }
    setDeleting(false)
  }

  // ── ELIMINAR USUARIO ──────────────────────────────────────────────────────
  const deleteUsuario = async (userId) => {
    setDeleting(true)
    try {
      await supabase.from('usuarios').delete().eq('id', userId)
      showSuccess(isEs ? 'Usuario eliminado.' : 'User deleted.')
      await loadAll()
    } catch (e) {
      setError(e.message)
    }
    setDeleting(false)
  }

  const saveUsuario = async () => {
    if (!form.email || !form.nombre || !form.rol || !form.tenant_id) return
    setSaving(true); setError('')
    try {
      if (form.id) {
        await supabase.from('usuarios').update({
          nombre: form.nombre, rol: form.rol, tenant_id: form.tenant_id, activo: form.activo,
        }).eq('id', form.id)
        showSuccess(isEs ? 'Usuario actualizado.' : 'User updated.')
      } else {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              email: form.email,
              password: form.password && form.password.length >= 6 ? form.password : Math.random().toString(36).slice(-10) + 'A1!',
              nombre: form.nombre,
              rol: form.rol,
              tenant_id: form.tenant_id
            })
          }
        )
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Error al crear usuario')
        showSuccess(isEs ? `Usuario ${form.nombre} creado.` : `User ${form.nombre} created.`)
      }
      await loadAll(); setDrawer(null)
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  const toggleUsuario = async (u) => {
    await supabase.from('usuarios').update({ activo: !u.activo }).eq('id', u.id)
    await loadAll()
  }

  const openDrawer = (type, data = {}) => {
    setForm(data); setError(''); setDrawer(type)
  }

  const rolLabel = (rol) => T[`role_${rol}`] || rol?.replace('_',' ')

  return (
    <div className="min-h-screen" style={{ background: '#F0F4F8' }}>

      {/* SUCCESS TOAST */}
      {success && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium">
          ✓ {success}
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-3">
              {confirmDel.isDangerous && (
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-lg flex-shrink-0">⚠</div>
              )}
              <p className="text-sm font-semibold text-gray-800">{T.confirmTitle}</p>
            </div>
            <p className="text-sm text-gray-500 mb-2">{confirmDel.msg}</p>
            {confirmDel.isDangerous && (
              <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-700 mb-4">
                {isEs
                  ? '⚠ Esta acción es irreversible. Se eliminarán todos los proyectos, presupuestos, materiales, órdenes de compra y demás datos asociados.'
                  : '⚠ This action is irreversible. All projects, budgets, materials, purchase orders and associated data will be deleted.'}
              </div>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setConfirmDel(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">{T.cancel}</button>
              <button
                onClick={async () => { await confirmDel.action(); setConfirmDel(null) }}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-60">
                {deleting ? T.deleting : (confirmDel.isDangerous ? T.delete : T.confirm)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER */}
      {drawer && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/30" onClick={() => setDrawer(null)} />
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#D6E4F0' }}>
              <p className="font-semibold text-gray-800 text-sm">
                {drawer === 'new_tenant'  ? T.newCompanyTitle  :
                 drawer === 'edit_tenant' ? T.editCompanyTitle :
                 drawer === 'new_user'    ? T.newUserTitle     : T.editUserTitle}
              </p>
              <button onClick={() => setDrawer(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="flex-1 p-6 flex flex-col gap-4">

              {/* TENANT FORM */}
              {(drawer === 'new_tenant' || drawer === 'edit_tenant') && <>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">{T.companyName} *</label>
                  <input className={inputCls} value={form.nombre_empresa||''} onChange={set('nombre_empresa')} placeholder={T.companyNamePh} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">{T.planCol} *</label>
                  <select className={selectCls} value={form.plan||''} onChange={set('plan')}>
                    <option value="">{T.selectPlan}</option>
                    {PLANES.map(p => <option key={p} value={p}>{T[`plan_${p}`]}</option>)}
                  </select>
                </div>
                {form.plan && (
                  <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
                    {T.limitLabel}: {PLAN_LIMITS[form.plan].max_usuarios} {T.usersLimit} · {PLAN_LIMITS[form.plan].max_proyectos} {T.projectsLimit}
                  </div>
                )}
                {drawer === 'edit_tenant' && (
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-gray-500">{T.stateLabel}</label>
                    <button onClick={() => setForm(f => ({ ...f, activo: !f.activo }))}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${form.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {form.activo ? T.activeLabel : T.inactiveLabel}
                    </button>
                  </div>
                )}
              </>}

              {/* USER FORM */}
              {(drawer === 'new_user' || drawer === 'edit_user') && <>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">{T.fullName} *</label>
                  <input className={inputCls} value={form.nombre||''} onChange={set('nombre')} placeholder="Juan Pérez" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">{T.emailCol} *</label>
                  <input type="email" className={inputCls} value={form.email||''} onChange={set('email')}
                    placeholder="juan@empresa.com" disabled={drawer === 'edit_user'} />
                  {drawer === 'edit_user' && <p className="text-xs text-gray-400 mt-1">{T.emailLocked}</p>}
                </div>
                {drawer === 'new_user' && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">{T.tempPass}</label>
                    <input type="password" className={inputCls} value={form.password||''} onChange={set('password')} placeholder="Min. 6 chars" />
                    <p className="text-xs text-gray-400 mt-1">{T.tempPassHint}</p>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">{T.companyCol} *</label>
                  <select className={selectCls} value={form.tenant_id||''} onChange={set('tenant_id')}>
                    <option value="">{T.selectCompany}</option>
                    {tenants.filter(t => t.activo).map(t => <option key={t.id} value={t.id}>{t.nombre_empresa}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">{T.roleCol} *</label>
                  <select className={selectCls} value={form.rol||''} onChange={set('rol')}>
                    <option value="">{T.selectRole}</option>
                    {ROLES.map(r => <option key={r} value={r}>{rolLabel(r)}</option>)}
                  </select>
                </div>
                {drawer === 'edit_user' && (
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-gray-500">{T.stateLabel}</label>
                    <button onClick={() => setForm(f => ({ ...f, activo: !f.activo }))}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${form.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {form.activo ? T.activeLabel : T.inactiveLabel}
                    </button>
                  </div>
                )}
              </>}

              {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">{error}</div>}

              <div className="flex gap-2 mt-auto pt-2">
                <button onClick={() => setDrawer(null)}
                  className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">{T.cancel}</button>
                <button onClick={drawer.includes('tenant') ? saveTenant : saveUsuario}
                  disabled={saving}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
                  style={{ background: BRAND }}>
                  {saving ? T.saving : T.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="flex items-center justify-between px-8 py-4 bg-white shadow-sm">
        <div className="flex items-center gap-4">
          <img src={maryLogo} alt="MARY" className="h-8 w-auto object-contain" />
          <div className="w-px h-6 bg-gray-200" />
          <div>
            <p className="font-bold text-gray-900 text-sm leading-none">{T.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{T.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="/" className="text-xs text-gray-400 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 border border-gray-200 transition-colors">
            {T.backToMary}
          </a>
          <button onClick={toggleLang}
            className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 transition-colors hover:bg-gray-50"
            style={{ color: BRAND }}>
            🌐 {isEs ? 'EN' : 'ES'}
          </button>
          <span className="text-xs text-gray-500 font-medium">{perfil?.nombre}</span>
          <button onClick={logout}
            className="text-xs text-gray-400 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 border border-gray-200 transition-colors">
            {T.signOut}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: T.companiesReg, value: tenants.length,  sub: `${tenants.filter(t=>t.activo).length} ${T.active}` },
            { label: T.totalUsers,   value: usuarios.length, sub: `${usuarios.filter(u=>u.activo).length} ${T.activeU}` },
            { label: T.entPlans,     value: tenants.filter(t=>t.plan==='enterprise'&&t.activo).length, sub: T.active },
            { label: isEs ? 'Trials activos' : 'Active trials', value: tenants.filter(t=>t.es_trial&&t.activo&&t.trial_fin&&new Date(t.trial_fin)>new Date()).length, sub: isEs ? '60 días gratis' : '60 days free' },
          ].map((k,i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="text-xs text-gray-400 mb-1">{k.label}</p>
              <p className="text-2xl font-bold" style={{ color: BRAND }}>{k.value}</p>
              <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div className="flex border-b border-gray-200 mb-6">
          {[['tenants', T.companies], ['usuarios', T.users]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
                ${tab===id ? 'border-[#1B3A6B] text-[#1B3A6B]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">{T.loading}</div>
        ) : tab === 'tenants' ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-500">{tenants.length} {T.registered}</p>
              <button onClick={() => openDrawer('new_tenant', { plan:'pro' })}
                className="px-4 py-2 text-sm font-semibold text-white rounded-lg"
                style={{ background: BRAND }}>{T.newCompany}</button>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {[T.company, T.planCol, T.usersCol, T.maxProjects, T.statusCol, T.createdCol, T.actionsCol].map((h,i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {tenants.map(t => {
                    const nUsuarios = usuarios.filter(u => u.tenant_id === t.id).length
                    return (
                      <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-800">{t.nombre_empresa}</p>
                          {(t.telefono || t.pais) && (
                            <p className="text-xs text-gray-400 mt-0.5">{[t.pais, t.telefono].filter(Boolean).join(' · ')}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${PLAN_COLORS[t.plan]}`}>
                              {T[`plan_${t.plan}`]}
                            </span>
                            {t.es_trial && (() => {
                              const dias = t.trial_fin ? Math.max(0, Math.ceil((new Date(t.trial_fin) - new Date()) / 86400000)) : 0
                              return (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${dias > 0 ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-600'}`}>
                                  {dias > 0 ? `Trial · ${dias}d` : isEs ? 'Trial expirado' : 'Trial expired'}
                                </span>
                              )
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{nUsuarios} / {t.max_usuarios}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{t.max_proyectos}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {t.activo ? T.activeLabel : T.inactiveLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{t.fecha_creacion?.slice(0,10)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => openDrawer('edit_tenant', {...t})}
                              className="text-xs px-2 py-1 border border-gray-200 rounded-lg hover:bg-gray-50">{T.edit}</button>
                            <button onClick={() => setConfirmDel({
                              msg: `¿${t.activo ? T.deactivate : T.activate} "${t.nombre_empresa}"?`,
                              action: () => toggleTenant(t),
                              isDangerous: false,
                            })}
                              className={`text-xs px-2 py-1 rounded-lg border ${t.activo ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                              {t.activo ? T.deactivate : T.activate}
                            </button>
                            {/* ── BOTÓN ELIMINAR EMPRESA ── */}
                            <button onClick={() => setConfirmDel({
                              msg: isEs
                                ? `¿Eliminar permanentemente la empresa "${t.nombre_empresa}" y todos sus datos?`
                                : `Permanently delete company "${t.nombre_empresa}" and all its data?`,
                              action: () => deleteTenant(t.id),
                              isDangerous: true,
                            })}
                              className="text-xs px-2 py-1 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 font-medium">
                              🗑 {T.delete}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-500">{usuarios.length} {T.registeredU}</p>
              <button onClick={() => openDrawer('new_user')}
                className="px-4 py-2 text-sm font-semibold text-white rounded-lg"
                style={{ background: BRAND }}>{T.newUser}</button>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {[T.nameCol, T.emailCol, T.companyCol, T.roleCol, T.statusCol, T.lastAccess, T.actionsCol].map((h,i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {usuarios.map(u => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{u.nombre}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{u.email}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{u.tenants?.nombre_empresa || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROL_COLORS[u.rol] || 'bg-gray-100 text-gray-500'}`}>
                          {rolLabel(u.rol)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {u.activo ? T.activeLabel : T.inactiveLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {u.fecha_acceso ? new Date(u.fecha_acceso).toLocaleDateString(isEs ? 'es' : 'en') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openDrawer('edit_user', {...u})}
                            className="text-xs px-2 py-1 border border-gray-200 rounded-lg hover:bg-gray-50">{T.edit}</button>
                          <button onClick={() => setConfirmDel({
                            msg: `¿${u.activo ? T.deactivate : T.activate} "${u.nombre}"?`,
                            action: () => toggleUsuario(u),
                            isDangerous: false,
                          })}
                            className={`text-xs px-2 py-1 rounded-lg border ${u.activo ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                            {u.activo ? T.deactivate : T.activate}
                          </button>
                          {/* ── BOTÓN ELIMINAR USUARIO ── */}
                          <button onClick={() => setConfirmDel({
                            msg: isEs
                              ? `¿Eliminar permanentemente al usuario "${u.nombre}" (${u.email})?`
                              : `Permanently delete user "${u.nombre}" (${u.email})?`,
                            action: () => deleteUsuario(u.id),
                            isDangerous: true,
                          })}
                            className="text-xs px-2 py-1 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 font-medium">
                            🗑 {T.delete}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
