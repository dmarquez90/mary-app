import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { supabaseAdmin } from '../supabaseAdmin'
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
  const [tab, setTab]           = useState('tenants')
  const [tenants, setTenants]   = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading]   = useState(true)
  const [drawer, setDrawer]     = useState(null)
  const [form, setForm]         = useState({})
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [confirmDel, setConfirmDel] = useState(null)
  const [success, setSuccess]   = useState('')

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

  // ── TENANT ──────────────────────────────────────────────
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
        showSuccess('Empresa actualizada correctamente.')
      } else {
        await supabase.from('tenants').insert({
          nombre_empresa: form.nombre_empresa,
          plan:           form.plan,
          max_usuarios:   limits.max_usuarios,
          max_proyectos:  limits.max_proyectos,
          activo:         true,
        })
        showSuccess('Empresa creada correctamente.')
      }
      await loadAll()
      setDrawer(null)
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  const toggleTenant = async (t) => {
    await supabase.from('tenants').update({ activo: !t.activo }).eq('id', t.id)
    await loadAll()
  }

  // ── USUARIO ─────────────────────────────────────────────
  const saveUsuario = async () => {
    if (!form.email || !form.nombre || !form.rol || !form.tenant_id) return
    setSaving(true); setError('')
    try {
      if (form.id) {
        await supabase.from('usuarios').update({
          nombre:    form.nombre,
          rol:       form.rol,
          tenant_id: form.tenant_id,
          activo:    form.activo,
        }).eq('id', form.id)
        showSuccess('Usuario actualizado correctamente.')
      } else {
        // Crear en Supabase Auth usando service key
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email:         form.email,
          password:      form.password && form.password.length >= 6
                           ? form.password
                           : Math.random().toString(36).slice(-10) + 'A1!',
          email_confirm: true,
        })
        if (authError) throw authError

        // Insertar perfil en tabla usuarios
        await supabase.from('usuarios').insert({
          id:         authData.user.id,
          tenant_id:  form.tenant_id,
          nombre:     form.nombre,
          email:      form.email,
          rol:        form.rol,
          activo:     true,
          creado_por: perfil?.id,
        })

        // Enviar email de recovery para que el usuario establezca su contraseña
        if (!form.password) {
          await supabaseAdmin.auth.admin.generateLink({
            type:  'recovery',
            email: form.email,
          })
        }

        showSuccess(`Usuario ${form.nombre} creado. Se envió email de activación.`)
      }
      await loadAll()
      setDrawer(null)
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  const toggleUsuario = async (u) => {
    await supabase.from('usuarios').update({ activo: !u.activo }).eq('id', u.id)
    await loadAll()
  }

  const openDrawer = (type, data = {}) => {
    setForm(data)
    setError('')
    setDrawer(type)
  }

  return (
    <div className="min-h-screen" style={{ background: '#F0F4F8' }}>

      {/* SUCCESS TOAST */}
      {success && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium">
          {success}
        </div>
      )}

      {/* CONFIRM */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <p className="text-sm font-semibold text-gray-800 mb-1">¿Confirmar acción?</p>
            <p className="text-sm text-gray-500 mb-5">{confirmDel.msg}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDel(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg">Cancelar</button>
              <button onClick={async () => { await confirmDel.action(); setConfirmDel(null) }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600">
                Confirmar
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
                {drawer === 'new_tenant'  ? 'Nueva empresa' :
                 drawer === 'edit_tenant' ? 'Editar empresa' :
                 drawer === 'new_user'    ? 'Nuevo usuario'  : 'Editar usuario'}
              </p>
              <button onClick={() => setDrawer(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="flex-1 p-6 flex flex-col gap-4">

              {/* TENANT FORM */}
              {(drawer === 'new_tenant' || drawer === 'edit_tenant') && <>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Nombre de la empresa *</label>
                  <input className={inputCls} value={form.nombre_empresa||''} onChange={set('nombre_empresa')}
                    placeholder="Constructora XYZ S.A." />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Plan *</label>
                  <select className={selectCls} value={form.plan||''} onChange={set('plan')}>
                    <option value="">— Seleccionar —</option>
                    {PLANES.map(p => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
                {form.plan && (
                  <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
                    Límite: {PLAN_LIMITS[form.plan].max_usuarios} usuarios · {PLAN_LIMITS[form.plan].max_proyectos} proyectos
                  </div>
                )}
                {drawer === 'edit_tenant' && (
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-gray-500">Estado</label>
                    <button onClick={() => setForm(f => ({ ...f, activo: !f.activo }))}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${form.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {form.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>
                )}
              </>}

              {/* USER FORM */}
              {(drawer === 'new_user' || drawer === 'edit_user') && <>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Nombre completo *</label>
                  <input className={inputCls} value={form.nombre||''} onChange={set('nombre')} placeholder="Juan Pérez" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Email *</label>
                  <input type="email" className={inputCls} value={form.email||''} onChange={set('email')}
                    placeholder="juan@empresa.com" disabled={drawer === 'edit_user'} />
                  {drawer === 'edit_user' && <p className="text-xs text-gray-400 mt-1">El email no se puede modificar.</p>}
                </div>
                {drawer === 'new_user' && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Contraseña temporal</label>
                    <input type="password" className={inputCls} value={form.password||''} onChange={set('password')}
                      placeholder="Mín. 6 caracteres (o vacío para enviar email)" />
                    <p className="text-xs text-gray-400 mt-1">Si dejas vacío se envía email de activación al usuario.</p>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Empresa *</label>
                  <select className={selectCls} value={form.tenant_id||''} onChange={set('tenant_id')}>
                    <option value="">— Seleccionar empresa —</option>
                    {tenants.filter(t => t.activo).map(t => (
                      <option key={t.id} value={t.id}>{t.nombre_empresa}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Rol *</label>
                  <select className={selectCls} value={form.rol||''} onChange={set('rol')}>
                    <option value="">— Seleccionar rol —</option>
                    {ROLES.map(r => (
                      <option key={r} value={r}>{r.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                {drawer === 'edit_user' && (
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-gray-500">Estado</label>
                    <button onClick={() => setForm(f => ({ ...f, activo: !f.activo }))}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${form.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {form.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>
                )}
              </>}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">{error}</div>
              )}

              <div className="flex gap-2 mt-auto pt-2">
                <button onClick={() => setDrawer(null)}
                  className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button
                  onClick={drawer.includes('tenant') ? saveTenant : saveUsuario}
                  disabled={saving}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60 transition-opacity"
                  style={{ background: BRAND }}>
                  {saving ? 'Guardando...' : 'Guardar'}
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
            <p className="font-bold text-gray-900 text-sm leading-none">Panel de Administración</p>
            <p className="text-xs text-gray-400 mt-0.5">Super Admin · MPS</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="/" className="text-xs text-gray-400 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 border border-gray-200 transition-colors">
            ← Volver a MARY
          </a>
          <span className="text-xs text-gray-500 font-medium">{perfil?.nombre}</span>
          <button onClick={logout}
            className="text-xs text-gray-400 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 border border-gray-200 transition-colors">
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Empresas registradas', value: tenants.length,           sub: `${tenants.filter(t=>t.activo).length} activas` },
            { label: 'Usuarios totales',     value: usuarios.length,          sub: `${usuarios.filter(u=>u.activo).length} activos` },
            { label: 'Planes enterprise',    value: tenants.filter(t=>t.plan==='enterprise'&&t.activo).length, sub: 'activos' },
          ].map((k, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="text-xs text-gray-400 mb-1">{k.label}</p>
              <p className="text-2xl font-bold" style={{ color: BRAND }}>{k.value}</p>
              <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div className="flex border-b border-gray-200 mb-6">
          {[['tenants','Empresas'], ['usuarios','Usuarios']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
                ${tab===id ? 'border-[#1B3A6B] text-[#1B3A6B]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">Cargando...</div>
        ) : tab === 'tenants' ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-500">{tenants.length} empresa(s) registrada(s)</p>
              <button onClick={() => openDrawer('new_tenant', { plan:'pro' })}
                className="px-4 py-2 text-sm font-semibold text-white rounded-lg"
                style={{ background: BRAND }}>
                + Nueva empresa
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {['Empresa','Plan','Usuarios','Proyectos máx.','Estado','Creada','Acciones'].map((h,i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {tenants.map(t => {
                    const nUsuarios = usuarios.filter(u => u.tenant_id === t.id).length
                    return (
                      <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{t.nombre_empresa}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[t.plan]}`}>
                            {t.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{nUsuarios} / {t.max_usuarios}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{t.max_proyectos}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {t.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{t.fecha_creacion?.slice(0,10)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => openDrawer('edit_tenant', {...t})}
                              className="text-xs px-2 py-1 border border-gray-200 rounded-lg hover:bg-gray-50">
                              Editar
                            </button>
                            <button onClick={() => setConfirmDel({
                              msg: `¿${t.activo ? 'Desactivar' : 'Activar'} "${t.nombre_empresa}"?`,
                              action: () => toggleTenant(t)
                            })}
                              className={`text-xs px-2 py-1 rounded-lg border ${t.activo
                                ? 'border-red-200 text-red-500 hover:bg-red-50'
                                : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                              {t.activo ? 'Desactivar' : 'Activar'}
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
              <p className="text-sm text-gray-500">{usuarios.length} usuario(s) registrado(s)</p>
              <button onClick={() => openDrawer('new_user')}
                className="px-4 py-2 text-sm font-semibold text-white rounded-lg"
                style={{ background: BRAND }}>
                + Nuevo usuario
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {['Nombre','Email','Empresa','Rol','Estado','Último acceso','Acciones'].map((h,i) => (
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
                          {u.rol?.replace('_',' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {u.fecha_acceso ? new Date(u.fecha_acceso).toLocaleDateString('es') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openDrawer('edit_user', {...u})}
                            className="text-xs px-2 py-1 border border-gray-200 rounded-lg hover:bg-gray-50">
                            Editar
                          </button>
                          <button onClick={() => setConfirmDel({
                            msg: `¿${u.activo ? 'Desactivar' : 'Activar'} a "${u.nombre}"?`,
                            action: () => toggleUsuario(u)
                          })}
                            className={`text-xs px-2 py-1 rounded-lg border ${u.activo
                              ? 'border-red-200 text-red-500 hover:bg-red-50'
                              : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                            {u.activo ? 'Desactivar' : 'Activar'}
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
