// supabase/functions/stripe-change-plan/index.ts
// Maneja upgrades y downgrades de planes con prorrateo automático
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&no-check'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')              ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// ── Price IDs TEST ────────────────────────────────────────────────────────────
const PRICE_IDS: Record<string, Record<string, string>> = {
  starter:    { mensual: 'price_1TZk0lJZWJ0VISBDC0xTA9us', anual: 'price_1TZk9CJZWJ0VISBDjaAT7NdV' },
  pro:        { mensual: 'price_1TZkM8JZWJ0VISBDMQpKeT7X', anual: 'price_1TZkMoJZWJ0VISBDbmHJvETa' },
  enterprise: { mensual: 'price_1TZk4CJZWJ0VISBD1xzoc3iq', anual: 'price_1TZkA6JZWJ0VISBDbm0FqWtR' },
}

const PLAN_TIERS: Record<string, number> = { starter: 1, pro: 2, enterprise: 3 }

const PLAN_CONFIG: Record<string, { max_usuarios: number; max_proyectos: number }> = {
  starter:    { max_usuarios: 5,   max_proyectos: 2   },
  pro:        { max_usuarios: 15,  max_proyectos: 10  },
  enterprise: { max_usuarios: 999, max_proyectos: 999 },
}

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { empresa_id, new_plan, new_periodo, subscription_id } = await req.json()

    const newPriceId = PRICE_IDS[new_plan]?.[new_periodo]
    if (!newPriceId) throw new Error(`Plan inválido: ${new_plan}/${new_periodo}`)
    if (!subscription_id) throw new Error('subscription_id requerido')

    // Obtener suscripción actual de Stripe
    const subscription = await stripe.subscriptions.retrieve(subscription_id)
    const currentItem   = subscription.items.data[0]
    const currentPriceId = currentItem.price.id

    if (currentPriceId === newPriceId) {
      throw new Error('Ya tienes este plan activo con el mismo período de facturación')
    }

    const currentPlan = subscription.metadata?.plan || 'pro'
    const isUpgrade   = PLAN_TIERS[new_plan] > PLAN_TIERS[currentPlan]
    const cfg         = PLAN_CONFIG[new_plan] || PLAN_CONFIG.pro

    // ── Actualizar suscripción en Stripe ─────────────────────────────────────
    const updatedSub = await stripe.subscriptions.update(subscription_id, {
      items: [{ id: currentItem.id, price: newPriceId }],
      // Upgrade: cobro inmediato prorrateado
      // Downgrade/cambio de período: sin cargo inmediato, efectivo al próximo ciclo
      proration_behavior: isUpgrade ? 'create_prorations' : 'none',
      metadata: { empresa_id, plan: new_plan, periodo: new_periodo },
    })

    // ── Actualizar Supabase ───────────────────────────────────────────────────
    await supabase.from('tenants').update({
      plan:          new_plan,
      billing_cycle: new_periodo,
      // Límites: se aplican inmediatamente en upgrade, en downgrade al vencer
      max_usuarios:  isUpgrade ? cfg.max_usuarios  : undefined,
      max_proyectos: isUpgrade ? cfg.max_proyectos : undefined,
    }).eq('id', empresa_id)

    await supabase.from('suscripciones').update({
      plan:            new_plan,
      periodo:         new_periodo,
      stripe_price_id: newPriceId,
      status:          'active',
      current_period_end: new Date(updatedSub.current_period_end * 1000).toISOString(),
      updated_at:      new Date().toISOString(),
    }).eq('stripe_subscription_id', subscription_id)

    const periodEnd = new Date(updatedSub.current_period_end * 1000).toLocaleDateString('es')

    return new Response(
      JSON.stringify({
        success:        true,
        is_upgrade:     isUpgrade,
        effective:      isUpgrade ? 'immediate' : 'end_of_period',
        period_end:     periodEnd,
        new_plan,
        new_periodo,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    console.error('stripe-change-plan error:', msg)
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
