const BRAND = '#1B3A6B'

export default function Planes() {
  const lang = localStorage.getItem('mary_lang') || 'ES'
  const isEs = lang === 'ES'

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F0F4F8' }}>
      <div className="w-full max-w-md text-center">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl rotate-3"
            style={{ background: BRAND }}>
            <span className="text-white text-2xl font-black -rotate-3">M</span>
          </div>
        </div>
        <h1 className="text-2xl font-black tracking-tighter mb-1" style={{ color: BRAND }}>
          MARY<span style={{ color: '#F59E0B' }}>.</span>
        </h1>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mt-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: '#FEF3C7' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {isEs ? 'Pago no completado' : 'Payment not completed'}
          </h2>
          <p className="text-sm text-gray-500 mb-6" style={{ lineHeight: 1.6 }}>
            {isEs
              ? 'No se realizó ningún cargo. Puedes intentarlo de nuevo cuando quieras desde el módulo de Configuración.'
              : 'No charge was made. You can try again anytime from the Settings module.'}
          </p>

          <button
            onClick={() => window.location.href = '/'}
            className="w-full py-3 text-sm font-bold text-white rounded-xl mb-3 transition-opacity hover:opacity-90"
            style={{ background: BRAND }}>
            {isEs ? 'Volver a MARY' : 'Back to MARY'}
          </button>

          <p className="text-xs text-gray-400">
            {isEs
              ? 'Para activar tu plan ve a Configuración > Suscripción'
              : 'To activate your plan go to Settings > Subscription'}
          </p>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          MARQUEZ PROJECT SOLUTIONS LLC · 2026
        </p>
      </div>
    </div>
  )
}
