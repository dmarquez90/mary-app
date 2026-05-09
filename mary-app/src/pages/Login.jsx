import { useState } from 'react'
import { useAuth } from '../auth'
import { supabase } from '../supabase'
import { supabaseAdmin } from '../supabaseAdmin'

const PAISES = [
  'Estados Unidos','México','Guatemala','El Salvador','Honduras','Nicaragua',
  'Costa Rica','Panamá','Colombia','Venezuela','Ecuador','Perú','Bolivia',
  'Chile','Argentina','Uruguay','Paraguay','España','Otro'
]

const T = {
  ES: {
    tagline:         'MANAGEMENT & RESOURCES YIELD',
    email:           'usuario@empresa.com',
    password:        '••••••••',
    enter:           'Entrar al Sistema',
    loading:         'Cargando...',
    forgot:          '¿Olvidaste tu contraseña?',
    try:             '¿No tienes cuenta? Prueba MARY gratis',
    footer:          'MARQUEZ PROJECT SOLUTIONS LLC · 2026',
    err_credentials: 'Credenciales incorrectas. Verifica tu email y contraseña.',
    // Registro
    reg_title:       'Prueba MARY por 60 días',
    reg_sub:         'Plan Pro gratis. Sin tarjeta de crédito.',
    reg_name:        'Nombre completo',
    reg_company:     'Nombre de la empresa',
    reg_phone:       'Teléfono',
    reg_email:       'Correo electrónico',
    reg_password:    'Contraseña (mín. 8 caracteres)',
    reg_country:     'País',
    reg_select:      '— Seleccionar país —',
    reg_btn:         'Crear cuenta gratis',
    reg_loading:     'Creando cuenta...',
    reg_back:        '← Volver al inicio de sesión',
    reg_success:     '¡Cuenta creada! Ya puedes iniciar sesión.',
    err_email_taken: 'Este correo ya está registrado.',
    err_company_taken: 'Ya existe una empresa con ese nombre.',
    err_fields:      'Por favor completa todos los campos.',
    err_password:    'La contraseña debe tener al menos 8 caracteres.',
    // Forgot
    forgot_title:    'Recuperar contraseña',
    forgot_sub:      'Te enviaremos un enlace para restablecer tu contraseña.',
    forgot_btn:      'Enviar enlace',
    forgot_loading:  'Enviando...',
    forgot_sent:     '✓ Revisa tu correo. Si existe una cuenta con ese email, recibirás el enlace.',
    forgot_back:     '← Volver al inicio de sesión',
  },
  EN: {
    tagline:         'MANAGEMENT & RESOURCES YIELD',
    email:           'user@company.com',
    password:        '••••••••',
    enter:           'Sign In',
    loading:         'Loading...',
    forgot:          'Forgot your password?',
    try:             "Don't have an account? Try MARY free",
    footer:          'MARQUEZ PROJECT SOLUTIONS LLC · 2026',
    err_credentials: 'Incorrect credentials. Check your email and password.',
    // Register
    reg_title:       'Try MARY for 60 days',
    reg_sub:         'Pro plan free. No credit card required.',
    reg_name:        'Full name',
    reg_company:     'Company name',
    reg_phone:       'Phone number',
    reg_email:       'Email address',
    reg_password:    'Password (min. 8 characters)',
    reg_country:     'Country',
    reg_select:      '— Select country —',
    reg_btn:         'Create free account',
    reg_loading:     'Creating account...',
    reg_back:        '← Back to sign in',
    reg_success:     'Account created! You can now sign in.',
    err_email_taken: 'This email is already registered.',
    err_company_taken: 'A company with that name already exists.',
    err_fields:      'Please fill in all fields.',
    err_password:    'Password must be at least 8 characters.',
    // Forgot
    forgot_title:    'Reset password',
    forgot_sub:      "We'll send you a link to reset your password.",
    forgot_btn:      'Send link',
    forgot_loading:  'Sending...',
    forgot_sent:     "✓ Check your email. If an account exists with that email, you'll receive the link.",
    forgot_back:     '← Back to sign in',
  }
}

const inputCls = 'w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-12 pr-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm'
const inputClsNoIcon = 'w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm'

