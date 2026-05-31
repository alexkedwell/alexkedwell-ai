import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { createServiceClient } from './supabase'

/**
 * Get authenticated user from request Authorization header.
 * Returns null if not authenticated.
 */
export async function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.replace('Bearer ', '')
  const supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const { data: { user }, error } = await supabaseClient.auth.getUser(token)
  if (error || !user) return null
  return user
}

/**
 * Get user profile from service client.
 */
export async function getUserProfile(userId: string) {
  const db = createServiceClient()
  const { data } = await db
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}
