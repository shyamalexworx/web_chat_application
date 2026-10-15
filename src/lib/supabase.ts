import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { generateLetterAvatar, resolveUserAvatar } from '../utils/avatar';
import type { ChatInvite } from '../types';

// ==============================================================================
// 1. CONFIGURATION & CLIENT INITIALIZATION
// ==============================================================================

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  let localUrl = '';
  let localKey = '';
  try {
    localUrl = (localStorage.getItem('pulsechat_supabase_url') || '').trim();
    localKey = (localStorage.getItem('pulsechat_supabase_anon_key') || '').trim();
  } catch (e) {
    // localStorage might be unavailable
  }

  const url = envUrl || localUrl;
  const anonKey = envKey || localKey;

  return { url, anonKey };
}

export function checkIsSupabaseConfigured(url: string, anonKey: string): boolean {
  return Boolean(
    url &&
    anonKey &&
    url.startsWith('https://') &&
    !url.includes('placeholder') &&
    !url.includes('your-project') &&
    anonKey.length > 20
  );
}

const initialCreds = getSupabaseCredentials();
export let isSupabaseConfigured = checkIsSupabaseConfigured(initialCreds.url, initialCreds.anonKey);

function buildClient(url: string, key: string): SupabaseClient {
  if (checkIsSupabaseConfigured(url, key)) {
    return createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return createClient('https://placeholder.supabase.co', 'placeholder-key', {
    auth: { persistSession: false },
  });
}

export let supabase: SupabaseClient = buildClient(initialCreds.url, initialCreds.anonKey);

/**
 * Update Supabase credentials dynamically (saves to localStorage and re-initializes client)
 */
export function saveSupabaseCredentials(url: string, anonKey: string): boolean {
  try {
    localStorage.setItem('pulsechat_supabase_url', url.trim());
    localStorage.setItem('pulsechat_supabase_anon_key', anonKey.trim());
    supabase = buildClient(url.trim(), anonKey.trim());
    isSupabaseConfigured = checkIsSupabaseConfigured(url.trim(), anonKey.trim());
    window.dispatchEvent(new CustomEvent('pulsechat_supabase_config_changed'));
    return isSupabaseConfigured;
  } catch (e) {
    console.error('Failed to save Supabase credentials:', e);
    return false;
  }
}

/**
 * Clear stored credentials
 */
export function clearSupabaseCredentials() {
  try {
    localStorage.removeItem('pulsechat_supabase_url');
    localStorage.removeItem('pulsechat_supabase_anon_key');
    const { url, anonKey } = getSupabaseCredentials();
    supabase = buildClient(url, anonKey);
    isSupabaseConfigured = checkIsSupabaseConfigured(url, anonKey);
    window.dispatchEvent(new CustomEvent('pulsechat_supabase_config_changed'));
  } catch (e) {
    console.error('Failed to clear Supabase credentials:', e);
  }
}

/**
 * Test Supabase connection against database tables and storage bucket
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  tablesFound?: boolean;
  storageFound?: boolean;
}> {
  const creds = getSupabaseCredentials();
  if (!checkIsSupabaseConfigured(creds.url, creds.anonKey)) {
    return {
      success: false,
      message: 'Supabase URL or Anon Key is missing or invalid. Please check your credentials.',
    };
  }

  try {
    // 1. Test database query (profiles)
    const { error: dbError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    if (dbError && dbError.code !== 'PGRST116') {
      return {
        success: false,
        message: `Database error: ${dbError.message}. Make sure you ran supabase_schema.sql in the SQL Editor.`,
      };
    }

    // 2. Test storage bucket (chat-media)
    let storageFound = false;
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      storageFound = Boolean(buckets?.some((b) => b.id === 'chat-media'));
    } catch {
      storageFound = false;
    }

    return {
      success: true,
      message: 'Successfully connected to Supabase Database!',
      tablesFound: true,
      storageFound,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Connection test failed: ${err.message || 'Network error'}`,
    };
  }
}

// ==============================================================================
// 2. AUTHENTICATION & SESSIONS
// ==============================================================================

export async function supabaseSignUp(params: {
  email: string;
  password?: string;
  fullName: string;
  username: string;
  avatarUrl?: string;
}) {
  if (!isSupabaseConfigured) return null;

  const cleanEmail = params.email.trim().toLowerCase();
  const cleanName = params.fullName.trim();
  const cleanUsername = params.username.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'member';
  const pwd = params.password || 'PulseChat@' + Math.random().toString(36).slice(2, 10);
  const avatarUrl = params.avatarUrl || generateLetterAvatar(cleanName);
  let authUser: any = null;

  // 1. Verify if user email already exists in profiles
  try {
    const { data: existingProf } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingProf) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }
  } catch (err: any) {
    if (err.message && err.message.includes('already exists')) {
      throw err;
    }
  }

  // 2. Attempt Supabase Auth signup
  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: pwd,
      options: {
        data: {
          full_name: cleanName,
          username: cleanUsername,
          avatar_url: avatarUrl,
        },
      },
    });
    if (!error && data?.user) {
      authUser = data.user;
    } else if (error && error.message?.toLowerCase().includes('already registered')) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }
  } catch (authErr: any) {
    if (authErr?.message?.includes('already exists') || authErr?.message?.toLowerCase().includes('already registered')) {
      throw authErr;
    }
    console.warn('Supabase auth.signUp notice:', authErr?.message);
  }

  // 3. User ID
  const userId = authUser?.id || 'usr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);

  // 4. Upsert user into public.profiles table (Fresh start: no demo workspaces or demo channels)
  try {
    await supabase.from('profiles').upsert({
      id: userId,
      username: cleanUsername,
      full_name: cleanName,
      email: cleanEmail,
      avatar_url: avatarUrl,
      role: 'member',
      is_online: true,
    }, { onConflict: 'id' });
  } catch (profErr) {
    console.warn('Profiles upsert notice:', profErr);
  }

  // 5. Return user object so client state logs in immediately
  return {
    user: {
      id: userId,
      email: cleanEmail,
      user_metadata: {
        full_name: cleanName,
        username: cleanUsername,
        avatar_url: avatarUrl,
      },
    },
    session: null,
  };
}

export async function supabaseSignIn(email: string, password?: string) {
  if (!isSupabaseConfigured) return null;

  const cleanEmail = email.trim().toLowerCase();
  const pwd = password || 'PulseChat@2026';

  // 1. Look up existing profile in public.profiles by email
  let prof: any = null;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (data) {
      prof = data;
    }
  } catch (pErr) {
    console.warn('Profile search notice:', pErr);
  }

  // 2. Also check Supabase Auth password sign in if available
  let authUser: any = null;
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: pwd,
    });
    if (!authError && authData?.user) {
      authUser = authData.user;
    }
  } catch (err: any) {
    // Auth notice
  }

  // 3. STRICT CHECK: If user does not exist in profiles and not in auth, REJECT!
  if (!prof && !authUser) {
    throw new Error('No account found with this email. Please sign up first.');
  }

  const userId = prof?.id || authUser?.id;
  const userName = prof?.full_name || authUser?.user_metadata?.full_name || cleanEmail.split('@')[0];
  const userHandle = prof?.username || authUser?.user_metadata?.username || cleanEmail.split('@')[0].replace(/[^a-z0-9]/g, '');
  const avatarUrl = resolveUserAvatar(prof?.avatar_url || authUser?.user_metadata?.avatar_url, userName);

  // Mark as online in profiles
  try {
    await supabase.from('profiles').update({ is_online: true, last_seen: new Date().toISOString() }).eq('id', userId);
  } catch (e) {}

  return {
    user: {
      id: userId,
      email: cleanEmail,
      user_metadata: {
        full_name: userName,
        username: userHandle,
        avatar_url: avatarUrl,
      },
    },
    session: null,
  } as any;
}

export async function supabaseSignOut(userId?: string) {
  if (!isSupabaseConfigured) return;
  if (userId) {
    await supabase.from('profiles').update({ is_online: false, last_seen: new Date().toISOString() }).eq('id', userId);
  }
  await supabase.auth.signOut();
}

export async function supabaseGetCurrentUser() {
  if (!isSupabaseConfigured) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ==============================================================================
// 3. STORAGE UPLOAD: PHOTOS, VIDEOS, VOICE AUDIO & DOCUMENTS
// ==============================================================================

/**
 * Upload any chat media file (photo, video, voice note, document) to Supabase Storage
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
      console.warn('Supabase storage upload error:', uploadError);
      throw uploadError;
    }

    // Get permanent public URL
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
    console.warn('Failed to upload media to Supabase:', err);
    throw err;
  }
}

// ==============================================================================
// 4. DATABASE SYNC: PROFILES, WORKSPACES, CHANNELS, CONVERSATIONS, MESSAGES
// ==============================================================================

/**
 * Fetch all user profiles from Supabase
 */
export async function fetchProfilesFromSupabase() {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('Error fetching profiles from Supabase:', error);
    return [];
  }
  return (data || []).map((p: any) => ({
    ...p,
    avatar_url: resolveUserAvatar(p.avatar_url, p.full_name || p.username),
  }));
}

