import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&no-check'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

const PRICE_IDS = {
  starter:    { mensual: 'price_1TaKbQJSrIBXg6vRDX68M4V4', anual: 'price_1TaKbQJSrIBXg6vRsoilDO90' },
  pro:        { mensual: 'price_1TaKbWJSrIBXg6vR0UbtBeTe', anual: 'price_1TaKbVJSrIBXg6vRsdqW5Cwn' },
  enterprise: { mensual: 'price_1TaKbSJSrIBXg6vRTHEm9cXX', anual: 'price_1TaKbRJSrIBXg6vRoRQTdZHn' },
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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
      return new Response(
        JSON.stringify({ error: `Plan o periodo invalido: ${plan}/${periodo}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: tenant } = await supabase
      .from('tenants')
      .select('stripe_customer_id')
      .eq('id', empresa_id)
      .single()

    let customerId = tenant?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name: empresa_nombre,
        metadata: { empresa_id },
      })
      customerId = customer.id
      await supabase.from('tenants').update({ stripe_customer_id: customerId }).eq('id', empresa_id)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: 'https://appmary.com/pago-exitoso?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://appmary.com/planes',
      metadata: { empresa_id, plan, periodo },
      subscription_data: { metadata: { empresa_id, plan, periodo } },
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('stripe-checkout error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
