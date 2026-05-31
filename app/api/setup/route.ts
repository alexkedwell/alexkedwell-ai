import { NextRequest, NextResponse } from 'next/server'

const MIGRATION_SQL = `-- Run this in the Supabase SQL Editor:
-- https://app.supabase.com/project/xuyodxtwxpfyzkjqowlb/sql/new

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_api_keys' 
    AND policyname = 'Users can manage own keys'
  ) THEN
    CREATE POLICY "Users can manage own keys"
      ON user_api_keys
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;`

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (token !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    message: 'Run this SQL in your Supabase dashboard to create the required table.',
    sql_editor_url: 'https://app.supabase.com/project/xuyodxtwxpfyzkjqowlb/sql/new',
    sql: MIGRATION_SQL,
  })
}
