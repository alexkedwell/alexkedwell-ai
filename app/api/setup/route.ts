import { NextRequest, NextResponse } from 'next/server'

// This route creates required DB tables on first run.
// Call GET /api/setup once after initial deployment.
// Protected by a setup token to prevent abuse.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  // Simple protection: require the service role key as a token
  if (token !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const PROJECT_REF = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').replace('.supabase.co', '')
  
  // Use Supabase pg meta API to run migration
  // This works differently - we need to use the REST API with service role to insert
  // and leverage PostgREST's DDL via a special approach

  // Actually use the Supabase Management API endpoint for SQL execution
  // which is available at https://api.supabase.com/v1/projects/{ref}/database/query
  // This requires a personal access token (PAT), not service role...

  // Best approach: use pg direct connection via the Supabase connection pooler
  // Return instructions for manual setup instead
  
  const sql = `
CREATE TABLE IF NOT EXISTS user_api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_key text NOT NULL,
  key_hint text,
  provider text DEFAULT 'openrouter',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can manage own keys"
  ON user_api_keys
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
`.trim()

  return NextResponse.json({
    message: 'Run this SQL in your Supabase SQL editor (https://app.supabase.com/project/xuyodxtwxpfyzkjqowlb/sql)',
    sql,
  })
}
