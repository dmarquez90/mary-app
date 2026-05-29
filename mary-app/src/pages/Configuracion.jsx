import { useState, useEffect, useContext } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { useStore } from '../store'
import { LangContext } from '../i18n'
import { MODULOS_PERMISOS } from '../usePermissions'

const BRAND = '#1B3A6B'
const ROLES  = ['coordinador','gerente','residente','bodeguero','contador','lectura']
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
  const { perfil, isClientAdmin, isSuperAdmin } = useAuth()
  const { state, dispatch } = useStore()
  const { t, lang }       = useContext(LangContext)
  const isEs = lang === 'ES'
  const esAdmin = isClientAdmin || isSuperAdmin

  const [usuarios, setUsuarios]   = useState([])
  const [tenant, setTenant]       = useState(null)
  const [loading, setLoading]     = useState(true)
  const [drawer, setDrawer]       = useState(null)
  const [form, setForm]           = useState({})
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')
  const [confirmAct, setConfirmAct] = useState(null)
  const [activeTab, setActiveTab] = useState(() => (isClientAdmin || isSuperAdmin) ? 'usuarios' : 'micuenta')
  const [permDrawer, setPermDrawer] = useState(null) // usuario seleccionado
  const [permData, setPermData]     = useState({})   // { modulo: { ver, editar } }
  const [permProys, setPermProys]   = useState([])   // IDs de proyectos permitidos
  const [todosProys, setTodosProys] = useState(true)
  const [savingPerm, setSavingPerm] = useState(false)

  // Modal para aprobar/rechazar solicitud de eliminación
  const [modalSol, setModalSol] = useState(null) // { sol, accion }
  const [comentarioAdmin, setComentarioAdmin] = useState('')

  // Suscripcion
  const [subPlan, setSubPlan]         = useState('pro')
  const [subPeriodo, setSubPeriodo]   = useState('mensual')
  const [subLoading, setSubLoading]   = useState(false)
  const [subError, setSubError]       = useState('')

  const PLANES = {
    starter:    { mensual: 29.99, anual: 25.49 },
    pro:        { mensual: 49.99, anual: 42.49 },
    enterprise: { mensual: 69.99, anual: 59.49 },
  }

  const iniciarCheckout = async () => {
    setSubLoading(true); setSubError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            plan:           subPlan,
            periodo:        subPeriodo,
            empresa_id:     perfil.tenant_id,
            email:          perfil.email,
            empresa_nombre: tenant?.nombre_empresa || '',
          }),
        }
      )
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Error al iniciar pago')
      window.location.href = result.url
    } catch (e) {
      setSubError(e.message)
      setSubLoading(false)
    }
  }

  const cambiarPlan = async () => {
    setSubLoading(true); setSubError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-change-plan`,
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            empresa_id:      perfil.tenant_id,
            new_plan:        subPlan,
            new_periodo:     subPeriodo,
            subscription_id: suscripcion?.stripe_subscription_id,
          }),
        }
      )
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Error al cambiar plan')
      await loadData()
      // Mostrar mensaje de éxito
      const msg = result.is_upgrade
        ? (isEs ? `¡Upgrade exitoso! Ahora tienes el plan ${subPlan.charAt(0).toUpperCase()+subPlan.slice(1)}.` : `Upgrade successful! You now have the ${subPlan} plan.`)
        : (isEs ? `Downgrade programado. Tu plan cambiará el ${result.period_end}.` : `Downgrade scheduled. Your plan will change on ${result.period_end}.`)
      setSubError('') 
      showSuccess(msg)
    } catch (e) {
      setSubError(e.message)
    }
    setSubLoading(false)
  }

  // Cambio de contraseña
  const [pwForm, setPwForm]     = useState({ actual: '', nueva: '', confirmar: '' })
  const [pwError, setPwError]   = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [suscripcion, setSuscripcion] = useState(null)

  const PLAN_TIERS = { starter: 1, pro: 2, enterprise: 3 }
  const activePlan   = tenant?.plan
  const hasActiveSub = suscripcion?.status === 'active'
  const isVitalicio  = tenant?.plan_vitalicio === true

  const getPlanAction = (planId) => {
    if (isVitalicio) return 'vitalicio'
    if (!hasActiveSub) return 'subscribe'
    if (planId === activePlan && subPeriodo === (suscripcion?.periodo || tenant?.billing_cycle || 'mensual')) return 'current'
    if (PLAN_TIERS[planId] > PLAN_TIERS[activePlan]) return 'upgrade'
    if (PLAN_TIERS[planId] < PLAN_TIERS[activePlan]) return 'downgrade'
    return 'change_period'
  }

  const planAction = getPlanAction(subPlan)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMode, setPwMode]     = useState('cambio') // 'cambio' | 'olvide'
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent]   = useState(false)
  const [resetSaving, setResetSaving] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const solicitudesPendientes = (state.solicitudes_eliminacion || []).filter(s => s.estado === 'pendiente')

  useEffect(() => { if (perfil?.tenant_id) loadData() }, [perfil])

  const loadData = async () => {
    setLoading(true)
    const [{ data: t }, { data: u }, { data: s }] = await Promise.all([
      supabase.from('tenants').select('*').eq('id', perfil.tenant_id).single(),
      supabase.from('usuarios').select('*').eq('tenant_id', perfil.tenant_id).order('nombre'),
      supabase.from('suscripciones').select('*').eq('empresa_id', perfil.tenant_id).eq('status','active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    setTenant(t)
    setUsuarios(u || [])
    setSuscripcion(s)
    setLoading(false)
  }

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3500) }

  const saveUsuario = async () => {
    if (!form.nombre || !form.email || !form.rol) return
    setSaving(true); setError('')
    try {
      const activos = usuarios.filter(u => u.activo).length
      if (!form.id && activos >= (tenant?.max_usuarios || 5)) {
        throw new Error(t('cfg_users_limit_reached'))
      }
      if (form.id) {
        await supabase.from('usuarios').update({ nombre:form.nombre, rol:form.rol, activo:form.activo }).eq('id', form.id)
        showSuccess(t('cfg_users_success_updated'))
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
            body: JSON.stringify({ email: form.email, password: form.password, nombre: form.nombre, rol: form.rol, tenant_id: perfil.tenant_id })
          }
        )
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Error al crear usuario')
        showSuccess(t('cfg_users_success_created', { nombre: form.nombre }))
      }
      await loadData(); setDrawer(null)
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  const toggleUsuario = async (u) => {
    await supabase.from('usuarios').update({ activo: !u.activo }).eq('id', u.id)
    await loadData()
  }

  const aprobarSolicitud = () => {
    if (!modalSol) return
    dispatch({
      type: 'APROBAR_SOL_ELIM',
      payload: { id: modalSol.sol.id, comentario: comentarioAdmin, reviewedBy: perfil?.id }
    })
    setModalSol(null); setComentarioAdmin('')
    showSuccess('Solicitud aprobada. El registro fue eliminado.')
  }

  const rechazarSolicitud = () => {
    if (!modalSol) return
    dispatch({
      type: 'RECHAZAR_SOL_ELIM',
      payload: { id: modalSol.sol.id, comentario: comentarioAdmin, reviewedBy: perfil?.id }
    })
    setModalSol(null); setComentarioAdmin('')
    showSuccess('Solicitud rechazada.')
  }

  const usuariosActivos = usuarios.filter(u => u.activo).length
  const limiteAlcanzado = usuariosActivos >= (tenant?.max_usuarios || 5)
  const rolLabel = (rol) => t(`role_${rol}`) || rol?.replace('_',' ')

  const openPermisos = async (u) => {
    const { data } = await supabase
      .from('usuario_permisos')
      .select('*')
      .eq('usuario_id', u.id)
      .maybeSingle()
    setPermData(data?.permisos || {})
    setPermProys(data?.proyectos || [])
    setTodosProys(data?.todos_proyectos !== false)
    setPermDrawer(u)
  }

  const savePermisos = async () => {
    if (!permDrawer) return
    setSavingPerm(true)
    const payload = {
      usuario_id:      permDrawer.id,
      tenant_id:       perfil.tenant_id,
      permisos:        permData,
      proyectos:       permProys,
      todos_proyectos: todosProys,
      updated_at:      new Date().toISOString(),
    }
    await supabase.from('usuario_permisos').upsert(payload, { onConflict: 'usuario_id' })
    setSavingPerm(false)
    setPermDrawer(null)
    showSuccess(isEs ? '✓ Permisos guardados' : '✓ Permissions saved')
  }

  const togglePermMod = (modId, tipo) => {
    setPermData(prev => ({
      ...prev,
      [modId]: { ...(prev[modId] || { ver: false, editar: false }), [tipo]: !prev[modId]?.[tipo] }
    }))
  }

  const toggleProy = (id) => {
    setPermProys(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const cambiarPassword = async () => {
    setPwError(''); setPwSuccess('')
    const { actual, nueva, confirmar } = pwForm
    if (!actual || !nueva || !confirmar) { setPwError(isEs ? 'Completa todos los campos.' : 'Fill in all fields.'); return }
    if (nueva.length < 6) { setPwError(isEs ? 'La nueva contraseña debe tener mínimo 6 caracteres.' : 'New password must be at least 6 characters.'); return }
    if (nueva !== confirmar) { setPwError(isEs ? 'Las contraseñas no coinciden.' : 'Passwords do not match.'); return }
    setPwSaving(true)
    try {
      const email = perfil?.email
      const { error: signErr } = await supabase.auth.signInWithPassword({ email, password: actual })
      if (signErr) { setPwError(isEs ? 'La contraseña actual es incorrecta.' : 'Current password is incorrect.'); setPwSaving(false); return }
      const { error: updErr } = await supabase.auth.updateUser({ password: nueva })
      if (updErr) throw updErr
      setPwSuccess(isEs ? '✓ Contraseña actualizada correctamente.' : '✓ Password updated successfully.')
      setPwForm({ actual: '', nueva: '', confirmar: '' })
    } catch (e) { setPwError(e.message) }
    setPwSaving(false)
  }

  const enviarResetEmail = async () => {
    setPwError(''); setResetSent(false)
    if (!resetEmail) { setPwError(isEs ? 'Escribe tu correo.' : 'Enter your email.'); return }
    setResetSaving(true)
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    setResetSaving(false)
    if (error) { setPwError(error.message); return }
    setResetSent(true)
  }

  return (
    <>
    <div className="p-6 max-w-5xl mx-auto">

      {/* SUCCESS TOAST */}
      {success && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <span>✓</span> {success}
        </div>
      )}

      {/* MODAL APROBAR/RECHAZAR SOLICITUD */}
      {modalSol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-lg">⚠</div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">Solicitud de eliminación</p>
                <p className="text-xs text-gray-400">Pendiente de revisión</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4 grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-400">Solicitante</p><p className="font-medium">{modalSol.sol.solicitante_nombre || '—'}</p></div>
              <div><p className="text-xs text-gray-400">Tipo</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${modalSol.sol.tipo==='entrada'?'bg-green-100 text-green-700':'bg-red-100 text-red-600'}`}>
                  {modalSol.sol.tipo === 'entrada' ? '↑ Entrada' : '↓ Salida'}
                </span>
              </div>
              <div><p className="text-xs text-gray-400">Material</p><p className="font-medium">{modalSol.sol.material_desc || '—'}</p></div>
              <div><p className="text-xs text-gray-400">Cantidad</p><p className="font-mono font-medium">{modalSol.sol.cantidad}</p></div>
              <div className="col-span-2">
                <p className="text-xs text-gray-400 mb-1">Justificación del bodeguero</p>
                <p className="text-sm text-gray-700 bg-white border border-gray-100 rounded-lg p-2">{modalSol.sol.justificacion}</p>
              </div>
              <div><p className="text-xs text-gray-400">Fecha solicitud</p><p className="text-sm">{modalSol.sol.created_at}</p></div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 block mb-1">Comentario del administrador (opcional)</label>
              <textarea
                className={inputCls + ' resize-none'}
                rows={2}
                placeholder="Motivo de aprobación o rechazo..."
                value={comentarioAdmin}
                onChange={e => setComentarioAdmin(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setModalSol(null); setComentarioAdmin('') }}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={rechazarSolicitud}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600">
                ✕ Rechazar
              </button>
              <button onClick={aprobarSolicitud}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white rounded-lg"
                style={{ background: BRAND }}>
                ✓ Aprobar y eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM TOGGLE USUARIO */}
      {confirmAct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <p className="text-sm font-semibold text-gray-800 mb-1">{confirmAct.title}</p>
            <p className="text-sm text-gray-500 mb-5">{confirmAct.msg}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmAct(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg">{t('btn_cancel')}</button>
              <button onClick={async () => { await confirmAct.action(); setConfirmAct(null) }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600">
                {t('btn_save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER USUARIO */}
      {drawer && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/30" onClick={() => setDrawer(null)} />
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor:'#D6E4F0' }}>
              <p className="font-semibold text-gray-800 text-sm">{drawer==='new' ? t('cfg_users_form_new') : t('cfg_users_form_edit')}</p>
              <button onClick={() => setDrawer(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="flex-1 p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">{t('cfg_users_form_name')} *</label>
                <input className={inputCls} value={form.nombre||''} onChange={set('nombre')} placeholder="Juan Pérez" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">{t('cfg_users_form_email')} *</label>
                <input type="email" className={inputCls} value={form.email||''} onChange={set('email')} placeholder="juan@empresa.com" disabled={drawer==='edit'} />
                {drawer==='edit' && <p className="text-xs text-gray-400 mt-1">{t('cfg_users_form_email_locked')}</p>}
              </div>
              {drawer==='new' && (
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">{t('cfg_users_form_password')}</label>
                  <input type="password" className={inputCls} value={form.password||''} onChange={set('password')} placeholder="Min. 6 chars" />
                  <p className="text-xs text-gray-400 mt-1">{t('cfg_users_form_password_hint')}</p>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">{t('cfg_users_form_role')} *</label>
                <select className={selectCls} value={form.rol||''} onChange={set('rol')}>
                  <option value="">— {t('lbl_select')} —</option>
                  {ROLES.map(r => <option key={r} value={r}>{rolLabel(r)}</option>)}
                </select>
              </div>
              {drawer==='edit' && (
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-gray-500">{t('lbl_status')}</label>
                  <button onClick={() => setForm(f => ({ ...f, activo: !f.activo }))}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${form.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {form.activo ? t('cfg_users_active') : t('cfg_users_inactive')}
                  </button>
                </div>
              )}
              {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">{error}</div>}
              <div className="flex gap-2 mt-auto pt-2">
                <button onClick={() => setDrawer(null)} className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">{t('btn_cancel')}</button>
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
        <h1 className="text-xl font-bold text-gray-900">
          {esAdmin ? t('cfg_users_title') : (isEs ? 'Configuración' : 'Settings')}
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">{tenant?.nombre_empresa}</p>
      </div>

      {/* KPIs — solo para admins */}
      {esAdmin && (
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
        <div className="bg-white rounded-xl border border-gray-100 p-4 relative">
          <p className="text-xs text-gray-400 mb-1">{t('cfg_users_max_projects')}</p>
          <p className="text-lg font-bold" style={{ color: BRAND }}>{tenant?.max_proyectos}</p>
          {solicitudesPendientes.length > 0 && (
            <div className="absolute top-3 right-3">
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                {solicitudesPendientes.length}
              </span>
            </div>
          )}
        </div>
      </div>
      )} {/* fin esAdmin KPIs */}

      {/* ALERTA LÍMITE */}
      {esAdmin && limiteAlcanzado && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 text-sm text-amber-700">
          {t('cfg_users_limit_reached')}
        </div>
      )}

      {/* ALERTA SOLICITUDES PENDIENTES */}
      {esAdmin && solicitudesPendientes.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <span className="text-lg">🔔</span>
            <span className="font-semibold">
              {solicitudesPendientes.length} solicitud(es) de eliminación pendiente(s) de revisión
            </span>
          </div>
          <button onClick={() => setActiveTab('solicitudes')}
            className="text-xs font-semibold text-red-700 underline hover:no-underline">
            Ver solicitudes →
          </button>
        </div>
      )}

      {/* TABS */}
      <div className="flex border-b border-gray-200 mb-5">
        {[
          esAdmin && { id:'usuarios',    label: t('cfg_users_sub') },
          esAdmin && { id:'solicitudes', label: `Solicitudes de eliminación${solicitudesPendientes.length > 0 ? ` (${solicitudesPendientes.length})` : ''}` },
          { id:'micuenta',   label: isEs ? 'Mi cuenta' : 'My account' },
          esAdmin && { id:'suscripcion', label: isEs ? 'Suscripción' : 'Subscription' },
        ].filter(Boolean).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
              ${activeTab===tab.id ? 'border-[#1B3A6B] text-[#1B3A6B]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB USUARIOS ─────────────────────────────────────────────────── */}
      {activeTab === 'usuarios' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">{t('cfg_users_sub')}</h2>
            <button onClick={() => { setForm({}); setError(''); setDrawer('new') }}
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
                          {rolLabel(u.rol)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {u.activo ? t('cfg_users_active') : t('cfg_users_inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {u.fecha_acceso ? new Date(u.fecha_acceso).toLocaleDateString('es') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {u.id !== perfil?.id ? (
                          <div className="flex gap-1 flex-wrap">
                            <button onClick={() => { setForm({...u}); setError(''); setDrawer('edit') }}
                              className="text-xs px-2 py-1 border border-gray-200 rounded-lg hover:bg-gray-50">{t('btn_edit')}</button>
                            <button onClick={() => openPermisos(u)}
                              className="text-xs px-2 py-1 border rounded-lg hover:bg-blue-50"
                              style={{ borderColor:'#1B3A6B', color:'#1B3A6B' }}>
                              {isEs ? 'Permisos' : 'Permissions'}
                            </button>
                            <button onClick={() => setConfirmAct({
                              title: u.activo ? t('cfg_users_deactivate') : t('cfg_users_activate'),
                              msg: `"${u.nombre}"`,
                              action: () => toggleUsuario(u)
                            })} className={`text-xs px-2 py-1 rounded-lg border ${u.activo ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                              {u.activo ? t('cfg_users_deactivate') : t('cfg_users_activate')}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 px-2">{t('cfg_users_your_account')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── TAB SOLICITUDES DE ELIMINACIÓN ───────────────────────────────── */}
      {activeTab === 'solicitudes' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Solicitudes de eliminación de registros</h2>
            {(state.solicitudes_eliminacion || []).some(s => s.estado !== 'pendiente') && (
              <button
                onClick={() => {
                  const procesadas = (state.solicitudes_eliminacion || []).filter(s => s.estado !== 'pendiente')
                  procesadas.forEach(s => dispatch({ type: 'DEL_SOL_ELIM', payload: s.id }))
                }}
                className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 px-3 py-1 rounded-lg transition-colors">
                Limpiar historial
              </button>
            )}
          </div>

          {(state.solicitudes_eliminacion || []).length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <p className="text-sm text-gray-400">No hay solicitudes de eliminación registradas.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {['Fecha','Solicitante','Tipo','Material','Cantidad','Justificación','Estado','Acciones'].map((h,i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {[...(state.solicitudes_eliminacion||[])].reverse().map(sol => (
                    <tr key={sol.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs text-gray-400">{sol.created_at}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{sol.solicitante_nombre || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sol.tipo==='entrada'?'bg-green-100 text-green-700':'bg-red-100 text-red-600'}`}>
                          {sol.tipo === 'entrada' ? '↑ Entrada' : '↓ Salida'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-[140px] truncate">{sol.material_desc || '—'}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">{sol.cantidad}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate" title={sol.justificacion}>{sol.justificacion}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                          ${sol.estado==='pendiente'?'bg-amber-100 text-amber-700':
                            sol.estado==='aprobada'?'bg-green-100 text-green-700':'bg-red-100 text-red-600'}`}>
                          {sol.estado==='pendiente'?'⏳ Pendiente':sol.estado==='aprobada'?'✓ Aprobada':'✕ Rechazada'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {sol.estado === 'pendiente' ? (
                          <button onClick={() => { setModalSol({ sol }); setComentarioAdmin('') }}
                            className="text-xs px-3 py-1 font-semibold text-white rounded-lg"
                            style={{ background: BRAND }}>
                            Revisar
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{sol.comentario_admin || '—'}</span>
                            <button
                              onClick={() => dispatch({ type: 'DEL_SOL_ELIM', payload: sol.id })}
                              title="Eliminar del historial"
                              className="text-xs text-gray-300 hover:text-red-400 transition-colors ml-1 flex-shrink-0">
                              ✕
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB MI CUENTA ────────────────────────────────────────────────── */}
      {activeTab === 'micuenta' && (
        <div className="max-w-md mx-auto">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            {isEs ? 'Cambiar contraseña' : 'Change password'}
          </h2>

          {/* Selector modo */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-5 w-fit">
            <button
              onClick={() => { setPwMode('cambio'); setPwError(''); setPwSuccess(''); setResetSent(false) }}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${pwMode === 'cambio' ? 'bg-white text-[#1B3A6B] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {isEs ? 'Cambiar contraseña' : 'Change password'}
            </button>
            <button
              onClick={() => { setPwMode('olvide'); setPwError(''); setPwSuccess(''); setResetSent(false); setResetEmail(perfil?.email || '') }}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${pwMode === 'olvide' ? 'bg-white text-[#1B3A6B] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {isEs ? 'Olvidé mi contraseña' : 'Forgot password'}
            </button>
          </div>

          {/* MODO CAMBIO NORMAL */}
          {pwMode === 'cambio' && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">
                  {isEs ? 'Contraseña actual' : 'Current password'} *
                </label>
                <input
                  type="password"
                  className={inputCls}
                  value={pwForm.actual}
                  onChange={e => setPwForm(f => ({ ...f, actual: e.target.value }))}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">
                  {isEs ? 'Nueva contraseña' : 'New password'} *
                </label>
                <input
                  type="password"
                  className={inputCls}
                  value={pwForm.nueva}
                  onChange={e => setPwForm(f => ({ ...f, nueva: e.target.value }))}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <p className="text-xs text-gray-400 mt-1">{isEs ? 'Mínimo 6 caracteres.' : 'At least 6 characters.'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">
                  {isEs ? 'Confirmar nueva contraseña' : 'Confirm new password'} *
                </label>
                <input
                  type="password"
                  className={inputCls}
                  value={pwForm.confirmar}
                  onChange={e => setPwForm(f => ({ ...f, confirmar: e.target.value }))}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
              {pwError   && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">{pwError}</div>}
              {pwSuccess && <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">{pwSuccess}</div>}
              <button
                onClick={cambiarPassword}
                disabled={pwSaving}
                className="w-full px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60 mt-1"
                style={{ background: BRAND }}>
                {pwSaving ? (isEs ? 'Guardando...' : 'Saving...') : (isEs ? 'Actualizar contraseña' : 'Update password')}
              </button>
            </div>
          )}

          {/* MODO OLVIDÉ MI CONTRASEÑA */}
          {pwMode === 'olvide' && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
              {!resetSent ? (
                <>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-3 text-xs text-blue-700">
                    {isEs
                      ? 'Te enviaremos un correo con un enlace para restablecer tu contraseña. Revisa también tu carpeta de spam.'
                      : 'We will send you an email with a link to reset your password. Check your spam folder too.'}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">
                      {isEs ? 'Correo electrónico' : 'Email address'} *
                    </label>
                    <input
                      type="email"
                      className={inputCls}
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      placeholder="tu@correo.com"
                    />
                  </div>
                  {pwError && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">{pwError}</div>}
                  <button
                    onClick={enviarResetEmail}
                    disabled={resetSaving}
                    className="w-full px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
                    style={{ background: BRAND }}>
                    {resetSaving ? (isEs ? 'Enviando...' : 'Sending...') : (isEs ? 'Enviar correo de recuperación' : 'Send recovery email')}
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-2xl">✓</div>
                  <p className="text-sm font-semibold text-gray-800">
                    {isEs ? '¡Correo enviado!' : 'Email sent!'}
                  </p>
                  <p className="text-xs text-gray-500 max-w-xs">
                    {isEs
                      ? `Revisa tu bandeja de entrada en ${resetEmail}. El enlace expira en 1 hora.`
                      : `Check your inbox at ${resetEmail}. The link expires in 1 hour.`}
                  </p>
                  <button
                    onClick={() => { setResetSent(false); setPwMode('cambio') }}
                    className="text-xs text-[#1B3A6B] underline mt-2">
                    {isEs ? 'Volver' : 'Go back'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB SUSCRIPCION ──────────────────────────────────────────────── */}
      {activeTab === 'suscripcion' && (
        <div className="max-w-2xl mx-auto">

          {/* Plan actual */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6 text-center">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              {isEs ? 'Plan actual' : 'Current plan'}
            </p>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-1"
                style={{ background: '#EEF2FF' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1B3A6B" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </div>
              <p className="font-bold text-gray-800 text-lg capitalize">
                {tenant?.plan === 'trial'
                  ? (isEs ? 'Período de prueba' : 'Trial period')
                  : `MARY ${tenant?.plan}`}
              </p>
              {!tenant?.es_trial && tenant?.plan !== 'trial' && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                  {isEs ? 'Activo' : 'Active'}
                </span>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {tenant?.es_trial
                  ? (isEs
                      ? `Trial activo · vence ${tenant?.trial_fin ? new Date(tenant.trial_fin).toLocaleDateString('es') : '—'}`
                      : `Trial active · expires ${tenant?.trial_fin ? new Date(tenant.trial_fin).toLocaleDateString('en') : '—'}`)
                  : (isEs
                      ? `${tenant?.billing_cycle === 'anual' ? 'Facturación anual' : 'Facturación mensual'}`
                      : `${tenant?.billing_cycle === 'anual' ? 'Annual billing' : 'Monthly billing'}`)}
              </p>
              {suscripcion?.current_period_end && (
                <p className="text-xs font-medium mt-1" style={{ color: '#1B3A6B' }}>
                  {isEs
                    ? `Próxima renovación: ${new Date(suscripcion.current_period_end).toLocaleDateString('es')}`
                    : `Next renewal: ${new Date(suscripcion.current_period_end).toLocaleDateString('en')}`}
                </p>
              )}
            </div>
          </div>

          {/* Toggle mensual/anual */}
          <div className="flex items-center gap-3 mb-5">
            <p className="text-sm font-semibold text-gray-700">
              {isEs ? 'Selecciona un plan' : 'Select a plan'}
            </p>
            <div className="ml-auto flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {['mensual','anual'].map(p => (
                <button key={p} onClick={() => setSubPeriodo(p)}
                  className="px-3 py-1 text-xs font-semibold rounded-md transition-colors"
                  style={{
                    background: subPeriodo === p ? '#1B3A6B' : 'transparent',
                    color:      subPeriodo === p ? '#fff' : '#6B7280',
                  }}>
                  {p === 'mensual'
                    ? (isEs ? 'Mensual' : 'Monthly')
                    : (isEs ? 'Anual' : 'Annual')}
                  {p === 'anual' && (
                    <span className="ml-1 text-xs opacity-80">
                      {isEs ? '(ahorra 15%)' : '(save 15%)'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tarjetas de planes */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              {
                id: 'starter',
                nombre: 'Starter',
                usuarios: isEs ? '1 usuario' : '1 user',
                proyectos: isEs ? '2 proyectos' : '2 projects',
                features: isEs
                  ? ['Dashboard','Inventario','Compras/OC','Reportes básicos']
                  : ['Dashboard','Inventory','Purchases/PO','Basic reports'],
              },
              {
                id: 'pro',
                nombre: 'Pro',
                usuarios: isEs ? '3 usuarios' : '3 users',
                proyectos: isEs ? '5 proyectos' : '3 projects',
                features: isEs
                  ? ['Todo Starter','Órdenes de Cambio','Avalúos','Curva S']
                  : ['All Starter','Change Orders','Valuations','S Curve'],
                destacado: true,
              },
              {
                id: 'enterprise',
                nombre: 'Enterprise',
                usuarios: isEs ? '5 usuarios' : '5 users',
                proyectos: isEs ? '10 proyectos' : '10 projects',
                features: isEs
                  ? ['Todo Pro','Financiero avanzado','Soporte prioritario','Usuario adicional $10/m']
                  : ['All Pro','Advanced financial','Priority support','Additional user $10/m'],
              },
            ].map(plan => {
              const precio = PLANES[plan.id][subPeriodo]
              const activo = subPlan === plan.id
              return (
                <div key={plan.id}
                  onClick={() => setSubPlan(plan.id)}
                  className="relative rounded-xl border-2 p-4 cursor-pointer transition-all"
                  style={{
                    borderColor:  activo ? '#1B3A6B' : plan.destacado ? '#D6E4F0' : '#E5E7EB',
                    background:   activo ? '#F0F4F8' : '#fff',
                    boxShadow:    plan.destacado && !activo ? '0 2px 8px rgba(27,58,107,0.08)' : undefined,
                  }}>
                  {plan.destacado && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white"
                        style={{ background: '#1B3A6B' }}>
                        {isEs ? 'Popular' : 'Popular'}
                      </span>
                    </div>
                  )}
                  {activo && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: '#1B3A6B' }}>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                  <p className="font-bold text-gray-800 text-sm mb-1">MARY {plan.nombre}</p>
                  <p className="text-2xl font-bold mb-0.5" style={{ color: '#1B3A6B' }}>
                    ${precio.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400 mb-3">
                    {isEs ? '/mes' : '/mo'}{subPeriodo === 'anual' ? (isEs ? ' · cobro anual' : ' · billed yearly') : ''}
                  </p>
                  <div className="border-t border-gray-100 pt-3 flex flex-col gap-1.5">
                    <p className="text-xs text-gray-500">{plan.usuarios} · {plan.proyectos}</p>
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span style={{ color: '#0F6E56' }}>✓</span> {f}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Error */}
          {subError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600 mb-4">
              {subError}
            </div>
          )}

          {/* Botón de acción inteligente */}
          {planAction === 'current' ? (
            <div className="w-full py-3 text-sm font-semibold text-center rounded-xl border-2 border-green-200 bg-green-50 text-green-700">
              ✓ {isEs ? 'Plan activo' : 'Active plan'}
              {suscripcion?.current_period_end && (
                <span className="text-xs font-normal ml-2 text-green-600">
                  · {isEs ? 'hasta' : 'until'} {new Date(suscripcion.current_period_end).toLocaleDateString(isEs ? 'es' : 'en')}
                </span>
              )}
            </div>
          ) : planAction === 'vitalicio' ? (
            <div className="w-full py-3 text-sm font-semibold text-center rounded-xl border-2 border-amber-200 bg-amber-50 text-amber-700">
              ⭐ {isEs ? 'Plan vitalicio activo' : 'Lifetime plan active'}
            </div>
          ) : (
            <>
              {/* Nota de prorrateo para upgrade */}
              {planAction === 'upgrade' && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700 mb-3">
                  {isEs
                    ? '💡 Solo pagarás la diferencia proporcional al tiempo restante de tu plan actual. Stripe prorratea automáticamente.'
                    : '💡 You will only pay the prorated difference for the remaining time on your current plan. Stripe calculates this automatically.'}
                </div>
              )}
              {/* Nota para downgrade */}
              {(planAction === 'downgrade' || planAction === 'change_period') && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700 mb-3">
                  {isEs
                    ? `⏳ El cambio de plan será efectivo al finalizar tu ciclo actual (${suscripcion?.current_period_end ? new Date(suscripcion.current_period_end).toLocaleDateString('es') : '—'}). No se realiza ningún cargo ahora.`
                    : `⏳ The plan change will take effect at the end of your current cycle (${suscripcion?.current_period_end ? new Date(suscripcion.current_period_end).toLocaleDateString('en') : '—'}). No charge now.`}
                </div>
              )}
              <button
                onClick={planAction === 'subscribe' ? iniciarCheckout : cambiarPlan}
                disabled={subLoading}
                className="w-full py-3 text-sm font-bold text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
                style={{ background: planAction === 'downgrade' ? '#92400E' : '#1B3A6B' }}>
                {subLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {isEs ? 'Procesando...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                    {planAction === 'subscribe' && (isEs
                      ? `Suscribirse a MARY ${subPlan.charAt(0).toUpperCase()+subPlan.slice(1)} · $${PLANES[subPlan][subPeriodo].toFixed(2)}/${subPeriodo === 'mensual' ? 'mes' : 'año'}`
                      : `Subscribe to MARY ${subPlan.charAt(0).toUpperCase()+subPlan.slice(1)} · $${PLANES[subPlan][subPeriodo].toFixed(2)}/${subPeriodo === 'mensual' ? 'mo' : 'yr'}`)}
                    {planAction === 'upgrade' && (isEs
                      ? `↑ Upgrade a ${subPlan.charAt(0).toUpperCase()+subPlan.slice(1)} · pago prorrateado`
                      : `↑ Upgrade to ${subPlan.charAt(0).toUpperCase()+subPlan.slice(1)} · prorated charge`)}
                    {planAction === 'downgrade' && (isEs
                      ? `↓ Cambiar a ${subPlan.charAt(0).toUpperCase()+subPlan.slice(1)} · efectivo al próximo ciclo`
                      : `↓ Switch to ${subPlan.charAt(0).toUpperCase()+subPlan.slice(1)} · effective next cycle`)}
                    {planAction === 'change_period' && (isEs
                      ? `Cambiar a facturación ${subPeriodo} · efectivo al próximo ciclo`
                      : `Switch to ${subPeriodo} billing · effective next cycle`)}
                  </>
                )}
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">
                {isEs
                  ? 'Pago seguro procesado por Stripe. Puedes cancelar en cualquier momento.'
                  : 'Secure payment processed by Stripe. Cancel anytime.'}
              </p>
            </>
          )}
        </div>
      )}

    
    {permDrawer && (
      <div className="fixed inset-0 z-50 flex">
        <div className="flex-1 bg-black/30" onClick={() => setPermDrawer(null)} />
        <div className="w-[480px] bg-white h-full shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <p className="font-semibold text-gray-800">{isEs ? 'Permisos de acceso' : 'Access permissions'}</p>
              <p className="text-xs text-gray-400 mt-0.5">{permDrawer.nombre} · {permDrawer.email}</p>
            </div>
            <button onClick={() => setPermDrawer(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

            {/* MÓDULOS */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {isEs ? 'Acceso por módulo' : 'Module access'}
              </p>
              <div className="text-xs text-gray-400 mb-2">
                {isEs ? 'Si no configuras permisos, se usan los del rol asignado.' : 'If not configured, role defaults are used.'}
              </div>
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-2.5 text-left text-xs text-gray-500">{isEs ? 'Módulo' : 'Module'}</th>
                      <th className="px-4 py-2.5 text-center text-xs text-gray-500">{isEs ? 'Ver' : 'View'}</th>
                      <th className="px-4 py-2.5 text-center text-xs text-gray-500">{isEs ? 'Editar' : 'Edit'}</th>
                      <th className="px-4 py-2.5 text-center text-xs text-gray-500">{isEs ? 'Rol base' : 'Default'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MODULOS_PERMISOS.map((mod, i) => {
                      const custom = permData[mod.id]
                      const hasCustom = custom !== undefined
                      return (
                        <tr key={mod.id} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm text-gray-700">{isEs ? mod.label_es : mod.label_en}</span>
                              {hasCustom && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">custom</span>}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <input type="checkbox"
                              className="w-4 h-4 accent-[#1B3A6B]"
                              checked={hasCustom ? (custom.ver === true) : false}
                              onChange={() => togglePermMod(mod.id, 'ver')}
                            />
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {mod.tieneEditar ? (
                              <input type="checkbox"
                                className="w-4 h-4 accent-[#1B3A6B]"
                                checked={hasCustom ? (custom.editar === true) : false}
                                onChange={() => togglePermMod(mod.id, 'editar')}
                                disabled={hasCustom && !custom.ver}
                              />
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button onClick={() => setPermData(prev => {
                              const next = { ...prev }
                              delete next[mod.id]
                              return next
                            })} className="text-xs text-gray-400 hover:text-red-400">
                              {isEs ? 'Restablecer' : 'Reset'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PROYECTOS */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {isEs ? 'Acceso a proyectos' : 'Project access'}
              </p>
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input type="checkbox" className="w-4 h-4 accent-[#1B3A6B]"
                  checked={todosProys} onChange={e => { setTodosProys(e.target.checked); if (e.target.checked) setPermProys([]) }} />
                <span className="text-sm text-gray-700">{isEs ? 'Acceso a todos los proyectos' : 'Access to all projects'}</span>
              </label>
              {!todosProys && (
                <div className="flex flex-col gap-1.5 border border-gray-100 rounded-xl p-3 bg-gray-50/30">
                  {state.proyectos.length === 0 ? (
                    <p className="text-xs text-gray-400">{isEs ? 'No hay proyectos registrados' : 'No projects registered'}</p>
                  ) : state.proyectos.map(p => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 accent-[#1B3A6B]"
                        checked={permProys.includes(p.id)}
                        onChange={() => toggleProy(p.id)} />
                      <span className="text-sm text-gray-700">{p.project_code} — {p.nombre}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* INFO */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
              {isEs
                ? 'Los permisos personalizados sobrescriben los del rol. Usa "Restablecer" en un módulo para volver al comportamiento del rol.'
                : 'Custom permissions override role defaults. Use "Reset" on a module to restore role behavior.'}
            </div>
          </div>

          <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
            <button onClick={() => setPermDrawer(null)}
              className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
              {isEs ? 'Cancelar' : 'Cancel'}
            </button>
            <button onClick={savePermisos} disabled={savingPerm}
              className="flex-1 px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
              style={{ background: '#1B3A6B' }}>
              {savingPerm ? '...' : (isEs ? 'Guardar permisos' : 'Save permissions')}
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
    </>
  )
}
