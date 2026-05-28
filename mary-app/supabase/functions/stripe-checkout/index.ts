// ============================================================
// CARPETA: supabase/functions/stripe-checkout/index.ts
// FUNCIÓN: Crea la sesión de Stripe y devuelve la URL de pago
// MODO: TEST (sandbox) — usar sk_test_... en Supabase Secrets
// ============================================================

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&no-check'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

// ── Price IDs TEST ────────────────────────────────────────────────────────────
const PRICE_IDS: Record<string, Record<string, string>> = {
  starter:    { mensual: 'price_1TZk0lJZWJ0VISBDC0xTA9us', anual: 'price_1TZk9CJZWJ0VISBDjaAT7NdV' },
  pro:        { mensual: 'price_1TZkM8JZWJ0VISBDMQpKeT7X', anual: 'price_1TZkMoJZWJ0VISBDbmHJvETa' },
  enterprise: { mensual: 'price_1TZk4CJZWJ0VISBD1xzoc3iq', anual: 'price_1TZkA6JZWJ0VISBDbm0FqWtR' },
}

const SITE_URL = Deno.env.get('SITE_URL') ?? 'http://localhost:5174'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { plan, periodo, empresa_id, email, empresa_nombre } = await req.json()

    const priceId = PRICE_IDS[plan]?.[periodo]
    if (!priceId) {
      throw new Error(`Plan inválido: ${plan}/${periodo}`)
    }

    console.log(`Creando checkout: empresa=${empresa_id} plan=${plan} periodo=${periodo} price=${priceId}`)

    const session = await stripe.checkout.sessions.create({
      mode:                 'subscription',
      payment_method_types: ['card'],
      customer_email:       email,
      line_items:           [{ price: priceId, quantity: 1 }],
      success_url:          `${SITE_URL}/pago-exitoso`,
      cancel_url:           `${SITE_URL}/pago-cancelado`,
      metadata: {
        empresa_id,
        plan,
        periodo,
        empresa_nombre: empresa_nombre ?? '',
      },
      subscription_data: {
        metadata: { empresa_id, plan, periodo },
      },
    })

    console.log(`Sesión creada: ${session.id} → ${session.url}`)

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('stripe-checkout error:', err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
