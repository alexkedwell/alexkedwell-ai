-- ============================================================
-- alexkedwell.com Full Platform Schema
-- Run via: psql or Supabase SQL editor
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

CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User Credits
CREATE TABLE IF NOT EXISTS user_credits (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_usd decimal(10,4) DEFAULT 0,
  total_spent decimal(10,4) DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits" ON user_credits
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own credits" ON user_credits
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Service role can update credits (for deductions)
CREATE POLICY "Service role can update credits" ON user_credits
  FOR UPDATE USING (true);

-- Chat Rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members can view rooms" ON chat_rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_room_members
      WHERE room_id = chat_rooms.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create rooms" ON chat_rooms
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Chat Room Members
CREATE TABLE IF NOT EXISTS chat_room_members (
  room_id uuid REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view room membership" ON chat_room_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM chat_room_members m
      WHERE m.room_id = chat_room_members.room_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Room creators can add members" ON chat_room_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE id = room_id AND created_by = auth.uid()
    ) OR user_id = auth.uid()
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

CREATE POLICY "Room members can read messages" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_room_members
      WHERE room_id = chat_messages.room_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Room members can insert messages" ON chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM chat_room_members
      WHERE room_id = chat_messages.room_id AND user_id = auth.uid()
    )
  );

-- Service role can insert AI messages
CREATE POLICY "Service role can insert AI messages" ON chat_messages
  FOR INSERT WITH CHECK (is_ai = true);

-- Enable Realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_room_members;

-- Avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
