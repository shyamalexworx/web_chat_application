-- ==============================================================================
-- PULSECHAT SUPABASE DATABASE & STORAGE SCHEMA
--
-- HOW TO APPLY IN SUPABASE:
-- 1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/rhrfuwpooznzgiosjmjx
-- 2. Open the "SQL Editor" from the left sidebar
-- 3. Click "New Query", paste this entire script, and click "Run" (green button)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CLEAN UP OLD CONFLICTING OBJECTS (Ensures clean setup)
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

-- 3. USER ROLES
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member', 'guest');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 4. PROFILES TABLE (Mirrors Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  title TEXT DEFAULT 'Product Engineer',
  status_text TEXT DEFAULT '',
  status_emoji TEXT DEFAULT '💬',
  role user_role DEFAULT 'member',
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. WORKSPACES TABLE
CREATE TABLE public.workspaces (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT DEFAULT '⚡',
  icon_bg TEXT DEFAULT '#4F8CFF',
  plan TEXT DEFAULT 'Enterprise',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. WORKSPACE MEMBERS TABLE
CREATE TABLE public.workspace_members (
  workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

-- 7. CHANNELS TABLE (Public & Private Channels)
CREATE TABLE public.channels (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  topic TEXT DEFAULT '',
  description TEXT DEFAULT '',
  is_private BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CHANNEL MEMBERS TABLE (For Private Channel Access)
CREATE TABLE public.channel_members (
  channel_id TEXT REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (channel_id, user_id)
);

-- 9. CONVERSATIONS TABLE (Direct Messages and Group Chats)
CREATE TABLE public.conversations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
  is_group BOOLEAN DEFAULT false,
  group_name TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. CONVERSATION PARTICIPANTS TABLE
CREATE TABLE public.conversation_participants (
  conversation_id TEXT REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- 11. MESSAGES TABLE
-- Supports text, attachments (photos, videos, audio/voice recordings, documents),
-- reactions, pin state, threads, and AES-256 encrypted payloads.
CREATE TABLE public.messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_type TEXT NOT NULL CHECK (conversation_type IN ('channel', 'dm')),
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_id TEXT REFERENCES public.messages(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT false,
  attachments JSONB DEFAULT '[]'::jsonb,
  reactions JSONB DEFAULT '{}'::jsonb,
  encrypted_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. PERFORMANCE INDEXES
CREATE INDEX idx_messages_conv ON public.messages(conversation_type, conversation_id, created_at ASC);
CREATE INDEX idx_messages_parent ON public.messages(parent_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_conv_part_user ON public.conversation_participants(user_id);
CREATE INDEX idx_conv_part_conv ON public.conversation_participants(conversation_id);
CREATE INDEX idx_channel_members_user ON public.channel_members(user_id);
CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_profiles_online ON public.profiles(is_online);

-- 13. SEED DEFAULT WORKSPACE & DEFAULT CHANNELS
INSERT INTO public.workspaces (id, name, slug, icon, icon_bg, plan)
VALUES ('ws-pulse', 'PulseChat Main HQ', 'pulsechat', '⚡', '#4F8CFF', 'Enterprise')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.channels (id, workspace_id, name, topic, description, is_private)
VALUES 
  ('ch-general', 'ws-pulse', 'general', 'Company-wide announcements and team banter', 'Public channel for everyone', false),
  ('ch-random', 'ws-pulse', 'random', 'Water cooler chats, pet pictures, and tech jokes', 'Casual discussion', false)
ON CONFLICT (id) DO NOTHING;

-- 14. AUTOMATIC USER PROFILE CREATION TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/bottts/svg?seed=' || NEW.id),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'member'::user_role)
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name;
  
  -- Add user to default workspace members
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES ('ws-pulse', NEW.id, 'member')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never abort auth signup on trigger error
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 15. STORAGE BUCKET CONFIGURATION FOR MEDIA (Photos, Videos, Audio/Voice, Documents)
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

-- 16. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Profiles are readable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Workspaces & Members
CREATE POLICY "Workspaces are readable by everyone" ON public.workspaces FOR SELECT USING (true);
CREATE POLICY "Users can insert workspaces" ON public.workspaces FOR INSERT WITH CHECK (true);
CREATE POLICY "Workspace members viewable" ON public.workspace_members FOR SELECT USING (true);
CREATE POLICY "Workspace members manageable" ON public.workspace_members FOR ALL USING (true);

-- Channels
CREATE POLICY "Channel select policy" ON public.channels FOR SELECT USING (
  NOT is_private OR EXISTS (
    SELECT 1 FROM public.channel_members cm
    WHERE cm.channel_id = public.channels.id AND cm.user_id = auth.uid()
  )
);
CREATE POLICY "Authenticated users can create channels" ON public.channels FOR INSERT WITH CHECK (true);
CREATE POLICY "Channel members viewable" ON public.channel_members FOR SELECT USING (true);
CREATE POLICY "Channel members manageable" ON public.channel_members FOR ALL USING (true);

-- Conversations (DMs & Groups)
CREATE POLICY "Conversations select policy" ON public.conversations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = public.conversations.id AND cp.user_id = auth.uid()
  )
);
CREATE POLICY "Authenticated users can create conversations" ON public.conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Conversation participants select policy" ON public.conversation_participants FOR SELECT USING (true);
CREATE POLICY "Conversation participants insert policy" ON public.conversation_participants FOR INSERT WITH CHECK (true);

-- Messages: Users see channel messages or their conversations
CREATE POLICY "Messages select policy" ON public.messages FOR SELECT USING (
  (
    conversation_type = 'channel' AND EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = public.messages.conversation_id AND (
        NOT c.is_private OR EXISTS (
          SELECT 1 FROM public.channel_members cm
          WHERE cm.channel_id = c.id AND cm.user_id = auth.uid()
        )
      )
    )
  )
  OR
  (
    conversation_type = 'dm' AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = public.messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  )
);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (
  auth.uid()::text = sender_id OR sender_id IS NOT NULL
);
CREATE POLICY "Users can update their messages" ON public.messages FOR UPDATE USING (auth.uid()::text = sender_id);
CREATE POLICY "Users can delete their messages" ON public.messages FOR DELETE USING (auth.uid()::text = sender_id);

-- Storage Policies for chat-media bucket
DROP POLICY IF EXISTS "Public can view chat-media" ON storage.objects;
CREATE POLICY "Public can view chat-media" ON storage.objects FOR SELECT USING (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "Anyone can upload to chat-media" ON storage.objects;
CREATE POLICY "Anyone can upload to chat-media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "Users can update delete chat-media" ON storage.objects;
CREATE POLICY "Users can update delete chat-media" ON storage.objects FOR ALL USING (bucket_id = 'chat-media');

-- 17. ENABLE REALTIME
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
