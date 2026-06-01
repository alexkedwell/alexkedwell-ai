import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getUserFromRequest } from '@/lib/auth-helpers'

// Credit packages — price in cents, credit value in USD we add to their account
// We charge slightly more than OpenRouter costs us (markup covers our profit)
const PACKAGES: Record<number, { priceUsd: number; creditsUsd: number; name: string }> = {
  5:  { priceUsd: 5,  creditsUsd: 5.00,  name: '$5 Credits — Ched AI' },
  10: { priceUsd: 10, creditsUsd: 10.00, name: '$10 Credits — Ched AI' },
  20: { priceUsd: 20, creditsUsd: 20.00, name: '$20 Credits — Ched AI' },
  50: { priceUsd: 50, creditsUsd: 50.00, name: '$50 Credits — Ched AI' },
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey || stripeKey.startsWith('sk_tes…')) {
    return NextResponse.json({ error: 'Payments not yet configured — check back soon!' }, { status: 503 })
  }

  const { amount } = await req.json()
  const pkg = PACKAGES[amount as number]
  if (!pkg) return NextResponse.json({ error: 'Invalid package' }, { status: 400 })

  const stripe = new Stripe(stripeKey)

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: pkg.name,
          description: `${pkg.creditsUsd} USD in Ched AI credits — use any model, never expires`,
        },
        unit_amount: pkg.priceUsd * 100, // cents
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ched.io'}/credits?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ched.io'}/credits?canceled=1`,
    metadata: {
      user_id: user.id,
      user_email: user.email ?? '',
      credits_usd: String(pkg.creditsUsd),
    },
    customer_email: user.email ?? undefined,
    payment_intent_data: {
      metadata: {
        user_id: user.id,
        credits_usd: String(pkg.creditsUsd),
      },
    },
  })

  return NextResponse.json({ url: session.url })
}