/**
 * Fetch accessible channels for a user (public channels OR private channels user is member of)
 */
export async function fetchChannelsFromSupabase(workspaceId: string, userId: string) {
  if (!isSupabaseConfigured) return [];

  // Query channels in workspace
  const { data, error } = await supabase
    .from('channels')
    .select(`
      id,
      workspace_id,
      name,
      topic,
      description,
      is_private,
      created_by,
      created_at,
      channel_members (
        user_id
      )
    `)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.warn('Error fetching channels from Supabase:', error);
    return [];
  }

  // Filter channels accessible to user (public OR user is member)
  return (data || [])
    .filter((ch: any) => !ch.is_private || (ch.channel_members || []).some((m: any) => m.user_id === userId))
    .map((ch: any) => ({
      id: ch.id,
      workspaceId: ch.workspace_id,
      name: ch.name,
      topic: ch.topic || '',
      description: ch.description || '',
      isPrivate: Boolean(ch.is_private),
      memberIds: (ch.channel_members || []).map((m: any) => m.user_id),
      createdBy: ch.created_by || 'system',
      createdAt: ch.created_at || new Date().toISOString(),
      unreadCount: 0,
      isStarred: false,
    }));
}

/**
 * Save channel to Supabase
 */
export async function saveChannelToSupabase(channel: {
  id: string;
  workspaceId: string;
  name: string;
  topic?: string;
  description?: string;
  isPrivate: boolean;
  createdBy: string;
  memberIds?: string[];
}) {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('channels')
    .upsert({
      id: channel.id,
      workspace_id: channel.workspaceId,
      name: channel.name,
      topic: channel.topic || '',
      description: channel.description || '',
      is_private: channel.isPrivate,
      created_by: channel.createdBy,
    })
    .select()
    .single();

  if (error) {
    console.warn('Error saving channel to Supabase:', error);
    return null;
  }

  // Add members
  if (channel.memberIds && channel.memberIds.length > 0) {
    const memberRows = channel.memberIds.map((uid) => ({
      channel_id: channel.id,
      user_id: uid,
      role: 'member',
    }));
    await supabase.from('channel_members').upsert(memberRows);
  }

  return data;
}

