import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&no-check'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const PRICE_TO_PLAN: Record<string, string> = {
  'price_1TZk0lJZWJ0VISBDC0xTA9us': 'starter',
  'price_1TZk9CJZWJ0VISBDjaAT7NdV': 'starter',
  'price_1TZkM8JZWJ0VISBDMQpKeT7X': 'pro',
  'price_1TZkMoJZWJ0VISBDbmHJvETa': 'pro',
  'price_1TZk4CJZWJ0VISBD1xzoc3iq': 'enterprise',
  'price_1TZkA6JZWJ0VISBDbm0FqWtR': 'enterprise',
}

const PRICE_TO_PERIODO: Record<string, string> = {
  'price_1TZk0lJZWJ0VISBDC0xTA9us': 'mensual',
  'price_1TZk9CJZWJ0VISBDjaAT7NdV': 'anual',
  'price_1TZkM8JZWJ0VISBDMQpKeT7X': 'mensual',
  'price_1TZkMoJZWJ0VISBDbmHJvETa': 'anual',
  'price_1TZk4CJZWJ0VISBD1xzoc3iq': 'mensual',
  'price_1TZkA6JZWJ0VISBDbm0FqWtR': 'anual',
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
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const empresa_id = session.metadata?.empresa_id
        const plan       = session.metadata?.plan
        const periodo    = session.metadata?.periodo
        const sub_id     = session.subscription as string

        if (!empresa_id || !plan) break

        // Obtener detalles de la suscripción
        const subscription = await stripe.subscriptions.retrieve(sub_id)
        const priceId      = subscription.items.data[0].price.id

        await supabase
          .from('tenants')
          .update({
            plan,
            es_trial:               false,
            stripe_subscription_id: sub_id,
            billing_cycle:          periodo,
          })
          .eq('id', empresa_id)

        await supabase
          .from('suscripciones')
          .upsert({
            empresa_id,
            stripe_customer_id:     session.customer as string,
            stripe_subscription_id: sub_id,
            stripe_price_id:        priceId,
            plan,
            periodo:                periodo ?? 'mensual',
            status:                 'active',
            current_period_start:   new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end:     new Date(subscription.current_period_end   * 1000).toISOString(),
            updated_at:             new Date().toISOString(),
          }, { onConflict: 'stripe_subscription_id' })

        console.log(`Suscripcion activada: empresa ${empresa_id} plan ${plan}`)
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

        if (!empresa_id) break

        await supabase
          .from('suscripciones')
          .update({
            status:              'active',
            stripe_price_id:     priceId,
            plan,
            periodo,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end:   new Date(subscription.current_period_end   * 1000).toISOString(),
            updated_at:          new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub_id)

        await supabase
          .from('tenants')
          .update({ plan, es_trial: false })
          .eq('stripe_subscription_id', sub_id)

        console.log(`Renovacion exitosa: suscripcion ${sub_id}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const sub_id  = invoice.subscription as string

        await supabase
          .from('suscripciones')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub_id)

        console.log(`Pago fallido: suscripcion ${sub_id}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const empresa_id   = subscription.metadata?.empresa_id

        await supabase
          .from('suscripciones')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subscription.id)

        if (empresa_id) {
          await supabase
            .from('tenants')
            .update({
              plan:                   'trial',
              es_trial:               true,
              stripe_subscription_id: null,
            })
            .eq('id', empresa_id)
        }

        console.log(`Suscripcion cancelada: ${subscription.id}`)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const priceId      = subscription.items.data[0].price.id
        const plan         = PRICE_TO_PLAN[priceId]
        const periodo      = PRICE_TO_PERIODO[priceId]
        const empresa_id   = subscription.metadata?.empresa_id

        await supabase
          .from('suscripciones')
          .update({
            plan,
            periodo,
            stripe_price_id:      priceId,
            status:               subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_end:   new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at:           new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        if (empresa_id) {
          await supabase
            .from('tenants')
            .update({ plan, billing_cycle: periodo })
            .eq('id', empresa_id)
        }

        console.log(`Suscripcion actualizada: ${subscription.id} plan ${plan}`)
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