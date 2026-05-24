import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno&no-check'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2026-04-22.dahlia',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// ── Price IDs TEST (sandbox) ──────────────────────────────────────────
// starter  mensual: price_1TZk0lJZWJ0VISBDC0xTA9us
// starter  anual:   price_1TZk9CJZWJ0VISBDjaAT7NdV
// pro      mensual: price_1TZkM8JZWJ0VISBDMQpKeT7X
// pro      anual:   price_1TZkMoJZWJ0VISBDbmHJvETa
// enterprise mensual: price_1TZk4CJZWJ0VISBD1xzoc3iq
// enterprise anual:   price_1TZkA6JZWJ0VISBDbm0FqWtR

// ── Price IDs LIVE ────────────────────────────────────────────────────
// starter  mensual: price_1TaKbQJSrIBXg6vRDX68M4V4
// starter  anual:   price_1TaKbQJSrIBXg6vRsoilDO90
// pro      mensual: price_1TaKbWJSrIBXg6vR0UbtBeTe
// pro      anual:   price_1TaKbVJSrIBXg6vRsdqW5Cwn
// enterprise mensual: price_1TaKbSJSrIBXg6vRTHEm9cXX
// enterprise anual:   price_1TaKbRJSrIBXg6vRoRQTdZHn

const PRICE_TO_PLAN: Record<string, string> = {
  // TEST
  'price_1TZk0lJZWJ0VISBDC0xTA9us': 'starter',
  'price_1TZk9CJZWJ0VISBDjaAT7NdV': 'starter',
  'price_1TZkM8JZWJ0VISBDMQpKeT7X': 'pro',
  'price_1TZkMoJZWJ0VISBDbmHJvETa': 'pro',
  'price_1TZk4CJZWJ0VISBD1xzoc3iq': 'enterprise',
  'price_1TZkA6JZWJ0VISBDbm0FqWtR': 'enterprise',
  // LIVE
  'price_1TaKbQJSrIBXg6vRDX68M4V4': 'starter',
  'price_1TaKbQJSrIBXg6vRsoilDO90': 'starter',
  'price_1TaKbWJSrIBXg6vR0UbtBeTe': 'pro',
  'price_1TaKbVJSrIBXg6vRsdqW5Cwn': 'pro',
  'price_1TaKbSJSrIBXg6vRTHEm9cXX': 'enterprise',
  'price_1TaKbRJSrIBXg6vRoRQTdZHn': 'enterprise',
}

const PRICE_TO_PERIODO: Record<string, string> = {
  // TEST
  'price_1TZk0lJZWJ0VISBDC0xTA9us': 'mensual',
  'price_1TZk9CJZWJ0VISBDjaAT7NdV': 'anual',
  'price_1TZkM8JZWJ0VISBDMQpKeT7X': 'mensual',
  'price_1TZkMoJZWJ0VISBDbmHJvETa': 'anual',
  'price_1TZk4CJZWJ0VISBD1xzoc3iq': 'mensual',
  'price_1TZkA6JZWJ0VISBDbm0FqWtR': 'anual',
  // LIVE
  'price_1TaKbQJSrIBXg6vRDX68M4V4': 'mensual',
  'price_1TaKbQJSrIBXg6vRsoilDO90': 'anual',
  'price_1TaKbWJSrIBXg6vR0UbtBeTe': 'mensual',
  'price_1TaKbVJSrIBXg6vRsdqW5Cwn': 'anual',
  'price_1TaKbSJSrIBXg6vRTHEm9cXX': 'mensual',
  'price_1TaKbRJSrIBXg6vRoRQTdZHn': 'anual',
}

