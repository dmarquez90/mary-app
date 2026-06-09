import { useState } from 'react'
import { supabase } from '../supabase'
import { useT } from '../i18n'

export default function ForgotPassword({ onNavigate }) {
  const t = useT()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      })
    } catch (_) {
      // Silent — always show success for security (don't reveal if email exists)
    } finally {
      setLoading(false)
      setSent(true)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#0f172a' }}
    >
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-900/20 rotate-3">
              <span className="text-white text-3xl font-black -rotate-3">M</span>
            </div>
          </div>
          <h1 className="text-white text-4xl font-black tracking-tighter">
            MARY<span className="text-blue-500">.</span>
          </h1>
          <p className="text-slate-500 text-[10px] uppercase tracking-[0.3em] mt-1 font-bold">
            Management &amp; Resources Yield
          </p>
        </div>

        {!sent ? (
          <>
            <div className="text-center mb-8">
              <h2 className="text-white text-xl font-bold mb-2">
                {t('auth_forgot_title')}
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                {t('auth_forgot_subtitle')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </span>
                <input
                  type="email"
                  placeholder={t('auth_forgot_email_ph')}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-12 pr-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl text-white font-bold text-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-lg disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
              >
                {loading ? '...' : t('auth_forgot_btn_send')}
              </button>
            </form>

            <div className="text-center mt-8">
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="text-blue-400 text-sm font-medium hover:text-white transition-colors"
              >
                {t('auth_forgot_back')}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-2xl flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
            </div>
            <h2 className="text-white text-xl font-bold mb-3">
              {t('auth_forgot_success_title')}
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              {t('auth_forgot_success_body').replace('{email}', email)}
            </p>
            <button
              type="button"
              onClick={() => onNavigate('verify-otp', { email })}
              className="w-full py-4 rounded-xl text-white font-bold text-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-lg"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
            >
              {t('auth_forgot_btn_enter_code')}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="text-blue-400 text-sm font-medium hover:text-white transition-colors mt-6 block mx-auto"
            >
              {t('auth_forgot_back')}
            </button>
          </div>
        )}

        <footer className="mt-16 text-center border-t border-slate-800 pt-8">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">
            Marquez Project Solutions LLC · 2026
          </p>
        </footer>
      </div>
    </div>
  )
}
