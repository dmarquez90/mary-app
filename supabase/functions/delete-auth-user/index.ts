import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

// Elimina una cuenta de forma permanente (acceso en Auth + perfil en `usuarios`).
// - super_admin: puede eliminar a cualquier usuario.
// - client_admin: solo usuarios de su propia empresa, y nunca a un super_admin.
// - Nadie puede eliminarse a sí mismo.
// El historial (auditoría, bitácora, caja chica…) se conserva desvinculando al usuario;
// auditoria_log guarda usuario_nombre, así que el registro sigue siendo legible.
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token)
    if (!caller) return json({ error: 'Unauthorized' }, 401)

    const { data: callerProfile } = await supabaseAdmin
      .from('usuarios').select('rol, tenant_id').eq('id', caller.id).single()
    if (!callerProfile || !['client_admin', 'super_admin'].includes(callerProfile.rol)) {
      return json({ error: 'Forbidden' }, 403)
    }

    const { userId } = await req.json()
    if (!userId) return json({ error: 'userId required' }, 400)
    if (userId === caller.id) return json({ error: 'No puedes eliminar tu propia cuenta / You cannot delete your own account' }, 400)

    const { data: target } = await supabaseAdmin
      .from('usuarios').select('id, rol, tenant_id').eq('id', userId).maybeSingle()

    if (callerProfile.rol === 'client_admin') {
      // Si el perfil ya no existe no podemos comprobar la empresa: solo el super_admin puede limpiar ese caso
      if (!target || target.tenant_id !== callerProfile.tenant_id) return json({ error: 'Forbidden: wrong tenant' }, 403)
      if (target.rol === 'super_admin') return json({ error: 'Forbidden' }, 403)
    }

    if (target) {
      // Referencias sin ON DELETE CASCADE que bloquearían el borrado
      const desvincular: [string, string][] = [
        ['auditoria_log', 'usuario_id'],
        ['bitacora_log', 'creado_por'],
        ['permisos_especiales', 'usuario_id'],
        ['solicitudes_eliminacion', 'solicitante_id'],
        ['cajas_chicas', 'responsable_id'],
        ['liquidaciones_caja_chica', 'aprobado_por'],
        ['reembolsos_personal', 'usuario_id'],
      ]
      for (const [tabla, col] of desvincular) {
        const { error } = await supabaseAdmin.from(tabla).update({ [col]: null }).eq(col, userId)
        if (error) throw new Error(`${tabla}: ${error.message}`)
      }
      // usuario_proyecto.usuario_id es NOT NULL: son asignaciones, se eliminan
      const { error: upErr } = await supabaseAdmin.from('usuario_proyecto').delete().eq('usuario_id', userId)
      if (upErr) throw new Error(`usuario_proyecto: ${upErr.message}`)
    }

    // Borrar de Auth; `usuarios` (y chat, notificaciones, permisos) se van en cascada
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) throw error

    return json({ success: true })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})
