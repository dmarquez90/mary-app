import { useState } from 'react'
import { useAuth } from '../auth'
import maryLogo from '../assets/mary-logo.png'

const BRAND = '#1B3A6B'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0F4F8' }}>
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="px-8 py-8 text-center" style={{ background: BRAND }}>
            <img src={maryLogo} alt="MARY" className="h-12 w-auto object-contain mx-auto mb-3" />
            <p className="text-blue-200 text-sm">Management And Resources Yield</p>
          </div>
          <div className="px-8 py-8">
            <h2 className="text-lg font-bold text-gray-800 mb-1">Iniciar sesión</h2>
            <p className="text-sm text-gray-400 mb-6">Ingresa tus credenciales para continuar</p>
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Email</label>
                <input type="email"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B]"
                  placeholder="correo@empresa.com"
                  value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Contraseña</label>
                <input type="password"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B]"
                  placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">{error}</div>
              )}
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                style={{ background: BRAND }}>
                {loading ? 'Iniciando sesión...' : 'Ingresar'}
              </button>
            </form>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">
          Marquez Project Solutions LLC · MARY ERP · 2026
        </p>
      </div>
    </div>
  )
}
