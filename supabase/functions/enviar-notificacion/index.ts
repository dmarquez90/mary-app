import { createClient } from 'jsr:@supabase/supabase-js@2'

// Notificaciones internas que también se envían por correo
const TIPOS_CON_CORREO = ['solicitud_nueva', 'avaluo_cliente_nuevo', 'avaluo_sub_nuevo', 'oc_cambio_nueva']

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

async function enviarCorreo(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) return { skipped: true }

  const from = Deno.env.get('NOTIF_FROM') ?? Deno.env.get('WELCOME_FROM') ??
    'Marquez Project Solutions <no-reply@marquezprojectsolutions.com>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
  })
  if (!res.ok) throw new Error(`resend_${res.status}: ${await res.text()}`)
  return { sent: true }
}

// El cuerpo solo trae el id: título, mensaje y destinatario se leen de la base de datos,
// así que nadie puede usar esta función para enviar texto arbitrario.
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  try {
    const body = await req.json()
    const id = body?.id ?? body?.record?.id
    if (!id || typeof id !== 'string') return json({ error: 'missing_id' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: notif } = await supabase
      .from('notificaciones')
      .select('id, tenant_id, usuario_id, tipo, titulo, mensaje, email_enviado_at')
      .eq('id', id)
      .maybeSingle()

    if (!notif) return json({ skipped: 'not_found' })
    if (!TIPOS_CON_CORREO.includes(notif.tipo)) return json({ skipped: 'tipo_sin_correo' })
    if (notif.email_enviado_at) return json({ skipped: 'ya_enviado' })

    if (!Deno.env.get('RESEND_API_KEY')) return json({ skipped: 'sin_resend_key' })

    // Reservar el envío para que una llamada repetida no duplique el correo
    const { data: reservada } = await supabase
      .from('notificaciones')
      .update({ email_enviado_at: new Date().toISOString() })
      .eq('id', id)
      .is('email_enviado_at', null)
      .select('id')
    if (!reservada?.length) return json({ skipped: 'ya_enviado' })

    const [{ data: usuario }, { data: tenant }] = await Promise.all([
      supabase.from('usuarios').select('email, nombre, lang, activo').eq('id', notif.usuario_id).maybeSingle(),
      supabase.from('tenants').select('nombre_empresa').eq('id', notif.tenant_id).maybeSingle(),
    ])

    if (!usuario?.email || usuario.activo === false) return json({ skipped: 'sin_destinatario' })

    const isEs = usuario.lang !== 'EN'
    const appUrl = Deno.env.get('APP_URL') ?? Deno.env.get('SITE_URL') ?? ''
    const empresa = tenant?.nombre_empresa ?? ''

    const html = `<p>${isEs ? 'Hola' : 'Hi'}${usuario.nombre ? `, ${esc(usuario.nombre)}` : ''}:</p>
      <p><b>${esc(notif.titulo)}</b></p>
      <p>${esc(notif.mensaje)}</p>
      ${appUrl ? `<p><a href="${esc(appUrl)}">${isEs ? 'Abrir MARY' : 'Open MARY'}</a></p>` : ''}
      <p style="color:#888;font-size:12px">${empresa ? `${esc(empresa)} · ` : ''}MARY</p>`

    try {
      await enviarCorreo(usuario.email, notif.titulo, html)
    } catch (e) {
      // Liberar la reserva para poder reintentar
      await supabase.from('notificaciones').update({ email_enviado_at: null }).eq('id', id)
      throw e
    }

    return json({ sent: true })
  } catch (error) {
    console.error('enviar-notificacion failed', error)
    return json({ error: (error as Error).message }, 500)
  }
})
