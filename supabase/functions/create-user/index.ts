import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

// ── Correo de bienvenida (best-effort, solo si RESEND_API_KEY está configurada) ──
async function enviarBienvenida(to: string, nombre: string, password: string, lang: string, empresa: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) return { skipped: true }

  const isEs = lang !== 'EN'
  const appUrl = Deno.env.get('APP_URL') ?? ''
  const from = Deno.env.get('WELCOME_FROM') ?? 'Marquez Project Solutions <no-reply@marquezprojectsolutions.com>'
  const org = esc(empresa || 'tu empresa')
  const orgEn = esc(empresa || 'your company')
  const subject = isEs ? `${empresa || 'Tu empresa'} te ha dado acceso a MARY` : `${empresa || 'Your company'} has given you access to MARY`
  const html = isEs
    ? `<p>¡Hola${nombre ? `, ${esc(nombre)}` : ''}!</p>
       <p><b>${org}</b> te ha dado acceso a la plataforma MARY. Estos son tus datos de acceso:</p>
       <p><b>Correo:</b> ${esc(to)}<br><b>Contraseña temporal:</b> ${esc(password)}</p>
       ${appUrl ? `<p><a href="${esc(appUrl)}">Ingresar a MARY</a></p>` : ''}
       <p>Por seguridad, cambia tu contraseña después de iniciar sesión.</p>`
    : `<p>Hi${nombre ? `, ${esc(nombre)}` : ''}!</p>
       <p><b>${orgEn}</b> has given you access to the MARY platform. Here are your login details:</p>
       <p><b>Email:</b> ${esc(to)}<br><b>Temporary password:</b> ${esc(password)}</p>
       ${appUrl ? `<p><a href="${esc(appUrl)}">Log in to MARY</a></p>` : ''}
       <p>For security, please change your password after signing in.</p>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
  })
  if (!res.ok) throw new Error(`resend_${res.status}: ${await res.text()}`)
  return { sent: true }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar que el que llama es client_admin o super_admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Cliente con el JWT del usuario que hace la petición
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verificar que el usuario tiene rol client_admin o super_admin
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: perfil } = await supabaseClient
      .from('usuarios')
      .select('rol, tenant_id, lang')
      .eq('id', user.id)
      .single()

    if (!perfil || !['client_admin', 'super_admin'].includes(perfil.rol)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Cliente admin con SERVICE_ROLE (seguro aquí, en el servidor)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, password, nombre, rol, tenant_id, lang } = await req.json()
    // Idioma del nuevo usuario: el indicado, o el de quien lo crea (antes quedaba siempre 'ES')
    const userLang = lang === 'EN' || lang === 'ES' ? lang : (perfil.lang === 'EN' ? 'EN' : 'ES')

    // Validar que client_admin solo crea usuarios de su propio tenant
    if (perfil.rol === 'client_admin' && tenant_id !== perfil.tenant_id) {
      return new Response(JSON.stringify({ error: 'Forbidden: wrong tenant' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Crear usuario en Auth
    const passwordFinal = password || Math.random().toString(36).slice(-10) + 'A1!'
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: passwordFinal,
      email_confirm: true,
    })

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Insertar en tabla usuarios
    const { error: insertError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        id: authData.user.id,
        tenant_id,
        nombre,
        email,
        rol,
        activo: true,
        lang: userLang,
      })

    if (insertError) {
      // Rollback: eliminar el usuario de Auth si falla la inserción
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // El correo no debe bloquear la creación del usuario
    let emailEnviado = false
    try {
      const { data: tenant } = await supabaseAdmin
        .from('tenants').select('nombre_empresa').eq('id', tenant_id).single()
      const r = await enviarBienvenida(email, nombre, passwordFinal, userLang, tenant?.nombre_empresa ?? '')
      emailEnviado = !!r.sent
    } catch (e) {
      console.error('welcome email failed', e)
    }

    return new Response(
      JSON.stringify({ user: { id: authData.user.id, email, nombre, rol, tenant_id }, email_enviado: emailEnviado }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