export default function Login({ onNavigate }) {
  const { login } = useAuth()
  const [lang, setLang]         = useState('ES')
  const [view, setView]         = useState('login') // 'login' | 'register' | 'forgot'
  const t = T[lang]

  // Login
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  // Register
  const [reg, setReg] = useState({ nombre:'', empresa:'', telefono:'', email:'', password:'', pais:'' })
  const [regError, setRegError]     = useState('')
  const [regSuccess, setRegSuccess] = useState(false)
  const [regLoading, setRegLoading] = useState(false)
  const setR = k => e => setReg(f => ({ ...f, [k]: e.target.value }))

  // Forgot
  const [forgotEmail, setForgotEmail]   = useState('')
  const [forgotSent, setForgotSent]     = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await login(email, password)
    } catch {
      setError(t.err_credentials)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setRegError('')
    if (!reg.nombre || !reg.empresa || !reg.telefono || !reg.email || !reg.password || !reg.pais) {
      setRegError(t.err_fields); return
    }
    if (reg.password.length < 8) {
      setRegError(t.err_password); return
    }
    setRegLoading(true)
    try {
      // Verificar empresa duplicada
      const { data: empresaExistente } = await supabase
        .from('tenants')
        .select('id')
        .ilike('nombre_empresa', reg.empresa)
        .maybeSingle()
      if (empresaExistente) { setRegError(t.err_company_taken); setRegLoading(false); return }

      // Calcular fechas trial
      const ahora     = new Date()
      const trialFin  = new Date(ahora)
      trialFin.setDate(trialFin.getDate() + 60)

      // Crear tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          nombre_empresa: reg.empresa,
          plan:           'pro',
          max_usuarios:   15,
          max_proyectos:  10,
          activo:         true,
          es_trial:       true,
          trial_inicio:   ahora.toISOString(),
          trial_fin:      trialFin.toISOString(),
          telefono:       reg.telefono,
          pais:           reg.pais,
          fecha_creacion: ahora.toISOString(),
        })
        .select()
        .single()

      if (tenantError) throw tenantError

      // Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email:         reg.email,
        password:      reg.password,
        email_confirm: true,
      })

      if (authError) {
        // Si falla el auth, limpiar el tenant creado
        await supabase.from('tenants').delete().eq('id', tenant.id)
        if (authError.message?.includes('already registered') || authError.message?.includes('already exists')) {
          setRegError(t.err_email_taken)
        } else {
          throw authError
        }
        setRegLoading(false); return
      }

      // Crear registro en tabla usuarios
      await supabase.from('usuarios').insert({
        id:         authData.user.id,
        tenant_id:  tenant.id,
        nombre:     reg.nombre,
        email:      reg.email,
        rol:        'client_admin',
        activo:     true,
      })

      setRegSuccess(true)
      setReg({ nombre:'', empresa:'', telefono:'', email:'', password:'', pais:'' })
    } catch (err) {
      setRegError(err.message || 'Error al crear la cuenta.')
    }
    setRegLoading(false)
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    setForgotLoading(true)
    try {
      await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      setForgotSent(true)
    } catch { /* silencioso por seguridad */ }
    setForgotLoading(false)
  }

  const Logo = () => (
    <div className="text-center mb-8">
      <div className="flex justify-center mb-4">
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-900/30 rotate-3">
          <span className="text-white text-2xl font-black -rotate-3">M</span>
        </div>
      </div>
      <h1 className="text-white text-3xl font-black tracking-tighter">
        MARY<span className="text-blue-500">.</span>
      </h1>
      <p className="text-slate-500 text-[9px] uppercase tracking-[0.3em] mt-1 font-bold">{t.tagline}</p>
    </div>
  )

  const LangToggle = () => (
    <button onClick={() => setLang(l => l==='ES'?'EN':'ES')}
      className="absolute top-4 right-4 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors">
      🌐 {lang === 'ES' ? 'EN' : 'ES'}
    </button>
  )

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  if (view === 'login') return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ background: '#0f172a' }}>
      <LangToggle />
      <div className="w-full max-w-sm">
        <Logo />
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </span>
            <input type="email" placeholder={t.email} className={inputCls}
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <input type="password" placeholder={t.password} className={inputCls}
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && (
            <div className="text-red-400 text-xs text-center font-medium bg-red-400/10 py-2 rounded-lg border border-red-400/20">{error}</div>
          )}
          <button type="submit" disabled={loading}
            className="w-full py-4 rounded-xl text-white font-bold text-base hover:brightness-110 active:scale-[0.98] transition-all shadow-lg disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}>
            {loading ? t.loading : t.enter}
          </button>
        </form>

        <div className="text-center mt-6 flex flex-col gap-3">
          <button onClick={() => { setView('forgot'); setForgotSent(false); setForgotEmail('') }}
            className="text-slate-400 text-sm hover:text-white transition-colors">{t.forgot}</button>

          <div className="border-t border-slate-800 pt-4">
            <button onClick={() => { setView('register'); setRegError(''); setRegSuccess(false) }}
              className="w-full py-3.5 rounded-xl text-sm font-semibold border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 transition-all">
              ✨ {t.try}
            </button>
          </div>
        </div>

        <footer className="mt-10 text-center border-t border-slate-800 pt-6">
          <p className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">{t.footer}</p>
        </footer>
      </div>
    </div>
  )

  // ── REGISTRO TRIAL ────────────────────────────────────────────────────────
  if (view === 'register') return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ background: '#0f172a' }}>
      <LangToggle />
      <div className="w-full max-w-md">
        <Logo />

        <div className="text-center mb-6">
          <h2 className="text-white text-xl font-bold">{t.reg_title}</h2>
          <p className="text-slate-400 text-sm mt-1">{t.reg_sub}</p>
          {/* Badges */}
          <div className="flex justify-center gap-2 mt-3 flex-wrap">
            {['✓ 60 días gratis','✓ Plan Pro','✓ Sin tarjeta'].map((b,i) => (
              <span key={i} className="text-xs text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded-full">{b}</span>
            ))}
          </div>
        </div>

        {regSuccess ? (
          <div className="bg-green-400/10 border border-green-400/20 rounded-xl p-6 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-green-400 font-semibold text-sm">{t.reg_success}</p>
            <button onClick={() => { setView('login'); setRegSuccess(false) }}
              className="mt-4 text-blue-400 text-sm hover:text-white transition-colors">{t.reg_back}</button>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">{t.reg_name} *</label>
                <input className={inputClsNoIcon} value={reg.nombre} onChange={setR('nombre')} placeholder="Juan Pérez" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">{t.reg_company} *</label>
                <input className={inputClsNoIcon} value={reg.empresa} onChange={setR('empresa')} placeholder="Constructora XYZ" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">{t.reg_phone} *</label>
                <input className={inputClsNoIcon} value={reg.telefono} onChange={setR('telefono')} placeholder="+1 555 000 0000" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">{t.reg_country} *</label>
                <select className={inputClsNoIcon + ' cursor-pointer'} value={reg.pais} onChange={setR('pais')}>
                  <option value="">{t.reg_select}</option>
                  {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">{t.reg_email} *</label>
              <input type="email" className={inputClsNoIcon} value={reg.email} onChange={setR('email')} placeholder="juan@empresa.com" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">{t.reg_password} *</label>
              <input type="password" className={inputClsNoIcon} value={reg.password} onChange={setR('password')} placeholder="••••••••" />
            </div>

            {regError && (
              <div className="text-red-400 text-xs text-center bg-red-400/10 py-2 rounded-lg border border-red-400/20">{regError}</div>
            )}

            <button type="submit" disabled={regLoading}
              className="w-full py-4 rounded-xl text-white font-bold text-base hover:brightness-110 active:scale-[0.98] transition-all shadow-lg disabled:opacity-60 mt-2"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}>
              {regLoading ? t.reg_loading : t.reg_btn}
            </button>

            <button type="button" onClick={() => setView('login')}
              className="w-full text-center text-slate-400 text-sm hover:text-white transition-colors py-2">
              {t.reg_back}
            </button>
          </form>
        )}

        <footer className="mt-6 text-center border-t border-slate-800 pt-4">
          <p className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">{t.footer}</p>
        </footer>
      </div>
    </div>
  )

  // ── FORGOT PASSWORD ───────────────────────────────────────────────────────
  if (view === 'forgot') return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ background: '#0f172a' }}>
      <LangToggle />
      <div className="w-full max-w-sm">
        <Logo />
        <div className="text-center mb-6">
          <h2 className="text-white text-xl font-bold">{t.forgot_title}</h2>
          <p className="text-slate-400 text-sm mt-1">{t.forgot_sub}</p>
        </div>

        {forgotSent ? (
          <div className="bg-green-400/10 border border-green-400/20 rounded-xl p-6 text-center">
            <div className="text-4xl mb-3">📧</div>
            <p className="text-green-400 font-semibold text-sm">{t.forgot_sent}</p>
          </div>
        ) : (
          <form onSubmit={handleForgot} className="space-y-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </span>
              <input type="email" placeholder={t.email} className={inputCls}
                value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
            </div>
            <button type="submit" disabled={forgotLoading}
              className="w-full py-4 rounded-xl text-white font-bold text-base hover:brightness-110 transition-all shadow-lg disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}>
              {forgotLoading ? t.forgot_loading : t.forgot_btn}
            </button>
          </form>
        )}

        <button onClick={() => setView('login')}
          className="w-full text-center text-slate-400 text-sm hover:text-white transition-colors py-3 mt-4">
          {t.forgot_back}
        </button>

        <footer className="mt-8 text-center border-t border-slate-800 pt-6">
          <p className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">{t.footer}</p>
        </footer>
      </div>
    </div>
  )
}
