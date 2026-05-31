import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { readFileSync } from 'fs'
import { join } from 'path'

const MIGRATION_SQL = `
-- ============================================================
-- Run this in the Supabase SQL Editor:
-- https://app.supabase.com/project/xuyodxtwxpfyzkjqowlb/sql/new
-- ============================================================

-- User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  avatar_color text DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User Credits
CREATE TABLE IF NOT EXISTS user_credits (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_usd decimal(10,4) DEFAULT 0,
  total_spent decimal(10,4) DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view own credits" ON user_credits FOR SELECT USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "Users can insert own credits" ON user_credits FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "Service role can update credits" ON user_credits FOR UPDATE USING (true);

-- Chat Rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Authenticated users can create rooms" ON chat_rooms FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Chat Room Members
CREATE TABLE IF NOT EXISTS chat_room_members (
  room_id uuid REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Members can view room membership" ON chat_room_members
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Room creators can add members" ON chat_room_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM chat_rooms WHERE id = room_id AND created_by = auth.uid())
    OR user_id = auth.uid()
  );

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  content text NOT NULL,
  is_ai boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Room members can read messages" ON chat_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM chat_room_members WHERE room_id = chat_messages.room_id AND user_id = auth.uid())
  );
CREATE POLICY IF NOT EXISTS "Room members can insert messages" ON chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM chat_room_members WHERE room_id = chat_messages.room_id AND user_id = auth.uid())
  );

-- Legacy user_api_keys (for backward compat)
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
CREATE POLICY IF NOT EXISTS "Users can manage own keys" ON user_api_keys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_room_members;
`

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (token !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check which tables exist
  const db = createServiceClient()
  const tableChecks = await Promise.allSettled([
    db.from('user_profiles').select('id').limit(1),
    db.from('user_credits').select('id').limit(1),
    db.from('chat_rooms').select('id').limit(1),
    db.from('chat_room_members').select('user_id').limit(1),
    db.from('chat_messages').select('id').limit(1),
  ])

  const tableNames = ['user_profiles', 'user_credits', 'chat_rooms', 'chat_room_members', 'chat_messages']
  const tableStatus: Record<string, boolean> = {}

  tableChecks.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      const { error } = result.value
      tableStatus[tableNames[i]] = !error || !error.message.includes('schema cache')
    } else {
      tableStatus[tableNames[i]] = false
    }
  })

  const allTablesExist = Object.values(tableStatus).every(Boolean)

  return NextResponse.json({
    status: allTablesExist ? 'ready' : 'migration_required',
    tables: tableStatus,
    message: allTablesExist
      ? 'All tables exist and are ready.'
      : 'Some tables are missing. Run the migration SQL in the Supabase SQL editor.',
    sql_editor_url: 'https://app.supabase.com/project/xuyodxtwxpfyzkjqowlb/sql/new',
    migration_sql: MIGRATION_SQL,
  })
}
