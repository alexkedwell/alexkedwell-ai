import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const { data, error } = await db
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ id: user.id, display_name: null, avatar_url: null, avatar_color: '#6366f1' })
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { display_name, avatar_url, avatar_color, openrouter_api_key } = body

  const db = createServiceClient()
  const { data, error } = await db
    .from('user_profiles')
    .upsert({
      id: user.id,
      display_name: display_name ?? null,
      avatar_url: avatar_url ?? null,
      avatar_color: avatar_color ?? '#6366f1',
      openrouter_api_key: openrouter_api_key ?? null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
