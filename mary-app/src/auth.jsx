import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

// Razones por las que se puede bloquear el acceso
// null = acceso permitido
// 'user_inactive'   = usuario desactivado por el admin
// 'tenant_inactive' = empresa desactivada por Super Admin
// 'trial_expired'   = período de prueba vencido

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null)
  const [perfil, setPerfil]       = useState(null)
  const [loading, setLoading]     = useState(true)
  const [blockedReason, setBlockedReason] = useState(null)

  const loadPerfil = async (authUser) => {
    if (!authUser) {
      setPerfil(null)
      setBlockedReason(null)
      return
    }

    const { data } = await supabase
      .from('usuarios')
      .select('*, tenants(*)')
      .eq('id', authUser.id)
      .single()

    if (!data) {
      // Usuario no existe en la tabla usuarios
      await supabase.auth.signOut()
      setPerfil(null)
      setBlockedReason(null)
      return
    }

    // ── Verificar usuario activo ──────────────────────────────────────
    if (data.activo === false) {
      await supabase.auth.signOut()
      setPerfil(null)
      setBlockedReason('user_inactive')
      return
    }

    // ── Verificar tenant activo ───────────────────────────────────────
    const tenant = data.tenants
    if (tenant && tenant.activo === false) {
      await supabase.auth.signOut()
      setPerfil(null)
      setBlockedReason('tenant_inactive')
      return
    }

    // ── Verificar trial no vencido ────────────────────────────────────
    if (tenant?.es_trial && tenant?.trial_fin) {
      const trialFin = new Date(tenant.trial_fin)
      if (trialFin < new Date() && data.rol !== 'super_admin') {
        await supabase.auth.signOut()
        setPerfil(null)
        setBlockedReason('trial_expired')
        return
      }
    }

    // ── Acceso permitido ──────────────────────────────────────────────
    setBlockedReason(null)

    // Cargar permisos personalizados si existen
    const { data: permData } = await supabase
      .from('usuario_permisos')
      .select('permisos, proyectos, todos_proyectos')
      .eq('usuario_id', authUser.id)
      .maybeSingle()

    const perfilFinal = {
      ...data,
      permisos_custom:      permData?.permisos || null,
      proyectos_permitidos: permData?.todos_proyectos !== false ? null : (permData?.proyectos || null),
    }

    setPerfil(perfilFinal)
    await supabase.from('usuarios')
      .update({ fecha_acceso: new Date().toISOString() })
      .eq('id', authUser.id)
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
    setBlockedReason(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setPerfil(null)
    setBlockedReason(null)
  }

  const isSuperAdmin  = perfil?.rol === 'super_admin'
  const isClientAdmin = perfil?.rol === 'client_admin' || isSuperAdmin
  const rol           = perfil?.rol || null
  const tenantId      = perfil?.tenant_id || null

  return (
    <AuthContext.Provider value={{
      user, perfil, loading, login, logout,
      isSuperAdmin, isClientAdmin, rol, tenantId,
      blockedReason, setBlockedReason
    }}>
      {children}
    </AuthContext.Provider>
  )
}
