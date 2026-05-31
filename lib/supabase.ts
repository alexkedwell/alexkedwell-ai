import { createClient } from '@supabase/supabase-js'

// NEXT_PUBLIC_ vars are baked at build time; fallbacks ensure the client works
// even if the build cache doesn't include env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xuyodxtwxpfyzkjqowlb.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_cCTjsIWxK38MpaoMwZIQTw_iTwk4anQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
