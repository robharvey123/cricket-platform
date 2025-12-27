import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.0.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

const TIER_CONFIGS = {
  free: {
    tier: 'free',
    max_players: 25,
    max_teams: 1,
    features: {
      availability_polling: false,
      team_selection: false,
      club_payments: false,
      ai_analyst: false,
      mega_stats: false,
    }
  },
  pro: {
    tier: 'pro',
    max_players: null,
    max_teams: 3,
    features: {
      availability_polling: true,
      team_selection: true,
      club_payments: true,
      ai_analyst: true,
      ai_queries_limit: 10,
      mega_stats: false,
    }
  },
  premier: {
    tier: 'premier',
    max_players: null,
    max_teams: null,
    features: {
      availability_polling: true,
      team_selection: true,
      club_payments: true,
      ai_analyst: true,
      ai_queries_limit: null,
      mega_stats: true,
      exportable_reports: true,
      optimal_lineup_ai: true,
    }
  }
}

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')!
  const body = await req.text()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const PRICE_TO_TIER: Record<string, string> = {
    [Deno.env.get('STRIPE_PRICE_PRO_MONTHLY')!]: 'pro',
    [Deno.env.get('STRIPE_PRICE_PRO_ANNUAL')!]: 'pro',
    [Deno.env.get('STRIPE_PRICE_PREMIER_MONTHLY')!]: 'premier',
    [Deno.env.get('STRIPE_PRICE_PREMIER_ANNUAL')!]: 'premier',
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      const priceId = subscription.items.data[0]?.price.id
      const tier = PRICE_TO_TIER[priceId] || 'free'

      await supabase
        .from('organizations')
        .update({
          stripe_subscription_id: subscription.id,
          subscription_tier: tier,
          feature_flags: TIER_CONFIGS[tier as keyof typeof TIER_CONFIGS],
        })
        .eq('stripe_customer_id', customerId)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      await supabase
        .from('organizations')
        .update({
          stripe_subscription_id: null,
          subscription_tier: 'free',
          feature_flags: TIER_CONFIGS.free,
        })
        .eq('stripe_customer_id', customerId)
      break
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
})