/**
 * Fetch conversations (DMs & groups) where user is participant
 */
export async function fetchConversationsFromSupabase(workspaceId: string, userId: string) {
  if (!isSupabaseConfigured) return [];

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
    .eq('workspace_id', workspaceId)
    .order('last_activity', { ascending: false });

  if (error) {
    console.warn('Error fetching conversations from Supabase:', error);
    return [];
  }

  // Filter conversations where user is participant
  return (data || [])
    .filter((conv: any) => (conv.conversation_participants || []).some((p: any) => p.user_id === userId))
    .map((conv: any) => ({
      id: conv.id,
      workspaceId: conv.workspace_id,
      isGroup: Boolean(conv.is_group),
      groupName: conv.group_name || undefined,
      participantIds: (conv.conversation_participants || []).map((p: any) => p.user_id),
      unreadCount: 0,
      isStarred: false,
      lastActivity: conv.last_activity || new Date().toISOString(),
    }));
}

/**
 * Save conversation to Supabase
 */
export async function saveConversationToSupabase(conv: {
  id: string;
  workspaceId: string;
  isGroup: boolean;
  groupName?: string;
  participantIds: string[];
  createdBy: string;
}) {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('conversations')
    .upsert({
      id: conv.id,
      workspace_id: conv.workspaceId,
      is_group: conv.isGroup,
      group_name: conv.groupName || null,
      created_by: conv.createdBy,
      last_activity: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.warn('Error saving conversation to Supabase:', error);
    return null;
  }

  if (conv.participantIds && conv.participantIds.length > 0) {
    const partRows = conv.participantIds.map((uid) => ({
      conversation_id: conv.id,
      user_id: uid,
    }));
    await supabase.from('conversation_participants').upsert(partRows);
  }

  return data;
}

/**
 * Fetch messages for a conversation/channel from Supabase
 */
export async function fetchMessagesFromSupabase(
  conversationType: 'channel' | 'dm',
  conversationId: string
) {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_type', conversationType)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('Error fetching messages from Supabase:', error);
    return [];
  }

  return (data || []).map((m: any) => ({
    id: m.id,
    conversationType: m.conversation_type,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    content: m.content,
    timestamp: m.created_at,
    attachments: m.attachments || [],
    reactions: m.reactions || {},
    isPinned: Boolean(m.is_pinned),
    parentId: m.parent_id || undefined,
    encryptedPayload: m.encrypted_payload || undefined,
    isEncrypted: Boolean(m.encrypted_payload),
  }));
}

