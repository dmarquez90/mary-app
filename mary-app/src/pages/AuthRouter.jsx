import { useState } from 'react'
import { useAuth } from "../auth"
import Login from './Login'
import ForgotPassword from './ForgotPassword'
import VerifyOTP from './VerifyOTP'
import ResetPassword from './ResetPassword'

// ── PANTALLA DE BLOQUEO ───────────────────────────────────────────────────
function BlockedScreen({ reason, onBack }) {
  const lang = localStorage.getItem('mary_lang') || 'ES'
  const isEs = lang === 'ES'

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
    trial_expired: {
      icon:    '⏰',
      title:   isEs ? 'Período de prueba vencido'  : 'Trial period expired',
      body:    isEs
        ? 'Tu período de prueba gratuito de 60 días ha finalizado. Para continuar usando MARY, activa una suscripción.'
        : 'Your 60-day free trial has ended. To continue using MARY, activate a subscription.',
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

          {reason === 'trial_expired' && (
            <a href="mailto:deybi@marquezprojectsolutions.com?subject=Activar suscripcion MARY"
              className="block w-full py-3.5 rounded-xl text-white font-bold text-sm mb-4 hover:brightness-110 transition-all"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}>
              {isEs ? 'Activar suscripción' : 'Activate subscription'}
            </a>
          )}

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
  const [screen, setScreen] = useState('login')
  const [otpEmail, setOtpEmail] = useState('')

  const navigate = (target, params = {}) => {
    if (params.email) setOtpEmail(params.email)
    setScreen(target)
  }

  // Si hay una razón de bloqueo, mostrar pantalla de bloqueo
  if (blockedReason) {
    return (
      <BlockedScreen
        reason={blockedReason}
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
