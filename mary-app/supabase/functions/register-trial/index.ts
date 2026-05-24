import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLAN_CONFIG = {
  starter:    { max_usuarios: 1,  max_proyectos: 2  },
  pro:        { max_usuarios: 3,  max_proyectos: 5  },
  enterprise: { max_usuarios: 5,  max_proyectos: 10 },
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { nombre, empresa, telefono, email, password, pais, plan } = await req.json()
    if (!nombre || !empresa || !email || !password || !pais)
      return new Response(JSON.stringify({ error: 'missing_fields' }), { status: 400, headers: corsHeaders })

    const planKey = PLAN_CONFIG[plan] ? plan : 'starter'
    const { max_usuarios, max_proyectos } = PLAN_CONFIG[planKey]

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: empresaExistente } = await supabase.from('tenants').select('id, activo').ilike('nombre_empresa', empresa.trim()).single()
    if (empresaExistente?.activo)
      return new Response(JSON.stringify({ error: 'company_taken' }), { status: 409, headers: corsHeaders })

    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()
    const authUserExistente = authUsers?.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (authUserExistente) {
      const { data: perfilExistente } = await supabase.from('usuarios').select('id, tenant_id, tenants(activo)').eq('id', authUserExistente.id).single()
      const tieneEmpresaActiva = perfilExistente?.tenants?.activo === true
      if (tieneEmpresaActiva)
        return new Response(JSON.stringify({ error: 'email_taken' }), { status: 409, headers: corsHeaders })

      await supabase.auth.admin.updateUserById(authUserExistente.id, { password })
      if (perfilExistente) await supabase.from('usuarios').delete().eq('id', authUserExistente.id)

      const trialFin = new Date(); trialFin.setDate(trialFin.getDate() + 7)
      const { data: nuevoTenant, error: tenantError } = await supabase.from('tenants').insert({
        nombre_empresa: empresa.trim(), pais, telefono, plan: planKey,
        max_usuarios, max_proyectos, activo: true, es_trial: true, trial_fin: trialFin.toISOString(),
      }).select().single()
      if (tenantError) throw tenantError

      const { error: usuarioError } = await supabase.from('usuarios').insert({
        id: authUserExistente.id, nombre, email: email.toLowerCase(),
        rol: 'client_admin', tenant_id: nuevoTenant.id, activo: true,
      })
      if (usuarioError) throw usuarioError
      return new Response(JSON.stringify({ success: true, reactivated: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const trialFin = new Date(); trialFin.setDate(trialFin.getDate() + 7)
    const { data: tenant, error: tenantError } = await supabase.from('tenants').insert({
      nombre_empresa: empresa.trim(), pais, telefono, plan: planKey,
      max_usuarios, max_proyectos, activo: true, es_trial: true, trial_fin: trialFin.toISOString(),
    }).select().single()
    if (tenantError) throw tenantError

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(), password, email_confirm: true,
    })
    if (authError) { await supabase.from('tenants').delete().eq('id', tenant.id); throw authError }

    const { error: usuarioError } = await supabase.from('usuarios').insert({
      id: authData.user.id, nombre, email: email.toLowerCase(),
      rol: 'client_admin', tenant_id: tenant.id, activo: true,
    })
    if (usuarioError) {
      await supabase.auth.admin.deleteUser(authData.user.id)
      await supabase.from('tenants').delete().eq('id', tenant.id)
      throw usuarioError
    }
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
