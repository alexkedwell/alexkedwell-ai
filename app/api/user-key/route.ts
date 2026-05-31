import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { encryptApiKey, decryptApiKey } from '@/lib/crypto'
import { createClient } from '@supabase/supabase-js'

async function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

// GET: fetch key hint for current user
export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const { data, error } = await db
    .from('user_api_keys')
    .select('key_hint, provider, created_at')
    .eq('user_id', user.id)
    .eq('provider', 'openrouter')
    .single()

  if (error || !data) return NextResponse.json({ hasKey: false })
  return NextResponse.json({ hasKey: true, keyHint: data.key_hint, provider: data.provider })
}

// POST: save/update API key
export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { apiKey } = await req.json()
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 8) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 400 })
  }

  const trimmed = apiKey.trim()
  const keyHint = trimmed.slice(-4)
  const encryptedKey = encryptApiKey(trimmed, user.id)

  const db = createServiceClient()
  const { error } = await db
    .from('user_api_keys')
    .upsert(
      { user_id: user.id, encrypted_key: encryptedKey, key_hint: keyHint, provider: 'openrouter' },
      { onConflict: 'user_id,provider' }
    )

  if (error) {
    console.error('Supabase upsert error:', error)
    return NextResponse.json({ error: 'Failed to save key' }, { status: 500 })
  }

  return NextResponse.json({ success: true, keyHint })
}

// DELETE: remove API key
export async function DELETE(req: NextRequest) {
  const user = await getAuthenticatedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  await db.from('user_api_keys').delete().eq('user_id', user.id).eq('provider', 'openrouter')
  return NextResponse.json({ success: true })
}
