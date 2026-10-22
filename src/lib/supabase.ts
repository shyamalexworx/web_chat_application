import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { generateLetterAvatar, resolveUserAvatar } from '../utils/avatar';
import type { ChatInvite } from '../types';
import { safeSetLocalStorage } from '../utils/imageCompressor';

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
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!EMAIL_REGEX.test(cleanEmail)) {
    throw new Error('Please enter a valid email address with a real domain (e.g. yourname@gmail.com).');
  }

  // Disposable / temporary email domain blocklist
  const DISPOSABLE_DOMAINS = [
    'tempmail.com', 'temp-mail.org', 'mailinator.com', '10minutemail.com',
    'guerrillamail.com', 'throwawaymail.com', 'yopmail.com', 'sharklasers.com',
    'fakemailgenerator.com', 'dispostable.com', 'getairmail.com', 'trashmail.com',
    'mytemp.email', 'mohmal.com', 'burnermail.io', 'generator.email'
  ];

  const domain = cleanEmail.split('@')[1] || '';
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    throw new Error('Disposable / temporary email addresses are not permitted. Please use a real email provider (e.g. your personal Gmail, Outlook, or corporate email).');
  }

  const cleanName = params.fullName.trim();
  const cleanUsername = params.username.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'member';
  const pwd = params.password || 'PulseChat@' + Math.random().toString(36).slice(2, 10);
  const avatarUrl = params.avatarUrl || generateLetterAvatar(cleanName);
  let authUser: any = null;
  let requiresVerification = false;

  // 1. Attempt Supabase Auth signup
  try {
    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}` : undefined;
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: pwd,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: cleanName,
          username: cleanUsername,
          avatar_url: avatarUrl,
        },
      },
    });

    if (error) {
      if (
        error.message?.toLowerCase().includes('already registered') ||
        error.message?.toLowerCase().includes('already exists')
      ) {
        // User already registered in Supabase Auth. Attempt auto-login if password was entered:
        if (params.password) {
          try {
            const signInRes = await supabaseSignIn(cleanEmail, params.password);
            if (signInRes?.user) {
              return {
                user: signInRes.user,
                alreadyExisted: true,
                message: `Welcome back, ${cleanName}! Signed in to your existing account.`,
              };
            }
          } catch {}
        }
        throw new Error('An account with this email already exists. Please sign in with your password, or use "Forgot password?" to reset it.');
      }
      throw error;
    }

    if (data?.user) {
      // In Supabase, if a user already exists and identities array is empty, it means existing account
      if (data.user.identities && data.user.identities.length === 0) {
        if (params.password) {
          try {
            const signInRes = await supabaseSignIn(cleanEmail, params.password);
            if (signInRes?.user) {
              return {
                user: signInRes.user,
                alreadyExisted: true,
                message: `Welcome back, ${cleanName}! Signed in to your existing account.`,
              };
            }
          } catch {}
        }
        throw new Error('An account with this email already exists. Please sign in with your password, or use "Forgot password?" to reset it.');
      }

      authUser = data.user;
      // If email confirmation is enabled in Supabase, session is null or email_confirmed_at is null
      if (!data.session || !data.user.email_confirmed_at) {
        requiresVerification = true;
      }
    }
  } catch (authErr: any) {
    throw authErr;
  }

  // 3. User ID
  const userId = authUser?.id || 'usr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);

  // 4. If email requires verification, DO NOT insert active online profile or return active session!
  if (requiresVerification) {
    // Save pending profile so trigger doesn't conflict
    try {
      await supabase.from('profiles').upsert({
        id: userId,
        username: cleanUsername,
        full_name: cleanName,
        email: cleanEmail,
        avatar_url: avatarUrl,
        role: 'member',
        is_online: false,
      }, { onConflict: 'id' });
    } catch {}

    return {
      user: null,
      requiresVerification: true,
      message: `A verification link has been sent to ${cleanEmail}. Please check your inbox and verify your email address before logging in.`,
    };
  }

  // 5. Active verified profile upsert
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

  // 1. Authenticate with Supabase Auth (Enforce real credentials & email confirmation)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: pwd,
  });

  if (authError) {
    if (authError.message?.toLowerCase().includes('email not confirmed')) {
      throw new Error('Your email address has not been verified yet. Please check your inbox (and spam folder) and click the verification link before logging in.');
    }
    if (authError.message?.toLowerCase().includes('invalid login credentials')) {
      throw new Error('Invalid email or password. Please verify your credentials or sign up.');
    }
    throw new Error(authError.message || 'Unable to sign in. Please check your credentials.');
  }

  const authUser = authData?.user;
  if (!authUser) {
    throw new Error('No account found with this email. Please sign up first.');
  }

  // Double check email verification
  if (!authUser.email_confirmed_at && !authData.session) {
    throw new Error('Your email address has not been verified yet. Please check your inbox and click the verification link before logging in.');
  }

  // 2. Look up or update profile
  let prof: any = null;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (data) {
      prof = data;
    }
  } catch (pErr) {
    console.warn('Profile search notice:', pErr);
  }

  const userId = authUser.id;
  const userName = prof?.full_name || authUser.user_metadata?.full_name || cleanEmail.split('@')[0];
  const userHandle = prof?.username || authUser.user_metadata?.username || cleanEmail.split('@')[0].replace(/[^a-z0-9]/g, '');
  const avatarUrl = resolveUserAvatar(prof?.avatar_url || authUser.user_metadata?.avatar_url, userName);

  // Mark as online in profiles
  try {
    await supabase.from('profiles').upsert({
      id: userId,
      username: userHandle,
      full_name: userName,
      email: cleanEmail,
      avatar_url: avatarUrl,
      role: prof?.role || 'member',
      is_online: true,
      last_seen: new Date().toISOString(),
    }, { onConflict: 'id' });
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

export async function supabaseSignInWithOAuth(provider: 'google' | 'apple') {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin,
      queryParams: provider === 'google' ? {
        prompt: 'select_account',
        access_type: 'offline',
      } : undefined,
    },
  });
  if (error) {
    throw error;
  }
  if (data?.url) {
    window.location.href = data.url;
  }
  return data;
}

/**
 * Delete a channel and its messages/members from Supabase permanently
 */
export async function deleteChannelFromSupabase(channelId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
  try {
    await supabase.from('messages').delete().eq('conversation_id', channelId);
    await supabase.from('chat_invites').delete().eq('channel_id', channelId);
    await supabase.from('channel_members').delete().eq('channel_id', channelId);
    const { error } = await supabase.from('channels').delete().eq('id', channelId);
    if (error) {
      console.warn('Supabase deleteChannel error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase deleteChannel exception:', err);
    return false;
  }
}

export async function supabaseSignOut(userId?: string) {
  if (!isSupabaseConfigured) return;
  if (userId) {
    await supabase.from('profiles').update({ is_online: false, last_seen: new Date().toISOString() }).eq('id', userId);
  }
  await supabase.auth.signOut();
}

/**
 * Send password reset email via Supabase Auth
 */
export async function supabaseResetPassword(email: string): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
    throw new Error('Please enter a valid email address with a real domain (e.g. yourname@gmail.com).');
  }

  if (!isSupabaseConfigured) {
    return {
      success: true,
      message: `Password reset link sent to ${cleanEmail}. Check your inbox.`,
    };
  }

  // 1. Verify user profile exists in database
  try {
    const { data: prof } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (!prof) {
      throw new Error('No account found with this email. Please check your spelling or sign up first.');
    }
  } catch (err: any) {
    if (err?.message && err.message.includes('No account found')) {
      throw err;
    }
  }

  // 2. Dispatch Supabase Auth reset email
  const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}` : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: redirectUrl,
  });

  if (error) {
    throw new Error(error.message || 'Unable to send password reset email. Please try again.');
  }

  return {
    success: true,
    message: `Password reset link sent to ${cleanEmail}. Please check your inbox or spam folder.`,
  };
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
    .map((ch: any) => {
      let customAvatar: string | undefined = undefined;
      try {
        customAvatar = localStorage.getItem('pulsechat_custom_channel_avatar_' + ch.id) || undefined;
      } catch (e) {}
      // Extract remote avatar and allowMemberEdits embedded in channel description if present
      let cleanDescription = ch.description || '';
      let remoteAvatar: string | undefined = undefined;
      const avatarMatch = cleanDescription.match(/<!--pulse_avatar:(.*?)-->/);
      if (avatarMatch) {
        remoteAvatar = avatarMatch[1];
        cleanDescription = cleanDescription.replace(/<!--pulse_avatar:.*?-->/, '').trim();
      }

      let remoteAllowEdits: boolean | undefined = undefined;
      const editsMatch = cleanDescription.match(/<!--pulse_allow_edits:(true|false)-->/);
      if (editsMatch) {
        remoteAllowEdits = editsMatch[1] === 'true';
        cleanDescription = cleanDescription.replace(/<!--pulse_allow_edits:.*?-->/, '').trim();
      }

      let localAllowEdits: boolean | undefined = undefined;
      try {
        const savedEdits = localStorage.getItem('pulsechat_channel_allow_edits_' + ch.id);
        if (savedEdits !== null) localAllowEdits = savedEdits === 'true';
      } catch (e) {}

      const resolvedAllowEdits = remoteAllowEdits !== undefined ? remoteAllowEdits : (localAllowEdits ?? false);
      try {
        safeSetLocalStorage('pulsechat_channel_allow_edits_' + ch.id, String(resolvedAllowEdits));
      } catch (e) {}

      const resolvedAvatar = remoteAvatar || customAvatar;
      if (resolvedAvatar) {
        try {
          safeSetLocalStorage('pulsechat_custom_channel_avatar_' + ch.id, resolvedAvatar);
        } catch (e) {}
      }

      // If local has custom avatar but Supabase doesn't, automatically sync it up
      if (customAvatar && !remoteAvatar && isSupabaseConfigured) {
        updateChannelInSupabase(ch.id, { avatar: customAvatar, description: cleanDescription }).catch(() => {});
      }

      return {
        id: ch.id,
        workspaceId: ch.workspace_id,
        name: ch.name,
        topic: ch.topic || '',
        description: cleanDescription,
        avatar: resolvedAvatar,
        allowMemberEdits: resolvedAllowEdits,
        isPrivate: Boolean(ch.is_private),
        memberIds: (ch.channel_members || []).map((m: any) => m.user_id),
        createdBy: ch.created_by || 'system',
        createdAt: ch.created_at || new Date().toISOString(),
        unreadCount: 0,
        isStarred: false,
      };
    });
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
  avatar?: string;
  isPrivate: boolean;
  createdBy: string;
  memberIds?: string[];
}) {
  if (!isSupabaseConfigured) return null;

  let desc = channel.description || '';
  if (channel.avatar) {
    desc = `${desc.replace(/<!--pulse_avatar:.*?-->/, '').trim()}<!--pulse_avatar:${channel.avatar}-->`;
  }

  const { data, error } = await supabase
    .from('channels')
    .upsert({
      id: channel.id,
      workspace_id: channel.workspaceId,
      name: channel.name,
      topic: channel.topic || '',
      description: desc,
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
    .order('last_activity', { ascending: false });

  if (error) {
    console.warn('Error fetching conversations from Supabase:', error);
    return [];
  }

  // Filter conversations where user is participant (1-on-1 DMs persist across workspaces)
  return (data || [])
    .filter((conv: any) => {
      const isParticipant = (conv.conversation_participants || []).some((p: any) => p.user_id === userId);
      if (!isParticipant) return false;
      return conv.workspace_id === workspaceId || !conv.is_group;
    })
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
  conversationId: string | string[]
) {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('messages')
    .select('*')
    .eq('conversation_type', conversationType);

  if (Array.isArray(conversationId)) {
    if (conversationId.length === 0) return [];
    if (conversationId.length === 1) {
      query = query.eq('conversation_id', conversationId[0]);
    } else {
      query = query.in('conversation_id', conversationId);
    }
  } else {
    query = query.eq('conversation_id', conversationId);
  }

  const { data, error } = await query.order('created_at', { ascending: true });

  if (error) {
    console.warn('Error fetching messages from Supabase:', error);
    return [];
  }

  return (data || []).map((m: any) => {
    const reactions = m.reactions && typeof m.reactions === 'object' ? m.reactions : {};
    const readBy = Array.isArray(reactions.__readBy) ? reactions.__readBy : [];
    const deliveredTo = Array.isArray(reactions.__deliveredTo) ? reactions.__deliveredTo : [];
    let deliveryStatus: 'sent' | 'delivered' | 'read' = 'sent';
    if (readBy.some((uid: string) => uid !== m.sender_id)) {
      deliveryStatus = 'read';
    } else if (deliveredTo.some((uid: string) => uid !== m.sender_id)) {
      deliveryStatus = 'delivered';
    }

    return {
      id: m.id,
      conversationType: m.conversation_type,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      content: m.content,
      timestamp: m.created_at,
      attachments: m.attachments || [],
      reactions,
      isPinned: Boolean(m.is_pinned),
      pinnedBy: reactions.__pinnedBy?.[0] || undefined,
      parentId: m.parent_id || undefined,
      encryptedPayload: m.encrypted_payload || undefined,
      isEncrypted: Boolean(m.encrypted_payload),
      editedAt: m.edited_at || undefined,
      deliveryStatus,
    };
  });
}

/**
 * Persist read receipts in Supabase
 */
export async function markMessagesAsReadInSupabase(messageIds: string[], readerId: string) {
  if (!isSupabaseConfigured || !messageIds.length || !readerId) return;
  for (const msgId of messageIds) {
    try {
      const { data: row } = await supabase.from('messages').select('reactions').eq('id', msgId).single();
      if (row) {
        const reactions = (row.reactions && typeof row.reactions === 'object') ? { ...row.reactions } : {};
        const readBy: string[] = Array.isArray(reactions.__readBy) ? [...reactions.__readBy] : [];
        if (!readBy.includes(readerId)) {
          reactions.__readBy = [...readBy, readerId];
          await supabase.from('messages').update({ reactions }).eq('id', msgId);
        }
      }
    } catch (err) {
      // Background receipt sync, ignore non-fatal errors
    }
  }
}

/**
 * Persist delivery receipts in Supabase
 */
export async function markMessagesAsDeliveredInSupabase(messageIds: string[], recipientId: string) {
  if (!isSupabaseConfigured || !messageIds.length || !recipientId) return;
  for (const msgId of messageIds) {
    try {
      const { data: row } = await supabase.from('messages').select('reactions').eq('id', msgId).single();
      if (row) {
        const reactions = (row.reactions && typeof row.reactions === 'object') ? { ...row.reactions } : {};
        const deliveredTo: string[] = Array.isArray(reactions.__deliveredTo) ? [...reactions.__deliveredTo] : [];
        if (!deliveredTo.includes(recipientId)) {
          reactions.__deliveredTo = [...deliveredTo, recipientId];
          await supabase.from('messages').update({ reactions }).eq('id', msgId);
        }
      }
    } catch (err) {
      // Background receipt sync, ignore non-fatal errors
    }
  }
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
 * Fetch workspaces from Supabase, filtering by user membership/ownership if userId provided
 */
export async function fetchWorkspacesFromSupabase(userId?: string) {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('workspaces')
      .select(`
        id,
        name,
        slug,
        icon,
        icon_bg,
        plan,
        created_by,
        created_at,
        workspace_members (
          user_id,
          role
        )
      `)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Error fetching workspaces from Supabase:', error);
      return [];
    }

    const list = data || [];
    // Strict isolation: only return workspaces where user is creator/owner or member
    const accessible = userId
      ? list.filter((w: any) => {
          if (w.created_by === userId) return true;
          const members = w.workspace_members || [];
          return members.some((m: any) => m.user_id === userId);
        })
      : list;

    return accessible.map((w: any) => {
      let customAvatar: string | undefined = undefined;
      try {
        customAvatar = localStorage.getItem('pulsechat_custom_workspace_avatar_' + w.id) || undefined;
      } catch (e) {}

      // If w.icon is a URL or data URL, it represents the custom workspace avatar
      const isImgAvatar = Boolean(w.icon && (w.icon.startsWith('http://') || w.icon.startsWith('https://') || w.icon.startsWith('data:image/') || w.icon.startsWith('avatar:')));
      const resolvedAvatar = isImgAvatar ? w.icon.replace(/^avatar:/, '') : customAvatar;

      if (resolvedAvatar) {
        try {
          safeSetLocalStorage('pulsechat_custom_workspace_avatar_' + w.id, resolvedAvatar);
        } catch (e) {}
      }

      // If local has avatar but Supabase doesn't, automatically sync it up
      if (customAvatar && !isImgAvatar && isSupabaseConfigured) {
        updateWorkspaceInSupabase(w.id, { avatar: customAvatar }).catch(() => {});
      }

      return {
        id: w.id,
        name: w.name,
        slug: w.slug,
        icon: isImgAvatar ? (w.name ? w.name[0].toUpperCase() : '⚡') : (w.icon || '⚡'),
        iconBg: w.icon_bg || '#4F8CFF',
        description: w.name + ' workspace',
        avatar: resolvedAvatar,
        ownerId: w.created_by || 'system',
        memberIds: (w.workspace_members || []).map((m: any) => m.user_id),
        membersCount: Math.max(1, (w.workspace_members || []).length),
        plan: w.plan || 'Pro',
        createdAt: w.created_at || new Date().toISOString(),
      };
    });
  } catch (err) {
    console.warn('fetchWorkspacesFromSupabase exception:', err);
    return [];
  }
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
  avatar?: string;
}) {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('workspaces')
    .upsert({
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      icon: ws.avatar || ws.icon || '⚡',
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
 * Delete workspace from Supabase and cascade delete its channels and messages
 */
export async function deleteWorkspaceFromSupabase(workspaceId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    await supabase.from('messages').delete().eq('workspace_id', workspaceId);
    await supabase.from('channels').delete().eq('workspace_id', workspaceId);
    await supabase.from('conversations').delete().eq('workspace_id', workspaceId);
    await supabase.from('workspace_members').delete().eq('workspace_id', workspaceId);
    const { error } = await supabase.from('workspaces').delete().eq('id', workspaceId);
    if (error) {
      console.warn('Supabase deleteWorkspace error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase deleteWorkspace notice:', err);
    return false;
  }
}



/**
 * Delete a conversation (DM or group chat) and its messages/participants permanently from Supabase
 */
export async function deleteConversationFromSupabase(conversationId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
  try {
    await supabase.from('messages').delete().eq('conversation_id', conversationId);
    await supabase.from('chat_invites').delete().eq('conversation_id', conversationId);
    await supabase.from('conversation_participants').delete().eq('conversation_id', conversationId);
    const { error } = await supabase.from('conversations').delete().eq('id', conversationId);
    if (error) {
      console.warn('Supabase deleteConversation error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase deleteConversation exception:', err);
    return false;
  }
}

/**
 * Update workspace in Supabase
 */
export async function updateWorkspaceInSupabase(
  workspaceId: string,
  updates: { name?: string; iconBg?: string; avatar?: string }
) {
  if (!isSupabaseConfigured) return;
  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.iconBg !== undefined) payload.icon_bg = updates.iconBg;
  if (updates.avatar !== undefined) {
    payload.icon = updates.avatar || (updates.name ? updates.name[0].toUpperCase() : '⚡');
  }
  await supabase.from('workspaces').update(payload).eq('id', workspaceId);
}

/**
 * Update channel in Supabase
 */
export async function updateChannelInSupabase(
  channelId: string,
  updates: {
    name?: string;
    topic?: string;
    description?: string;
    avatar?: string;
    allowMemberEdits?: boolean;
    memberIds?: string[];
  }
) {
  if (!isSupabaseConfigured) return;
  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.topic !== undefined) payload.topic = updates.topic;
  if (updates.description !== undefined || updates.avatar !== undefined || updates.allowMemberEdits !== undefined) {
    let rawDesc = updates.description;
    let existingAvatar: string | undefined = undefined;
    let existingAllowEdits: boolean | undefined = undefined;

    try {
      const { data: currentCh } = await supabase.from('channels').select('description').eq('id', channelId).single();
      const currentRaw = currentCh?.description || '';
      if (rawDesc === undefined) {
        rawDesc = currentRaw;
      }
      const avMatch = currentRaw.match(/<!--pulse_avatar:(.*?)-->/);
      if (avMatch) existingAvatar = avMatch[1];
      const edMatch = currentRaw.match(/<!--pulse_allow_edits:(true|false)-->/);
      if (edMatch) existingAllowEdits = edMatch[1] === 'true';
    } catch {
      if (rawDesc === undefined) rawDesc = '';
    }

    let cleanDesc = (rawDesc || '').replace(/<!--pulse_avatar:.*?-->/, '').replace(/<!--pulse_allow_edits:.*?-->/, '').trim();

    const finalAvatar = updates.avatar !== undefined ? updates.avatar : existingAvatar;
    if (finalAvatar) {
      cleanDesc += `<!--pulse_avatar:${finalAvatar}-->`;
    }

    const finalAllowEdits = updates.allowMemberEdits !== undefined ? updates.allowMemberEdits : existingAllowEdits;
    if (finalAllowEdits) {
      cleanDesc += `<!--pulse_allow_edits:true-->`;
    }

    payload.description = cleanDesc;
  }
  if (Object.keys(payload).length > 0) {
    await supabase.from('channels').update(payload).eq('id', channelId);
  }
  if (updates.memberIds && updates.memberIds.length > 0) {
    const rows = updates.memberIds.map((uid) => ({
      channel_id: channelId,
      user_id: uid,
      role: 'member',
    }));
    await supabase.from('channel_members').upsert(rows, { onConflict: 'channel_id,user_id' });
  }
}

/**
 * Resolve user profile from Supabase by email or username
 */
export async function resolveUserByEmailOrUsername(
  identifier: string
): Promise<{ id: string; name: string; username: string; email: string } | null> {
  if (!isSupabaseConfigured) return null;
  const clean = identifier.trim().toLowerCase();
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, username, email')
      .or(`email.ilike.${clean},username.ilike.${clean}`)
      .maybeSingle();
    if (data) {
      return {
        id: data.id,
        name: data.full_name || data.username,
        username: data.username,
        email: data.email || clean,
      };
    }
  } catch (err) {
    console.warn('resolveUserByEmailOrUsername notice:', err);
  }
  return null;
}

/**
 * Fetch chat invitations for a user (sent or received)
 */
export async function fetchInvitesFromSupabase(userId: string, userEmail?: string): Promise<ChatInvite[]> {
  if (!isSupabaseConfigured) return [];
  const inviteMap = new Map<string, ChatInvite>();

  // 1. Fetch from chat_invites table
  try {
    let orQuery = `receiver_id.eq.${userId},sender_id.eq.${userId}`;
    if (userEmail) {
      const clean = userEmail.trim().toLowerCase();
      orQuery += `,receiver_id.eq.${clean},sender_id.eq.${clean}`;
    }

    const { data } = await supabase
      .from('chat_invites')
      .select('*')
      .or(orQuery)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      data.forEach((inv: any) => {
        inviteMap.set(inv.id, {
          id: inv.id,
          workspaceId: inv.workspace_id,
          senderId: inv.sender_id,
          receiverId: inv.receiver_id,
          conversationId: inv.conversation_id,
          channelId: inv.channel_id,
          inviteType: inv.invite_type || 'dm',
          status: inv.status || 'pending',
          createdAt: inv.created_at,
        });
      });
    }
  } catch {}

  // 2. Cross-user fallback: Fetch from messages table where conversation_id is inv_<userId> or inv_<userEmail>
  try {
    const targetConvIds = ['inv_' + userId];
    if (userEmail) {
      targetConvIds.push('inv_' + userEmail.trim().toLowerCase());
    }

    const { data: msgInvites } = await supabase
      .from('messages')
      .select('*')
      .in('conversation_id', targetConvIds)
      .order('created_at', { ascending: false });

    if (msgInvites && msgInvites.length > 0) {
      msgInvites.forEach((m: any) => {
        let invData: any = null;
        if (m.content?.startsWith('[PULSE_INVITE]:')) {
          try {
            invData = JSON.parse(m.content.slice('[PULSE_INVITE]:'.length));
          } catch {}
        } else if (m.attachments?.[0]?.invite) {
          invData = m.attachments[0].invite;
        }

        if (invData && invData.id) {
          if (!inviteMap.has(invData.id)) {
            inviteMap.set(invData.id, {
              id: invData.id,
              workspaceId: invData.workspaceId || invData.workspace_id,
              senderId: invData.senderId || invData.sender_id,
              receiverId: invData.receiverId || invData.receiver_id,
              conversationId: invData.conversationId || invData.conversation_id,
              channelId: invData.channelId || invData.channel_id,
              inviteType: invData.inviteType || invData.invite_type || 'dm',
              status: invData.status || 'pending',
              createdAt: invData.createdAt || m.created_at,
            });
          }
        }
      });
    }
  } catch {}

  return Array.from(inviteMap.values());
}

