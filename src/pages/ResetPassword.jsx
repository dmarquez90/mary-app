import { useState } from 'react'
import { supabase } from '../supabase'
import { useT } from '../i18n'

export default function ResetPassword({ onNavigate }) {
  const t = useT()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Password strength
  const strength = (() => {
    if (!password) return 0
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    return score
  })()

  const strengthLabel = [
    '',
    t('auth_reset_strength_weak'),
    t('auth_reset_strength_fair'),
    t('auth_reset_strength_good'),
    t('auth_reset_strength_strong'),
  ]

  const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e']

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError(t('auth_reset_weak'))
      return
    }
    if (password !== confirm) {
      setError(t('auth_reset_mismatch'))
      return
    }

    setLoading(true)
    try {
      const { error: sbError } = await supabase.auth.updateUser({ password })
      if (sbError) throw sbError
      setSuccess(true)
    } catch (err) {
      setError(err.message || t('auth_reset_error'))
    } finally {
      setLoading(false)
    }
  }

  const EyeIcon = ({ open }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {open ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      )}
    </svg>
  )

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

        {!success ? (
          <>
            <div className="text-center mb-8">
              <h2 className="text-white text-xl font-bold mb-2">{t('auth_reset_title')}</h2>
              <p className="text-slate-400 text-sm">{t('auth_reset_subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New password */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder={t('auth_reset_new_pw')}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-12 pr-12 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <EyeIcon open={showPw} />
                </button>
              </div>

              {/* Strength bar */}
              {password.length > 0 && (
                <div className="space-y-1 px-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{
                          background: strength >= level ? strengthColor[strength] : '#1e293b',
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-medium" style={{ color: strengthColor[strength] || '#64748b' }}>
                    {strengthLabel[strength]}
                  </p>
                </div>
              )}

              {/* Confirm password */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder={t('auth_reset_confirm_pw')}
                  className={`w-full bg-slate-800/50 border rounded-xl pl-12 pr-12 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${
                    confirm && confirm !== password
                      ? 'border-red-500/60'
                      : 'border-slate-700'
                  }`}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <EyeIcon open={showConfirm} />
                </button>
              </div>

              {error && (
                <div className="text-red-400 text-xs text-center font-medium bg-red-400/10 py-2 rounded-lg border border-red-400/20">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || strength < 2 || password !== confirm}
                className="w-full py-4 rounded-xl text-white font-bold text-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-lg disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
              >
                {loading ? '...' : t('auth_reset_btn_save')}
              </button>
            </form>
          </>
        ) : (
          /* Success state */
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-2xl flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
            <h2 className="text-white text-xl font-bold mb-3">{t('auth_reset_success_title')}</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              {t('auth_reset_success_body')}
            </p>
            <button
              onClick={() => onNavigate('login')}
              className="w-full py-4 rounded-xl text-white font-bold text-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-lg"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
            >
              {t('auth_reset_btn_login')}
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