/**
 * Save message to Supabase
 */
export async function saveMessageToSupabase(msg: {
  id: string;
  workspaceId: string;
  conversationType: 'channel' | 'dm';
  conversationId: string;
  senderId: string;
  content: string;
  attachments?: any[];
  reactions?: Record<string, string[]>;
  encryptedPayload?: any;
  parentId?: string;
}) {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('messages')
    .upsert({
      id: msg.id,
      workspace_id: msg.workspaceId,
      conversation_type: msg.conversationType,
      conversation_id: msg.conversationId,
      sender_id: msg.senderId,
      content: msg.content,
      attachments: msg.attachments || [],
      reactions: msg.reactions || {},
      encrypted_payload: msg.encryptedPayload || null,
      parent_id: msg.parentId || null,
    })
    .select()
    .single();

  if (error) {
    console.warn('Error saving message to Supabase:', error);
    return null;
  }

  // Update conversation last_activity
  if (msg.conversationType === 'dm') {
    await supabase
      .from('conversations')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', msg.conversationId);
  }

  return data;
}

/**
 * Delete message from Supabase
 */
export async function deleteMessageFromSupabase(messageId: string) {
  if (!isSupabaseConfigured) return;
  await supabase.from('messages').delete().eq('id', messageId);
}

/**
 * Update message in Supabase (reactions, pin status, content)
 */
export async function updateMessageInSupabase(
  messageId: string,
  updates: {
    reactions?: Record<string, string[]>;
    isPinned?: boolean;
    content?: string;
  }
) {
  if (!isSupabaseConfigured) return null;
  const payload: any = { updated_at: new Date().toISOString() };
  if (updates.reactions !== undefined) payload.reactions = updates.reactions;
  if (updates.isPinned !== undefined) payload.is_pinned = updates.isPinned;
  if (updates.content !== undefined) payload.content = updates.content;

  const { data, error } = await supabase
    .from('messages')
    .update(payload)
    .eq('id', messageId)
    .select()
    .maybeSingle();

  if (error) {
    console.warn('Error updating message in Supabase:', error);
  }
  return data;
}

/**
 * Update user profile in Supabase
 */
export async function updateProfileInSupabase(
  userId: string,
  updates: {
    name?: string;
    avatar?: string;
    title?: string;
    statusText?: string;
    statusEmoji?: string;
  }
) {
  if (!isSupabaseConfigured) return null;
  const payload: any = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) payload.full_name = updates.name;
  if (updates.avatar !== undefined) payload.avatar_url = updates.avatar;
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.statusText !== undefined) payload.status_text = updates.statusText;
  if (updates.statusEmoji !== undefined) payload.status_emoji = updates.statusEmoji;

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select()
    .maybeSingle();

  if (error) {
    console.warn('Error updating profile in Supabase:', error);
  }
  return data;
}

