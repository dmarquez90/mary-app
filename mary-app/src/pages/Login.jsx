import { useState } from 'react'
import { useAuth } from '../auth'

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
         style={{ background: '#0f172a' }}> {/* Fondo azul muy oscuro */}
      
      <div className="w-full max-w-sm">
        {/* Logo MARY Estilizado */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-900/20 rotate-3">
               <span className="text-white text-3xl font-black -rotate-3">M</span>
            </div>
          </div>
          <h1 className="text-white text-4xl font-black tracking-tighter">MARY<span className="text-blue-500">.</span></h1>
          <p className="text-slate-500 text-[10px] uppercase tracking-[0.3em] mt-1 font-bold">
            Management & Resources Yield
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div className="flex flex-col gap-1">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <input
                type="email"
                placeholder="usuario@empresa.com"
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-12 pr-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-12 pr-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-xs text-center font-medium bg-red-400/10 py-2 rounded-lg border border-red-400/20">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl text-white font-bold text-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-lg"
            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
          >
            {loading ? 'Cargando...' : 'Entrar al Sistema'}
          </button>
        </form>

        {/* Link corregido (usando <a> en lugar de <Link>) */}
        <div className="text-center mt-8">
          <a 
            href="#" 
            className="text-blue-400 text-sm font-medium hover:text-white transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </a>
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
