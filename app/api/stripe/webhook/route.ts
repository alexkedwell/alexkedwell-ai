import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { addCredits } from '@/lib/credits'

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeKey || stripeKey === 'sk_test_placeholder') {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const stripe = new Stripe(stripeKey)
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  let event: Stripe.Event

  if (webhookSecret && sig) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Webhook error'
      return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 })
    }
  } else {
    // No webhook secret configured — parse without verification (dev mode)
    event = JSON.parse(body) as Stripe.Event
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.userId
    const creditAmount = Number(session.metadata?.creditAmount)

    if (userId && creditAmount > 0) {
      await addCredits(userId, creditAmount)
      console.log(`Added $${creditAmount} credits to user ${userId}`)
    }
  }

  return NextResponse.json({ received: true })
}
