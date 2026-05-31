import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-helpers'
import { getUserCredits } from '@/lib/credits'

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const credits = await getUserCredits(user.id)
  return NextResponse.json({ balance: credits.balance_usd, totalSpent: credits.total_spent })
}
