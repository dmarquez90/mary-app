import { useState } from 'react'
import { useAuth } from '../auth'

// Color de la marca para el botón principal
const BRAND_BLUE = '#0061E0' 

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
    <div className="min-h-screen flex items-center justify-center p-4" 
         style={{ background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)' }}>
      
      <div className="w-full max-w-md">
        {/* Nuevo Logo Estilizado (Inspirado en la referencia) */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>
              {/* Círculo de fondo sutil */}
              <circle cx="50" cy="50" r="48" fill="white" fillOpacity="0.05" />
              {/* Símbolo de la M estilizada */}
              <path 
                d="M25 70V30L50 55L75 30V70" 
                stroke="url(#logo-gradient)" 
                strokeWidth="12" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-white text-4xl font-extrabold tracking-tighter">
            MARY<span className="text-blue-400">.</span>
          </h1>
          <p className="text-gray-400 text-sm mt-2 font-medium tracking-widest uppercase">
            Management And Resources Yield
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Campo Email */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <input
              type="email"
              placeholder="Usuario o Email"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 transition-all"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Campo Contraseña */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <input
              type="password"
              placeholder="Contraseña"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="text-red-400 text-xs text-center bg-red-400/10 py-3 rounded-lg border border-red-400/20">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl text-white font-bold text-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-2xl shadow-blue-900/20"
            style={{ background: `linear-gradient(135deg, ${BRAND_BLUE} 0%, #004bb0 100%)` }}
          >
            {loading ? 'Procesando...' : 'Entrar al Sistema'}
          </button>
        </form>

        <div className="flex justify-between items-center mt-6 px-2">
          <label className="flex items-center text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" className="mr-2 accent-blue-500" /> Recordarme
          </label>
          <a href="#" className="text-blue-400 text-xs hover:text-blue-300 transition-colors">
            ¿Olvidaste tu contraseña?
          </a>
        </div>

        <footer className="text-center mt-16">
          <p className="text-[10px] text-gray-600 uppercase tracking-[0.2em]">
            Marquez Project Solutions LLC · 2026
          </p>
        </footer>
      </div>
    </div>
  )
}