/**
 * Fetch workspaces from Supabase
 */
export async function fetchWorkspacesFromSupabase() {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('Error fetching workspaces from Supabase:', error);
    return [];
  }

  return (data || []).map((w: any) => ({
    id: w.id,
    name: w.name,
    slug: w.slug,
    icon: w.icon || '⚡',
    iconBg: w.icon_bg || '#4F8CFF',
    description: w.name + ' workspace',
    ownerId: w.created_by || 'system',
    membersCount: 1,
    plan: w.plan || 'Pro',
    createdAt: w.created_at || new Date().toISOString(),
  }));
}

/**
 * Save new workspace to Supabase and register creator as owner in workspace_members
 */
export async function saveWorkspaceToSupabase(ws: {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  iconBg?: string;
  plan?: string;
  createdBy: string;
}) {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('workspaces')
    .upsert({
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      icon: ws.icon || '⚡',
      icon_bg: ws.iconBg || '#4F8CFF',
      plan: ws.plan || 'Enterprise',
      created_by: ws.createdBy,
    })
    .select()
    .single();

  if (error) {
    console.warn('Error saving workspace to Supabase:', error);
    return null;
  }

  // Register creator as owner in workspace_members
  try {
    await supabase.from('workspace_members').upsert({
      workspace_id: ws.id,
      user_id: ws.createdBy,
      role: 'owner',
    }, { onConflict: 'workspace_id,user_id' });
  } catch (wmErr) {
    console.warn('Error adding workspace owner:', wmErr);
  }

  return data;
}

/**
 * Update workspace in Supabase
 */
export async function updateWorkspaceInSupabase(
  workspaceId: string,
  updates: { name?: string; iconBg?: string }
) {
  if (!isSupabaseConfigured) return;
  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.iconBg !== undefined) payload.icon_bg = updates.iconBg;
  await supabase.from('workspaces').update(payload).eq('id', workspaceId);
}

/**
 * Update channel in Supabase
 */
export async function updateChannelInSupabase(
  channelId: string,
  updates: { name?: string; topic?: string; description?: string }
) {
  if (!isSupabaseConfigured) return;
  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.topic !== undefined) payload.topic = updates.topic;
  if (updates.description !== undefined) payload.description = updates.description;
  await supabase.from('channels').update(payload).eq('id', channelId);
}

/**
 * Fetch chat invitations for a user (sent or received)
 */
export async function fetchInvitesFromSupabase(userId: string): Promise<ChatInvite[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('chat_invites')
      .select('*')
      .or(`receiver_id.eq.${userId},sender_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      // Table may not exist yet if user hasn't run latest SQL
      return [];
    }

    return (data || []).map((inv: any) => ({
      id: inv.id,
      workspaceId: inv.workspace_id,
      senderId: inv.sender_id,
      receiverId: inv.receiver_id,
      conversationId: inv.conversation_id,
      channelId: inv.channel_id,
      inviteType: inv.invite_type || 'dm',
      status: inv.status || 'pending',
      createdAt: inv.created_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Save chat invitation to Supabase
 */
export async function saveInviteToSupabase(invite: ChatInvite) {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('chat_invites')
      .upsert({
        id: invite.id,
        workspace_id: invite.workspaceId || null,
        sender_id: invite.senderId,
        receiver_id: invite.receiverId,
        conversation_id: invite.conversationId || null,
        channel_id: invite.channelId || null,
        invite_type: invite.inviteType,
        status: invite.status,
      })
      .select()
      .maybeSingle();

    if (error) {
      console.warn('Notice saving invite to Supabase:', error.message);
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Update invite status in Supabase (accepted, declined)
 */
export async function updateInviteStatusInSupabase(inviteId: string, status: 'accepted' | 'declined') {
  if (!isSupabaseConfigured) return;
  try {
    await supabase
      .from('chat_invites')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', inviteId);
  } catch (e) {
    console.warn('Notice updating invite status:', e);
  }
}


