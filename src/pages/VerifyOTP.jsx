import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabase'
import { useT } from '../i18n'

export default function VerifyOTP({ email, onNavigate }) {
  const t = useT()
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const inputRefs = useRef([])

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleDigitChange = (index, value) => {
    const cleaned = value.replace(/\D/g, '').slice(-1)
    const newDigits = [...digits]
    newDigits[index] = cleaned
    setDigits(newDigits)
    setError('')

    // Auto-advance
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 filled
    if (index === 5 && cleaned) {
      const allFilled = newDigits.every((d) => d !== '')
      if (allFilled) handleVerify(newDigits.join(''))
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowLeft'  && index > 0) inputRefs.current[index - 1]?.focus()
    if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus()
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const newDigits = ['', '', '', '', '', '']
    pasted.split('').forEach((ch, i) => { newDigits[i] = ch })
    setDigits(newDigits)
    const nextFocus = pasted.length < 6 ? pasted.length : 5
    inputRefs.current[nextFocus]?.focus()
    if (pasted.length === 6) handleVerify(pasted)
  }

  const handleVerify = async (code) => {
    if (!code) code = digits.join('')
    if (code.length < 6) { setError(t('auth_otp_error_incomplete')); return }
    setError('')
    setLoading(true)
    try {
      const { error: sbError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      })
      if (sbError) throw sbError
      onNavigate('reset-password')
    } catch {
      setError(t('auth_otp_error_invalid'))
      setDigits(['', '', '', '', '', ''])
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setCanResend(false)
    setCountdown(60)
    setError('')
    try {
      await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      })
    } catch (_) {
      // Silent
    }
  }

  const token = digits.join('')

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

        <div className="text-center mb-8">
          <h2 className="text-white text-xl font-bold mb-2">{t('auth_otp_title')}</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            {t('auth_otp_subtitle').replace('{email}', email)}
          </p>
        </div>

        {/* 6 digit boxes */}
        <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              autoFocus={i === 0}
              disabled={loading}
              className={[
                'w-12 h-14 text-center text-white text-xl font-black rounded-xl border transition-all',
                'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
                digit
                  ? 'bg-blue-600/20 border-blue-500/60'
                  : 'bg-slate-800/50 border-slate-700',
                error ? 'border-red-500/60' : '',
              ].join(' ')}
            />
          ))}
        </div>

        {error && (
          <div className="text-red-400 text-xs text-center font-medium bg-red-400/10 py-2 rounded-lg border border-red-400/20 mb-4">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={() => handleVerify()}
          disabled={loading || token.length < 6}
          className="w-full py-4 rounded-xl text-white font-bold text-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-lg disabled:opacity-40 mb-4"
          style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
        >
          {loading ? '...' : t('auth_otp_btn_verify')}
        </button>

        <div className="text-center">
          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              className="text-blue-400 text-sm font-medium hover:text-white transition-colors"
            >
              {t('auth_otp_resend')}
            </button>
          ) : (
            <p className="text-slate-500 text-sm">
              {t('auth_otp_countdown').replace('{n}', countdown)}
            </p>
          )}
        </div>

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => onNavigate('forgot-password')}
            className="text-slate-500 text-sm hover:text-slate-300 transition-colors"
          >
            {t('auth_forgot_back')}
          </button>
        </div>

        <footer className="mt-16 text-center border-t border-slate-800 pt-8">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">
            Marquez Project Solutions LLC · 2026
          </p>
        </footer>
      </div>
    </div>
  )
}
