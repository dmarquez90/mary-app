import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [perfil, setPerfil]   = useState(null)
  const [loading, setLoading] = useState(true)

  const loadPerfil = async (authUser) => {
    if (!authUser) { setPerfil(null); return }
    const { data } = await supabase
      .from('usuarios')
      .select('*, tenants(*)')
      .eq('id', authUser.id)
      .single()
    setPerfil(data || null)
    if (data) {
      await supabase.from('usuarios').update({ fecha_acceso: new Date().toISOString() }).eq('id', authUser.id)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      loadPerfil(session?.user ?? null).finally(() => setLoading(false))
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      loadPerfil(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setPerfil(null)
  }

  const isSuperAdmin  = perfil?.rol === 'super_admin'
  const isClientAdmin = perfil?.rol === 'client_admin' || isSuperAdmin
  const rol           = perfil?.rol || null
  const tenantId      = perfil?.tenant_id || null

  return (
    <AuthContext.Provider value={{ user, perfil, loading, login, logout, isSuperAdmin, isClientAdmin, rol, tenantId }}>
      {children}
    </AuthContext.Provider>
  )
}
