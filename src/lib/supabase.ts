import { createClient, RealtimeChannel } from '@supabase/supabase-js';

// Retrieve credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseAnonKey.includes('placeholder')
);

if (!isSupabaseConfigured) {
  console.info(
    'ℹ️ PulseChat: Supabase credentials not found. App running in local storage mode. To sync with Supabase cloud, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

// Supabase client instance (or placeholder client if not yet configured)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: { persistSession: false },
    });

// ==============================================================================
// DATABASE TYPES
// ==============================================================================
export type UserRole = 'owner' | 'admin' | 'member' | 'guest';

export interface DatabaseProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  title: string;
  status_text: string;
  status_emoji: string;
  role: UserRole;
  is_online: boolean;
  last_seen: string;
  created_at: string;
}

export interface DatabaseConversation {
  id: string;
  workspace_id: string;
  is_group: boolean;
  group_name?: string | null;
  created_by?: string | null;
  last_activity: string;
  created_at: string;
}

export interface DatabaseMessage {
  id: string;
  workspace_id: string;
  conversation_type: 'channel' | 'dm';
  conversation_id: string;
  sender_id: string;
  content: string;
  parent_id?: string | null;
  is_pinned: boolean;
  attachments: Array<{
    id: string;
    name: string;
    size: string;
    type: 'image' | 'video' | 'audio' | 'document' | 'code';
    url: string;
    previewUrl?: string;
    duration?: number;
  }>;
  reactions: Record<string, string[]>;
  encrypted_payload?: any;
  created_at: string;
  updated_at: string;
}

// ==============================================================================
// 1. AUTHENTICATION & USER SESSIONS
// ==============================================================================

/**
 * Register a new user with Supabase Auth
 */
export async function signUpWithSupabase(params: {
  email: string;
  password: string;
  fullName: string;
  username: string;
}) {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        full_name: params.fullName,
        username: params.username,
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(params.username)}`,
      },
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Sign in existing user with Supabase Auth
 */
export async function signInWithSupabase(email: string, password: string) {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Sign out from Supabase Auth
 */
export async function signOutWithSupabase() {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get currently active Supabase Auth user session
 */
export async function getCurrentSupabaseUser() {
  if (!isSupabaseConfigured) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ==============================================================================
// 2. USER PROFILES & PRESENCE
// ==============================================================================

export async function fetchUsersList(): Promise<DatabaseProfile[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }
  return data || [];
}

export async function setUserPresence(userId: string, isOnline: boolean) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('profiles')
    .update({
      is_online: isOnline,
      last_seen: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) console.error('Error updating user presence:', error);
}

export function subscribeToUsersPresence(
  onUserChange: (user: DatabaseProfile) => void
): RealtimeChannel | null {
  if (!isSupabaseConfigured) return null;

  return supabase
    .channel('public:profiles')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles' },
      (payload) => {
        if (payload.new) {
          onUserChange(payload.new as DatabaseProfile);
        }
      }
    )
    .subscribe();
}

// ==============================================================================
// 3. STORAGE: PHOTOS, VIDEOS, AUDIO (VOICE NOTES), & DOCUMENTS
// ==============================================================================

/**
 * Upload any chat media file (photo, video, voice recording, document) to Supabase Storage
 * Bucket: 'chat-media'
 */
export async function uploadChatMedia(
  file: File | Blob,
  fileName: string,
  category: 'images' | 'videos' | 'voice' | 'documents' = 'documents'
): Promise<{
  id: string;
  name: string;
  size: string;
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
} | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const timestamp = Date.now();
    const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${category}/${timestamp}_${cleanName}`;

    // Upload to 'chat-media' bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-media')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase Storage upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('chat-media')
      .getPublicUrl(uploadData.path);

    const sizeInMB = file.size ? (file.size / (1024 * 1024)).toFixed(2) + ' MB' : '0.1 MB';

    let itemType: 'image' | 'video' | 'audio' | 'document' = 'document';
    if (category === 'images') itemType = 'image';
    else if (category === 'videos') itemType = 'video';
    else if (category === 'voice') itemType = 'audio';

    return {
      id: 'att-sb-' + timestamp,
      name: fileName,
      size: sizeInMB,
      type: itemType,
      url: publicUrl,
    };
  } catch (err) {
    console.error('Failed to upload media to Supabase:', err);
    throw err;
  }
}

