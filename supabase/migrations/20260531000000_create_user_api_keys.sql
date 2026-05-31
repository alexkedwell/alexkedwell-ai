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
    SELECT 1 FROM pg_policies WHERE tablename = 'user_api_keys' AND policyname = 'Users can manage own keys'
  ) THEN
    CREATE POLICY "Users can manage own keys"
      ON user_api_keys
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
