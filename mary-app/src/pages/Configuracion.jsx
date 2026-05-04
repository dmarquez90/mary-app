import { useState, useEffect, useContext } from 'react'
import { supabase } from '../supabase'
import { supabaseAdmin } from '../supabaseAdmin'
import { useAuth } from '../auth'
import { LangContext } from '../i18n'

const BRAND = '#1B3A6B'

const ROLES = ['coordinador','gerente','residente','bodeguero','contador','lectura']

const ROL_COLORS = {
  gerente:      'bg-blue-100 text-blue-700',
  coordinador:  'bg-cyan-100 text-cyan-700',
  residente:    'bg-green-100 text-green-700',
  bodeguero:    'bg-orange-100 text-orange-700',
  contador:     'bg-violet-100 text-violet-700',
  lectura:      'bg-gray-100 text-gray-500',
  client_admin: 'bg-amber-100 text-amber-700',
}

const inputCls  = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B]'
const selectCls = inputCls

export default function Configuracion() {
  const { perfil } = useAuth()
  const { t } = useContext(LangContext)
  const [usuarios, setUsuarios] = useState([])
  const [tenant, setTenant]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [drawer, setDrawer]     = useState(null)
  const [form, setForm]         = useState({})
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [confirmAct, setConfirmAct] = useState(null)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  useEffect(() => { if (perfil?.tenant_id) loadData() }, [perfil])

  const loadData = async () => {
    setLoading(true)
    const [{ data: t }, { data: u }] = await Promise.all([
      supabase.from('tenants').select('*').eq('id', perfil.tenant_id).single(),
      supabase.from('usuarios').select('*').eq('tenant_id', perfil.tenant_id).order('nombre'),
    ])
    setTenant(t)
    setUsuarios(u || [])
    setLoading(false)
  }

  const showSuccess = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  const saveUsuario = async () => {
    if (!form.nombre || !form.email || !form.rol) return
    setSaving(true); setError('')
    try {
      const activos = usuarios.filter(u => u.activo).length
      if (!form.id && activos >= (tenant?.max_usuarios || 5)) {
        throw new Error(t('cfg_users_limit_reached'))
      }

      if (form.id) {
        await supabase.from('usuarios').update({
          nombre: form.nombre,
          rol:    form.rol,
          activo: form.activo,
        }).eq('id', form.id)
        showSuccess(t('cfg_users_success_updated'))
      } else {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email:         form.email,
          password:      form.password && form.password.length >= 6
                           ? form.password
                           : Math.random().toString(36).slice(-10) + 'A1!',
          email_confirm: true,
        })
        if (authError) throw authError

        await supabase.from('usuarios').insert({
          id:         authData.user.id,
          tenant_id:  perfil.tenant_id,
          nombre:     form.nombre,
          email:      form.email,
          rol:        form.rol,
          activo:     true,
          creado_por: perfil.id,
        })

        showSuccess(t('cfg_users_success_created', { nombre: form.nombre }))
      }

      await loadData()
      setDrawer(null)
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  const toggleUsuario = async (u) => {
    await supabase.from('usuarios').update({ activo: !u.activo }).eq('id', u.id)
    await loadData()
  }

  const usuariosActivos = usuarios.filter(u => u.activo).length
  const limiteAlcanzado = usuariosActivos >= (tenant?.max_usuarios || 5)

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* SUCCESS TOAST */}
      {success && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium">
          {success}
        </div>
      )}

      {/* CONFIRM */}
      {confirmAct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <p className="text-sm font-semibold text-gray-800 mb-1">{confirmAct.title}</p>
            <p className="text-sm text-gray-500 mb-5">{confirmAct.msg}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmAct(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg">{t('btn_cancel')}</button>
              <button onClick={async () => { await confirmAct.action(); setConfirmAct(null) }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600">
                {t('btn_save')}
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
                {drawer === 'new' ? t('cfg_users_form_new') : t('cfg_users_form_edit')}
              </p>
              <button onClick={() => setDrawer(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="flex-1 p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">{t('cfg_users_form_name')} *</label>
                <input className={inputCls} value={form.nombre||''} onChange={set('nombre')} placeholder="Juan Pérez" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">{t('cfg_users_form_email')} *</label>
                <input type="email" className={inputCls} value={form.email||''} onChange={set('email')}
                  placeholder="juan@empresa.com" disabled={drawer === 'edit'} />
                {drawer === 'edit' && <p className="text-xs text-gray-400 mt-1">{t('cfg_users_form_email_locked')}</p>}
              </div>
              {drawer === 'new' && (
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">{t('cfg_users_form_password')}</label>
                  <input type="password" className={inputCls} value={form.password||''} onChange={set('password')}
                    placeholder="Min. 6 chars" />
                  <p className="text-xs text-gray-400 mt-1">{t('cfg_users_form_password_hint')}</p>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">{t('cfg_users_form_role')} *</label>
                <select className={selectCls} value={form.rol||''} onChange={set('rol')}>
                  <option value="">— {t('lbl_select')} —</option>
                  {ROLES.map(r => (
                    <option key={r} value={r}>{t(`role_${r}`)}</option>
                  ))}
                </select>
              </div>
              {drawer === 'edit' && (
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-gray-500">{t('lbl_status')}</label>
                  <button onClick={() => setForm(f => ({ ...f, activo: !f.activo }))}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${form.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {form.activo ? t('cfg_users_active') : t('cfg_users_inactive')}
                  </button>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">{error}</div>
              )}

              <div className="flex gap-2 mt-auto pt-2">
                <button onClick={() => setDrawer(null)}
                  className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                  {t('btn_cancel')}
                </button>
                <button onClick={saveUsuario} disabled={saving}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
                  style={{ background: BRAND }}>
                  {saving ? '...' : t('btn_save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">{t('cfg_users_title')}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{tenant?.nombre_empresa}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">{t('cfg_users_plan')}</p>
          <p className="text-lg font-bold capitalize" style={{ color: BRAND }}>{tenant?.plan || '—'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">{t('cfg_users_limit')}</p>
          <p className="text-lg font-bold" style={{ color: limiteAlcanzado ? '#ef4444' : BRAND }}>
            {usuariosActivos} / {tenant?.max_usuarios}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">{t('cfg_users_max_projects')}</p>
          <p className="text-lg font-bold" style={{ color: BRAND }}>{tenant?.max_proyectos}</p>
        </div>
      </div>

      {/* ALERTA LÍMITE */}
      {limiteAlcanzado && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 text-sm text-amber-700">
          {t('cfg_users_limit_reached')}
        </div>
      )}

      {/* TABLA */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">{t('cfg_users_sub')}</h2>
        <button
          onClick={() => { setForm({}); setError(''); setDrawer('new') }}
          disabled={limiteAlcanzado}
          className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: BRAND }}>
          {t('cfg_users_new')}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Cargando...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              {[t('cfg_users_col_name'), t('cfg_users_col_email'), t('cfg_users_col_role'), t('cfg_users_col_status'), t('cfg_users_col_last_access'), t('cfg_users_col_actions')].map((h,i) => (
                <th key={i} className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{u.nombre}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROL_COLORS[u.rol] || 'bg-gray-100 text-gray-500'}`}>
                      {t(`role_${u.rol}`) || u.rol?.replace('_',' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {u.activo ? t('cfg_users_active') : t('cfg_users_inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {u.fecha_acceso ? new Date(u.fecha_acceso).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {u.id !== perfil?.id ? (
                        <>
                          <button onClick={() => { setForm({...u}); setError(''); setDrawer('edit') }}
                            className="text-xs px-2 py-1 border border-gray-200 rounded-lg hover:bg-gray-50">
                            {t('btn_edit')}
                          </button>
                          <button onClick={() => setConfirmAct({
                            title: u.activo ? t('cfg_users_deactivate') : t('cfg_users_activate'),
                            msg:   `"${u.nombre}"`,
                            action: () => toggleUsuario(u)
                          })}
                            className={`text-xs px-2 py-1 rounded-lg border ${u.activo
                              ? 'border-red-200 text-red-500 hover:bg-red-50'
                              : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                            {u.activo ? t('cfg_users_deactivate') : t('cfg_users_activate')}
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 px-2">{t('cfg_users_your_account')}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
