// ============================================================
// CARPETA: supabase/functions/stripe-webhook/index.ts
// FUNCIÓN: Procesa eventos de Stripe y actualiza Supabase
// MODO: TEST (sandbox) — usar sk_test_... y whsec_ de test
// ============================================================

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&no-check'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

// ── Supabase de MARY (app principal) ─────────────────────────────────────────
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')             ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// ── Supabase del PORTAL de gestión de ventas ─────────────────────────────────
// Variables separadas para no mezclar las dos bases de datos
const portalSupabase = createClient(
  Deno.env.get('PORTAL_SUPABASE_URL')             ?? '',
  Deno.env.get('PORTAL_SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// ── Comisiones por nivel de agente ────────────────────────────────────────────
const COMMISSION_PCT: Record<string, number> = {
  bronze:   0.10,
  silver:   0.15,
  gold:     0.20,
  platinum: 0.25,
}

// ── Límites por plan ──────────────────────────────────────────────────────────
const PLAN_CONFIG: Record<string, { max_usuarios: number; max_proyectos: number }> = {
  starter:    { max_usuarios: 5,   max_proyectos: 2   },
  pro:        { max_usuarios: 15,  max_proyectos: 10  },
  enterprise: { max_usuarios: 999, max_proyectos: 999 },
}

// ── Price IDs TEST → plan / periodo ──────────────────────────────────────────
const PRICE_TO_PLAN: Record<string, string> = {
  'price_1TaKbQJSrIBXg6vRDX68M4V4': 'starter',
  'price_1TaKbQJSrIBXg6vRsoilDO90': 'starter',
  'price_1TaKbWJSrIBXg6vR0UbtBeTe': 'pro',
  'price_1TaKbVJSrIBXg6vRsdqW5Cwn': 'pro',
  'price_1TaKbSJSrIBXg6vRTHEm9cXX': 'enterprise',
  'price_1TaKbRJSrIBXg6vRoRQTdZHn': 'enterprise',
}

const PRICE_TO_PERIODO: Record<string, string> = {
  'price_1TaKbQJSrIBXg6vRDX68M4V4': 'mensual',
  'price_1TaKbQJSrIBXg6vRsoilDO90': 'anual',
  'price_1TaKbWJSrIBXg6vR0UbtBeTe': 'mensual',
  'price_1TaKbVJSrIBXg6vRsdqW5Cwn': 'anual',
  'price_1TaKbSJSrIBXg6vRTHEm9cXX': 'mensual',
  'price_1TaKbRJSrIBXg6vRoRQTdZHn': 'anual',
}

// ── Precios mensuales para calcular comisión ──────────────────────────────────
const PLAN_MONTHLY_VALUE: Record<string, number> = {
  'price_1TaKbQJSrIBXg6vRDX68M4V4': 29.99,   // starter mensual
  'price_1TaKbQJSrIBXg6vRsoilDO90': 25.49,   // starter anual (precio/mes equivalente)
  'price_1TaKbWJSrIBXg6vR0UbtBeTe': 49.99,   // pro mensual
  'price_1TaKbVJSrIBXg6vRsdqW5Cwn': 42.49,   // pro anual
  'price_1TaKbSJSrIBXg6vRTHEm9cXX': 69.99,   // enterprise mensual
  'price_1TaKbRJSrIBXg6vRoRQTdZHn': 59.49,   // enterprise anual
}

function toISO(val: unknown): string | null {
  if (!val) return null
  if (typeof val === 'number') return new Date(val * 1000).toISOString()
  if (typeof val === 'string') {
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }
  return null
}

// ── Función principal: registrar comisión en el portal ────────────────────────
async function registrarComisionPortal(params: {
  ref_code:        string
  empresa_id:      string
  empresa_nombre:  string
  plan:            string
  periodo:         string
  stripe_price_id: string
  invoice_id:      string
  amount_paid:     number  // en centavos (Stripe)
}) {
  const { ref_code, empresa_id, empresa_nombre, plan, periodo, stripe_price_id, invoice_id, amount_paid } = params

  // Verificar que tenemos las credenciales del portal
  if (!Deno.env.get('PORTAL_SUPABASE_URL') || !Deno.env.get('PORTAL_SUPABASE_SERVICE_ROLE_KEY')) {
    console.log('Portal Supabase no configurado — omitiendo comisión')
    return
  }

  try {
    // 1. Buscar el agente por ref_code
    const { data: partner, error: partnerErr } = await portalSupabase
      .from('partners')
      .select('id, full_name, email, level, commission_pct, status, onboarding_status')
      .eq('ref_code', ref_code)
      .eq('status', 'active')
      .single()

    if (partnerErr || !partner) {
      console.log(`ref_code=${ref_code} no encontrado o inactivo en el portal — omitiendo comisión`)
      return
    }

    console.log(`Agente encontrado: ${partner.full_name} (${partner.level}) ref_code=${ref_code}`)

    // 2. Calcular monto de comisión
    const commissionPct  = COMMISSION_PCT[partner.level] ?? 0.10
    const monthlyValue   = PLAN_MONTHLY_VALUE[stripe_price_id] ?? (amount_paid / 100)
    const commissionAmt  = Math.round(monthlyValue * commissionPct * 100) / 100

    // 3. Período actual (YYYY-MM)
    const now    = new Date()
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // 4. Verificar que no existe ya una comisión para este invoice (idempotencia)
    const { data: existing } = await portalSupabase
      .from('commissions')
      .select('id')
      .eq('payout_ref', invoice_id)
      .single()

    if (existing) {
      console.log(`Comisión ya registrada para invoice=${invoice_id} — omitiendo`)
      return
    }

    // 5. Buscar o crear el referido en el portal
    let referral_id: string | null = null

    const { data: existingReferral } = await portalSupabase
      .from('referrals')
      .select('id, status')
      .eq('partner_id', partner.id)
      .eq('stripe_customer_id', empresa_id)  // empresa_id es el tenant_id de MARY
      .maybeSingle()

    if (existingReferral) {
      referral_id = existingReferral.id
      // Actualizar estado a active si no lo estaba
      if (existingReferral.status !== 'active') {
        await portalSupabase
          .from('referrals')
          .update({ status: 'active', started_at: now.toISOString(), updated_at: now.toISOString() })
          .eq('id', existingReferral.id)
      }
    } else {
      // Crear nuevo referido
      const { data: newReferral, error: refErr } = await portalSupabase
        .from('referrals')
        .insert({
          partner_id:        partner.id,
          company_name:      empresa_nombre || `Empresa ${empresa_id.slice(0, 8)}`,
          plan:              plan as any,
          billing_type:      periodo === 'anual' ? 'annual' : 'monthly',
          status:            'active',
          monthly_value:     monthlyValue,
          stripe_customer_id: empresa_id,
          started_at:        now.toISOString(),
        })
        .select('id')
        .single()

      if (refErr) {
        console.error('Error creando referido:', refErr.message)
      } else {
        referral_id = newReferral.id
      }
    }

    // 6. Registrar la comisión
    const { error: commErr } = await portalSupabase
      .from('commissions')
      .insert({
        partner_id:  partner.id,
        referral_id: referral_id,
        period,
        amount:      commissionAmt,
        status:      'pending',
        payout_ref:  invoice_id,  // usamos invoice_id como referencia única
        notes:       `Auto: ${plan} ${periodo} · ${ref_code} · ${commissionPct * 100}%`,
      })

    if (commErr) {
      console.error('Error registrando comisión:', commErr.message)
    } else {
      console.log(`✅ Comisión registrada: agente=${partner.full_name} plan=${plan} monto=$${commissionAmt} invoice=${invoice_id}`)
    }

  } catch (err) {
    // No propagamos el error para no afectar el webhook principal de MARY
    console.error('Error en registrarComisionPortal:', err)
  }
}

// ── Función: marcar referido como cancelado en el portal ──────────────────────
async function cancelarReferidoPortal(empresa_id: string) {
  if (!Deno.env.get('PORTAL_SUPABASE_URL')) return
  try {
    await portalSupabase
      .from('referrals')
      .update({ status: 'churned', churned_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('stripe_customer_id', empresa_id)
      .eq('status', 'active')

    console.log(`Referido cancelado en portal: empresa_id=${empresa_id}`)
  } catch (err) {
    console.error('Error cancelando referido en portal:', err)
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const signature     = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!signature || !webhookSecret) {
    return new Response('Missing signature', { status: 400 })
  }

  let event: Stripe.Event

  try {
    const body = await req.text()
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return new Response('Webhook Error: ' + err.message, { status: 400 })
  }

  try {
    switch (event.type) {

      // ── Pago inicial exitoso ────────────────────────────────────────────────
      case 'checkout.session.completed': {
        const session    = event.data.object as Stripe.Checkout.Session
        const empresa_id = session.metadata?.empresa_id
        const plan       = session.metadata?.plan
        const periodo    = session.metadata?.periodo
        const sub_id     = session.subscription as string

        console.log(`checkout.session.completed empresa=${empresa_id} plan=${plan}`)
        if (!empresa_id || !plan) break

        const subscription = await stripe.subscriptions.retrieve(sub_id)
        const priceId      = subscription.items.data[0].price.id
        const cfg          = PLAN_CONFIG[plan] ?? PLAN_CONFIG.starter

        const { error: tenantErr } = await supabase
          .from('tenants')
          .update({
            plan,
            es_trial:               false,
            stripe_subscription_id: sub_id,
            billing_cycle:          periodo,
            max_usuarios:           cfg.max_usuarios,
            max_proyectos:          cfg.max_proyectos,
          })
          .eq('id', empresa_id)

        if (tenantErr) console.error('tenant update error:', JSON.stringify(tenantErr))

        const { error: subErr } = await supabase
          .from('suscripciones')
          .upsert({
            empresa_id,
            stripe_customer_id:     session.customer as string,
            stripe_subscription_id: sub_id,
            stripe_price_id:        priceId,
            plan,
            periodo:                periodo ?? 'mensual',
            status:                 'active',
            current_period_start:   toISO(subscription.current_period_start),
            current_period_end:     toISO(subscription.current_period_end),
            updated_at:             new Date().toISOString(),
          }, { onConflict: 'stripe_subscription_id' })

        if (subErr) console.error('suscripcion upsert error:', JSON.stringify(subErr))

        console.log(`Suscripcion activada: empresa=${empresa_id} plan=${plan}`)
        break
      }

      // ── Renovación pagada ───────────────────────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice      = event.data.object as Stripe.Invoice
        const sub_id       = invoice.subscription as string
        const subscription = await stripe.subscriptions.retrieve(sub_id)
        const priceId      = subscription.items.data[0].price.id
        const plan         = PRICE_TO_PLAN[priceId]
        const periodo      = PRICE_TO_PERIODO[priceId]
        const empresa_id   = subscription.metadata?.empresa_id
        // ref_code puede venir del metadata de Stripe O del tenant en la DB de MARY
        let ref_code       = subscription.metadata?.ref_code ?? ''

        // Si no está en Stripe metadata, buscar en la tabla tenants de MARY
        if (!ref_code && empresa_id) {
          const { data: tenant } = await supabase
            .from('tenants')
            .select('ref_code, nombre_empresa')
            .eq('id', empresa_id)
            .single()
          ref_code = tenant?.ref_code ?? ''
        }
        const cfg          = PLAN_CONFIG[plan] ?? PLAN_CONFIG.starter

        console.log(`invoice.payment_succeeded empresa=${empresa_id} ref_code=${ref_code || 'ninguno'}`)
        if (!empresa_id) break
        await supabase
          .from('suscripciones')
          .update({
            status:               'active',
            stripe_price_id:      priceId,
            plan,
            periodo,
            current_period_start: toISO(subscription.current_period_start),
            current_period_end:   toISO(subscription.current_period_end),
            updated_at:           new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub_id)

        await supabase
          .from('tenants')
          .update({ plan, es_trial: false, max_usuarios: cfg.max_usuarios, max_proyectos: cfg.max_proyectos })
          .eq('stripe_subscription_id', sub_id)

        console.log(`Renovacion exitosa: ${sub_id}`)

        // ── NUEVO: Registrar comisión en el portal si hay ref_code ────────────
        if (ref_code) {
          // Obtener nombre de la empresa desde MARY
          const { data: tenant } = await supabase
            .from('tenants')
            .select('nombre_empresa')
            .eq('id', empresa_id)
            .single()

          await registrarComisionPortal({
            ref_code,
            empresa_id,
            empresa_nombre:  tenant?.nombre_empresa ?? '',
            plan,
            periodo,
            stripe_price_id: priceId,
            invoice_id:      invoice.id,
            amount_paid:     invoice.amount_paid,
          })
        }
        break
      }

      // ── Pago fallido ────────────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const sub_id  = invoice.subscription as string

        await supabase
          .from('suscripciones')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub_id)

        console.log(`Pago fallido: ${sub_id}`)
        break
      }

      // ── Suscripción cancelada ───────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const empresa_id   = subscription.metadata?.empresa_id

        await supabase
          .from('suscripciones')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subscription.id)

        if (empresa_id) {
          const graceFin = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
          await supabase
            .from('tenants')
            .update({
              plan:                   'trial',
              es_trial:               true,
              stripe_subscription_id: null,
              max_usuarios:           1,
              max_proyectos:          2,
              grace_period_fin:       graceFin,
            })
            .eq('id', empresa_id)

          // ── NUEVO: Marcar referido como cancelado en el portal ────────────
          await cancelarReferidoPortal(empresa_id)
        }

        console.log(`Suscripcion cancelada: ${subscription.id}`)
        break
      }

      // ── Suscripción actualizada (upgrade/downgrade) ─────────────────────────
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const priceId      = subscription.items.data[0].price.id
        const plan         = PRICE_TO_PLAN[priceId]
        const periodo      = PRICE_TO_PERIODO[priceId]
        const empresa_id   = subscription.metadata?.empresa_id
        const cfg          = PLAN_CONFIG[plan] ?? PLAN_CONFIG.starter

        console.log(`customer.subscription.updated empresa=${empresa_id} plan=${plan}`)

        await supabase
          .from('suscripciones')
          .update({
            plan,
            periodo,
            stripe_price_id:      priceId,
            status:               subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_end:   toISO(subscription.current_period_end),
            updated_at:           new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        if (empresa_id) {
          await supabase
            .from('tenants')
            .update({ plan, billing_cycle: periodo, max_usuarios: cfg.max_usuarios, max_proyectos: cfg.max_proyectos })
            .eq('id', empresa_id)
        }

        console.log(`Suscripcion actualizada: ${subscription.id} plan=${plan}`)
        break
      }

      default:
        console.log(`Evento no manejado: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Webhook processing error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
