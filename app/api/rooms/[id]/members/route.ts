import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { id: roomId } = await params
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  const { data: members, error } = await db
    .from('chat_room_members')
    .select('user_id, joined_at')
    .eq('room_id', roomId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch profiles for each member
  const userIds = (members || []).map(m => m.user_id)
  const { data: profiles } = await db
    .from('user_profiles')
    .select('id, display_name, avatar_url, avatar_color')
    .in('id', userIds)

  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))

  const enriched = (members || []).map(m => ({
    ...m,
    profile: profileMap[m.user_id] ?? null,
  }))

  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id: roomId } = await params
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email } = await req.json()
  if (!email?.trim()) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const db = createServiceClient()

  // Verify requester is in the room
  const { data: requesterMember } = await db
    .from('chat_room_members')
    .select('user_id')
    .eq('room_id', roomId)
    .eq('user_id', user.id)
    .single()

  if (!requesterMember) return NextResponse.json({ error: 'Not a member of this room' }, { status: 403 })

  // Look up the user by email using service client (admin)
  const { data: users } = await db.auth.admin.listUsers()
  const targetUser = users?.users?.find(u => u.email === email.trim())
  
  if (!targetUser) {
    return NextResponse.json({ error: 'No user found with that email' }, { status: 404 })
  }

  // Add as member
  const { error } = await db
    .from('chat_room_members')
    .insert({ room_id: roomId, user_id: targetUser.id })

  if (error && !error.message.includes('duplicate')) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, userId: targetUser.id })
}
