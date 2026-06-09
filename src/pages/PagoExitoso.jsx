import { useEffect, useState } from 'react'

const BRAND = '#1B3A6B'

export default function PagoExitoso() {
  const lang = localStorage.getItem('mary_lang') || 'ES'
  const isEs = lang === 'ES'
  const [segundos, setSegundos] = useState(5)

  useEffect(() => {
    const interval = setInterval(() => {
      setSegundos(s => {
        if (s <= 1) {
          clearInterval(interval)
          window.location.href = '/'
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

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
            style={{ background: '#D1FAE5' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {isEs ? '¡Suscripción activada!' : 'Subscription activated!'}
          </h2>
          <p className="text-sm text-gray-500 mb-6" style={{ lineHeight: 1.6 }}>
            {isEs
              ? 'Tu pago fue procesado correctamente. Ya tienes acceso completo a todos los módulos de tu plan.'
              : 'Your payment was processed successfully. You now have full access to all modules in your plan.'}
          </p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm text-gray-600">
            {isEs
              ? 'Recibirás un correo de confirmación de Stripe con los detalles de tu suscripción.'
              : 'You will receive a confirmation email from Stripe with your subscription details.'}
          </div>

          <button
            onClick={() => window.location.href = '/'}
            className="w-full py-3 text-sm font-bold text-white rounded-xl transition-opacity hover:opacity-90"
            style={{ background: BRAND }}>
            {isEs ? `Ir a MARY (${segundos}s)` : `Go to MARY (${segundos}s)`}
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          MARQUEZ PROJECT SOLUTIONS LLC · 2026
        </p>
      </div>
    </div>
  )
}