const PLAN_CONFIG: Record<string, { max_usuarios: number; max_proyectos: number }> = {
  starter:    { max_usuarios: 1,  max_proyectos: 2  },
  pro:        { max_usuarios: 3,  max_proyectos: 5  },
  enterprise: { max_usuarios: 5,  max_proyectos: 10 },
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const signature = req.headers.get('stripe-signature')
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

      case 'checkout.session.completed': {
        const session    = event.data.object as Stripe.Checkout.Session
        const empresa_id = session.metadata?.empresa_id
        const plan       = session.metadata?.plan
        const periodo    = session.metadata?.periodo
        const sub_id     = session.subscription as string

        console.log('checkout.session.completed empresa_id=' + empresa_id + ' plan=' + plan)
        if (!empresa_id || !plan) break

        const subscription = await stripe.subscriptions.retrieve(sub_id)
        const priceId      = subscription.items.data[0].price.id
        const cfg          = PLAN_CONFIG[plan] || PLAN_CONFIG.starter

        const { error: tenantError } = await supabase.from('tenants').update({
          plan,
          es_trial:               false,
          stripe_subscription_id: sub_id,
          billing_cycle:          periodo,
          max_usuarios:           cfg.max_usuarios,
          max_proyectos:          cfg.max_proyectos,
        }).eq('id', empresa_id)

        if (tenantError) console.error('tenant update error:', JSON.stringify(tenantError))

        const { error: subError } = await supabase.from('suscripciones').upsert({
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

        if (subError) console.error('suscripcion upsert error:', JSON.stringify(subError))

        console.log('Suscripcion activada: empresa ' + empresa_id + ' plan ' + plan)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice      = event.data.object as Stripe.Invoice
        const sub_id       = invoice.subscription as string
        const subscription = await stripe.subscriptions.retrieve(sub_id)
        const priceId      = subscription.items.data[0].price.id
        const plan         = PRICE_TO_PLAN[priceId]
        const periodo      = PRICE_TO_PERIODO[priceId]
        const empresa_id   = subscription.metadata?.empresa_id
        const cfg          = PLAN_CONFIG[plan] || PLAN_CONFIG.starter

        console.log('invoice.payment_succeeded empresa_id=' + empresa_id)
        if (!empresa_id) break

        await supabase.from('suscripciones').update({
          status:               'active',
          stripe_price_id:      priceId,
          plan,
          periodo,
          current_period_start: toISO(subscription.current_period_start),
          current_period_end:   toISO(subscription.current_period_end),
          updated_at:           new Date().toISOString(),
        }).eq('stripe_subscription_id', sub_id)

        await supabase.from('tenants').update({
          plan,
          es_trial:      false,
          max_usuarios:  cfg.max_usuarios,
          max_proyectos: cfg.max_proyectos,
        }).eq('stripe_subscription_id', sub_id)

        console.log('Renovacion exitosa: suscripcion ' + sub_id)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const sub_id  = invoice.subscription as string

        await supabase.from('suscripciones').update({
          status:     'past_due',
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', sub_id)

        console.log('Pago fallido: suscripcion ' + sub_id)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const empresa_id   = subscription.metadata?.empresa_id

        await supabase.from('suscripciones').update({
          status:     'canceled',
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', subscription.id)

        if (empresa_id) {
          await supabase.from('tenants').update({
            plan:                   'trial',
            es_trial:               true,
            stripe_subscription_id: null,
            max_usuarios:           1,
            max_proyectos:          2,
          }).eq('id', empresa_id)
        }

        console.log('Suscripcion cancelada: ' + subscription.id)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const priceId      = subscription.items.data[0].price.id
        const plan         = PRICE_TO_PLAN[priceId]
        const periodo      = PRICE_TO_PERIODO[priceId]
        const empresa_id   = subscription.metadata?.empresa_id
        const cfg          = PLAN_CONFIG[plan] || PLAN_CONFIG.starter

        console.log('customer.subscription.updated empresa_id=' + empresa_id)

        await supabase.from('suscripciones').update({
          plan,
          periodo,
          stripe_price_id:      priceId,
          status:               subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_end:   toISO(subscription.current_period_end),
          updated_at:           new Date().toISOString(),
        }).eq('stripe_subscription_id', subscription.id)

        if (empresa_id) {
          await supabase.from('tenants').update({
            plan,
            billing_cycle: periodo,
            max_usuarios:  cfg.max_usuarios,
            max_proyectos: cfg.max_proyectos,
          }).eq('id', empresa_id)
        }

        console.log('Suscripcion actualizada: ' + subscription.id + ' plan ' + plan)
        break
      }

      default:
        console.log('Evento no manejado: ' + event.type)
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
