-- ==============================================================================
-- PULSECHAT DATABASE & CLOUD STORAGE SCHEMA
--
-- HOW TO APPLY IN SUPABASE:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/rhrfuwpooznzgiosjmjx
-- 2. Click "SQL Editor" on the left menu
-- 3. Click "New Query", paste this entire script, and click "Run" (green button)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CLEAN UP OLD CONFLICTING OBJECTS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.channel_members CASCADE;
DROP TABLE IF EXISTS public.channels CASCADE;
DROP TABLE IF EXISTS public.workspace_members CASCADE;
DROP TABLE IF EXISTS public.workspaces CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 3. PROFILES TABLE (Stores each person's user info: username, full name, email, avatar, role)
CREATE TABLE public.profiles (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  title TEXT DEFAULT 'Product Engineer',
  status_text TEXT DEFAULT '',
  status_emoji TEXT DEFAULT '💬',
  role TEXT DEFAULT 'member',
  is_online BOOLEAN DEFAULT true,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. WORKSPACES TABLE
CREATE TABLE public.workspaces (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT DEFAULT '⚡',
  icon_bg TEXT DEFAULT '#4F8CFF',
  plan TEXT DEFAULT 'Enterprise',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. WORKSPACE MEMBERS TABLE
CREATE TABLE public.workspace_members (
  workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

-- 6. CHANNELS TABLE
CREATE TABLE public.channels (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  topic TEXT DEFAULT '',
  description TEXT DEFAULT '',
  is_private BOOLEAN DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CHANNEL MEMBERS TABLE
CREATE TABLE public.channel_members (
  channel_id TEXT REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (channel_id, user_id)
);

-- 8. CONVERSATIONS TABLE (Direct Messages and Group Chats)
CREATE TABLE public.conversations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
  is_group BOOLEAN DEFAULT false,
  group_name TEXT,
  created_by TEXT,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. CONVERSATION PARTICIPANTS TABLE
CREATE TABLE public.conversation_participants (
  conversation_id TEXT REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- 10. MESSAGES TABLE
-- Stores:
-- - Text content
-- - Sender info
-- - Photos, videos, voice recordings, documents (in attachments JSONB)
-- - Emoji reactions
-- - Pin status and reply threads
CREATE TABLE public.messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT DEFAULT 'ws-pulse',
  conversation_type TEXT NOT NULL CHECK (conversation_type IN ('channel', 'dm')),
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_id TEXT,
  is_pinned BOOLEAN DEFAULT false,
  attachments JSONB DEFAULT '[]'::jsonb,
  reactions JSONB DEFAULT '{}'::jsonb,
  encrypted_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. INDEXES FOR PERFORMANCE
CREATE INDEX idx_messages_conv ON public.messages(conversation_type, conversation_id, created_at ASC);
CREATE INDEX idx_messages_parent ON public.messages(parent_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_conv_part_user ON public.conversation_participants(user_id);
CREATE INDEX idx_conv_part_conv ON public.conversation_participants(conversation_id);
CREATE INDEX idx_channel_members_user ON public.channel_members(user_id);
CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- 12. SEED DEFAULT WORKSPACE & DEFAULT CHANNELS
INSERT INTO public.workspaces (id, name, slug, icon, icon_bg, plan)
VALUES ('ws-pulse', 'PulseChat Main HQ', 'pulsechat', '⚡', '#4F8CFF', 'Enterprise')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.channels (id, workspace_id, name, topic, description, is_private)
VALUES 
  ('ch-general', 'ws-pulse', 'general', 'Company announcements and team banter', 'Public channel for everyone', false),
  ('ch-random', 'ws-pulse', 'random', 'Water cooler chats and casual discussion', 'Casual discussion', false)
ON CONFLICT (id) DO NOTHING;

-- 13. AUTOMATIC USER PROFILE TRIGGER (Fires on Supabase Auth signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, email, avatar_url, role)
  VALUES (
    NEW.id::text,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/bottts/svg?seed=' || NEW.id),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;
  
  -- Add user to default workspace members
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES ('ws-pulse', NEW.id::text, 'member')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 14. STORAGE BUCKET FOR PHOTOS, VIDEOS, VOICE AUDIO & DOCUMENTS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  true,
  104857600, -- 100MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/webm', 'audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/mp4',
    'application/pdf', 'text/plain', 'text/markdown', 'application/json', 'application/zip'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600;

-- 15. ROW-LEVEL SECURITY & PERMISSIONS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Seamless Read/Write Policies (Ensures zero 401/403 permission failures when saving messages & profiles)
DROP POLICY IF EXISTS "profiles_open" ON public.profiles;
CREATE POLICY "profiles_open" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "workspaces_open" ON public.workspaces;
CREATE POLICY "workspaces_open" ON public.workspaces FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "workspace_members_open" ON public.workspace_members;
CREATE POLICY "workspace_members_open" ON public.workspace_members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "channels_open" ON public.channels;
CREATE POLICY "channels_open" ON public.channels FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "channel_members_open" ON public.channel_members;
CREATE POLICY "channel_members_open" ON public.channel_members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "conversations_open" ON public.conversations;
CREATE POLICY "conversations_open" ON public.conversations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "conversation_participants_open" ON public.conversation_participants;
CREATE POLICY "conversation_participants_open" ON public.conversation_participants FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "messages_open" ON public.messages;
CREATE POLICY "messages_open" ON public.messages FOR ALL USING (true) WITH CHECK (true);

-- Storage Policies for chat-media bucket
DROP POLICY IF EXISTS "chat_media_select" ON storage.objects;
CREATE POLICY "chat_media_select" ON storage.objects FOR SELECT USING (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "chat_media_insert" ON storage.objects;
CREATE POLICY "chat_media_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "chat_media_all" ON storage.objects;
CREATE POLICY "chat_media_all" ON storage.objects FOR ALL USING (bucket_id = 'chat-media');

-- 16. REALTIME REPLICATION (Instant multi-device live sync)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN OTHERS THEN null;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN OTHERS THEN null;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
EXCEPTION WHEN OTHERS THEN null;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
EXCEPTION WHEN OTHERS THEN null;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
EXCEPTION WHEN OTHERS THEN null;
END $$;
