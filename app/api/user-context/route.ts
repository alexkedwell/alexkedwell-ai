import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase'

// GET — fetch all context entries for the user
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const { data } = await db
    .from('user_context')
    .select('key, value, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  return NextResponse.json({ context: data ?? [] })
}

// POST — save a key/value (upsert)
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { key, value } = await req.json()
  if (!key || !value) return NextResponse.json({ error: 'key and value required' }, { status: 400 })

  const db = createServiceClient()
  await db.from('user_context').upsert(
    { user_id: user.id, key, value, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,key' }
  )

  return NextResponse.json({ ok: true })
}

// DELETE — remove a key
export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { key } = await req.json()
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })

  const db = createServiceClient()
  await db.from('user_context').delete().eq('user_id', user.id).eq('key', key)

  return NextResponse.json({ ok: true })
}
