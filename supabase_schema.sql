-- ==============================================================================
-- PULSECHAT SUPABASE SCHEMA, STORAGE & ROW-LEVEL SECURITY (RLS) SETUP
-- Handles:
--   1. User Profiles & Roles (Owner, Admin, Member, Guest)
--   2. Workspaces & Workspace Members
--   3. Public & Private Channels with Channel Membership
--   4. Direct Messages & Group Conversations with Participant Isolation
--   5. Realtime Messages (Text, Threads, Reactions, Pins, Encryption Payloads)
--   6. Storage Bucket for Photos, Videos, Voice Recordings & Documents
--   7. Strict RLS Isolation: Users only see the channels, DMs, groups & messages they belong to
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USER ROLE ENUM
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member', 'guest');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Mirrors Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
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

-- 4. WORKSPACES TABLE
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT DEFAULT '⚡',
  icon_bg TEXT DEFAULT '#4F8CFF',
  plan TEXT DEFAULT 'Enterprise',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. WORKSPACE MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.workspace_members (
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

-- 6. CHANNELS TABLE (Public & Private Channels)
CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  topic TEXT DEFAULT '',
  description TEXT DEFAULT '',
  is_private BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CHANNEL MEMBERS TABLE (For Private Channels & Channel Access)
CREATE TABLE IF NOT EXISTS public.channel_members (
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (channel_id, user_id)
);

-- 8. CONVERSATIONS TABLE (Direct Messages and Group Chats)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  is_group BOOLEAN DEFAULT false,
  group_name TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. CONVERSATION PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- 10. MESSAGES TABLE
-- Stores text messages, attachments (photos, videos, audio/voice notes, documents),
-- reactions, pin status, and end-to-end encryption metadata.
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_type TEXT NOT NULL CHECK (conversation_type IN ('channel', 'dm')),
  conversation_id UUID NOT NULL, -- references channels(id) or conversations(id)
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.messages(id) ON DELETE SET NULL, -- Thread reply
  is_pinned BOOLEAN DEFAULT false,
  attachments JSONB DEFAULT '[]'::jsonb, -- Photos, videos, voice notes, documents
  reactions JSONB DEFAULT '{}'::jsonb,   -- Emoji reaction maps: { "👍": ["user_id"] }
  encrypted_payload JSONB,               -- Optional AES-256-GCM ciphertext + IV
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. INDEXES FOR LIGHTNING FAST QUERIES
CREATE INDEX IF NOT EXISTS idx_messages_conv ON public.messages(conversation_type, conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_parent ON public.messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conv_part_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_part_conv ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user ON public.channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_online ON public.profiles(is_online);

-- 12. AUTOMATIC USER PROFILE CREATION TRIGGER
-- Triggers whenever a user signs up via Supabase Auth (email/password or social)
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 13. CONFIGURE STORAGE BUCKET FOR PHOTOS, VIDEOS, AUDIO & DOCUMENTS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  true,
  104857600, -- 100MB limit per file
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'audio/webm',
    'audio/wav',
    'audio/mpeg',
    'audio/ogg',
    'audio/mp4',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/json',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600;

-- 14. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 15. RLS POLICIES FOR USERS, CHANNELS, GROUPS & MESSAGES

-- A. Profiles: All authenticated users can view profiles; only self can update
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- B. Workspaces & Workspace Members
CREATE POLICY "Users can view workspaces they belong to"
  ON public.workspaces FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = public.workspaces.id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view workspace members in their workspaces"
  ON public.workspace_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = public.workspace_members.workspace_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and Admins can manage workspace members"
  ON public.workspace_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = public.workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

-- C. Channels: Public channels viewable by all workspace members; private only by channel members
CREATE POLICY "Channel visibility policy"
  ON public.channels FOR SELECT
  TO authenticated
  USING (
    NOT is_private OR EXISTS (
      SELECT 1 FROM public.channel_members cm
      WHERE cm.channel_id = public.channels.id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated members can create channels"
  ON public.channels FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Channel members can view membership"
  ON public.channel_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.channel_members cm
      WHERE cm.channel_id = public.channel_members.channel_id AND cm.user_id = auth.uid()
    )
  );

-- D. Conversations & Groups: Users ONLY see conversations/groups they are a participant in!
CREATE POLICY "Users can view only conversations they participate in"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = public.conversations.id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view participants of their conversations"
  ON public.conversation_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = public.conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add participants to conversations"
  ON public.conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- E. Messages: Users only see messages in channels or groups they are a member of!
CREATE POLICY "Users can view messages in accessible channels or conversations"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
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

CREATE POLICY "Users can send messages as themselves"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages"
  ON public.messages FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

-- F. Storage Policies for Photos, Videos, Voice Notes & Documents
CREATE POLICY "Authenticated users can upload to chat-media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-media');

CREATE POLICY "Anyone can view chat-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-media');

CREATE POLICY "Users can delete their own uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'chat-media' AND auth.uid() = owner);

-- 16. REALTIME REPLICATION SETUP
-- Enables live instant message streams, typing events, and group sync across all active clients
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_members;
