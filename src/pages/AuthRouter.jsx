import { useState } from 'react'
import { useAuth } from "../auth"
import { supabase } from '../supabase'
import Login from './Login'
import ForgotPassword from './ForgotPassword'
import VerifyOTP from './VerifyOTP'
import ResetPassword from './ResetPassword'

// ── PLANES para selector de trial_expired ────────────────────────────────
const PLANES_INFO = {
  starter: {
    nombre: 'Starter',
    mensual: 29.99, anual: 25.49,
    usuarios: 1, proyectos: 2,
    color: '#5F5E5A', bg: 'rgba(241,239,232,0.08)', border: 'rgba(255,255,255,0.1)',
    features: {
      ES: ['1 usuario', '2 proyectos', 'Todos los módulos base', 'Soporte por email'],
      EN: ['1 user', '2 projects', 'All base modules', 'Email support'],
    },
  },
  pro: {
    nombre: 'Pro',
    mensual: 49.99, anual: 42.49,
    usuarios: 3, proyectos: 5,
    color: '#2563eb', bg: 'rgba(37,99,235,0.12)', border: 'rgba(37,99,235,0.4)',
    popular: true,
    features: {
      ES: ['3 usuarios', '5 proyectos', 'Órdenes de Cambio', 'Avalúos de clientes', 'Soporte prioritario'],
      EN: ['3 users', '5 projects', 'Change Orders', 'Client Valuations', 'Priority support'],
    },
  },
  enterprise: {
    nombre: 'Enterprise',
    mensual: 69.99, anual: 59.49,
    usuarios: 5, proyectos: 10,
    color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.35)',
    features: {
      ES: ['5 usuarios', '10 proyectos', 'Todos los módulos Pro+', 'Auditoría completa', 'Usuarios adicionales'],
      EN: ['5 users', '10 projects', 'All Pro+ modules', 'Full audit log', 'Additional users'],
    },
  },
}

