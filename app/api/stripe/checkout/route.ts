import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getUserFromRequest } from '@/lib/auth-helpers'

const CREDIT_PACKAGES = [
  { amount: 5, label: '$5' },
  { amount: 10, label: '$10' },
  { amount: 20, label: '$20' },
  { amount: 50, label: '$50' },
]

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { amount } = await req.json()
  const pkg = CREDIT_PACKAGES.find(p => p.amount === amount)
  if (!pkg) {
    return NextResponse.json({ error: 'Invalid credit amount' }, { status: 400 })
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey || stripeKey === 'sk_test_placeholder') {
    return NextResponse.json(
      { error: 'Stripe not configured. Contact the site owner to set up payments.' },
      { status: 503 }
    )
  }

  const stripe = new Stripe(stripeKey)

  const origin = req.headers.get('origin') || 'https://alexkedwell.com'

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${pkg.label} AI Credits`,
            description: `Add ${pkg.label} in credits to your AlexKedwell AI account`,
          },
          unit_amount: pkg.amount * 100, // cents
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: user.id,
      creditAmount: pkg.amount,
    },
    success_url: `${origin}/credits?success=true`,
    cancel_url: `${origin}/credits?canceled=true`,
  })

  return NextResponse.json({ url: session.url })
}