/**
 * Save chat invitation to Supabase (with dual-storage fallback into messages)
 */
export async function saveInviteToSupabase(invite: ChatInvite) {
  if (!isSupabaseConfigured) return null;

  // 1. Attempt to save to chat_invites table
  try {
    await supabase
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
      }, { onConflict: 'id' });
  } catch (err) {
    console.warn('Notice saving invite to chat_invites table:', err);
  }

  // 2. Reliable cross-user fallback: Save to messages table with [PULSE_INVITE]
  // This table has 100% open RLS and triggers real-time INSERT events to all clients immediately!
  try {
    const inviteConvId = 'inv_' + invite.receiverId;
    const { data } = await supabase.from('messages').upsert({
      id: 'msg-inv-' + invite.id,
      workspace_id: invite.workspaceId || 'default',
      conversation_type: 'dm',
      conversation_id: inviteConvId,
      sender_id: invite.senderId,
      content: '[PULSE_INVITE]:' + JSON.stringify(invite),
      attachments: [{ type: 'invite', invite }],
      is_pinned: false,
    }, { onConflict: 'id' }).select().maybeSingle();

    if (invite.receiverEmail && invite.receiverEmail.trim().toLowerCase() !== invite.receiverId.toLowerCase()) {
      await supabase.from('messages').upsert({
        id: 'msg-inv-em-' + invite.id,
        workspace_id: invite.workspaceId || 'default',
        conversation_type: 'dm',
        conversation_id: 'inv_' + invite.receiverEmail.trim().toLowerCase(),
        sender_id: invite.senderId,
        content: '[PULSE_INVITE]:' + JSON.stringify(invite),
        attachments: [{ type: 'invite', invite }],
        is_pinned: false,
      }, { onConflict: 'id' });
    }

    return data;
  } catch (msgErr) {
    console.warn('Notice saving fallback invite to messages:', msgErr);
    return null;
  }
}

/**
 * Update invite status in Supabase (accepted, declined)
 */
export async function updateInviteStatusInSupabase(inviteId: string, status: 'accepted' | 'declined') {
  if (!isSupabaseConfigured) return;
  // 1. Update in chat_invites
  try {
    await supabase
      .from('chat_invites')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', inviteId);
  } catch {}

  // 2. Clean up from messages
  try {
    await supabase
      .from('messages')
      .delete()
      .in('id', ['msg-inv-' + inviteId, 'msg-inv-em-' + inviteId]);
  } catch {}
}


