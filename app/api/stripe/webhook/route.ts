import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { addCredits } from '@/lib/credits'

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const stripe = new Stripe(stripeKey)
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    // Only fulfill paid sessions
    if (session.payment_status !== 'paid') return NextResponse.json({ ok: true })

    const userId = session.metadata?.user_id
    const creditsUsd = parseFloat(session.metadata?.credits_usd ?? '0')

    if (!userId || !creditsUsd) {
      console.error('Missing metadata on session:', session.id)
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    // Instantly add credits to user's account
    const newBalance = await addCredits(userId, creditsUsd)
    console.log(`✅ Credits added: user=${userId} amount=$${creditsUsd} newBalance=$${newBalance}`)
  }

  return NextResponse.json({ ok: true })
}

// Required: disable body parsing so Stripe signature check works
export const config = {
  api: { bodyParser: false },
}
