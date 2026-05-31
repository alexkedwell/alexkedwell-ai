import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  
  // Get rooms the user is a member of
  const { data: memberRows } = await db
    .from('chat_room_members')
    .select('room_id')
    .eq('user_id', user.id)

  const roomIds = (memberRows || []).map(r => r.room_id)
  
  if (roomIds.length === 0) return NextResponse.json([])

  const { data: rooms, error } = await db
    .from('chat_rooms')
    .select('*')
    .in('id', roomIds)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(rooms || [])
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Room name required' }, { status: 400 })

  const db = createServiceClient()

  // Create room
  const { data: room, error: roomError } = await db
    .from('chat_rooms')
    .insert({ name: name.trim(), created_by: user.id })
    .select()
    .single()

  if (roomError) return NextResponse.json({ error: roomError.message }, { status: 500 })

  // Add creator as member
  await db.from('chat_room_members').insert({ room_id: room.id, user_id: user.id })

  return NextResponse.json(room)
}
