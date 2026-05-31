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
  starter:    { mensual: 'price_1TaKbQJSrIBXg6vRDX68M4V4', anual: 'price_1TaKbQJSrIBXg6vRsoilDO90' },
  pro:        { mensual: 'price_1TaKbWJSrIBXg6vR0UbtBeTe', anual: 'price_1TaKbVJSrIBXg6vRsdqW5Cwn' },
  enterprise: { mensual: 'price_1TaKbSJSrIBXg6vRTHEm9cXX', anual: 'price_1TaKbRJSrIBXg6vRoRQTdZHn' },
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
    // ── ref_code es opcional — no bloquea el checkout si está vacío ──────────
    const { plan, periodo, empresa_id, email, empresa_nombre, ref_code, promotion_code_id } = await req.json()

    const priceId = PRICE_IDS[plan]?.[periodo]
    if (!priceId) {
      throw new Error(`Plan inválido: ${plan}/${periodo}`)
    }

    // Limpiar ref_code: solo letras y números, máx 20 chars, mayúsculas
    const cleanRefCode = ref_code
      ? String(ref_code).trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)
      : ''

    console.log(`Creando checkout: empresa=${empresa_id} plan=${plan} periodo=${periodo} price=${priceId} ref_code=${cleanRefCode || 'ninguno'}`)

    const session = await stripe.checkout.sessions.create({
      mode:                 'subscription',
      payment_method_types: ['card'],
      customer_email:       email,
      line_items:           [{ price: priceId, quantity: 1 }],
      success_url:          `${SITE_URL}/pago-exitoso`,
      cancel_url:           `${SITE_URL}/pago-cancelado`,
      // Apply promo code discount if provided
      ...(promotion_code_id ? { discounts: [{ promotion_code: promotion_code_id }] } : { allow_promotion_codes: false }),
      metadata: {
        empresa_id,
        plan,
        periodo,
        empresa_nombre: empresa_nombre ?? '',
        ref_code:       cleanRefCode,   // ← NUEVO: guardado en metadata de la sesión
      },
      subscription_data: {
        metadata: {
          empresa_id,
          plan,
          periodo,
          ref_code: cleanRefCode,       // ← NUEVO: guardado en metadata de la suscripción
        },
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