// ==============================================================================
// 4. CHANNELS, GROUPS & CONVERSATIONS (MEMBERSHIP FILTERING)
// ==============================================================================

/**
 * Fetch conversations / groups that the current user belongs to
 * Uses RLS on Supabase: returns only conversations where user is in conversation_participants
 */
export async function fetchUserConversations(userId: string) {
  if (!isSupabaseConfigured) return [];

  // Query conversation_participants for current user
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      workspace_id,
      is_group,
      group_name,
      last_activity,
      conversation_participants (
        user_id
      )
    `)
    .order('last_activity', { ascending: false });

  if (error) {
    console.error('Error fetching user conversations:', error);
    return [];
  }

  return (data || []).map((c: any) => ({
    id: c.id,
    workspaceId: c.workspace_id,
    isGroup: c.is_group,
    groupName: c.group_name,
    participantIds: (c.conversation_participants || []).map((cp: any) => cp.user_id),
    lastActivity: c.last_activity,
    unreadCount: 0,
    isStarred: false,
  }));
}

/**
 * Create a new Direct Message or Group conversation in Supabase
 */
export async function createConversation(params: {
  workspaceId: string;
  isGroup: boolean;
  groupName?: string;
  participantIds: string[];
}) {
  if (!isSupabaseConfigured) return null;

  // 1. Insert conversation row
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .insert([
      {
        workspace_id: params.workspaceId,
        is_group: params.isGroup,
        group_name: params.groupName || null,
      },
    ])
    .select()
    .single();

  if (convError || !conv) {
    console.error('Error creating conversation:', convError);
    throw convError;
  }

  // 2. Insert participants
  const participantRows = params.participantIds.map((userId) => ({
    conversation_id: conv.id,
    user_id: userId,
  }));

  const { error: partError } = await supabase
    .from('conversation_participants')
    .insert(participantRows);

  if (partError) {
    console.error('Error adding conversation participants:', partError);
    throw partError;
  }

  return conv;
}

// ==============================================================================
// 5. MESSAGES & REALTIME SYNC
// ==============================================================================

/**
 * Fetch messages for a channel or DM/Group
 */
export async function fetchConversationMessages(
  conversationType: 'channel' | 'dm',
  conversationId: string,
  limit: number = 60
): Promise<DatabaseMessage[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_type', conversationType)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching messages from Supabase:', error);
    return [];
  }
  return data || [];
}

/**
 * Send a message to Supabase
 */
export async function sendMessageToSupabase(params: {
  workspaceId: string;
  conversationType: 'channel' | 'dm';
  conversationId: string;
  senderId: string;
  content: string;
  attachments?: any[];
  reactions?: Record<string, string[]>;
  encryptedPayload?: any;
  parentId?: string | null;
}): Promise<DatabaseMessage | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('messages')
    .insert([
      {
        workspace_id: params.workspaceId,
        conversation_type: params.conversationType,
        conversation_id: params.conversationId,
        sender_id: params.senderId,
        content: params.content,
        attachments: params.attachments || [],
        reactions: params.reactions || {},
        encrypted_payload: params.encryptedPayload || null,
        parent_id: params.parentId || null,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error sending message to Supabase:', error);
    throw error;
  }

  // Update conversation last_activity
  if (params.conversationType === 'dm') {
    await supabase
      .from('conversations')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', params.conversationId);
  }

  return data;
}

/**
 * Realtime subscription for conversation messages
 */
export function subscribeToConversationMessages(
  conversationId: string,
  onNewMessage: (msg: DatabaseMessage) => void,
  onUpdateMessage: (msg: DatabaseMessage) => void,
  onDeleteMessage?: (msgId: string) => void
): RealtimeChannel | null {
  if (!isSupabaseConfigured) return null;

  return supabase
    .channel(`conv_messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onNewMessage(payload.new as DatabaseMessage);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onUpdateMessage(payload.new as DatabaseMessage);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        if (onDeleteMessage && payload.old) {
          onDeleteMessage(payload.old.id);
        }
      }
    )
    .subscribe();
}
