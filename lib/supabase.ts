import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

// Use createBrowserClient so auth tokens are stored in cookies,
// allowing the server-side middleware to read the session
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xuyodxtwxpfyzkjqowlb.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_cCTjsIWxK38MpaoMwZIQTw_iTwk4anQ'
)

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xuyodxtwxpfyzkjqowlb.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
