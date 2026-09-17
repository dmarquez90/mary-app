import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const MODALIDADES = ['virtual', 'presencial', 'hibrida']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Recorta y limpia texto libre que viene de un formulario público
const clean = (v: unknown, max: number) =>
  typeof v === 'string' ? v.trim().slice(0, max) : ''

// ── Envío de correo (best-effort, solo si RESEND_API_KEY está configurada) ──
async function enviarCorreo(to: string[], subject: string, html: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) return { skipped: true }

  const from = Deno.env.get('CAPACITACION_FROM') ?? 'MARY <onboarding@resend.dev>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  })
  if (!res.ok) throw new Error(`resend_${res.status}: ${await res.text()}`)
  return { sent: true }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  try {
    const body = await req.json()

    const nombre  = clean(body.nombre, 120)
    const email   = clean(body.email, 160).toLowerCase()
    const pais    = clean(body.pais, 60)
    const empresa = clean(body.empresa, 140)
    const telefono = clean(body.telefono, 40)
    const rol     = clean(body.rol, 80)
    const mensaje = clean(body.mensaje, 2000)
    const lang    = body.lang === 'EN' ? 'EN' : 'ES'
    const isEs    = lang === 'ES'

    const modalidad = MODALIDADES.includes(body.modalidad) ? body.modalidad : 'virtual'

    const participantes = Number.isFinite(Number(body.participantes))
      ? Math.min(500, Math.max(1, Math.trunc(Number(body.participantes))))
      : null

    const temas = Array.isArray(body.temas)
      ? body.temas.filter((t: unknown) => typeof t === 'string').slice(0, 15).map((t: string) => t.slice(0, 80))
      : []

    if (!nombre || !email || !pais) return json({ error: 'missing_fields' }, 400)
    if (!EMAIL_RE.test(email))      return json({ error: 'invalid_email' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // ── Anti-spam: una solicitud por correo cada 10 minutos ──────────────
    const hace10min = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { count: recientes } = await supabase
      .from('solicitudes_capacitacion')
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
      .gt('created_at', hace10min)

    if ((recientes ?? 0) > 0) return json({ error: 'rate_limited' }, 429)

    // ── Guardar la solicitud ────────────────────────────────────────────
    const { data: solicitud, error: insertError } = await supabase
      .from('solicitudes_capacitacion')
      .insert({
        nombre, empresa, email, telefono, pais, rol,
        participantes, modalidad, temas, mensaje, lang,
        origen: clean(body.origen, 40) || 'landing',
        user_agent: (req.headers.get('user-agent') ?? '').slice(0, 300),
      })
      .select('id, created_at')
      .single()

    if (insertError) {
      console.error('insert_error', insertError)
      return json({ error: 'insert_failed' }, 500)
    }

    // ── Avisos por correo (no bloquean la respuesta si fallan) ───────────
    const destino = Deno.env.get('CAPACITACION_TO') ?? 'deybi@marquezprojectsolutions.com'
    const fila = (k: string, v: string) =>
      v ? `<tr><td style="padding:6px 12px 6px 0;color:#6B7280;font-size:13px">${k}</td><td style="padding:6px 0;color:#111827;font-size:13px"><strong>${v}</strong></td></tr>` : ''

    const interno = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px">
        <h2 style="color:#0B1C36;margin:0 0 4px">Nueva solicitud de capacitación</h2>
        <p style="color:#6B7280;font-size:12px;margin:0 0 16px">MARY · landing · ${solicitud.created_at}</p>
        <table style="border-collapse:collapse">
          ${fila('Nombre', nombre)}
          ${fila('Empresa', empresa)}
          ${fila('Correo', email)}
          ${fila('Teléfono', telefono)}
          ${fila('País', pais)}
          ${fila('Rol', rol)}
          ${fila('Participantes', participantes ? String(participantes) : '')}
          ${fila('Modalidad', modalidad)}
          ${fila('Temas', temas.join(', '))}
          ${fila('Idioma', lang)}
        </table>
        ${mensaje ? `<p style="margin:16px 0 0;color:#374151;font-size:13px;line-height:1.6"><strong>Mensaje:</strong><br/>${mensaje.replace(/\n/g, '<br/>')}</p>` : ''}
        <p style="margin:20px 0 0;color:#9CA3AF;font-size:11px">ID: ${solicitud.id}</p>
      </div>`

    const confirmacion = isEs
      ? `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px">
           <h2 style="color:#0B1C36;margin:0 0 12px">Recibimos tu solicitud, ${nombre.split(' ')[0]}</h2>
           <p style="color:#374151;font-size:14px;line-height:1.7">Gracias por tu interés en MARY. Un miembro del equipo te escribirá dentro de 1 día hábil para coordinar la fecha y la modalidad de la capacitación.</p>
           <p style="color:#374151;font-size:14px;line-height:1.7">Mientras tanto, puedes empezar tu prueba gratuita de 7 días sin tarjeta de crédito.</p>
           <p style="color:#6B7280;font-size:12px;margin-top:24px">Marquez Project Solutions LLC · deybi@marquezprojectsolutions.com</p>
         </div>`
      : `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px">
           <h2 style="color:#0B1C36;margin:0 0 12px">We received your request, ${nombre.split(' ')[0]}</h2>
           <p style="color:#374151;font-size:14px;line-height:1.7">Thanks for your interest in MARY. A team member will email you within 1 business day to arrange the date and format of the training session.</p>
           <p style="color:#374151;font-size:14px;line-height:1.7">In the meantime, you can start your 7-day free trial — no credit card required.</p>
           <p style="color:#6B7280;font-size:12px;margin-top:24px">Marquez Project Solutions LLC · deybi@marquezprojectsolutions.com</p>
         </div>`

    try {
      await enviarCorreo([destino], `Capacitación MARY — ${nombre}${empresa ? ` (${empresa})` : ''}`, interno)
      await enviarCorreo([email], isEs ? 'Solicitud de capacitación recibida — MARY' : 'Training request received — MARY', confirmacion)
    } catch (mailErr) {
      // La solicitud ya quedó guardada; el correo es un extra.
      console.error('email_error', mailErr)
    }

    return json({ ok: true, id: solicitud.id })
  } catch (err) {
    console.error('unhandled_error', err)
    return json({ error: 'unexpected_error' }, 500)
  }
})