// ── Sub-componente: Selector de plan para trial expirado ──────────────────
function TrialExpiredCheckout({ perfil, trialMeta, isEs, onBack }) {
  const [plan, setPlan]       = useState('pro')
  const [periodo, setPeriodo] = useState('mensual')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const iniciarCheckout = async () => {
    setLoading(true); setError('')
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
            plan,
            periodo,
            empresa_id:     perfil?.tenant_id,
            email:          perfil?.email,
            empresa_nombre: perfil?.tenants?.nombre_empresa || '',
          }),
        }
      )
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || (isEs ? 'Error al iniciar pago' : 'Payment error'))
      window.location.href = result.url
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  const precioMostrar = (p) => periodo === 'anual' ? PLANES_INFO[p].anual : PLANES_INFO[p].mensual
  const ahorro = (p) => ((PLANES_INFO[p].mensual - PLANES_INFO[p].anual) * 12).toFixed(0)

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0f172a' }}>
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl rotate-3">
              <span className="text-white text-xl font-black -rotate-3">M</span>
            </div>
          </div>
          <h1 className="text-white text-2xl font-black tracking-tighter mb-1">
            MARY<span className="text-blue-500">.</span>
          </h1>
          <p className="text-slate-500 text-[9px] uppercase tracking-[0.3em] font-bold">
            MANAGEMENT &amp; RESOURCES YIELD
          </p>
        </div>

        {/* Card principal */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="text-center mb-5">
            <div className="text-4xl mb-2">⏰</div>
            <h2 className="text-white text-lg font-bold mb-1">
              {isEs ? 'Tu período de prueba finalizó' : 'Your trial period has ended'}
            </h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              {(() => {
                const dias = trialMeta?.trialDias
                if (dias) {
                  return isEs
                    ? `Tu período de prueba gratuito de ${dias} día${dias !== 1 ? 's' : ''} ha finalizado. Selecciona un plan para continuar.`
                    : `Your ${dias}-day free trial has ended. Select a plan to continue using MARY.`
                }
                return isEs
                  ? 'Tu período de prueba ha finalizado. Selecciona un plan para continuar usando MARY.'
                  : 'Your free trial has ended. Select a plan to continue using MARY.'
              })()}
            </p>
          </div>

          {/* Toggle mensual / anual */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <span className={`text-xs font-semibold transition-colors ${periodo === 'mensual' ? 'text-white' : 'text-slate-500'}`}>
              {isEs ? 'Mensual' : 'Monthly'}
            </span>
            <button
              onClick={() => setPeriodo(p => p === 'mensual' ? 'anual' : 'mensual')}
              className="relative w-11 h-6 rounded-full transition-all"
              style={{ background: periodo === 'anual' ? '#2563eb' : '#334155' }}>
              <span
                className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                style={{ left: periodo === 'anual' ? '22px' : '2px' }}
              />
            </button>
            <span className={`text-xs font-semibold transition-colors ${periodo === 'anual' ? 'text-white' : 'text-slate-500'}`}>
              {isEs ? 'Anual' : 'Annual'}
              <span className="ml-1.5 text-[10px] text-emerald-400 font-bold">-5%</span>
            </span>
          </div>

          {/* Cards de planes */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {Object.entries(PLANES_INFO).map(([id, info]) => (
              <button
                key={id}
                onClick={() => setPlan(id)}
                className="relative rounded-xl p-3 text-left transition-all"
                style={{
                  background:   plan === id ? info.bg    : 'rgba(255,255,255,0.03)',
                  border:       `1.5px solid ${plan === id ? info.border : 'rgba(255,255,255,0.07)'}`,
                  boxShadow:    plan === id ? `0 0 0 1px ${info.border}` : 'none',
                }}>
                {info.popular && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    {isEs ? 'Popular' : 'Popular'}
                  </div>
                )}
                <p className="text-white text-xs font-bold mb-1">{info.nombre}</p>
                <p className="text-white text-sm font-black">${precioMostrar(id)}</p>
                <p className="text-slate-500 text-[10px]">{isEs ? '/mes' : '/mo'}</p>
                {periodo === 'anual' && (
                  <p className="text-emerald-400 text-[9px] font-semibold mt-1">
                    {isEs ? `Ahorras $${ahorro(id)}/año` : `Save $${ahorro(id)}/yr`}
                  </p>
                )}
                <div className="mt-2 space-y-0.5">
                  {info.features[isEs ? 'ES' : 'EN'].map((f, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span className="text-emerald-400 text-[10px]">✓</span>
                      <span className="text-slate-400 text-[10px]">{f}</span>
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center">
              {error}
            </div>
          )}

          {/* Botón CTA */}
          <button
            onClick={iniciarCheckout}
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}>
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12"/>
                </svg>
                {isEs ? 'Redirigiendo...' : 'Redirecting...'}
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                {isEs
                  ? `Activar plan ${PLANES_INFO[plan].nombre} — $${precioMostrar(plan)}/mes`
                  : `Activate ${PLANES_INFO[plan].nombre} plan — $${precioMostrar(plan)}/mo`}
              </>
            )}
          </button>

          {/* Info de contacto */}
          <div className="mt-4 bg-slate-900/50 rounded-xl p-3 text-xs text-slate-400 text-center">
            <p className="font-medium text-slate-300 mb-0.5">
              {isEs ? 'Para más información:' : 'For more information:'}
            </p>
            <p>deybi@marquezprojectsolutions.com</p>
            <p className="mt-0.5">www.marquezprojectsolutions.com</p>
          </div>
        </div>

        <button onClick={onBack}
          className="mt-5 w-full text-slate-500 text-sm hover:text-slate-300 transition-colors text-center">
          {isEs ? '← Volver al inicio de sesión' : '← Back to sign in'}
        </button>

        <p className="text-[9px] text-slate-700 uppercase tracking-widest font-bold mt-6 text-center">
          MARQUEZ PROJECT SOLUTIONS LLC · 2026
        </p>
      </div>
    </div>
  )
}

// ── PANTALLA DE BLOQUEO ───────────────────────────────────────────────────
function BlockedScreen({ reason, trialMeta, onBack }) {
  const lang = localStorage.getItem('mary_lang') || 'ES'
  const isEs = lang === 'ES'
  const { perfil } = useAuth()

  // trial_expired tiene su propio componente con selector de plan
  if (reason === 'trial_expired') {
    return <TrialExpiredCheckout perfil={perfil} trialMeta={trialMeta} isEs={isEs} onBack={onBack} />
  }

  const messages = {
    user_inactive: {
      icon:    '🚫',
      title:   isEs ? 'Cuenta desactivada'        : 'Account deactivated',
      body:    isEs
        ? 'Tu cuenta ha sido desactivada por el administrador de tu empresa. Contacta a tu administrador para más información.'
        : 'Your account has been deactivated by your company administrator. Contact your administrator for more information.',
      contact: isEs ? 'Contacta a tu administrador' : 'Contact your administrator',
    },
    tenant_inactive: {
      icon:    '🏢',
      title:   isEs ? 'Empresa desactivada'        : 'Company deactivated',
      body:    isEs
        ? 'El acceso a MARY para tu empresa ha sido desactivado. Si crees que esto es un error, contacta a Marquez Project Solutions LLC.'
        : 'MARY access for your company has been deactivated. If you believe this is an error, contact Marquez Project Solutions LLC.',
      contact: 'deybi@marquezprojectsolutions.com',
    },
  }

  const msg = messages[reason] || messages.user_inactive

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0f172a' }}>
      <div className="w-full max-w-md text-center">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl rotate-3">
            <span className="text-white text-2xl font-black -rotate-3">M</span>
          </div>
        </div>
        <h1 className="text-white text-2xl font-black tracking-tighter mb-1">
          MARY<span className="text-blue-500">.</span>
        </h1>
        <p className="text-slate-500 text-[9px] uppercase tracking-[0.3em] font-bold mb-8">
          MANAGEMENT &amp; RESOURCES YIELD
        </p>

        {/* Card de bloqueo */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
          <div className="text-5xl mb-4">{msg.icon}</div>
          <h2 className="text-white text-xl font-bold mb-3">{msg.title}</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">{msg.body}</p>

          <div className="bg-slate-900/50 rounded-xl p-3 text-xs text-slate-400">
            <p className="font-medium text-slate-300 mb-1">
              {isEs ? 'Para más información:' : 'For more information:'}
            </p>
            <p>{msg.contact}</p>
            <p className="mt-1">www.marquezprojectsolutions.com</p>
          </div>
        </div>

        <button onClick={onBack}
          className="mt-6 text-slate-500 text-sm hover:text-slate-300 transition-colors">
          {isEs ? '← Volver al inicio de sesión' : '← Back to sign in'}
        </button>

        <p className="text-[9px] text-slate-700 uppercase tracking-widest font-bold mt-8">
          MARQUEZ PROJECT SOLUTIONS LLC · 2026
        </p>
      </div>
    </div>
  )
}

// ── ROUTER PRINCIPAL ──────────────────────────────────────────────────────
export default function AuthRouter() {
  const { blockedReason, setBlockedReason } = useAuth()
  // blockedReason puede ser string (user_inactive, tenant_inactive) u objeto { reason, trialDias, ... }
  const [screen, setScreen] = useState('login')
  const [otpEmail, setOtpEmail] = useState('')

  const navigate = (target, params = {}) => {
    if (params.email) setOtpEmail(params.email)
    setScreen(target)
  }

  // Si hay una razon de bloqueo, mostrar pantalla de bloqueo
  // blockedReason puede ser string o { reason, trialDias, email, tenant_id, tenantNombre }
  if (blockedReason) {
    const reason     = typeof blockedReason === 'object' ? blockedReason.reason : blockedReason
    const trialMeta  = typeof blockedReason === 'object' ? blockedReason : null
    return (
      <BlockedScreen
        reason={reason}
        trialMeta={trialMeta}
        onBack={() => setBlockedReason(null)}
      />
    )
  }

  switch (screen) {
    case 'forgot-password':
      return <ForgotPassword onNavigate={navigate} />
    case 'verify-otp':
      return <VerifyOTP email={otpEmail} onNavigate={navigate} />
    case 'reset-password':
      return <ResetPassword onNavigate={navigate} />
    case 'login':
    default:
      return <Login onNavigate={navigate} />
  }
}
