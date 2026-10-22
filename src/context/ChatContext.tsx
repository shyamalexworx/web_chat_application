import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type {
  User,
  Workspace,
  Channel,
  DirectMessageConversation,
  Message,
  NotificationItem,
  ToastItem,
  HuddleState,
  ActiveView,
  Attachment,
  ChatInvite,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_WORKSPACES,
  INITIAL_CHANNELS,
  INITIAL_DMS,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS,
} from '../data/initialData';
import { soundFX } from '../utils/audio';
import { translateText, getTranslation } from '../utils/translation';
import { encryptMessage } from '../utils/crypto';
import { sanitizeInput, rateLimiter } from '../utils/security';
import { generateLetterAvatar, resolveUserAvatar } from '../utils/avatar';
import { safeSetLocalStorage, cleanLocalStorageQuota } from '../utils/imageCompressor';
import {
  isSupabaseConfigured,
  supabase,
  supabaseSignUp,
  supabaseSignIn,
  supabaseSignOut,
  fetchProfilesFromSupabase,
  fetchWorkspacesFromSupabase,
  saveWorkspaceToSupabase,
  updateWorkspaceInSupabase,
  fetchChannelsFromSupabase,
  saveChannelToSupabase,
  updateChannelInSupabase,
  fetchConversationsFromSupabase,
  saveConversationToSupabase,
  fetchMessagesFromSupabase,
  saveMessageToSupabase,
  updateMessageInSupabase,
  deleteMessageFromSupabase,
  deleteWorkspaceFromSupabase,
  deleteChannelFromSupabase,
  deleteConversationFromSupabase,
  updateProfileInSupabase,
  fetchInvitesFromSupabase,
  saveInviteToSupabase,
  updateInviteStatusInSupabase,
  resolveUserByEmailOrUsername,
  markMessagesAsReadInSupabase,
  markMessagesAsDeliveredInSupabase,
} from '../lib/supabase';

const STORAGE_KEY_PREFIX = 'pulsechat_v6_fresh_';

export const DELETED_CHANNELS_KEY = 'pulsechat_deleted_channel_ids';
export const DELETED_DMS_KEY = 'pulsechat_deleted_dm_ids';
export const DELETED_WORKSPACES_KEY = 'pulsechat_deleted_ws_ids';

export const getDeletedIds = (key: string): Set<string> => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
};

export const getStarredSet = (key: string): Set<string> => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
};

export const saveStarredSet = (key: string, set: Set<string>) => {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('Failed to save starred set:', e);
  }
};

export const recordDeletedEntity = (type: 'channel' | 'dm' | 'workspace', id: string) => {
  const key =
    type === 'channel'
      ? DELETED_CHANNELS_KEY
      : type === 'dm'
      ? DELETED_DMS_KEY
      : DELETED_WORKSPACES_KEY;
  try {
    const set = getDeletedIds(key);
    set.add(id);
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('Failed to record deleted entity:', e);
  }
};

export const unrecordDeletedEntity = (type: 'channel' | 'dm' | 'workspace', id: string) => {
  const key =
    type === 'channel'
      ? DELETED_CHANNELS_KEY
      : type === 'dm'
      ? DELETED_DMS_KEY
      : DELETED_WORKSPACES_KEY;
  try {
    const set = getDeletedIds(key);
    if (set.has(id)) {
      set.delete(id);
      localStorage.setItem(key, JSON.stringify(Array.from(set)));
    }
  } catch (e) {
    console.warn('Failed to unrecord deleted entity:', e);
  }
};

export const getCanonicalDMId = (userIdA: string, userIdB: string): string => {
  const sorted = [userIdA, userIdB].sort();
  return `dm_${sorted[0]}_${sorted[1]}`;
};

const GUEST_FALLBACK_USER: User = {
  id: 'guest',
  name: 'Team Member',
  username: 'member',
  email: 'member@pulsechat.io',
  avatar: generateLetterAvatar('Team Member'),
  role: 'owner',
  title: 'Workspace Member',
  isOnline: true,
  joinedDate: 'Today',
};

interface ChatContextType {
  // Auth & Profile
  currentUser: User;
  setCurrentUser: (user: User) => void;
  switchUser: (userId: string) => void;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<boolean> | boolean;
  socialLogin: (provider: 'google' | 'apple', email: string, name?: string, avatarUrl?: string) => Promise<boolean>;
  register: (name: string, email: string, username: string, password?: string, avatarUrl?: string) => Promise<boolean | { requiresVerification?: boolean; message?: string; success?: boolean; error?: string }> | boolean | { requiresVerification?: boolean; message?: string; success?: boolean; error?: string };
  logout: () => void;
  updateCurrentUserProfile: (updates: Partial<User>) => void;
  users: User[];

  // Chat Invitations (Slack style)
  invites: ChatInvite[];
  sendChatInvite: (receiverId: string) => Promise<boolean>;
  acceptInvite: (inviteId: string) => Promise<void>;
  declineInvite: (inviteId: string) => Promise<void>;
  isInviteChannelMembersOpen: boolean;
  setIsInviteChannelMembersOpen: (open: boolean) => void;
  inviteUsersToChannel: (channelId: string, userIds: string[], customEmail?: string) => Promise<boolean>;

  // Themes (Dark, Light, System)
  theme: 'dark' | 'light' | 'system';
  setTheme: (theme: 'dark' | 'light' | 'system') => void;

  // Supabase Cloud State
  isSupabaseConfigured: boolean;
  isSupabaseConnected: boolean;

  // Workspaces
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  setActiveWorkspaceId: (id: string) => void;
  createWorkspace: (name: string, description: string, iconBg?: string) => Workspace;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  deleteWorkspace: (id: string) => Promise<void> | void;

  // Navigation & Channels
  channels: Channel[];
  dms: DirectMessageConversation[];
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  createChannel: (name: string, topic: string, description: string, isPrivate: boolean, initialMemberIds?: string[]) => Channel;
  toggleStarChannel: (channelId: string) => void;
  toggleStarDM: (dmId: string) => void;
  createOrOpenDM: (participantIds: string[], groupName?: string) => string;
  updateChannelDetails: (channelId: string, updates: Partial<Channel>) => void;
  deleteChannel: (channelId: string) => Promise<void> | void;
  deleteDM: (dmId: string) => Promise<void> | void;
  inviteToDMByEmail: (email: string) => Promise<string | null>;

  // User Blocking (WhatsApp style)
  blockedUserIds: string[];
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  isUserBlocked: (userId: string) => boolean;

  // Channel Blocking & Muting
  blockedChannelIds: string[];
  blockChannel: (channelId: string) => void;
  unblockChannel: (channelId: string) => void;
  isChannelBlocked: (channelId: string) => boolean;

  // Workspace Blocking
  blockedWorkspaceIds: string[];
  blockWorkspace: (workspaceId: string) => void;
  unblockWorkspace: (workspaceId: string) => void;
  isWorkspaceBlocked: (workspaceId: string) => boolean;

  // Sidebar Collapse (Mac-style Genie animation to workspace button)
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;

  // Messages & Threads
  messages: Message[];
  activeConversationMessages: Message[];
  sendMessage: (content: string, attachments?: Attachment[]) => void;
  editMessage: (messageId: string, newContent: string) => void;
  deleteMessage: (messageId: string, mode?: 'me' | 'everyone') => void;
  toggleReaction: (messageId: string, emoji: string) => void;
  togglePinMessage: (messageId: string) => void;
  isMessagePinnedByMe: (message: Message) => boolean;
  
  // Threads
  activeThreadMessage: Message | null;
  setActiveThreadMessageId: (messageId: string | null) => void;
  threadReplies: Message[];
  sendThreadReply: (parentMessageId: string, content: string) => void;

  // Typing & Presence
  typingUsers: User[];
  setSelfTyping: (isTyping: boolean) => void;

  // Google Meet (replaces huddle)
  isGoogleMeetOpen: boolean;
  setIsGoogleMeetOpen: (open: boolean) => void;
  startGoogleMeet: () => void;
  huddle: HuddleState;
  toggleHuddle: (channelId?: string) => void;
  toggleHuddleMute: () => void;
  toggleHuddleScreenShare: () => void;
  leaveHuddle: () => void;

  // Translation
  isTranslationOpen: boolean;
  setIsTranslationOpen: (open: boolean) => void;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  autoTranslateEnabled: boolean;
  setAutoTranslateEnabled: (enabled: boolean) => void;
  translateActiveConversation: (lang: string) => void;
  translateSingleMessage: (messageId: string, lang: string) => void;
  restoreOriginalSingleMessage: (messageId: string) => void;
  resetTranslations: () => void;
  t: (key: string) => string;

  // AI Assistant Copilot
  isAIAssistantOpen: boolean;
  setIsAIAssistantOpen: (open: boolean) => void;
  toggleAIAssistant: () => void;

  // Notifications (Realtime)
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => void;
  removeNotification: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearAllNotifications: () => void;
  triggerLiveNotification: (title?: string, body?: string) => void;

  // Right Info Panel
  isRightPanelOpen: boolean;
  setIsRightPanelOpen: (open: boolean) => void;
  rightPanelTab: 'details' | 'members' | 'pinned' | 'files' | 'activity';
  setRightPanelTab: (tab: 'details' | 'members' | 'pinned' | 'files' | 'activity') => void;

  // Modals
  isCreateChannelOpen: boolean;
  setIsCreateChannelOpen: (open: boolean) => void;
  isBrowseChannelsOpen: boolean;
  setIsBrowseChannelsOpen: (open: boolean) => void;
  isNewDMOpen: boolean;
  setIsNewDMOpen: (open: boolean) => void;
  isCreateWorkspaceOpen: boolean;
  setIsCreateWorkspaceOpen: (open: boolean) => void;
  isWorkspaceSettingsOpen: boolean;
  setIsWorkspaceSettingsOpen: (open: boolean) => void;
  isUserProfileOpen: boolean;
  setIsUserProfileOpen: (open: boolean) => void;
  isGlobalSearchOpen: boolean;
  setIsGlobalSearchOpen: (open: boolean) => void;
  isKeyboardShortcutsOpen: boolean;
  setIsKeyboardShortcutsOpen: (open: boolean) => void;
  isSecurityModalOpen: boolean;
  setIsSecurityModalOpen: (open: boolean) => void;

  // Search Filter state
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Toasts
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastItem['type']) => void;
  removeToast: (id: string) => void;

  // Reset
  resetToDemoData: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Prune any legacy oversized items to prevent QuotaExceededError
  cleanLocalStorageQuota();

  // Load state or default
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('pulsechat_auth') === 'true';
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    try {
      return localStorage.getItem('pulsechat_current_user') || '';
    } catch {
      return '';
    }
  });

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'users');
      const parsed = saved ? JSON.parse(saved) : INITIAL_USERS;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'workspaces');
      const parsed = saved ? JSON.parse(saved) : INITIAL_WORKSPACES;
      const deleted = getDeletedIds(DELETED_WORKSPACES_KEY);
      const list = Array.isArray(parsed) ? parsed : INITIAL_WORKSPACES;
      return list
        .filter((w: any) => w && w.id && !deleted.has(w.id))
        .map((w: any) => ({
          ...w,
          avatar: localStorage.getItem('pulsechat_custom_workspace_avatar_' + w.id) || w.avatar,
        }));
    } catch {
      return INITIAL_WORKSPACES;
    }
  });

  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_PREFIX + 'active_workspace') || '';
    } catch {
      return '';
    }
  });

  const [channels, setChannels] = useState<Channel[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'channels');
      const parsed = saved ? JSON.parse(saved) : INITIAL_CHANNELS;
      const deleted = getDeletedIds(DELETED_CHANNELS_KEY);
      const uid = localStorage.getItem('pulsechat_current_user') || 'default';
      const starredChannels = getStarredSet('pulsechat_starred_channels_' + uid);
      const list = Array.isArray(parsed) ? parsed : INITIAL_CHANNELS;
      const seen = new Set<string>();
      const valid: Channel[] = [];
      for (const c of list) {
        if (c && c.id && !deleted.has(c.id) && !seen.has(c.id)) {
          seen.add(c.id);
          valid.push({
            ...c,
            name: c.name || 'channel',
            memberIds: Array.isArray(c.memberIds) ? c.memberIds : [],
            isStarred: starredChannels.has(c.id) || Boolean(c.isStarred),
            avatar: localStorage.getItem('pulsechat_custom_channel_avatar_' + c.id) || c.avatar,
          });
        }
      }
      return valid;
    } catch {
      return INITIAL_CHANNELS;
    }
  });

  const [dms, setDms] = useState<DirectMessageConversation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'dms');
      const parsed = saved ? JSON.parse(saved) : INITIAL_DMS;
      const deleted = getDeletedIds(DELETED_DMS_KEY);
      const uid = localStorage.getItem('pulsechat_current_user') || 'default';
      const starredDMs = getStarredSet('pulsechat_starred_dms_' + uid);
      const list = Array.isArray(parsed) ? parsed : INITIAL_DMS;
      const seen = new Set<string>();
      const valid: DirectMessageConversation[] = [];
      for (const d of list) {
        if (d && d.id && !deleted.has(d.id) && !seen.has(d.id)) {
          seen.add(d.id);
          valid.push({
            ...d,
            participantIds: Array.isArray(d.participantIds) ? d.participantIds : [],
            isStarred: starredDMs.has(d.id) || Boolean(d.isStarred),
          });
        }
      }
      return valid;
    } catch {
      return INITIAL_DMS;
    }
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'messages');
      const parsed = saved ? JSON.parse(saved) : INITIAL_MESSAGES;
      return Array.isArray(parsed) ? parsed : INITIAL_MESSAGES;
    } catch {
      return INITIAL_MESSAGES;
    }
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'notifications');
      const parsed = saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
      return Array.isArray(parsed) ? parsed : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  const [invites, setInvites] = useState<ChatInvite[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'invites');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [activeView, setActiveView] = useState<ActiveView>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'active_view');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && typeof parsed === 'object' && parsed.type && parsed.id) {
        return parsed;
      }
      return { type: 'channel', id: '' };
    } catch {
      return { type: 'channel', id: '' };
    }
  });

  // Mac-style collapsible channel sidebar (responsive: collapsed by default on mobile)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  const [activeThreadMessageId, setActiveThreadMessageId] = useState<string | null>(null);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);

  // User-specific pinned message IDs (Private to each user)
  const [pinnedMessageIds, setPinnedMessageIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`pulsechat_pins_${currentUserId || 'default'}`);
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? new Set<string>(parsed) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`pulsechat_pins_${currentUserId || 'default'}`);
      const parsed = saved ? JSON.parse(saved) : null;
      setPinnedMessageIds(Array.isArray(parsed) ? new Set<string>(parsed) : new Set<string>());
    } catch {
      setPinnedMessageIds(new Set<string>());
    }
  }, [currentUserId]);

  // Live Realtime Channel & State Sync Refs (Eliminates stale closure bugs)
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const localBroadcastRef = useRef<BroadcastChannel | null>(null);
  const usersRef = useRef<User[]>(users);
  const channelsRef = useRef<Channel[]>(channels);
  const dmsRef = useRef<DirectMessageConversation[]>(dms);
  const workspacesRef = useRef<Workspace[]>(workspaces);
  const activeViewRef = useRef<ActiveView>(activeView);
  const currentUserIdRef = useRef<string>(currentUserId);

  // Blocked Users State (WhatsApp style)
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>(() => {
    try {
      const uid = localStorage.getItem('pulsechat_current_user') || 'default';
      const saved = localStorage.getItem('pulsechat_blocked_users_' + uid);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const blockedUserIdsRef = useRef<string[]>(blockedUserIds);
  useEffect(() => {
    blockedUserIdsRef.current = blockedUserIds;
    const uid = currentUserId || 'default';
    try {
      localStorage.setItem('pulsechat_blocked_users_' + uid, JSON.stringify(blockedUserIds));
    } catch (e) {}
  }, [blockedUserIds, currentUserId]);

  // Blocked Channels State
  const [blockedChannelIds, setBlockedChannelIds] = useState<string[]>(() => {
    try {
      const uid = localStorage.getItem('pulsechat_current_user') || 'default';
      const saved = localStorage.getItem('pulsechat_blocked_channels_' + uid);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const blockedChannelIdsRef = useRef<string[]>(blockedChannelIds);
  useEffect(() => {
    blockedChannelIdsRef.current = blockedChannelIds;
    const uid = currentUserId || 'default';
    try {
      localStorage.setItem('pulsechat_blocked_channels_' + uid, JSON.stringify(blockedChannelIds));
    } catch (e) {}
  }, [blockedChannelIds, currentUserId]);

  // Blocked Workspaces State
  const [blockedWorkspaceIds, setBlockedWorkspaceIds] = useState<string[]>(() => {
    try {
      const uid = localStorage.getItem('pulsechat_current_user') || 'default';
      const saved = localStorage.getItem('pulsechat_blocked_workspaces_' + uid);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const blockedWorkspaceIdsRef = useRef<string[]>(blockedWorkspaceIds);
  useEffect(() => {
    blockedWorkspaceIdsRef.current = blockedWorkspaceIds;
    const uid = currentUserId || 'default';
    try {
      localStorage.setItem('pulsechat_blocked_workspaces_' + uid, JSON.stringify(blockedWorkspaceIds));
    } catch (e) {}
  }, [blockedWorkspaceIds, currentUserId]);

  useEffect(() => { usersRef.current = users; }, [users]);
  useEffect(() => { channelsRef.current = channels; }, [channels]);
  useEffect(() => { dmsRef.current = dms; }, [dms]);
  useEffect(() => { workspacesRef.current = workspaces; }, [workspaces]);
  useEffect(() => { activeViewRef.current = activeView; }, [activeView]);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);

  const broadcastDeliveryStatus = useCallback((conversationId: string, messageId: string) => {
    const myId = currentUserIdRef.current;
    if (!myId || !messageId) return;
    const payload = { id: messageId, conversationId, recipientId: myId };
    try {
      localBroadcastRef.current?.postMessage({
        type: 'message_delivered',
        payload,
      });
      if (isSupabaseConfigured && realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'message_delivered',
          payload,
        }).catch(() => {});
      }
      markMessagesAsDeliveredInSupabase([messageId], myId).catch(() => {});
    } catch (e) {}
  }, []);

  const broadcastReadStatus = useCallback((conversationId: string, messageIds?: string[]) => {
    const myId = currentUserIdRef.current;
    if (!myId || !conversationId) return;

    let canonicalId: string | undefined = undefined;
    const currentDMs = dmsRef.current;
    const activeDM = currentDMs.find((d) => d.id === conversationId);
    if (activeDM && !activeDM.isGroup && activeDM.participantIds?.length === 2) {
      canonicalId = getCanonicalDMId(activeDM.participantIds[0], activeDM.participantIds[1]);
    }

    const payload = {
      conversationId,
      canonicalId,
      readerId: myId,
      messageIds,
    };

    try {
      localBroadcastRef.current?.postMessage({
        type: 'conversation_read',
        payload,
      });
      if (isSupabaseConfigured && realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'conversation_read',
          payload,
        }).catch(() => {});
      }
      if (messageIds && messageIds.length > 0) {
        markMessagesAsReadInSupabase(messageIds, myId).catch(() => {});
      }
    } catch (e) {}
  }, []);

  // Translation State
  const [isTranslationOpen, setIsTranslationOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(false);

  // AI Assistant State
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);

  // Google Meet State
  const [isGoogleMeetOpen, setIsGoogleMeetOpen] = useState(false);

  // Modals state
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isBrowseChannelsOpen, setIsBrowseChannelsOpen] = useState(false);
  const [isNewDMOpen, setIsNewDMOpen] = useState(false);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [isWorkspaceSettingsOpen, setIsWorkspaceSettingsOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isInviteChannelMembersOpen, setIsInviteChannelMembersOpen] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(isSupabaseConfigured);

  // Theme Management (Dark, Light, System)
  const [theme, setThemeState] = useState<'dark' | 'light' | 'system'>(() => {
    return (localStorage.getItem('pulsechat_theme') as 'dark' | 'light' | 'system') || 'dark';
  });

  const setTheme = useCallback((newTheme: 'dark' | 'light' | 'system') => {
    setThemeState(newTheme);
    localStorage.setItem('pulsechat_theme', newTheme);
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      let effectiveTheme = theme;
      if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        effectiveTheme = prefersDark ? 'dark' : 'light';
      }

      if (effectiveTheme === 'light') {
        root.classList.add('light');
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      } else {
        root.classList.add('dark');
        root.classList.remove('light');
        root.setAttribute('data-theme', 'dark');
      }
    };

    applyTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);


  // Listen to dynamic Supabase config changes
  useEffect(() => {
    const handleConfigChange = () => {
      setIsSupabaseConnected(isSupabaseConfigured);
    };
    window.addEventListener('pulsechat_supabase_config_changed', handleConfigChange);
    return () => window.removeEventListener('pulsechat_supabase_config_changed', handleConfigChange);
  }, []);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Right info panel
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<'details' | 'members' | 'pinned' | 'files' | 'activity'>('details');

  // Huddle state (legacy wrapper)
  const [huddle, setHuddle] = useState<HuddleState>({
    isActive: false,
    participants: [],
    isMuted: false,
    isScreenSharing: false,
  });

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Synchronize to localStorage safely
  useEffect(() => {
    safeSetLocalStorage(STORAGE_KEY_PREFIX + 'users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    safeSetLocalStorage(STORAGE_KEY_PREFIX + 'workspaces', JSON.stringify(workspaces));
  }, [workspaces]);

  useEffect(() => {
    safeSetLocalStorage(STORAGE_KEY_PREFIX + 'channels', JSON.stringify(channels));
  }, [channels]);

  useEffect(() => {
    safeSetLocalStorage(STORAGE_KEY_PREFIX + 'dms', JSON.stringify(dms));
  }, [dms]);

  useEffect(() => {
    safeSetLocalStorage(STORAGE_KEY_PREFIX + 'messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    safeSetLocalStorage(STORAGE_KEY_PREFIX + 'notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    safeSetLocalStorage(STORAGE_KEY_PREFIX + 'invites', JSON.stringify(invites));
  }, [invites]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'active_workspace', activeWorkspaceId);
  }, [activeWorkspaceId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'active_view', JSON.stringify(activeView));
  }, [activeView]);

  useEffect(() => {
    localStorage.setItem('pulsechat_current_user', currentUserId);
  }, [currentUserId]);

  // Ensure all existing messages have cryptographic AES-256-GCM payload attached
  useEffect(() => {
    let isMounted = true;
    const sealMessages = async () => {
      let needsUpdate = false;
      const sealed = await Promise.all(
        messages.map(async (m) => {
          if (!m.encryptedPayload) {
            needsUpdate = true;
            const payload = await encryptMessage(m.content, m.conversationId);
            return { ...m, isEncrypted: true, encryptedPayload: payload };
          }
          return m;
        })
      );
      if (needsUpdate && isMounted) {
        setMessages(sealed);
      }
    };
    sealMessages();
    return () => { isMounted = false; };
  }, []);

  const addToast = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    setToasts((prev) => {
      if (prev.some((t) => t.message === message)) {
        return prev;
      }
      const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== id));
      }, 3800);
      return [...prev, { id, message, type }];
    });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Current User helper with permanent custom avatar and profile preservation
  const currentUser: User = React.useMemo(() => {
    const baseUser = users.find((u) => u.id === currentUserId) || users[0] || GUEST_FALLBACK_USER;
    const uid = currentUserId || baseUser.id;
    let customAvatar: string | null = null;
    let customProfile: Partial<User> = {};

    try {
      if (uid) {
        customAvatar = localStorage.getItem(`pulsechat_custom_avatar_${uid}`);
        const savedProf = localStorage.getItem(`pulsechat_custom_profile_${uid}`);
        if (savedProf) customProfile = JSON.parse(savedProf);
      }
      if (!customAvatar && baseUser.email) {
        customAvatar = localStorage.getItem(`pulsechat_custom_avatar_${baseUser.email.toLowerCase()}`);
      }
    } catch {}

    const resolvedAvatar = customAvatar || customProfile.avatar || baseUser.avatar || generateLetterAvatar(baseUser.name);

    return {
      ...baseUser,
      ...customProfile,
      avatar: resolvedAvatar,
    };
  }, [users, currentUserId]);

  const setCurrentUser = useCallback((user: User) => {
    setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
    setCurrentUserId(user.id);
  }, []);

  const switchUser = useCallback((userId: string) => {
    setCurrentUserId(userId);
    const targetUser = users.find((u) => u.id === userId);
    if (targetUser) {
      addToast(`Switched view to ${targetUser.name}`, 'info');
    }
  }, [users, addToast]);

  const updateCurrentUserProfile = useCallback((updates: Partial<User>) => {
    // 1. Permanently store in dedicated localStorage keys safely
    try {
      if (updates.avatar) {
        if (currentUserId) safeSetLocalStorage(`pulsechat_custom_avatar_${currentUserId}`, updates.avatar);
        if (currentUser.email) safeSetLocalStorage(`pulsechat_custom_avatar_${currentUser.email.toLowerCase()}`, updates.avatar);
      }
      if (currentUserId) {
        const existing = localStorage.getItem(`pulsechat_custom_profile_${currentUserId}`);
        const parsed = existing ? JSON.parse(existing) : {};
        safeSetLocalStorage(`pulsechat_custom_profile_${currentUserId}`, JSON.stringify({ ...parsed, ...updates }));
      }
    } catch (e) {
      console.warn('Failed saving custom profile to storage:', e);
    }

    setUsers((prev) => {
      const exists = prev.some((u) => u.id === currentUserId);
      if (exists) {
        return prev.map((u) => (u.id === currentUserId ? { ...u, ...updates } : u));
      } else {
        const updatedMe = { ...currentUser, ...updates, id: currentUserId || currentUser.id };
        return [...prev, updatedMe];
      }
    });

    // 2. Broadcast avatar & profile update across local tabs
    try {
      if (localBroadcastRef.current && currentUserId) {
        localBroadcastRef.current.postMessage({
          type: 'profile_updated',
          payload: { userId: currentUserId, updates },
        });
      }
    } catch (e) {}

    // 3. Broadcast across Supabase clients in real-time
    try {
      if (realtimeChannelRef.current && currentUserId) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'profile_updated',
          payload: { userId: currentUserId, updates },
        });
      }
    } catch (e) {}

    if (isSupabaseConfigured && currentUserId && currentUserId !== 'guest') {
      updateProfileInSupabase(currentUserId, updates).catch((err) =>
        console.warn('Supabase profile update notice:', err)
      );
    }
    addToast('Profile updated successfully', 'success');
  }, [currentUserId, currentUser, addToast]);

  // Supabase Cloud Realtime Data Loader & Subscription
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isMounted = true;
    const syncFromSupabase = async () => {
      try {
        // 1. Session check
        const { data: { session } } = await supabase.auth.getSession();
        let uid = currentUserId;
        if (session?.user) {
          uid = session.user.id;
          if (isMounted) {
            setCurrentUserId(uid);
            setIsAuthenticated(true);
            localStorage.setItem('pulsechat_auth', 'true');
          }
        }

        // 2. Fetch Workspaces from Supabase (filtered strictly to this user's created/joined workspaces)
        const remoteWorkspaces = await fetchWorkspacesFromSupabase(uid);
        if (isMounted && remoteWorkspaces.length > 0) {
          const deletedWs = getDeletedIds(DELETED_WORKSPACES_KEY);
          const validWs = remoteWorkspaces.filter((w) => !deletedWs.has(w.id));
          if (validWs.length > 0) {
            setWorkspaces(validWs);
            if (!validWs.some((w) => w.id === activeWorkspaceId)) {
              setActiveWorkspaceIdState(validWs[0].id);
            }
          }
        }

        // 3. Fetch Profiles from Supabase (preserving user's permanent custom avatars)
        const remoteProfiles = await fetchProfilesFromSupabase();
        if (isMounted && remoteProfiles.length > 0) {
          const mappedUsers: User[] = remoteProfiles.map((p) => {
            let savedAvatar: string | null = null;
            let savedProfileUpdates: Partial<User> = {};
            try {
              savedAvatar = localStorage.getItem(`pulsechat_custom_avatar_${p.id}`);
              if (!savedAvatar && p.email) {
                savedAvatar = localStorage.getItem(`pulsechat_custom_avatar_${p.email.toLowerCase()}`);
              }
              const sp = localStorage.getItem(`pulsechat_custom_profile_${p.id}`);
              if (sp) savedProfileUpdates = JSON.parse(sp);
            } catch {}

            const finalAvatar = savedAvatar || resolveUserAvatar(p.avatar_url, p.full_name || p.username);

            return {
              id: p.id,
              name: savedProfileUpdates.name || p.full_name || p.username,
              username: p.username,
              email: p.email || p.username + '@pulsechat.io',
              role: savedProfileUpdates.role || p.role || 'member',
              title: savedProfileUpdates.title || p.title || 'Product Engineer',
              isOnline: Boolean(p.is_online),
              joinedDate: 'Joined recently',
              ...savedProfileUpdates,
              avatar: finalAvatar,
            };
          });
          setUsers(mappedUsers);
        }

        // 4. Fetch Channels for workspace & user
        const remoteChannels = await fetchChannelsFromSupabase(activeWorkspaceId, uid);
        if (isMounted) {
          const deletedChannels = getDeletedIds(DELETED_CHANNELS_KEY);
          const starredChannels = getStarredSet('pulsechat_starred_channels_' + (uid || 'default'));
          const validChannels = remoteChannels
            .filter((c) => c && !deletedChannels.has(c.id))
            .map((c) => ({
              ...c,
              name: c.name || 'channel',
              memberIds: Array.isArray(c.memberIds) ? c.memberIds : [],
              isStarred: starredChannels.has(c.id) || Boolean(c.isStarred),
            }));
          setChannels((prev) => {
            const otherWs = prev.filter((c) => c && c.workspaceId !== activeWorkspaceId && !deletedChannels.has(c.id));
            return [...otherWs, ...validChannels];
          });
        }

        // 5. Fetch Conversations (DMs & Groups) and Chat Invites for user
        if (uid) {
          const remoteDMs = await fetchConversationsFromSupabase(activeWorkspaceId, uid);
          if (isMounted) {
            const deletedDMs = getDeletedIds(DELETED_DMS_KEY);
            const starredDMs = getStarredSet('pulsechat_starred_dms_' + (uid || 'default'));
            const validDMs = remoteDMs
              .filter((d) => d && !deletedDMs.has(d.id))
              .map((d) => ({
                ...d,
                participantIds: Array.isArray(d.participantIds) ? d.participantIds : [],
                isStarred: starredDMs.has(d.id) || Boolean(d.isStarred),
              }));
            setDms(validDMs);
          }

          const remoteInvites = await fetchInvitesFromSupabase(uid, currentUser.email);
          if (isMounted && remoteInvites.length > 0) {
            setInvites(remoteInvites);
            const pendingForMe = remoteInvites.filter(
              (inv) =>
                inv.status === 'pending' &&
                inv.senderId !== uid &&
                (inv.receiverId === uid ||
                  (currentUser.email && inv.receiverId.toLowerCase() === currentUser.email.toLowerCase()))
            );
            if (pendingForMe.length > 0) {
              setNotifications((prevNotifs) => {
                const existingNotifIds = new Set(prevNotifs.map((n) => n.id));
                const newNotifs: NotificationItem[] = [];
                for (const inv of pendingForMe) {
                  const notifId = 'notif-inv-' + inv.id;
                  if (!existingNotifIds.has(notifId)) {
                    const isChan = inv.inviteType === 'channel';
                    newNotifs.push({
                      id: notifId,
                      userId: uid,
                      title: isChan ? 'Channel invitation' : 'Chat invitation',
                      body: isChan
                        ? 'You have been invited to join a channel. Review and accept in notifications to join.'
                        : 'Review your invitations in the notification bell to accept and connect.',
                      type: 'invite',
                      timestamp: inv.createdAt || new Date().toISOString(),
                      isRead: false,
                      targetType: isChan ? 'channel' : 'dm',
                      targetId: inv.conversationId || inv.channelId || '',
                    });
                  }
                }
                return newNotifs.length > 0 ? [...newNotifs, ...prevNotifs] : prevNotifs;
              });
            }
          }
        }

        // 5. Fetch Messages for active view
        const remoteMsgs = await fetchMessagesFromSupabase(activeView.type, activeView.id);
        if (isMounted && remoteMsgs.length > 0) {
          setMessages((prev) => {
            const map = new Map(prev.map((m) => [m.id, m]));
            remoteMsgs.forEach((m) => map.set(m.id, m));
            return Array.from(map.values());
          });
        }
      } catch (err) {
        console.warn('Initial Supabase sync error:', err);
      }
    };

    syncFromSupabase();

    // Initialize cross-tab local broadcast channel
    let localBroadcast: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        localBroadcast = new BroadcastChannel('pulsechat_cross_tab_sync');
        localBroadcastRef.current = localBroadcast;
        localBroadcast.onmessage = (event) => {
          const { type, payload } = event.data || {};
          if (type === 'new_message' && payload) {
            handleIncomingMessage(payload);
          } else if (type === 'update_message' && payload) {
            handleUpdateMessage(payload);
          } else if (type === 'delete_message' && payload?.id) {
            handleDeleteMessage(payload.id);
          } else if (type === 'channel_deleted' && payload?.id) {
            recordDeletedEntity('channel', payload.id);
            setChannels((prev) => prev.filter((c) => c.id !== payload.id));
            setMessages((prev) => prev.filter((m) => !(m.conversationType === 'channel' && m.conversationId === payload.id)));
          } else if (type === 'dm_deleted' && payload?.id) {
            recordDeletedEntity('dm', payload.id);
            setDms((prev) => prev.filter((d) => d.id !== payload.id));
            setMessages((prev) => prev.filter((m) => !(m.conversationType === 'dm' && m.conversationId === payload.id)));
          } else if (type === 'workspace_deleted' && payload?.id) {
            recordDeletedEntity('workspace', payload.id);
            setWorkspaces((prev) => prev.filter((w) => w.id !== payload.id));
            setChannels((prev) => prev.filter((c) => c.workspaceId !== payload.id));
            setDms((prev) => prev.filter((d) => d.workspaceId !== payload.id));
          } else if (type === 'new_invite' && payload) {
            handleIncomingInvite(payload);
          } else if (type === 'member_joined_channel' && payload) {
            handleMemberJoinedChannel(payload);
          } else if (type === 'message_delivered' && payload?.id) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === payload.id && m.deliveryStatus === 'sent'
                  ? { ...m, deliveryStatus: 'delivered' }
                  : m
              )
            );
          } else if (type === 'conversation_delivered' && payload?.conversationId) {
            setMessages((prev) =>
              prev.map((m) =>
                (m.conversationId === payload.conversationId || (payload.canonicalId && m.conversationId === payload.canonicalId)) &&
                m.senderId === currentUserIdRef.current &&
                m.deliveryStatus === 'sent'
                  ? { ...m, deliveryStatus: 'delivered' }
                  : m
              )
            );
          } else if (type === 'message_read' && payload?.id) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === payload.id ? { ...m, deliveryStatus: 'read' as const } : m
              )
            );
          } else if (type === 'conversation_read' && payload?.conversationId) {
            setMessages((prev) =>
              prev.map((m) =>
                (m.conversationId === payload.conversationId ||
                  (payload.canonicalId && (m.conversationId === payload.canonicalId || payload.canonicalId.includes(m.conversationId))) ||
                  (payload.messageIds && payload.messageIds.includes(m.id)) ||
                  (payload.readerId && m.conversationId.includes(payload.readerId))) &&
                m.senderId === currentUserIdRef.current
                  ? { ...m, deliveryStatus: 'read' as const }
                  : m
              )
            );
          } else if (type === 'profile_updated' && payload?.userId) {
            setUsers((prev) =>
              prev.map((u) => (u.id === payload.userId ? { ...u, ...payload.updates } : u))
            );
          } else if (type === 'workspace_updated' && payload?.workspaceId) {
            const { workspaceId, updates } = payload;
            if (updates?.avatar !== undefined) {
              try {
                if (updates.avatar) {
                  safeSetLocalStorage('pulsechat_custom_workspace_avatar_' + workspaceId, updates.avatar);
                } else {
                  localStorage.removeItem('pulsechat_custom_workspace_avatar_' + workspaceId);
                }
              } catch (e) {}
            }
            setWorkspaces((prev) =>
              prev.map((w) => (w.id === workspaceId ? { ...w, ...updates } : w))
            );
          } else if (type === 'channel_updated' && payload?.channelId) {
            const { channelId, updates } = payload;
            if (updates?.avatar !== undefined) {
              try {
                if (updates.avatar) {
                  safeSetLocalStorage('pulsechat_custom_channel_avatar_' + channelId, updates.avatar);
                } else {
                  localStorage.removeItem('pulsechat_custom_channel_avatar_' + channelId);
                }
              } catch (e) {}
            }
            if (updates?.allowMemberEdits !== undefined) {
              try {
                safeSetLocalStorage('pulsechat_channel_allow_edits_' + channelId, String(updates.allowMemberEdits));
              } catch (e) {}
            }
            setChannels((prev) =>
              prev.map((c) => (c.id === channelId ? { ...c, ...updates } : c))
            );
          }
        };
      }
    } catch (e) {}

    // Unified incoming message handler
    const handleIncomingMessage = (incomingMsg: Message) => {
      if (!isMounted || !incomingMsg?.id) return;

      // WhatsApp Block check: drop incoming messages from blocked users
      if (incomingMsg.senderId && blockedUserIdsRef.current.includes(incomingMsg.senderId)) {
        return;
      }

      // Intercept and route fallback invites
      if (incomingMsg.content && typeof incomingMsg.content === 'string' && incomingMsg.content.startsWith('[PULSE_INVITE]:')) {
        try {
          const invObj = JSON.parse(incomingMsg.content.slice('[PULSE_INVITE]:'.length));
          const myId = currentUserIdRef.current;
          const myUser = usersRef.current.find((u) => u.id === myId) || currentUser;
          const myEmail = myUser?.email?.toLowerCase();
          const targetId = (invObj.receiverId || '').toLowerCase();
          const targetEmail = (invObj.receiverEmail || '').toLowerCase();

          const isForMe =
            (myId && targetId === myId.toLowerCase()) ||
            (myEmail && (targetId === myEmail || targetEmail === myEmail));

          if (isForMe) {
            handleIncomingInvite(invObj);
          }
        } catch (e) {
          console.error('Failed to parse PULSE_INVITE payload:', e);
        }
        return; // Never store fallback invites into regular chat messages
      }

      let msgToStore = { ...incomingMsg };

      // If it's a 1-on-1 DM, normalize to matching DM ID or canonical ID
      if (msgToStore.conversationType === 'dm' && currentUserIdRef.current) {
        const canonicalId = getCanonicalDMId(msgToStore.senderId, currentUserIdRef.current);
        const matchingDM = dmsRef.current.find(
          (d) =>
            !d.isGroup &&
            Array.isArray(d.participantIds) &&
            d.participantIds.includes(msgToStore.senderId) &&
            d.participantIds.includes(currentUserIdRef.current)
        );

        if (matchingDM) {
          msgToStore.conversationId = matchingDM.id;
        } else {
          msgToStore.conversationId = canonicalId;
          // Ensure DM conversation exists in state so recipient has it in their sidebar
          const newDMEntry: DirectMessageConversation = {
            id: canonicalId,
            workspaceId: activeWorkspaceId,
            participantIds: [currentUserIdRef.current, msgToStore.senderId],
            isGroup: false,
            unreadCount: 1,
            isStarred: false,
            lastActivity: msgToStore.timestamp || new Date().toISOString(),
            status: 'accepted',
          };
          setDms((prev) => [newDMEntry, ...prev.filter((d) => d.id !== canonicalId)]);
        }
      }

      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === msgToStore.id);
        if (idx !== -1) {
          return prev.map((m) => (m.id === msgToStore.id ? { ...m, ...msgToStore } : m));
        }
        if (msgToStore.parentId) {
          return prev
            .map((m) =>
              m.id === msgToStore.parentId
                ? {
                    ...m,
                    replyCount: (m.replyCount || 0) + 1,
                    lastReplyAt: msgToStore.timestamp,
                  }
                : m
            )
            .concat(msgToStore);
        }
        return [...prev, msgToStore];
      });

      // If sent by someone else, acknowledge receipt / read status and trigger notification
      if (msgToStore.senderId !== currentUserIdRef.current) {
        const currentActive = activeViewRef.current;
        const isViewing =
          currentActive?.id === msgToStore.conversationId ||
          (currentActive?.type === 'dm' &&
            dmsRef.current.some(
              (d) =>
                d.id === currentActive?.id &&
                !d.isGroup &&
                Array.isArray(d.participantIds) &&
                d.participantIds.includes(msgToStore.senderId)
            ));
        const isVisible = typeof document !== 'undefined' ? document.visibilityState === 'visible' : true;

        if (isViewing && isVisible) {
          msgToStore.deliveryStatus = 'read';
          broadcastReadStatus(msgToStore.conversationId, [msgToStore.id]);
        } else {
          msgToStore.deliveryStatus = 'delivered';
          broadcastDeliveryStatus(msgToStore.conversationId, msgToStore.id);
        }

        const isChanBlocked = msgToStore.conversationType === 'channel' && blockedChannelIdsRef.current.includes(msgToStore.conversationId);
        const latestChannels = channelsRef.current;
        const targetChan = msgToStore.conversationType === 'channel' ? latestChannels.find((c) => c.id === msgToStore.conversationId) : null;
        const isWsBlocked = targetChan ? blockedWorkspaceIdsRef.current.includes(targetChan.workspaceId) : false;

        if (!isChanBlocked && !isWsBlocked) {
          soundFX.playMessageReceived();

          const latestUsers = usersRef.current;
          const sender = latestUsers.find((u) => u.id === msgToStore.senderId);
          const senderName = sender ? sender.name : 'Team member';
          const isChannel = msgToStore.conversationType === 'channel';
          
          const notifTitle = isChannel
            ? `New message in #${targetChan?.name || 'channel'}`
            : `New message from ${senderName}`;
        const notifBody = isChannel
          ? `You got a message from ${senderName} in #${targetChan?.name || 'channel'}`
          : `You got a message from ${senderName}`;

        const liveNotif: NotificationItem = {
          id: 'notif-msg-' + msgToStore.id,
          userId: currentUserIdRef.current,
          title: notifTitle,
          body: notifBody,
          type: isChannel ? 'channel' : 'dm',
          timestamp: msgToStore.timestamp || new Date().toISOString(),
          isRead: false,
          targetType: msgToStore.conversationType,
          targetId: msgToStore.conversationId,
        };
        setNotifications((prev) => [liveNotif, ...prev.filter((n) => n.id !== liveNotif.id)]);
        addToast(notifTitle, 'info');

        // Browser desktop notification if permission granted
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(notifTitle, {
              body: notifBody,
              icon: sender?.avatar || '/favicon.ico',
            });
          } catch (e) {}
        }
        }
      }
    };

    const handleUpdateMessage = (update: { id: string; content?: string; reactions?: Record<string, string[]>; isPinned?: boolean; pinnedBy?: string; attachments?: any[]; editedAt?: string }) => {
      if (!isMounted || !update?.id) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === update.id
            ? {
                ...m,
                ...(update.content !== undefined ? { content: update.content } : {}),
                ...(update.reactions !== undefined ? { reactions: update.reactions } : {}),
                ...(update.isPinned !== undefined ? { isPinned: update.isPinned } : {}),
                pinnedBy: update.isPinned !== undefined
                  ? (update.isPinned ? (update.pinnedBy || update.reactions?.__pinnedBy?.[0] || m.pinnedBy) : undefined)
                  : m.pinnedBy,
                ...(update.attachments !== undefined ? { attachments: update.attachments } : {}),
                ...(update.editedAt !== undefined ? { editedAt: update.editedAt } : {}),
              }
            : m
        )
      );
    };

    const handleDeleteMessage = (messageId: string) => {
      if (!isMounted || !messageId) return;
      setMessages((prev) => prev.filter((m) => m.id !== messageId && m.parentId !== messageId));
    };

    const handleIncomingInvite = (rawInv: any) => {
      if (!isMounted || !rawInv) return;
      const inv: ChatInvite = {
        id: rawInv.id,
        workspaceId: rawInv.workspaceId || rawInv.workspace_id,
        senderId: rawInv.senderId || rawInv.sender_id,
        receiverId: rawInv.receiverId || rawInv.receiver_id,
        receiverEmail: rawInv.receiverEmail || rawInv.receiver_email,
        senderName: rawInv.senderName || rawInv.sender_name,
        channelName: rawInv.channelName || rawInv.channel_name,
        workspaceName: rawInv.workspaceName || rawInv.workspace_name,
        conversationId: rawInv.conversationId || rawInv.conversation_id,
        channelId: rawInv.channelId || rawInv.channel_id,
        inviteType: rawInv.inviteType || rawInv.invite_type || 'dm',
        status: rawInv.status || 'pending',
        createdAt: rawInv.createdAt || rawInv.created_at || new Date().toISOString(),
      };
      const myId = currentUserIdRef.current;
      const myUser = usersRef.current.find((u) => u.id === myId) || currentUser;
      const myEmail = myUser?.email?.toLowerCase();
      const targetId = (inv.receiverId || '').toLowerCase();
      const targetEmail = (inv.receiverEmail || '').toLowerCase();

      const isForMe =
        (myId && targetId === myId.toLowerCase()) ||
        (myEmail && (targetId === myEmail || targetEmail === myEmail));

      if (isForMe && inv.senderId !== myId) {
        setInvites((prev) => [inv, ...prev.filter((i) => i.id !== inv.id)]);
        soundFX.playMessageReceived();
        const latestUsers = usersRef.current;
        const latestChannels = channelsRef.current;
        const latestWorkspaces = workspacesRef.current;
        const sender = latestUsers.find((u) => u.id === inv.senderId);
        const senderName = inv.senderName || sender?.name || 'A team member';
        const isChan = inv.inviteType === 'channel';
        const targetChan = isChan ? latestChannels.find((c) => c.id === inv.channelId || c.id === inv.conversationId) : null;
        const targetWs = isChan ? latestWorkspaces.find((w) => w.id === inv.workspaceId) : null;
        const channelDisplayName = inv.channelName || targetChan?.name || 'channel';
        const wsDisplayName = inv.workspaceName || targetWs?.name || 'Team Workspace';

        const notifTitle = isChan
          ? `${senderName} invited you to join #${channelDisplayName}`
          : `${senderName} sent you a chat invite`;
        const notifBody = isChan
          ? `Workspace: ${wsDisplayName} • Channel: #${channelDisplayName}. Review and accept to join.`
          : 'Review your invitations in the notification bell to accept and connect.';
        const liveNotif: NotificationItem = {
          id: 'notif-inv-' + inv.id,
          userId: myId,
          title: notifTitle,
          body: notifBody,
          type: 'invite',
          timestamp: inv.createdAt || new Date().toISOString(),
          isRead: false,
          targetType: isChan ? 'channel' : 'dm',
          targetId: inv.conversationId || inv.channelId || '',
        };
        setNotifications((prev) => [liveNotif, ...prev.filter((n) => n.id !== liveNotif.id)]);
        addToast(notifTitle, 'info');

        // Browser desktop notification if permission granted
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(notifTitle, {
              body: notifBody,
              icon: sender?.avatar || '/favicon.ico',
            });
          } catch (e) {}
        }
        addToast(notifTitle, 'info');

        fetchConversationsFromSupabase(activeWorkspaceId, myId).then((remoteDMs) => {
          if (isMounted && remoteDMs.length > 0) setDms(remoteDMs);
        });
      }
    };

    const handleMemberJoinedChannel = (data: { channelId?: string; workspaceId?: string; userId?: string }) => {
      if (!isMounted || !data?.userId) return;
      if (data.channelId) {
        setChannels((prev) =>
          prev.map((c) =>
            c.id === data.channelId
              ? { ...c, memberIds: Array.from(new Set([...(c.memberIds || []), data.userId!])) }
              : c
          )
        );
      }
      if (data.workspaceId) {
        setWorkspaces((prev) =>
          prev.map((w) =>
            w.id === data.workspaceId
              ? { ...w, memberIds: Array.from(new Set([...(w.memberIds || []), data.userId!])) }
              : w
          )
        );
      }
    };

    // Realtime channel across messages, channels, conversations, profiles, chat_invites
    const channel = supabase
      .channel('pulsechat_live_realtime', {
        config: {
          broadcast: { self: false, ack: false },
        },
      })
      .on('broadcast', { event: 'new_message' }, (payload) => {
        const msg = payload?.payload as Message;
        if (msg) handleIncomingMessage(msg);
      })
      .on('broadcast', { event: 'update_message' }, (payload) => {
        const update = payload?.payload;
        if (update?.id) handleUpdateMessage(update);
      })
      .on('broadcast', { event: 'delete_message' }, (payload) => {
        const id = payload?.payload?.id;
        if (id) handleDeleteMessage(id);
      })
      .on('broadcast', { event: 'new_invite' }, (payload) => {
        const inv = payload?.payload;
        if (inv) handleIncomingInvite(inv);
      })
      .on('broadcast', { event: 'member_joined_channel' }, (payload) => {
        const data = payload?.payload;
        if (data) handleMemberJoinedChannel(data);
      })
      .on('broadcast', { event: 'message_delivered' }, (payload) => {
        const data = payload?.payload;
        if (data?.id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === data.id && m.deliveryStatus === 'sent'
                ? { ...m, deliveryStatus: 'delivered' }
                : m
            )
          );
        }
      })
      .on('broadcast', { event: 'conversation_delivered' }, (payload) => {
        const data = payload?.payload;
        if (data?.conversationId) {
          setMessages((prev) =>
            prev.map((m) =>
              (m.conversationId === data.conversationId || (data.canonicalId && m.conversationId === data.canonicalId)) &&
              m.senderId === currentUserIdRef.current &&
              m.deliveryStatus === 'sent'
                ? { ...m, deliveryStatus: 'delivered' }
                : m
            )
          );
        }
      })
      .on('broadcast', { event: 'message_read' }, (payload) => {
        const data = payload?.payload;
        if (data?.id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === data.id ? { ...m, deliveryStatus: 'read' as const } : m
            )
          );
        }
      })
      .on('broadcast', { event: 'conversation_read' }, (payload) => {
        const data = payload?.payload;
        if (data?.conversationId) {
          setMessages((prev) =>
            prev.map((m) =>
              (m.conversationId === data.conversationId ||
                (data.canonicalId && (m.conversationId === data.canonicalId || data.canonicalId.includes(m.conversationId))) ||
                (data.messageIds && data.messageIds.includes(m.id)) ||
                (data.readerId && m.conversationId.includes(data.readerId))) &&
              m.senderId === currentUserIdRef.current
                ? { ...m, deliveryStatus: 'read' as const }
                : m
            )
          );
        }
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new as any;
          if (!row?.id) return;
          const incomingMsg: Message = {
            id: row.id,
            conversationType: row.conversation_type,
            conversationId: row.conversation_id,
            senderId: row.sender_id,
            content: row.content,
            timestamp: row.created_at,
            attachments: row.attachments || [],
            reactions: row.reactions || {},
            isPinned: Boolean(row.is_pinned),
            parentId: row.parent_id || undefined,
            encryptedPayload: row.encrypted_payload || undefined,
            isEncrypted: Boolean(row.encrypted_payload),
          };
          handleIncomingMessage(incomingMsg);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new as any;
          if (row?.id) {
            handleUpdateMessage({
              id: row.id,
              content: row.content,
              isPinned: Boolean(row.is_pinned),
              pinnedBy: row.reactions?.__pinnedBy?.[0] || undefined,
              reactions: row.reactions || {},
              attachments: row.attachments || [],
              editedAt: row.edited_at,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.old as any;
          if (row?.id) {
            handleDeleteMessage(row.id);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channels' },
        async (payload) => {
          if (isMounted) {
            const oldId = (payload.old as any)?.id;
            if (payload.eventType === 'DELETE' && oldId) {
              recordDeletedEntity('channel', oldId);
              setChannels((prev) => prev.filter((c) => c.id !== oldId));
              setMessages((prev) => prev.filter((m) => !(m.conversationType === 'channel' && m.conversationId === oldId)));
              return;
            }
            const updated = await fetchChannelsFromSupabase(activeWorkspaceId, currentUserId);
            const deleted = getDeletedIds(DELETED_CHANNELS_KEY);
            const valid = updated
              .filter((c) => c && !deleted.has(c.id))
              .map((c) => ({
                ...c,
                name: c.name || 'channel',
                memberIds: Array.isArray(c.memberIds) ? c.memberIds : [],
              }));
            setChannels((prev) => {
              const otherWs = prev.filter((c) => c && c.workspaceId !== activeWorkspaceId && !deleted.has(c.id));
              return [...otherWs, ...valid];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        async (payload) => {
          if (isMounted) {
            const oldId = (payload.old as any)?.id;
            if (payload.eventType === 'DELETE' && oldId) {
              recordDeletedEntity('dm', oldId);
              setDms((prev) => prev.filter((d) => d.id !== oldId));
              setMessages((prev) => prev.filter((m) => !(m.conversationType === 'dm' && m.conversationId === oldId)));
              return;
            }
            const updated = await fetchConversationsFromSupabase(activeWorkspaceId, currentUserId);
            const deleted = getDeletedIds(DELETED_DMS_KEY);
            setDms(
              updated
                .filter((d) => d && !deleted.has(d.id))
                .map((d) => ({
                  ...d,
                  participantIds: Array.isArray(d.participantIds) ? d.participantIds : [],
                }))
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        async () => {
          if (isMounted) {
            const updated = await fetchProfilesFromSupabase();
            if (updated.length > 0) {
              const mappedUsers: User[] = updated.map((p) => {
                if (p.avatar_url) {
                  try { safeSetLocalStorage(`pulsechat_custom_avatar_${p.id}`, p.avatar_url); } catch (e) {}
                }
                return {
                  id: p.id,
                  name: p.full_name || p.username,
                  username: p.username,
                  email: p.email || p.username + '@pulsechat.io',
                  avatar: resolveUserAvatar(p.avatar_url, p.full_name || p.username),
                  role: p.role || 'member',
                  title: p.title || 'Product Engineer',
                  isOnline: Boolean(p.is_online),
                  joinedDate: 'Joined recently',
                };
              });
              setUsers(mappedUsers);
            }
          }
        }
      )
      .on('broadcast', { event: 'profile_updated' }, (payload) => {
        if (isMounted && payload?.payload?.userId) {
          const { userId, updates } = payload.payload;
          if (updates?.avatar) {
            try { safeSetLocalStorage(`pulsechat_custom_avatar_${userId}`, updates.avatar); } catch (e) {}
          }
          setUsers((prev) =>
            prev.map((u) => (u.id === userId ? { ...u, ...updates } : u))
          );
        }
      })
      .on('broadcast', { event: 'workspace_updated' }, (payload) => {
        if (isMounted && payload?.payload?.workspaceId) {
          const { workspaceId, updates } = payload.payload;
          if (updates?.avatar !== undefined) {
            try {
              if (updates.avatar) {
                safeSetLocalStorage('pulsechat_custom_workspace_avatar_' + workspaceId, updates.avatar);
              } else {
                localStorage.removeItem('pulsechat_custom_workspace_avatar_' + workspaceId);
              }
            } catch (e) {}
          }
          setWorkspaces((prev) =>
            prev.map((w) => (w.id === workspaceId ? { ...w, ...updates } : w))
          );
        }
      })
      .on('broadcast', { event: 'channel_updated' }, (payload) => {
        if (isMounted && payload?.payload?.channelId) {
          const { channelId, updates } = payload.payload;
          if (updates?.avatar !== undefined) {
            try {
              if (updates.avatar) {
                safeSetLocalStorage('pulsechat_custom_channel_avatar_' + channelId, updates.avatar);
              } else {
                localStorage.removeItem('pulsechat_custom_channel_avatar_' + channelId);
              }
            } catch (e) {}
          }
          if (updates?.allowMemberEdits !== undefined) {
            try {
              safeSetLocalStorage('pulsechat_channel_allow_edits_' + channelId, String(updates.allowMemberEdits));
            } catch (e) {}
          }
          setChannels((prev) =>
            prev.map((c) => (c.id === channelId ? { ...c, ...updates } : c))
          );
        }
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_invites' },
        async (payload) => {
          if (isMounted && currentUserId) {
            const updated = await fetchInvitesFromSupabase(currentUserId, currentUser.email);
            setInvites(updated);
            const remoteDMs = await fetchConversationsFromSupabase(activeWorkspaceId, currentUserId);
            if (remoteDMs.length > 0) setDms(remoteDMs);
            const remoteChannels = await fetchChannelsFromSupabase(activeWorkspaceId, currentUserId);
            if (remoteChannels.length > 0) setChannels(remoteChannels);

            if (payload.eventType === 'INSERT') {
              const row = payload.new as any;
              if (row) handleIncomingInvite(row);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workspaces' },
        async () => {
          if (isMounted && currentUserId) {
            const updated = await fetchWorkspacesFromSupabase(currentUserId);
            if (updated.length > 0) setWorkspaces(updated);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Supabase Realtime] Connected to live channel');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[Supabase Realtime] Channel status:', status, err);
        }
      });

    realtimeChannelRef.current = channel;

    const { data: authSub } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (currentSession?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        const u = currentSession.user;
        const newUid = u.id;
        const rawName = u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'User';
        const rawHandle = u.user_metadata?.username || u.user_metadata?.preferred_username || u.email?.split('@')[0].replace(/[^a-z0-9]/g, '') || 'member';
        const avatarUrl = resolveUserAvatar(u.user_metadata?.avatar_url, rawName);

        if (isMounted) {
          setCurrentUserId(newUid);
          setIsAuthenticated(true);
          localStorage.setItem('pulsechat_auth', 'true');
          localStorage.setItem('pulsechat_current_user', newUid);

          setUsers((prev) => {
            const exists = prev.find((usr) => usr.id === newUid);
            if (exists) {
              return prev.map((usr) => (usr.id === newUid ? { ...usr, isOnline: true } : usr));
            }
            const newUser: User = {
              id: newUid,
              name: rawName,
              username: rawHandle,
              email: u.email || `${rawHandle}@pulsechat.io`,
              avatar: avatarUrl,
              role: 'member',
              title: 'Team Member',
              isOnline: true,
              joinedDate: 'Today',
            };
            return [newUser, ...prev];
          });
        }

        Promise.resolve(
          supabase.from('profiles').upsert({
            id: newUid,
            username: rawHandle,
            full_name: rawName,
            email: u.email,
            avatar_url: avatarUrl,
            role: 'member',
            is_online: true,
          })
        ).catch(() => {});
      }
    });

    return () => {
      isMounted = false;
      realtimeChannelRef.current = null;
      supabase.removeChannel(channel);
      authSub?.subscription?.unsubscribe();
      if (localBroadcast) {
        localBroadcast.close();
        localBroadcastRef.current = null;
      }
    };
  }, [activeWorkspaceId, currentUserId]);

  // Real-time Conversation Read Status Sync: mark received messages as read when activeView is viewed
  useEffect(() => {
    if (!activeView.id || !currentUserId) return;

    // 1. Mark all incoming messages in this conversation as read
    const unreadMessageIds: string[] = [];
    setMessages((prev) => {
      let changed = false;
      const updated = prev.map((m) => {
        const isThisConv =
          m.conversationId === activeView.id ||
          (activeView.type === 'dm' &&
            dmsRef.current.some(
              (d) =>
                d.id === activeView.id &&
                !d.isGroup &&
                Array.isArray(d.participantIds) &&
                d.participantIds.includes(m.senderId)
            ));
        if (isThisConv && m.senderId !== currentUserId && m.deliveryStatus !== 'read') {
          changed = true;
          unreadMessageIds.push(m.id);
          return { ...m, deliveryStatus: 'read' as const };
        }
        return m;
      });
      return changed ? updated : prev;
    });

    // 2. Broadcast conversation_read to sender so their ticks update in real time
    broadcastReadStatus(activeView.id, unreadMessageIds);
  }, [activeView.id, currentUserId, broadcastReadStatus]);

  // Live Active Conversation Sync & Continuous Real-time Polling
  useEffect(() => {
    if (!isSupabaseConfigured || !activeView.id) return;
    let isMounted = true;

    const pullMessages = async () => {
      try {
        let convIds: string[] = [activeView.id];
        if (activeView.type === 'dm') {
          const currentDMs = dmsRef.current;
          const activeDM = currentDMs.find((d) => d.id === activeView.id);
          if (activeDM && !activeDM.isGroup && activeDM.participantIds?.length === 2) {
            const canonicalId = getCanonicalDMId(activeDM.participantIds[0], activeDM.participantIds[1]);
            convIds.push(canonicalId);
            currentDMs.forEach((d) => {
              if (
                !d.isGroup &&
                Array.isArray(d.participantIds) &&
                d.participantIds.length === 2 &&
                d.participantIds.includes(activeDM.participantIds[0]) &&
                d.participantIds.includes(activeDM.participantIds[1])
              ) {
                convIds.push(d.id);
              }
            });
          }
        }
        convIds = Array.from(new Set(convIds));

        const remoteMsgs = await fetchMessagesFromSupabase(activeView.type, convIds);
        if (isMounted && remoteMsgs.length > 0) {
          setMessages((prev) => {
            const map = new Map(prev.map((m) => [m.id, m]));
            let hasChanges = false;
            remoteMsgs.forEach((m) => {
              const normalizedM = convIds.includes(m.conversationId)
                ? { ...m, conversationId: activeView.id }
                : m;
              const existing = map.get(normalizedM.id);
              if (!existing) {
                map.set(normalizedM.id, normalizedM);
                hasChanges = true;
              } else if (
                existing.content !== normalizedM.content ||
                JSON.stringify(existing.reactions) !== JSON.stringify(normalizedM.reactions) ||
                existing.isPinned !== normalizedM.isPinned ||
                existing.editedAt !== normalizedM.editedAt ||
                existing.conversationId !== normalizedM.conversationId ||
                (normalizedM.deliveryStatus === 'read' && existing.deliveryStatus !== 'read') ||
                (normalizedM.deliveryStatus === 'delivered' && existing.deliveryStatus === 'sent')
              ) {
                const nextDelivery =
                  (existing.deliveryStatus === 'read' || normalizedM.deliveryStatus === 'read')
                    ? 'read'
                    : (existing.deliveryStatus === 'delivered' || normalizedM.deliveryStatus === 'delivered')
                    ? 'delivered'
                    : (existing.deliveryStatus || normalizedM.deliveryStatus || 'sent');

                map.set(normalizedM.id, { ...existing, ...normalizedM, deliveryStatus: nextDelivery });
                hasChanges = true;
              }
            });
            return hasChanges ? Array.from(map.values()) : prev;
          });
        }
      } catch (err) {}
    };

    // Immediate pull on view switch
    pullMessages();

    // 2-second interval polling fallback ensures real-time updates even without websockets
    const interval = setInterval(pullMessages, 2000);

    // Immediate pull on window focus / tab visibility
    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        pullMessages();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityOrFocus);
    window.addEventListener('focus', onVisibilityOrFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      window.removeEventListener('focus', onVisibilityOrFocus);
    };
  }, [activeView.type, activeView.id]);

  // Periodic background sync for DMs, invites and presence so new incoming chats pop up live
  useEffect(() => {
    if (!isSupabaseConfigured || !currentUserId) return;
    let isMounted = true;

    const pullSidebarData = async () => {
      try {
        const [remoteDMs, remoteInvites] = await Promise.all([
          fetchConversationsFromSupabase(activeWorkspaceId, currentUserId),
          fetchInvitesFromSupabase(currentUserId, currentUser.email),
        ]);

        if (isMounted) {
          if (remoteDMs.length > 0) {
            const starredDMs = getStarredSet('pulsechat_starred_dms_' + (currentUserId || 'default'));
            setDms((prev) => {
              const map = new Map(prev.map((d) => [d.id, d]));
              let changed = false;
              remoteDMs.forEach((d) => {
                const existing = map.get(d.id);
                const isStarred = starredDMs.has(d.id) || (existing ? existing.isStarred : Boolean(d.isStarred));
                if (!existing || existing.lastActivity !== d.lastActivity || existing.unreadCount !== d.unreadCount || existing.isStarred !== isStarred) {
                  map.set(d.id, { ...existing, ...d, isStarred });
                  changed = true;
                }
              });
              return changed ? Array.from(map.values()) : prev;
            });
          }

          if (remoteInvites.length >= 0) {
            setInvites((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(remoteInvites)) {
                return remoteInvites;
              }
              return prev;
            });

            // Ensure all pending invitations for me are visible in notifications center
            const pendingForMe = remoteInvites.filter(
              (inv) =>
                inv.status === 'pending' &&
                inv.senderId !== currentUserId &&
                (inv.receiverId === currentUserId ||
                  (currentUser.email && inv.receiverId.toLowerCase() === currentUser.email.toLowerCase()))
            );

            setNotifications((prevNotifs) => {
              const pendingNotifIds = new Set(pendingForMe.map((inv) => 'notif-inv-' + inv.id));
              const existingNotifIds = new Set(prevNotifs.map((n) => n.id));
              const latestUsers = usersRef.current;
              const latestChannels = channelsRef.current;
              const latestWorkspaces = workspacesRef.current;

              const toAdd: NotificationItem[] = [];
              for (const inv of pendingForMe) {
                const notifId = 'notif-inv-' + inv.id;
                if (!existingNotifIds.has(notifId)) {
                  const sender = latestUsers.find((u) => u.id === inv.senderId);
                  const senderName = sender ? sender.name : 'A team member';
                  const isChan = inv.inviteType === 'channel';
                  const targetChan = isChan
                    ? latestChannels.find((c) => c.id === inv.channelId || c.id === inv.conversationId)
                    : null;
                  const targetWs = isChan
                    ? latestWorkspaces.find((w) => w.id === inv.workspaceId)
                    : null;

                  toAdd.push({
                    id: notifId,
                    userId: currentUserId,
                    title: isChan
                      ? `${senderName} invited you to join #${targetChan?.name || 'channel'}`
                      : `${senderName} sent you a chat invite`,
                    body: isChan
                      ? `Workspace: ${targetWs?.name || 'Team Workspace'} • Channel: #${targetChan?.name || 'channel'}. Review and accept to join.`
                      : 'Review your invitations in the notification bell to accept and connect.',
                    type: 'invite',
                    timestamp: inv.createdAt || new Date().toISOString(),
                    isRead: false,
                    targetType: isChan ? 'channel' : 'dm',
                    targetId: inv.conversationId || inv.channelId || '',
                  });
                }
              }

              // Remove notifications for invitations that are no longer pending
              const cleaned = prevNotifs.filter((n) => {
                if (n.id.startsWith('notif-inv-')) {
                  return pendingNotifIds.has(n.id);
                }
                return true;
              });

              if (toAdd.length > 0 || cleaned.length !== prevNotifs.length) {
                return [...toAdd, ...cleaned];
              }
              return prevNotifs;
            });
          }
        }
      } catch (err) {}
    };

    const interval = setInterval(pullSidebarData, 3500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeWorkspaceId, currentUserId, currentUser.email]);

  // Fetch channels when active workspace changes (Smooth & Flicker-free)
  useEffect(() => {
    if (!isSupabaseConfigured || !currentUserId || !activeWorkspaceId) return;
    let isMounted = true;
    fetchChannelsFromSupabase(activeWorkspaceId, currentUserId).then((remoteChannels) => {
      if (isMounted) {
        const deleted = getDeletedIds(DELETED_CHANNELS_KEY);
        const starredChannels = getStarredSet('pulsechat_starred_channels_' + (currentUserId || 'default'));
        const valid = remoteChannels
          .filter((c) => !deleted.has(c.id))
          .map((c) => ({
            ...c,
            avatar: localStorage.getItem('pulsechat_custom_channel_avatar_' + c.id) || c.avatar,
            isStarred: starredChannels.has(c.id) || Boolean(c.isStarred),
          }));
        setChannels((prev) => {
          const currentWsChans = prev.filter((c) => c.workspaceId === activeWorkspaceId);
          // Check if identical to avoid re-renders that cause flickering
          const hasDiff =
            currentWsChans.length !== valid.length ||
            valid.some((vc) => {
              const cur = currentWsChans.find((c) => c.id === vc.id);
              return (
                !cur ||
                cur.name !== vc.name ||
                cur.topic !== vc.topic ||
                cur.avatar !== vc.avatar ||
                cur.isStarred !== vc.isStarred
              );
            });
          if (!hasDiff) return prev;

          const otherWs = prev.filter((c) => c.workspaceId !== activeWorkspaceId && !deleted.has(c.id));
          return [...otherWs, ...valid];
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, [activeWorkspaceId, currentUserId]);

  const recordSavedAccount = (accEmail: string, accName: string, accAvatar?: string) => {
    try {
      const raw = localStorage.getItem('pulsechat_saved_accounts');
      const list = raw ? JSON.parse(raw) : [];
      const updated = [
        { email: accEmail.toLowerCase(), name: accName, avatar: accAvatar },
        ...list.filter((a: any) => a.email?.toLowerCase() !== accEmail.toLowerCase()),
      ];
      localStorage.setItem('pulsechat_saved_accounts', JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
  };

  const login = useCallback(
    async (email: string, password?: string) => {
      const cleanEmail = email.trim().toLowerCase();

      if (isSupabaseConfigured) {
        try {
          const res = await supabaseSignIn(cleanEmail, password);
          if (res?.user) {
            const uid = res.user.id;
            const userName = res.user.user_metadata?.full_name || cleanEmail.split('@')[0];
            const userHandle = res.user.user_metadata?.username || cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            const loggedInAvatar = resolveUserAvatar(res.user.user_metadata?.avatar_url, userName);
            recordSavedAccount(cleanEmail, userName, loggedInAvatar);
            const loggedInUser: User = {
              id: uid,
              name: userName,
              username: userHandle,
              email: cleanEmail,
              avatar: resolveUserAvatar(res.user.user_metadata?.avatar_url, userName),
              role: 'member',
              title: 'Product Engineer',
              isOnline: true,
              joinedDate: 'Joined recently',
            };
            setUsers((prev) => [loggedInUser, ...prev.filter((u) => u.id !== uid)]);
            setCurrentUserId(uid);
            setIsAuthenticated(true);
            localStorage.setItem('pulsechat_auth', 'true');
            localStorage.setItem('pulsechat_current_user', uid);
            addToast(`Welcome back, ${userName}!`, 'success');
            return true;
          }
        } catch (err: any) {
          console.warn('Sign in error:', err);
          addToast(err?.message || 'No account found with this email. Please sign up first.', 'error');
          return false;
        }
      }

      // Demo/local mode: strictly check if user exists in registered list
      const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (existing) {
        recordSavedAccount(existing.email, existing.name, existing.avatar);
        setCurrentUserId(existing.id);
        setIsAuthenticated(true);
        localStorage.setItem('pulsechat_auth', 'true');
        localStorage.setItem('pulsechat_current_user', existing.id);
        addToast(`Welcome back, ${existing.name}!`, 'success');
        return true;
      }

      // Strictly reject unregistered user
      addToast('No account found with this email. Please sign up first.', 'error');
      return false;
    },
    [users, addToast]
  );

  const register = useCallback(
    async (name: string, email: string, username: string, password?: string, avatarUrl?: string) => {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();
      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'member';
      const resolvedAvatar = avatarUrl || generateLetterAvatar(cleanName);

      if (isSupabaseConfigured) {
        try {
          const res = await supabaseSignUp({
            email: cleanEmail,
            password,
            fullName: cleanName,
            username: cleanUsername,
            avatarUrl: resolvedAvatar,
          });
          if (res?.requiresVerification) {
            addToast(res.message || 'A verification link has been sent to your email. Please verify before signing in.', 'info');
            return { requiresVerification: true, message: res.message };
          }
          if (res?.user) {
            const uid = res.user.id;
            const newUser: User = {
              id: uid,
              name: cleanName,
              username: cleanUsername,
              email: cleanEmail,
              avatar: resolveUserAvatar(res.user.user_metadata?.avatar_url || resolvedAvatar, cleanName),
              role: 'member',
              title: 'Fullstack Engineer',
              isOnline: true,
              joinedDate: 'Today',
            };
            setUsers((prev) => [newUser, ...prev.filter((u) => u.id !== uid)]);
            recordSavedAccount(cleanEmail, cleanName, newUser.avatar);
            setCurrentUserId(uid);
            setIsAuthenticated(true);
            localStorage.setItem('pulsechat_auth', 'true');
            localStorage.setItem('pulsechat_current_user', uid);
            addToast(`Welcome to PulseChat, ${cleanName}!`, 'success');
            if (workspaces.length === 0) {
              setIsCreateWorkspaceOpen(true);
            }
            return true;
          }
        } catch (err: any) {
          console.warn('Sign up error:', err);
          const msg = err.message || 'Registration failed';
          addToast(msg, 'error');
          return { success: false, error: msg };
        }
      }

      // Demo/local mode registration check
      const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (existing) {
        const msg = 'An account with this email already exists. Please sign in instead.';
        addToast(msg, 'error');
        return { success: false, error: msg };
      }

      const newUser: User = {
        id: 'usr-' + Date.now(),
        name: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        avatar: resolvedAvatar,
        role: 'member',
        title: 'Fullstack Engineer',
        isOnline: true,
        joinedDate: 'Just now',
      };
      setUsers((prev) => [...prev, newUser]);
      recordSavedAccount(cleanEmail, cleanName, resolvedAvatar);
      setCurrentUserId(newUser.id);
      setIsAuthenticated(true);
      localStorage.setItem('pulsechat_auth', 'true');
      localStorage.setItem('pulsechat_current_user', newUser.id);
      addToast(`Welcome to PulseChat, ${cleanName}!`, 'success');
      if (workspaces.length === 0) {
        setIsCreateWorkspaceOpen(true);
      }
      return true;
    },
    [users, workspaces.length, addToast]
  );

  const socialLogin = useCallback(
    async (provider: 'google' | 'apple', email: string, name?: string, avatarUrl?: string) => {
      const cleanEmail = email.trim().toLowerCase();
      const providerTitle = provider === 'google' ? 'Google' : 'Apple';
      const cleanName = name?.trim() || (provider === 'google' ? 'Google User' : 'Apple User');
      const cleanHandle = cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || provider;
      const resolvedAvatar = avatarUrl || generateLetterAvatar(cleanName);

      const localExisting = users.find((u) => u.email.toLowerCase() === cleanEmail);
      let uid = localExisting ? localExisting.id : `usr-${provider}-${Date.now()}`;

      if (isSupabaseConfigured) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', cleanEmail)
            .maybeSingle();

          if (profile) {
            uid = profile.id;
          }

          await supabase.from('profiles').upsert(
            {
              id: uid,
              email: cleanEmail,
              username: profile?.username || cleanHandle,
              full_name: profile?.full_name || cleanName,
              avatar_url: profile?.avatar_url || resolvedAvatar,
              role: profile?.role || 'member',
              is_online: true,
              last_seen: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );
        } catch (sbErr) {
          console.warn('Supabase socialLogin notice:', sbErr);
        }
      }

      const verifiedUser: User = {
        id: uid,
        name: cleanName,
        username: cleanHandle,
        email: cleanEmail,
        avatar: resolvedAvatar,
        role: 'member',
        title: `${providerTitle} Team Member`,
        isOnline: true,
        joinedDate: 'Joined with ' + providerTitle,
      };

      setUsers((prev) => [verifiedUser, ...prev.filter((u) => u.id !== uid && u.email.toLowerCase() !== cleanEmail)]);
      recordSavedAccount(cleanEmail, cleanName, resolvedAvatar);
      setCurrentUserId(uid);
      setIsAuthenticated(true);
      localStorage.setItem('pulsechat_auth', 'true');
      localStorage.setItem('pulsechat_current_user', uid);
      addToast(`Signed in successfully with verified ${providerTitle} account!`, 'success');

      if (workspaces.length === 0) {
        setIsCreateWorkspaceOpen(true);
      }
      return true;
    },
    [users, workspaces.length, addToast]
  );

  const logout = useCallback(() => {
    if (isSupabaseConfigured) {
      supabaseSignOut(currentUserId).catch(() => {});
    }
    setIsAuthenticated(false);
    localStorage.setItem('pulsechat_auth', 'false');
    addToast('Logged out successfully', 'info');
  }, [currentUserId, addToast]);

  // Safe fallback workspace if workspace array is completely empty
  const EMPTY_WORKSPACE: Workspace = {
    id: '',
    name: 'PulseChat',
    slug: 'pulsechat',
    icon: 'PC',
    iconBg: '#4F8CFF',
    description: 'Create a workspace to begin collaborating',
    ownerId: '',
    membersCount: 0,
    plan: 'Pro',
    createdAt: new Date().toISOString(),
  };

  // Strictly filter workspaces so users only see their own workspaces or those they joined
  const userWorkspaces: Workspace[] = React.useMemo(() => {
    if (!currentUserId || currentUserId === 'guest') return workspaces;
    const filtered = (workspaces || []).filter((ws: Workspace) => {
      if (!ws || !ws.id) return false;
      if (ws.ownerId === currentUserId) return true;
      if (Array.isArray(ws.memberIds) && ws.memberIds.includes(currentUserId)) return true;
      return false;
    });
    return filtered.length > 0 ? filtered : (workspaces || []);
  }, [workspaces, currentUserId]);

  // Active Workspace
  const activeWorkspace: Workspace = React.useMemo(() => {
    return (
      userWorkspaces.find((w: Workspace) => w && w.id === activeWorkspaceId) ||
      userWorkspaces[0] ||
      (workspaces || [])[0] ||
      EMPTY_WORKSPACE
    );
  }, [userWorkspaces, workspaces, activeWorkspaceId]);

  const setActiveWorkspaceId = useCallback((id: string) => {
    setActiveWorkspaceIdState(id);
    const firstChan = channels.find((c) => c.workspaceId === id);
    if (firstChan) {
      setActiveView({ type: 'channel', id: firstChan.id });
    }
  }, [channels]);

  // Auto-heal activeView so user NEVER gets stuck without an active channel/DM (e.g. on mobile or workspace switch)
  useEffect(() => {
    if (channels.length === 0 && dms.length === 0) return;

    const hasMatchingChannel = activeView.type === 'channel' && channels.some((c) => c.id === activeView.id && c.workspaceId === activeWorkspace.id);
    const hasMatchingDM = activeView.type === 'dm' && dms.some((d) => d.id === activeView.id);

    if (!hasMatchingChannel && !hasMatchingDM) {
      const defaultChan = channels.find((c) => c.workspaceId === activeWorkspace.id) || channels[0];
      if (defaultChan) {
        setActiveView({ type: 'channel', id: defaultChan.id });
      } else if (dms.length > 0) {
        const defaultDM = dms.find((d) => d.workspaceId === activeWorkspace.id) || dms[0];
        setActiveView({ type: 'dm', id: defaultDM.id });
      }
    }
  }, [channels, dms, activeWorkspace.id, activeView]);

  const toggleSidebarCollapsed = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  const createWorkspace = useCallback((name: string, description: string, iconBg = '#4F8CFF'): Workspace => {
    const initials = name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'WS';

    const newWs: Workspace = {
      id: 'ws-' + Date.now(),
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      icon: initials,
      iconBg,
      description,
      ownerId: currentUserId,
      memberIds: [currentUserId],
      membersCount: 1,
      plan: 'Pro',
      createdAt: new Date().toISOString(),
    };

    const genChannel: Channel = {
      id: 'ch-' + Date.now(),
      workspaceId: newWs.id,
      name: 'general',
      topic: `Company-wide discussion for ${name}`,
      description: 'Default channel for team updates and general chat',
      isPrivate: false,
      memberIds: [currentUserId],
      createdBy: currentUserId,
      createdAt: new Date().toISOString(),
      unreadCount: 0,
      isStarred: true,
    };

    setWorkspaces((prev) => [...prev, newWs]);
    setChannels((prev) => [...prev, genChannel]);
    setActiveWorkspaceIdState(newWs.id);
    setActiveView({ type: 'channel', id: genChannel.id });
    addToast(`Workspace "${name}" created!`, 'success');

    if (isSupabaseConfigured) {
      saveWorkspaceToSupabase({
        id: newWs.id,
        name: newWs.name,
        slug: newWs.slug,
        icon: newWs.icon,
        iconBg: newWs.iconBg,
        plan: newWs.plan,
        createdBy: currentUserId,
      }).catch((err) => console.warn('Supabase saveWorkspace notice:', err));

      saveChannelToSupabase({
        id: genChannel.id,
        workspaceId: newWs.id,
        name: genChannel.name,
        topic: genChannel.topic,
        description: genChannel.description,
        isPrivate: genChannel.isPrivate,
        createdBy: currentUserId,
        memberIds: genChannel.memberIds,
      }).catch((err) => console.warn('Supabase saveChannel notice:', err));
    }

    return newWs;
  }, [currentUserId, addToast]);

  const updateWorkspace = useCallback((id: string, updates: Partial<Workspace>) => {
    if (updates.avatar !== undefined) {
      try {
        if (updates.avatar) {
          safeSetLocalStorage('pulsechat_custom_workspace_avatar_' + id, updates.avatar);
        } else {
          localStorage.removeItem('pulsechat_custom_workspace_avatar_' + id);
        }
      } catch (e) {}
    }
    setWorkspaces((prev) => {
      const next = prev.map((w) => (w.id === id ? { ...w, ...updates } : w));
      safeSetLocalStorage(STORAGE_KEY_PREFIX + 'workspaces', JSON.stringify(next));
      return next;
    });

    // 1. Broadcast across local browser tabs
    try {
      if (localBroadcastRef.current) {
        localBroadcastRef.current.postMessage({
          type: 'workspace_updated',
          payload: { workspaceId: id, updates },
        });
      }
    } catch (e) {}

    // 2. Broadcast across Supabase clients in real-time
    try {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'workspace_updated',
          payload: { workspaceId: id, updates },
        });
      }
    } catch (e) {}

    if (isSupabaseConfigured) {
      updateWorkspaceInSupabase(id, {
        name: updates.name,
        iconBg: updates.iconBg,
        avatar: updates.avatar,
      }).catch((err) =>
        console.warn('Supabase updateWorkspace notice:', err)
      );
    }
    addToast('Workspace settings saved', 'success');
  }, [addToast]);

  const deleteWorkspace = useCallback(
    async (workspaceId: string) => {
      recordDeletedEntity('workspace', workspaceId);
      try {
        localStorage.removeItem('pulsechat_custom_workspace_avatar_' + workspaceId);
      } catch (e) {}

      const wsChannelIds = new Set(channels.filter((c) => c.workspaceId === workspaceId).map((c) => c.id));
      const wsDmIds = new Set(dms.filter((d) => d.workspaceId === workspaceId).map((d) => d.id));

      wsChannelIds.forEach((id) => recordDeletedEntity('channel', id));
      wsDmIds.forEach((id) => recordDeletedEntity('dm', id));

      setWorkspaces((prev) => prev.filter((w) => w.id !== workspaceId));
      setChannels((prev) => prev.filter((c) => c.workspaceId !== workspaceId));
      setDms((prev) => prev.filter((d) => d.workspaceId !== workspaceId));
      setMessages((prev) => prev.filter((m) => !wsChannelIds.has(m.conversationId) && !wsDmIds.has(m.conversationId)));

      if (localBroadcastRef.current) {
        localBroadcastRef.current.postMessage({ type: 'workspace_deleted', payload: { id: workspaceId } });
      }

      const remaining = userWorkspaces.filter((w: Workspace) => w.id !== workspaceId);
      if (remaining.length > 0) {
        setActiveWorkspaceIdState(remaining[0].id);
        const firstChan = channels.find((c) => c.workspaceId === remaining[0].id);
        if (firstChan) {
          setActiveView({ type: 'channel', id: firstChan.id });
        }
      } else {
        const newWs: Workspace = {
          id: 'ws-' + Date.now(),
          name: `${currentUser.name}'s Workspace`,
          slug: `${currentUser.username || 'workspace'}-${Date.now().toString(36).slice(-4)}`,
          icon: (currentUser.name[0] || 'W').toUpperCase(),
          iconBg: '#4F8CFF',
          description: `${currentUser.name}'s workspace`,
          ownerId: currentUserId,
          memberIds: [currentUserId],
          membersCount: 1,
          plan: 'Pro',
          createdAt: new Date().toISOString(),
        };
        const genChannel: Channel = {
          id: 'ch-' + Date.now(),
          workspaceId: newWs.id,
          name: 'general',
          topic: `Company-wide discussion for ${newWs.name}`,
          description: 'Default channel for team updates and general chat',
          isPrivate: false,
          memberIds: [currentUserId],
          createdBy: currentUserId,
          createdAt: new Date().toISOString(),
          unreadCount: 0,
          isStarred: true,
        };
        unrecordDeletedEntity('workspace', newWs.id);
        unrecordDeletedEntity('channel', genChannel.id);
        setWorkspaces([newWs]);
        setChannels((prev) => [...prev, genChannel]);
        setActiveWorkspaceIdState(newWs.id);
        setActiveView({ type: 'channel', id: genChannel.id });
        if (isSupabaseConfigured) {
          saveWorkspaceToSupabase({
            id: newWs.id,
            name: newWs.name,
            slug: newWs.slug,
            icon: newWs.icon,
            iconBg: newWs.iconBg,
            plan: newWs.plan,
            createdBy: currentUserId,
          }).catch(() => {});
          saveChannelToSupabase({
            id: genChannel.id,
            workspaceId: newWs.id,
            name: genChannel.name,
            topic: genChannel.topic,
            description: genChannel.description,
            isPrivate: false,
            createdBy: currentUserId,
            memberIds: [currentUserId],
          }).catch(() => {});
        }
      }

      if (isSupabaseConfigured) {
        await deleteWorkspaceFromSupabase(workspaceId);
      }

      setIsWorkspaceSettingsOpen(false);
      addToast('Workspace deleted permanently', 'success');
    },
    [userWorkspaces, channels, dms, currentUser, currentUserId, isSupabaseConfigured, addToast, setIsWorkspaceSettingsOpen]
  );

  // Channels
  const createChannel = useCallback(
    (name: string, topic: string, description: string, isPrivate: boolean, initialMemberIds?: string[]): Channel => {
      const cleanName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^-+|-+$/g, '') || 'channel';
      
      // Prevent duplicates in active workspace
      const existing = channels.find(
        (c) => c.workspaceId === activeWorkspaceId && c.name.toLowerCase() === cleanName
      );
      if (existing) {
        addToast(`Channel #${cleanName} already exists`, 'info');
        setActiveView({ type: 'channel', id: existing.id });
        return existing;
      }

      const allMembers = Array.from(new Set([currentUserId, ...(initialMemberIds || [])]));
      const newChannel: Channel = {
        id: 'ch-' + Date.now(),
        workspaceId: activeWorkspaceId,
        name: cleanName,
        topic: topic || `Discussion topic for #${cleanName}`,
        description: description || `Welcome to #${cleanName}!`,
        isPrivate,
        memberIds: allMembers,
        createdBy: currentUserId,
        createdAt: new Date().toISOString(),
        unreadCount: 0,
        isStarred: false,
      };

      unrecordDeletedEntity('channel', newChannel.id);

      setChannels((prev) => [...prev, newChannel]);
      setActiveView({ type: 'channel', id: newChannel.id });
      addToast(`Channel #${cleanName} created!`, 'success');

      if (isSupabaseConfigured) {
        saveChannelToSupabase({
          id: newChannel.id,
          workspaceId: activeWorkspaceId,
          name: newChannel.name,
          topic: newChannel.topic,
          description: newChannel.description,
          isPrivate: newChannel.isPrivate,
          createdBy: currentUserId,
          memberIds: newChannel.memberIds,
        }).catch((err) => console.warn('Supabase saveChannel error:', err));
      }

      return newChannel;
    },
    [activeWorkspaceId, currentUserId, channels, addToast]
  );

  const toggleStarChannel = useCallback((channelId: string) => {
    const uid = currentUserId || 'default';
    const key = 'pulsechat_starred_channels_' + uid;
    const currentStarred = getStarredSet(key);
    const nextState = !currentStarred.has(channelId);
    if (nextState) {
      currentStarred.add(channelId);
    } else {
      currentStarred.delete(channelId);
    }
    saveStarredSet(key, currentStarred);

    setChannels((prev) =>
      prev.map((c) =>
        c.id === channelId ? { ...c, isStarred: nextState } : c
      )
    );
    addToast(nextState ? 'Channel added to Starred' : 'Channel unstarred', 'info');
  }, [currentUserId, addToast]);

  const toggleStarDM = useCallback((dmId: string) => {
    const uid = currentUserId || 'default';
    const key = 'pulsechat_starred_dms_' + uid;
    const currentStarred = getStarredSet(key);
    const nextState = !currentStarred.has(dmId);
    if (nextState) {
      currentStarred.add(dmId);
    } else {
      currentStarred.delete(dmId);
    }
    saveStarredSet(key, currentStarred);

    setDms((prev) =>
      prev.map((d) =>
        d.id === dmId ? { ...d, isStarred: nextState } : d
      )
    );
    addToast(nextState ? 'Conversation added to Starred' : 'Conversation unstarred', 'info');
  }, [currentUserId, addToast]);

  const blockUser = useCallback((userIdToBlock: string) => {
    if (!userIdToBlock || userIdToBlock === currentUserId) return;
    setBlockedUserIds((prev) => {
      if (prev.includes(userIdToBlock)) return prev;
      return [...prev, userIdToBlock];
    });
    const targetUser = users.find((u) => u.id === userIdToBlock);
    const targetName = targetUser?.name || 'User';
    soundFX.play('chime');
    addToast(`${targetName} has been blocked. They cannot message you.`, 'info');
  }, [currentUserId, users, addToast]);

  const unblockUser = useCallback((userIdToUnblock: string) => {
    if (!userIdToUnblock) return;
    setBlockedUserIds((prev) => prev.filter((id) => id !== userIdToUnblock));
    const targetUser = users.find((u) => u.id === userIdToUnblock);
    const targetName = targetUser?.name || 'User';
    addToast(`${targetName} has been unblocked.`, 'success');
  }, [users, addToast]);

  const isUserBlocked = useCallback((userIdToCheck: string) => {
    if (!userIdToCheck) return false;
    return blockedUserIds.includes(userIdToCheck);
  }, [blockedUserIds]);

  const blockChannel = useCallback((channelIdToBlock: string) => {
    if (!channelIdToBlock) return;
    setBlockedChannelIds((prev) => {
      if (prev.includes(channelIdToBlock)) return prev;
      return [...prev, channelIdToBlock];
    });
    const targetChannel = channels.find((c) => c.id === channelIdToBlock);
    const targetName = targetChannel?.name || 'Channel';
    soundFX.play('chime');
    addToast(`#${targetName} has been blocked. Messaging and alerts are restricted.`, 'info');
  }, [channels, addToast]);

  const unblockChannel = useCallback((channelIdToUnblock: string) => {
    if (!channelIdToUnblock) return;
    setBlockedChannelIds((prev) => prev.filter((id) => id !== channelIdToUnblock));
    const targetChannel = channels.find((c) => c.id === channelIdToUnblock);
    const targetName = targetChannel?.name || 'Channel';
    addToast(`#${targetName} has been unblocked.`, 'success');
  }, [channels, addToast]);

  const isChannelBlocked = useCallback((channelIdToCheck: string) => {
    if (!channelIdToCheck) return false;
    return blockedChannelIds.includes(channelIdToCheck);
  }, [blockedChannelIds]);

  const blockWorkspace = useCallback((workspaceIdToBlock: string) => {
    if (!workspaceIdToBlock) return;
    setBlockedWorkspaceIds((prev) => {
      if (prev.includes(workspaceIdToBlock)) return prev;
      return [...prev, workspaceIdToBlock];
    });
    const targetWorkspace = workspaces.find((w) => w.id === workspaceIdToBlock);
    const targetName = targetWorkspace?.name || 'Workspace';
    soundFX.play('chime');
    addToast(`"${targetName}" workspace has been blocked. Background notifications are silenced.`, 'info');
  }, [workspaces, addToast]);

  const unblockWorkspace = useCallback((workspaceIdToUnblock: string) => {
    if (!workspaceIdToUnblock) return;
    setBlockedWorkspaceIds((prev) => prev.filter((id) => id !== workspaceIdToUnblock));
    const targetWorkspace = workspaces.find((w) => w.id === workspaceIdToUnblock);
    const targetName = targetWorkspace?.name || 'Workspace';
    addToast(`"${targetName}" workspace has been unblocked.`, 'success');
  }, [workspaces, addToast]);

  const isWorkspaceBlocked = useCallback((workspaceIdToCheck: string) => {
    if (!workspaceIdToCheck) return false;
    return blockedWorkspaceIds.includes(workspaceIdToCheck);
  }, [blockedWorkspaceIds]);

  const updateChannelDetails = useCallback((channelId: string, updates: Partial<Channel>) => {
    if (updates.avatar !== undefined) {
      try {
        if (updates.avatar) {
          safeSetLocalStorage('pulsechat_custom_channel_avatar_' + channelId, updates.avatar);
        } else {
          localStorage.removeItem('pulsechat_custom_channel_avatar_' + channelId);
        }
      } catch (e) {}
    }
    if (updates.allowMemberEdits !== undefined) {
      try {
        safeSetLocalStorage('pulsechat_channel_allow_edits_' + channelId, String(updates.allowMemberEdits));
      } catch (e) {}
    }
    setChannels((prev) => {
      const next = prev.map((c) => (c.id === channelId ? { ...c, ...updates } : c));
      safeSetLocalStorage(STORAGE_KEY_PREFIX + 'channels', JSON.stringify(next));
      return next;
    });

    // 1. Broadcast across local browser tabs
    try {
      if (localBroadcastRef.current) {
        localBroadcastRef.current.postMessage({
          type: 'channel_updated',
          payload: { channelId, updates },
        });
      }
    } catch (e) {}

    // 2. Broadcast across Supabase clients in real-time
    try {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'channel_updated',
          payload: { channelId, updates },
        });
      }
    } catch (e) {}

    if (isSupabaseConfigured) {
      updateChannelInSupabase(channelId, {
        name: updates.name,
        topic: updates.topic,
        description: updates.description,
        avatar: updates.avatar,
        allowMemberEdits: updates.allowMemberEdits,
      }).catch((err) => console.warn('Supabase updateChannel notice:', err));
    }
    addToast('Channel details updated', 'success');
  }, [addToast]);

  const deleteChannel = useCallback(
    async (channelId: string) => {
      // 1. Record persistent deletion so it NEVER spawns back on reload/sync
      recordDeletedEntity('channel', channelId);
      try {
        localStorage.removeItem('pulsechat_custom_channel_avatar_' + channelId);
      } catch (e) {}

      // 2. Remove immediately from local state & messages
      setChannels((prev) => prev.filter((c) => c.id !== channelId));
      setMessages((prev) => prev.filter((m) => !(m.conversationType === 'channel' && m.conversationId === channelId)));

      // 3. Switch active view if deleted channel is active
      setActiveView((prev) => {
        if (prev.type === 'channel' && prev.id === channelId) {
          const remaining = channels.filter((c) => c.id !== channelId && c.workspaceId === activeWorkspaceId);
          if (remaining.length > 0) {
            return { type: 'channel', id: remaining[0].id };
          }
          return { type: 'channel', id: 'general' };
        }
        return prev;
      });

      setIsRightPanelOpen(false);
      addToast('Channel deleted permanently', 'success');

      // 4. Notify other open tabs in real-time
      if (localBroadcastRef.current) {
        localBroadcastRef.current.postMessage({ type: 'channel_deleted', payload: { id: channelId } });
      }

      // 5. Permanently delete from Supabase database
      if (isSupabaseConfigured) {
        await deleteChannelFromSupabase(channelId);
      }
    },
    [channels, activeWorkspaceId, isSupabaseConfigured, addToast, setIsRightPanelOpen]
  );

  const deleteDM = useCallback(
    async (dmId: string) => {
      // 1. Record persistent deletion so it NEVER spawns back on reload/sync
      recordDeletedEntity('dm', dmId);

      // 2. Remove immediately from local state & messages
      setDms((prev) => prev.filter((d) => d.id !== dmId));
      setMessages((prev) => prev.filter((m) => !(m.conversationType === 'dm' && m.conversationId === dmId)));

      // 3. Switch active view if deleted DM is active
      setActiveView((prev) => {
        if (prev.type === 'dm' && prev.id === dmId) {
          const remaining = channels.filter((c) => c.workspaceId === activeWorkspaceId);
          if (remaining.length > 0) {
            return { type: 'channel', id: remaining[0].id };
          }
          return { type: 'channel', id: 'general' };
        }
        return prev;
      });

      setIsRightPanelOpen(false);
      addToast('Conversation deleted permanently', 'success');

      // 4. Notify other open tabs in real-time
      if (localBroadcastRef.current) {
        localBroadcastRef.current.postMessage({ type: 'dm_deleted', payload: { id: dmId } });
      }

      // 5. Permanently delete from Supabase database
      if (isSupabaseConfigured) {
        await deleteConversationFromSupabase(dmId);
      }
    },
    [channels, activeWorkspaceId, isSupabaseConfigured, addToast, setIsRightPanelOpen]
  );

  // Direct Messages
  const createOrOpenDM = useCallback((participantIds: string[], groupName?: string): string => {
    const allParticipants = Array.from(new Set([...participantIds, currentUserId]));
    const isGroup = allParticipants.length > 2;
    const otherUserId = participantIds.find((id) => id !== currentUserId) || participantIds[0];
    const canonicalId = !isGroup && otherUserId ? getCanonicalDMId(currentUserId, otherUserId) : null;
    
    const existing = dms.find((d) => {
      if (canonicalId && d.id === canonicalId) return true;
      if (allParticipants.length === 2 && !d.isGroup) {
        return (
          Array.isArray(d.participantIds) &&
          d.participantIds.length === 2 &&
          d.participantIds.includes(participantIds[0]) &&
          d.participantIds.includes(currentUserId)
        );
      }
      return false;
    });

    if (existing) {
      unrecordDeletedEntity('dm', existing.id);
      setActiveView({ type: 'dm', id: existing.id });
      return existing.id;
    }

    const dmId = canonicalId || 'dm-' + Date.now();
    unrecordDeletedEntity('dm', dmId);
    const uid = currentUserId || 'default';
    const starredDMs = getStarredSet('pulsechat_starred_dms_' + uid);
    const newDM: DirectMessageConversation = {
      id: dmId,
      workspaceId: activeWorkspaceId,
      participantIds: allParticipants,
      isGroup,
      groupName: isGroup ? (groupName || 'Group Discussion') : undefined,
      unreadCount: 0,
      isStarred: starredDMs.has(dmId),
      lastActivity: new Date().toISOString(),
      status: 'accepted',
      invitedBy: currentUserId,
    };

    setDms((prev) => [newDM, ...prev]);
    setActiveView({ type: 'dm', id: newDM.id });

    if (!isGroup && otherUserId) {
      const targetUser = users.find((u) => u.id === otherUserId);
      addToast(`Direct message with ${targetUser?.name || 'user'} started`, 'success');
    } else {
      addToast('Group conversation started', 'success');
    }

    if (isSupabaseConfigured) {
      saveConversationToSupabase({
        id: newDM.id,
        workspaceId: activeWorkspaceId,
        isGroup,
        groupName: newDM.groupName,
        participantIds: allParticipants,
        createdBy: currentUserId,
      }).catch((err) => console.warn('Supabase saveConversation error:', err));
    }

    return newDM.id;
  }, [currentUserId, currentUser.name, users, dms, activeWorkspaceId, addToast]);

  const inviteToDMByEmail = useCallback(async (email: string): Promise<string | null> => {
    const clean = email.trim().toLowerCase();
    if (!clean) return null;
    let targetId = clean;
    const matched = users.find((u) => u.email.toLowerCase() === clean);
    if (matched) {
      targetId = matched.id;
    } else if (isSupabaseConfigured) {
      try {
        const resolved = await resolveUserByEmailOrUsername(clean);
        if (resolved) {
          targetId = resolved.id;
          if (!users.some((u) => u.id === resolved.id)) {
            setUsers((prev) => [
              ...prev,
              {
                id: resolved.id,
                name: resolved.name,
                username: resolved.username,
                email: resolved.email,
                avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80`,
                role: 'member',
                title: 'Team Member',
                isOnline: true,
                joinedDate: new Date().toISOString(),
              },
            ]);
          }
        } else {
          const syntheticName = clean.split('@')[0];
          targetId = 'user-' + clean.replace(/[^a-z0-9]/g, '-');
          setUsers((prev) => [
            ...prev,
            {
              id: targetId,
              name: syntheticName,
              username: syntheticName,
              email: clean,
              avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80`,
              role: 'member',
              title: 'Team Member',
              isOnline: true,
              joinedDate: new Date().toISOString(),
            },
          ]);
        }
      } catch (e) {}
    } else {
      const syntheticName = clean.split('@')[0];
      targetId = 'user-' + clean.replace(/[^a-z0-9]/g, '-');
      if (!users.some((u) => u.id === targetId || u.email.toLowerCase() === clean)) {
        setUsers((prev) => [
          ...prev,
          {
            id: targetId,
            name: syntheticName,
            username: syntheticName,
            email: clean,
            avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80`,
            role: 'member',
            title: 'Team Member',
            isOnline: true,
            joinedDate: new Date().toISOString(),
          },
        ]);
      }
    }

    const dmId = createOrOpenDM([targetId]);
    return dmId;
  }, [users, createOrOpenDM]);

  const sendChatInvite = useCallback(async (receiverId: string): Promise<boolean> => {
    if (receiverId === currentUserId) return false;
    const dmId = createOrOpenDM([receiverId]);
    return Boolean(dmId);
  }, [currentUserId, createOrOpenDM]);

  const acceptInvite = useCallback(async (inviteId: string) => {
    let inv = invites.find((i) => i.id === inviteId);
    if (!inv && isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('chat_invites').select('*').eq('id', inviteId).maybeSingle();
        if (data) {
          inv = {
            id: data.id,
            workspaceId: data.workspace_id,
            senderId: data.sender_id,
            receiverId: data.receiver_id,
            conversationId: data.conversation_id,
            channelId: data.channel_id,
            inviteType: data.invite_type || 'dm',
            status: data.status || 'pending',
            createdAt: data.created_at,
          };
        }
      } catch (e) {
        console.warn('Error fetching invite details:', e);
      }
    }
    if (!inv) return;

    setInvites((prev) =>
      prev.map((i) => (i.id === inviteId ? { ...i, status: 'accepted' } : i))
    );
    setNotifications((prev) => prev.filter((n) => n.id !== 'notif-inv-' + inviteId));

    if (isSupabaseConfigured) {
      updateInviteStatusInSupabase(inviteId, 'accepted').catch(() => {});
    }

    if (inv.inviteType === 'channel') {
      const targetChannelId = inv.channelId || inv.conversationId;
      const targetWorkspaceId = inv.workspaceId;

      if (isSupabaseConfigured) {
        // 1. Add user to workspace_members in Supabase
        if (targetWorkspaceId) {
          try {
            await supabase.from('workspace_members').upsert({
              workspace_id: targetWorkspaceId,
              user_id: currentUserId,
              role: 'member',
            }, { onConflict: 'workspace_id,user_id' });
          } catch (wmErr) {
            console.warn('Error adding user to workspace_members:', wmErr);
          }
        }

        // 2. Add user to channel_members in Supabase
        if (targetChannelId) {
          try {
            await supabase.from('channel_members').upsert({
              channel_id: targetChannelId,
              user_id: currentUserId,
              role: 'member',
            }, { onConflict: 'channel_id,user_id' });
          } catch (cmErr) {
            console.warn('Error adding user to channel_members:', cmErr);
          }
        }
      }

      // 3. Update workspaces state so target workspace is present & contains currentUserId in memberIds
      if (targetWorkspaceId) {
        let wsToJoin = workspaces.find((w) => w.id === targetWorkspaceId);

        if (!wsToJoin && isSupabaseConfigured) {
          try {
            const { data: wsData } = await supabase.from('workspaces').select('*').eq('id', targetWorkspaceId).maybeSingle();
            if (wsData) {
              wsToJoin = {
                id: wsData.id,
                name: wsData.name,
                slug: wsData.slug,
                icon: wsData.icon || '⚡',
                iconBg: wsData.icon_bg || '#4F8CFF',
                description: wsData.name + ' workspace',
                ownerId: wsData.created_by || 'system',
                memberIds: [currentUserId],
                membersCount: 1,
                plan: wsData.plan || 'Pro',
                createdAt: wsData.created_at || new Date().toISOString(),
              };
            }
          } catch (err) {}
        }

        if (wsToJoin) {
          const updatedWs: Workspace = {
            ...wsToJoin,
            memberIds: Array.from(new Set([...(wsToJoin.memberIds || []), currentUserId])),
            membersCount: Math.max(1, (wsToJoin.membersCount || 1) + 1),
          };
          setWorkspaces((prev) => {
            const exists = prev.some((w) => w.id === targetWorkspaceId);
            return exists
              ? prev.map((w) => (w.id === targetWorkspaceId ? updatedWs : w))
              : [...prev, updatedWs];
          });
        }

        // Switch to the target workspace
        setActiveWorkspaceIdState(targetWorkspaceId);
        localStorage.setItem(STORAGE_KEY_PREFIX + 'active_workspace', targetWorkspaceId);
      }

      // 4. Update channels state so target channel is present and memberIds includes currentUserId
      if (targetChannelId) {
        let chToJoin: Channel | undefined = channels.find((c) => c.id === targetChannelId);

        if (isSupabaseConfigured) {
          try {
            const remoteWsChannels = await fetchChannelsFromSupabase(targetWorkspaceId || activeWorkspaceId, currentUserId);
            if (remoteWsChannels.length > 0) {
              setChannels((prev) => {
                const map = new Map(prev.map((c) => [c.id, c]));
                remoteWsChannels.forEach((rc) => map.set(rc.id, rc));
                return Array.from(map.values());
              });
              chToJoin = remoteWsChannels.find((c) => c.id === targetChannelId) || chToJoin;
            } else {
              const { data: chData } = await supabase.from('channels').select('*').eq('id', targetChannelId).maybeSingle();
              if (chData) {
                chToJoin = {
                  id: chData.id,
                  workspaceId: chData.workspace_id,
                  name: chData.name,
                  topic: chData.topic || '',
                  description: chData.description || '',
                  isPrivate: Boolean(chData.is_private),
                  createdBy: chData.created_by || 'system',
                  memberIds: [currentUserId],
                  unreadCount: 0,
                  isStarred: false,
                  createdAt: chData.created_at || new Date().toISOString(),
                };
                setChannels((prev) => {
                  const exists = prev.some((c) => c.id === targetChannelId);
                  return exists
                    ? prev.map((c) => (c.id === targetChannelId ? chToJoin! : c))
                    : [...prev, chToJoin!];
                });
              }
            }
          } catch (err) {}
        } else {
          setChannels((prev) =>
            prev.map((c) =>
              c.id === targetChannelId
                ? { ...c, memberIds: Array.from(new Set([...(c.memberIds || []), currentUserId])) }
                : c
            )
          );
        }

        // Switch active view to this channel
        setActiveView({ type: 'channel', id: targetChannelId });
        localStorage.setItem(STORAGE_KEY_PREFIX + 'active_view', JSON.stringify({ type: 'channel', id: targetChannelId }));

        // 5. Fetch messages for this channel immediately so conversation appears populated
        if (isSupabaseConfigured) {
          fetchMessagesFromSupabase('channel', targetChannelId).then((remoteMsgs) => {
            if (remoteMsgs.length > 0) {
              setMessages((prev) => {
                const map = new Map(prev.map((m) => [m.id, m]));
                remoteMsgs.forEach((m) => map.set(m.id, m));
                return Array.from(map.values());
              });
            }
          }).catch(() => {});
        }
      }

      // Broadcast join event
      if (isSupabaseConfigured && realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'member_joined_channel',
          payload: { channelId: targetChannelId, workspaceId: targetWorkspaceId, userId: currentUserId },
        }).catch(() => {});
      }
      if (localBroadcastRef.current) {
        localBroadcastRef.current.postMessage({
          type: 'member_joined_channel',
          payload: { channelId: targetChannelId, workspaceId: targetWorkspaceId, userId: currentUserId },
        });
      }

      soundFX.playMessageReceived();
      addToast('Joined channel and workspace successfully!', 'success');
    } else {
      // DM invite accept
      const canonicalId = getCanonicalDMId(inv.senderId, currentUserId);
      const convId = inv.conversationId || canonicalId;

      setDms((prev) => {
        const matchingIndex = prev.findIndex((d) => d.id === convId || (!d.isGroup && d.participantIds.includes(inv.senderId) && d.participantIds.includes(currentUserId)));
        if (matchingIndex !== -1) {
          return prev.map((d, idx) => (idx === matchingIndex ? { ...d, status: 'accepted' } : d));
        } else {
          const newDM: DirectMessageConversation = {
            id: convId,
            workspaceId: inv.workspaceId || activeWorkspaceId,
            participantIds: [inv.senderId, currentUserId],
            isGroup: false,
            unreadCount: 0,
            isStarred: false,
            lastActivity: new Date().toISOString(),
            status: 'accepted',
          };
          return [newDM, ...prev];
        }
      });

      if (isSupabaseConfigured) {
        saveConversationToSupabase({
          id: convId,
          workspaceId: inv.workspaceId || activeWorkspaceId,
          isGroup: false,
          participantIds: [inv.senderId, currentUserId],
          createdBy: inv.senderId,
        }).catch(() => {});
      }

      setActiveView({ type: 'dm', id: convId });
      soundFX.playMessageReceived();
      addToast('Invitation accepted! You are now connected.', 'success');
    }
  }, [invites, workspaces, channels, currentUserId, activeWorkspaceId, isSupabaseConfigured, addToast]);

  const inviteUsersToChannel = useCallback(
    async (channelId: string, userIds: string[], customEmail?: string): Promise<boolean> => {
      const channel = channels.find((c) => c.id === channelId);
      if (!channel) return false;

      const wsId = channel.workspaceId || activeWorkspaceId;
      const currentWs = workspaces.find((w) => w.id === wsId);

      if (userIds.length > 0) {
        for (const uid of userIds) {
          const targetUser = users.find((u) => u.id === uid);
          const inv: ChatInvite = {
            id: 'inv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            workspaceId: wsId,
            senderId: currentUserId,
            receiverId: uid,
            receiverEmail: targetUser?.email,
            senderName: currentUser.name,
            channelName: channel.name,
            workspaceName: currentWs?.name,
            conversationId: channelId,
            channelId: channelId,
            inviteType: 'channel',
            status: 'pending',
            createdAt: new Date().toISOString(),
          };
          setInvites((prev) => [inv, ...prev.filter((i) => i.id !== inv.id)]);

          if (isSupabaseConfigured) {
            saveInviteToSupabase(inv).catch(() => {});
            if (realtimeChannelRef.current) {
              realtimeChannelRef.current.send({
                type: 'broadcast',
                event: 'new_invite',
                payload: inv,
              }).catch(() => {});
            }
          }

          if (localBroadcastRef.current) {
            localBroadcastRef.current.postMessage({ type: 'new_invite', payload: inv });
          }
        }
      }

      if (customEmail && customEmail.trim()) {
        const cleanEmail = customEmail.trim().toLowerCase();
        let matchedUser = users.find((u) => u.email.toLowerCase() === cleanEmail);
        let receiverTarget = matchedUser ? matchedUser.id : cleanEmail;

        if (!matchedUser && isSupabaseConfigured) {
          try {
            const resolved = await resolveUserByEmailOrUsername(cleanEmail);
            if (resolved) {
              receiverTarget = resolved.id;
              if (!users.some((u) => u.id === resolved.id)) {
                setUsers((prev) => [
                  ...prev,
                  {
                    id: resolved.id,
                    name: resolved.name,
                    username: resolved.username,
                    email: resolved.email,
                    avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80`,
                    role: 'member',
                    title: 'Team Member',
                    isOnline: true,
                    joinedDate: new Date().toISOString(),
                  },
                ]);
              }
            }
          } catch (e) {}
        }

        const inv: ChatInvite = {
          id: 'inv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          workspaceId: wsId,
          senderId: currentUserId,
          receiverId: receiverTarget,
          receiverEmail: cleanEmail,
          senderName: currentUser.name,
          channelName: channel.name,
          workspaceName: currentWs?.name,
          conversationId: channelId,
          channelId: channelId,
          inviteType: 'channel',
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        setInvites((prev) => [inv, ...prev.filter((i) => i.id !== inv.id)]);

        if (isSupabaseConfigured) {
          saveInviteToSupabase(inv).catch(() => {});
          if (realtimeChannelRef.current) {
            realtimeChannelRef.current.send({
              type: 'broadcast',
              event: 'new_invite',
              payload: inv,
            }).catch(() => {});
          }
        }

        if (localBroadcastRef.current) {
          localBroadcastRef.current.postMessage({ type: 'new_invite', payload: inv });
        }
      }

      soundFX.playMessageSent();
      addToast('Channel invitation sent successfully!', 'success');
      return true;
    },
    [channels, activeWorkspaceId, currentUserId, currentUser.name, users, workspaces, isSupabaseConfigured, addToast]
  );

  const declineInvite = useCallback(async (inviteId: string) => {
    const inv = invites.find((i) => i.id === inviteId);
    if (!inv) return;

    setInvites((prev) =>
      prev.map((i) => (i.id === inviteId ? { ...i, status: 'declined' } : i))
    );
    setNotifications((prev) => prev.filter((n) => n.id !== 'notif-inv-' + inviteId));

    if (inv.conversationId) {
      setDms((prev) =>
        prev.map((d) => (d.id === inv.conversationId ? { ...d, status: 'declined' } : d))
      );
    }

    if (isSupabaseConfigured) {
      await updateInviteStatusInSupabase(inviteId, 'declined');
    }

    addToast('Invitation declined', 'info');
  }, [invites, isSupabaseConfigured, addToast]);

  // Global screen localization helper
  const t = useCallback(
    (key: string) => {
      return getTranslation(key, selectedLanguage);
    },
    [selectedLanguage]
  );

  // Filter messages for active conversation and dynamically translate whole screen to selected language
  const activeConversationMessages = React.useMemo(() => {
    let dmParticipantIds: string[] | null = null;
    let canonicalDMId: string | null = null;
    if (activeView.type === 'dm') {
      const activeDM = dms.find((d) => d.id === activeView.id);
      if (activeDM && !activeDM.isGroup && activeDM.participantIds?.length === 2) {
        dmParticipantIds = activeDM.participantIds;
        canonicalDMId = getCanonicalDMId(activeDM.participantIds[0], activeDM.participantIds[1]);
      }
    }

    const raw = messages.filter((m) => {
      if (m.parentId) return false;
      if (m.hiddenForUserIds?.includes(currentUserId)) return false;
      if (activeView.type === 'channel') {
        return m.conversationType === 'channel' && m.conversationId === activeView.id;
      } else {
        if (m.conversationType !== 'dm') return false;
        if (m.conversationId === activeView.id) return true;
        if (canonicalDMId && m.conversationId === canonicalDMId) return true;
        if (dmParticipantIds && dmParticipantIds.length === 2) {
          const otherUserId = dmParticipantIds.find((id) => id !== currentUserId);
          if (otherUserId && (m.senderId === otherUserId || m.senderId === currentUserId)) {
            const msgDM = dms.find((d) => d.id === m.conversationId);
            if (msgDM && !msgDM.isGroup) {
              return (
                Array.isArray(msgDM.participantIds) &&
                msgDM.participantIds.includes(otherUserId) &&
                msgDM.participantIds.includes(currentUserId)
              );
            }
            if (m.conversationId.includes(otherUserId) || m.senderId === otherUserId) {
              return true;
            }
          }
        }
        return false;
      }
    });

    if (selectedLanguage === 'en') return raw;

    return raw.map((m) => ({
      ...m,
      content: translateText(m.content, selectedLanguage),
      isTranslated: true,
    }));
  }, [messages, activeView, dms, selectedLanguage, currentUserId]);

  const activeThreadMessage = React.useMemo(() => {
    if (!activeThreadMessageId) return null;
    const msg = messages.find((m) => m.id === activeThreadMessageId);
    if (!msg || msg.hiddenForUserIds?.includes(currentUserId)) return null;
    if (selectedLanguage === 'en') return msg;
    return {
      ...msg,
      content: translateText(msg.content, selectedLanguage),
      isTranslated: true,
    };
  }, [messages, activeThreadMessageId, selectedLanguage, currentUserId]);

  const threadReplies = React.useMemo(() => {
    if (!activeThreadMessageId) return [];
    const replies = messages.filter(
      (m) => m.parentId === activeThreadMessageId && !m.hiddenForUserIds?.includes(currentUserId)
    );
    if (selectedLanguage === 'en') return replies;
    return replies.map((m) => ({
      ...m,
      content: translateText(m.content, selectedLanguage),
      isTranslated: true,
    }));
  }, [messages, activeThreadMessageId, selectedLanguage, currentUserId]);

  // Real-time Notification Dispatcher
  const triggerLiveNotification = useCallback((customTitle?: string, customBody?: string) => {
    const sender = users.find((u) => u.id !== currentUserId) || users[1];
    const title = customTitle || `${sender.name} mentioned you in #general`;
    const body = customBody || 'Reviewing the real-time cluster benchmarks. The latency drop is incredible!';
    
    const newNotif: NotificationItem = {
      id: 'notif-live-' + Date.now(),
      userId: currentUserId,
      title,
      body,
      type: 'mention',
      timestamp: new Date().toISOString(),
      isRead: false,
      targetType: 'channel',
      targetId: 'ch-general',
    };

    setNotifications((prev) => [newNotif, ...prev]);
    soundFX.playMention();
    addToast(title, 'info');
  }, [currentUserId, users, addToast]);

  // Send Message with Anti-Flood Protection, Anti-XSS Sanitization & Real-time AES-256-GCM Encryption
  const sendMessage = useCallback(
    (content: string, attachments?: Attachment[]) => {
      if (!content.trim() && (!attachments || attachments.length === 0)) return;

      // WhatsApp Block Check: prevent sending to a blocked contact
      if (activeView.type === 'dm') {
        const activeDM = dms.find((d) => d.id === activeView.id);
        const otherId = activeDM && !activeDM.isGroup
          ? activeDM.participantIds.find((id) => id !== currentUserId)
          : null;
        if (otherId && blockedUserIds.includes(otherId)) {
          addToast('You cannot send messages to a blocked contact. Unblock them first.', 'warning');
          return;
        }
      }

      // Anti-Flooding / DoS rate limiter defense
      const rateCheck = rateLimiter.checkLimit();
      if (!rateCheck.allowed) {
        soundFX.playMention();
        addToast('Anti-flood shield active: Please slow down message sending to protect workspace stability.', 'warning');
        return;
      }

      // Anti-XSS & HTML Injection Sanitization
      const cleanContent = sanitizeInput(content.trim());
      const msgId = 'msg-' + Date.now();

      let targetConvId = activeView.id;
      if (activeView.type === 'dm') {
        const activeDM = dms.find((d) => d.id === activeView.id);
        if (activeDM && !activeDM.isGroup && activeDM.participantIds?.length === 2) {
          targetConvId = getCanonicalDMId(activeDM.participantIds[0], activeDM.participantIds[1]);
        }
      }

      const newMsg: Message = {
        id: msgId,
        conversationType: activeView.type,
        conversationId: targetConvId,
        senderId: currentUserId,
        content: cleanContent,
        timestamp: new Date().toISOString(),
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
        reactions: {},
        isEncrypted: true,
        deliveryStatus: 'sent',
      };

      // Encrypt message with AES-256-GCM and persist to Supabase
      encryptMessage(cleanContent, targetConvId).then((payload) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, encryptedPayload: payload } : m))
        );

        if (isSupabaseConfigured) {
          saveMessageToSupabase({
            id: msgId,
            workspaceId: activeWorkspaceId,
            conversationType: activeView.type,
            conversationId: targetConvId,
            senderId: currentUserId,
            content: cleanContent,
            attachments: attachments && attachments.length > 0 ? attachments : [],
            reactions: {},
            encryptedPayload: payload,
          }).catch((err) => {
            console.warn('Supabase saveMessage error:', err);
          });
        }
      });

      setMessages((prev) => [...prev, { ...newMsg, conversationId: activeView.id }]);
      soundFX.playMessageSent();

      // Immediately broadcast over live Supabase Realtime channel and local cross-tab channel
      try {
        if (isSupabaseConfigured && realtimeChannelRef.current) {
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'new_message',
            payload: newMsg,
          }).catch(() => {});
        }
      } catch (e) {}
      try {
        localBroadcastRef.current?.postMessage({
          type: 'new_message',
          payload: newMsg,
        });
      } catch (e) {}

      if (activeView.type === 'channel') {
        setChannels((prev) =>
          prev.map((c) => (c.id === activeView.id ? { ...c, unreadCount: 0 } : c))
        );
      } else {
        setDms((prev) =>
          prev.map((d) =>
            d.id === activeView.id
              ? { ...d, unreadCount: 0, lastActivity: new Date().toISOString() }
              : d
          )
        );
      }
    },
    [activeView, currentUserId, activeWorkspaceId, dms, blockedUserIds, addToast]
  );

  // Edit Message
  const editMessage = useCallback((messageId: string, newContent: string) => {
    const editedAt = new Date().toISOString();
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, content: newContent, editedAt }
          : m
      )
    );
    try {
      if (isSupabaseConfigured && realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'update_message',
          payload: { id: messageId, content: newContent, editedAt },
        }).catch(() => {});
      }
    } catch (e) {}
    try {
      localBroadcastRef.current?.postMessage({
        type: 'update_message',
        payload: { id: messageId, content: newContent, editedAt },
      });
    } catch (e) {}
    if (isSupabaseConfigured) {
      updateMessageInSupabase(messageId, { content: newContent }).catch((err) =>
        console.warn('Supabase editMessage notice:', err)
      );
    }
    addToast('Message edited', 'info');
  }, [addToast]);

  // Delete Message (Supports "delete for me" and "delete for everyone")
  const deleteMessage = useCallback(
    (messageId: string, mode: 'me' | 'everyone' = 'everyone') => {
      if (mode === 'me') {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === messageId) {
              const hidden = m.hiddenForUserIds || [];
              return {
                ...m,
                hiddenForUserIds: hidden.includes(currentUserId)
                  ? hidden
                  : [...hidden, currentUserId],
              };
            }
            return m;
          })
        );
        addToast('Message deleted for you', 'info');
      } else {
        setMessages((prev) =>
          prev.filter((m) => m.id !== messageId && m.parentId !== messageId)
        );
        try {
          if (isSupabaseConfigured && realtimeChannelRef.current) {
            realtimeChannelRef.current.send({
              type: 'broadcast',
              event: 'delete_message',
              payload: { id: messageId },
            }).catch(() => {});
          }
        } catch (e) {}
        try {
          localBroadcastRef.current?.postMessage({
            type: 'delete_message',
            payload: { id: messageId },
          });
        } catch (e) {}
        if (isSupabaseConfigured) {
          deleteMessageFromSupabase(messageId).catch(() => {});
        }
        addToast('Message deleted for everyone', 'info');
      }
    },
    [currentUserId, addToast]
  );

  // Toggle Reaction - Enforces single emoji reaction per user per message
  const toggleReaction = useCallback((messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;

        const currentReactors = m.reactions[emoji] || [];
        const hadReactedWithThisEmoji = currentReactors.includes(currentUserId);

        const newReactions: Record<string, string[]> = {};

        // 1. Remove current user from ALL emojis on this message
        Object.entries(m.reactions).forEach(([e, userIds]) => {
          const filtered = userIds.filter((id) => id !== currentUserId);
          if (filtered.length > 0) {
            newReactions[e] = filtered;
          }
        });

        // 2. If the user had not already reacted with this emoji, add them
        if (!hadReactedWithThisEmoji) {
          const existing = newReactions[emoji] || [];
          newReactions[emoji] = [...existing, currentUserId];
        }

        if (isSupabaseConfigured) {
          updateMessageInSupabase(messageId, { reactions: newReactions }).catch((err) =>
            console.warn('Supabase reaction notice:', err)
          );
        }

        try {
          if (isSupabaseConfigured && realtimeChannelRef.current) {
            realtimeChannelRef.current.send({
              type: 'broadcast',
              event: 'update_message',
              payload: { id: messageId, reactions: newReactions },
            }).catch(() => {});
          }
        } catch (e) {}
        try {
          localBroadcastRef.current?.postMessage({
            type: 'update_message',
            payload: { id: messageId, reactions: newReactions },
          });
        } catch (e) {}

        return { ...m, reactions: newReactions };
      })
    );
  }, [currentUserId]);

  // User-specific pin checker: ONLY returns true if current user pinned this message
  const isMessagePinnedByMe = useCallback((m: Message): boolean => {
    if (!m) return false;
    // Check locally persisted pinned IDs for this user
    if (pinnedMessageIds.has(m.id)) return true;

    // Check message pinnedBy metadata (reactions.__pinnedBy array or pinnedBy string)
    const pBy = m.pinnedBy || m.reactions?.__pinnedBy?.[0];
    const pByList = m.reactions?.__pinnedBy || (m.pinnedBy ? [m.pinnedBy] : []);

    const myId = currentUserId || currentUser?.id;
    const myEmail = currentUser?.email;

    if (myId && (pBy === myId || pByList.includes(myId))) return true;
    if (myEmail && (pBy === myEmail || pByList.includes(myEmail))) return true;

    return false;
  }, [pinnedMessageIds, currentUserId, currentUser]);

  // Toggle Pin (Personal / Private per-user pinning with single notification)
  const togglePinMessage = useCallback((messageId: string) => {
    let targetMsg: Message | undefined;

    setMessages((prev) => {
      targetMsg = prev.find((m) => m.id === messageId);
      return prev;
    });

    if (!targetMsg) return;

    const isCurrentlyPinned = isMessagePinnedByMe(targetMsg);
    const isNowPinned = !isCurrentlyPinned;

    // Update local user pin set and cache immediately
    setPinnedMessageIds((prev) => {
      const next = new Set(prev);
      if (isNowPinned) next.add(messageId);
      else next.delete(messageId);
      try {
        localStorage.setItem(`pulsechat_pins_${currentUserId || 'default'}`, JSON.stringify(Array.from(next)));
      } catch (e) {}
      return next;
    });

    const currentPinners: string[] = targetMsg.reactions?.__pinnedBy || (targetMsg.pinnedBy ? [targetMsg.pinnedBy] : []);
    let newPinners: string[];
    if (isNowPinned) {
      newPinners = Array.from(new Set([...currentPinners, currentUserId]));
    } else {
      newPinners = currentPinners.filter((id) => id !== currentUserId && id !== currentUser?.email && id !== currentUser?.id);
    }

    const newReactions = { ...targetMsg.reactions };
    if (newPinners.length > 0) {
      newReactions.__pinnedBy = newPinners;
    } else {
      delete newReactions.__pinnedBy;
    }

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        return {
          ...m,
          isPinned: newPinners.length > 0,
          pinnedBy: newPinners[0] || undefined,
          reactions: newReactions,
        };
      })
    );

    addToast(isNowPinned ? 'Message pinned to conversation' : 'Message unpinned', 'info');

    if (isSupabaseConfigured) {
      updateMessageInSupabase(messageId, {
        isPinned: newPinners.length > 0,
        reactions: newReactions,
      }).catch((err) => console.warn('Supabase pin notice:', err));
    }

    try {
      if (isSupabaseConfigured && realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'update_message',
          payload: {
            id: messageId,
            isPinned: newPinners.length > 0,
            pinnedBy: newPinners[0] || undefined,
            reactions: newReactions,
          },
        }).catch(() => {});
      }
    } catch (e) {}

    try {
      localBroadcastRef.current?.postMessage({
        type: 'update_message',
        payload: {
          id: messageId,
          isPinned: newPinners.length > 0,
          pinnedBy: newPinners[0] || undefined,
          reactions: newReactions,
        },
      });
    } catch (e) {}
  }, [currentUserId, currentUser, isMessagePinnedByMe, addToast]);

  // Thread Reply with Anti-Flood Protection and Encryption
  const sendThreadReply = useCallback(
    (parentMessageId: string, content: string) => {
      if (!content.trim()) return;

      const rateCheck = rateLimiter.checkLimit();
      if (!rateCheck.allowed) {
        addToast('Anti-flood shield active: Please slow down message sending.', 'warning');
        return;
      }

      const parentMsg = messages.find((m) => m.id === parentMessageId);
      if (!parentMsg) return;

      const cleanContent = sanitizeInput(content.trim());
      const replyId = 'msg-reply-' + Date.now();

      const replyMsg: Message = {
        id: replyId,
        conversationType: parentMsg.conversationType,
        conversationId: parentMsg.conversationId,
        senderId: currentUserId,
        content: cleanContent,
        timestamp: new Date().toISOString(),
        parentId: parentMessageId,
        reactions: {},
        isEncrypted: true,
        deliveryStatus: 'sent',
      };

      encryptMessage(cleanContent, parentMsg.conversationId).then((payload) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === replyId ? { ...m, encryptedPayload: payload } : m))
        );
        if (isSupabaseConfigured) {
          saveMessageToSupabase({
            id: replyId,
            workspaceId: activeWorkspaceId,
            conversationType: parentMsg.conversationType,
            conversationId: parentMsg.conversationId,
            senderId: currentUserId,
            content: cleanContent,
            parentId: parentMessageId,
            attachments: [],
            reactions: {},
            encryptedPayload: payload,
          }).catch((err) => console.warn('Supabase saveThreadReply notice:', err));
        }
      });

      setMessages((prev) => {
        const updated = prev.map((m) => {
          if (m.id === parentMessageId) {
            return {
              ...m,
              replyCount: (m.replyCount || 0) + 1,
              lastReplyAt: replyMsg.timestamp,
            };
          }
          return m;
        });
        return [...updated, replyMsg];
      });

      try {
        if (isSupabaseConfigured && realtimeChannelRef.current) {
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'new_message',
            payload: replyMsg,
          }).catch(() => {});
        }
      } catch (e) {}
      try {
        localBroadcastRef.current?.postMessage({
          type: 'new_message',
          payload: replyMsg,
        });
      } catch (e) {}

      soundFX.playMessageSent();
    },
    [currentUserId, activeWorkspaceId, messages, addToast]
  );

  const setSelfTyping = useCallback((_isTyping: boolean) => {
    // Socket emit hook
  }, []);

  // Google Meet integration
  const startGoogleMeet = useCallback(() => {
    setIsGoogleMeetOpen(true);
    soundFX.playHuddleToggle(true);
    addToast('Google Meet launcher initialized', 'info');
  }, [addToast]);

  // Translation helpers
  const translateActiveConversation = useCallback((lang: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        const original = m.originalContent || m.content;
        return {
          ...m,
          originalContent: original,
          content: translateText(original, lang),
          isTranslated: true,
          translatedLanguage: lang,
        };
      })
    );
  }, []);

  const translateSingleMessage = useCallback((messageId: string, lang: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const original = m.originalContent || m.content;
        const translated = translateText(original, lang);
        const updated = {
          ...m,
          originalContent: original,
          content: translated,
          isTranslated: true,
          translatedLanguage: lang,
        };
        if (isSupabaseConfigured) {
          updateMessageInSupabase(messageId, {
            content: translated,
          }).catch((err) => console.warn('Supabase translate message notice:', err));
        }
        return updated;
      })
    );
  }, []);

  const restoreOriginalSingleMessage = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const restoredContent = m.originalContent || m.content;
        const updated = {
          ...m,
          content: restoredContent,
          isTranslated: false,
          translatedLanguage: undefined,
        };
        if (isSupabaseConfigured) {
          updateMessageInSupabase(messageId, {
            content: restoredContent,
          }).catch((err) => console.warn('Supabase restore message notice:', err));
        }
        return updated;
      })
    );
  }, []);

  const resetTranslations = useCallback(() => {
    setMessages((prev) =>
      prev.map((m) => ({
        ...m,
        content: m.originalContent || m.content,
        isTranslated: false,
      }))
    );
  }, []);

  const toggleAIAssistant = useCallback(() => {
    setIsAIAssistantOpen((prev) => !prev);
  }, []);

  // Legacy huddle handlers
  const toggleHuddle = useCallback((_channelId?: string) => {
    startGoogleMeet();
  }, [startGoogleMeet]);

  const toggleHuddleMute = useCallback(() => {
    setHuddle((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

  const toggleHuddleScreenShare = useCallback(() => {
    setHuddle((prev) => ({ ...prev, isScreenSharing: !prev.isScreenSharing }));
  }, []);

  const leaveHuddle = useCallback(() => {
    setHuddle({
      isActive: false,
      participants: [],
      isMuted: false,
      isScreenSharing: false,
    });
  }, []);

  // Notifications
  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markNotificationAsRead = useCallback((id: string) => {
    // Once viewed, remove notification from notification center
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    addToast('All notifications cleared', 'info');
  }, [addToast]);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications([]);
    addToast('All notifications cleared', 'info');
  }, [addToast]);

  // Reset to default data
  const resetToDemoData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'users');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'workspaces');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'channels');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'dms');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'messages');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'notifications');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'active_workspace');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'active_view');
    localStorage.removeItem('pulsechat_current_user');

    setUsers([]);
    setWorkspaces(INITIAL_WORKSPACES);
    setChannels(INITIAL_CHANNELS);
    setDms([]);
    setMessages([]);
    setNotifications([]);
    addToast('Workspace data reset successfully', 'success');
  }, [addToast]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreateChannelOpen(false);
        setIsBrowseChannelsOpen(false);
        setIsNewDMOpen(false);
        setIsCreateWorkspaceOpen(false);
        setIsWorkspaceSettingsOpen(false);
        setIsUserProfileOpen(false);
        setIsGlobalSearchOpen(false);
        setIsKeyboardShortcutsOpen(false);
        setIsTranslationOpen(false);
        setIsAIAssistantOpen(false);
        setIsGoogleMeetOpen(false);
        setActiveThreadMessageId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-sync pending received invitations into notification center so bell badge shows
  useEffect(() => {
    if (!currentUserId || currentUserId === 'guest') return;

    const myPendingInvites = invites.filter(
      (inv) =>
        (inv.receiverId === currentUserId ||
          (currentUser.email && inv.receiverId.toLowerCase() === currentUser.email.toLowerCase())) &&
        inv.status === 'pending'
    );

    if (myPendingInvites.length === 0) return;

    setNotifications((prev) => {
      const updated = [...prev];
      let added = false;
      for (const inv of myPendingInvites) {
        const notifId = 'notif-inv-' + inv.id;
        if (!updated.some((n) => n.id === notifId)) {
          const sender = users.find((u) => u.id === inv.senderId);
          const senderName = sender ? sender.name : 'A team member';
          const isChan = inv.inviteType === 'channel';
          const targetChan = isChan ? channels.find((c) => c.id === inv.channelId || c.id === inv.conversationId) : null;
          const notifTitle = isChan
            ? `${senderName} invited you to join #${targetChan?.name || 'channel'}`
            : `${senderName} sent you a chat invite`;

          updated.unshift({
            id: notifId,
            userId: currentUserId,
            title: notifTitle,
            body: isChan
              ? `You were invited to join #${targetChan?.name || 'channel'}. Accept to start messaging.`
              : 'Direct message invitation received. Accept to connect.',
            type: 'invite',
            timestamp: inv.createdAt || new Date().toISOString(),
            isRead: false,
            targetType: isChan ? 'channel' : 'dm',
            targetId: inv.conversationId || inv.channelId || '',
          });
          added = true;
        }
      }
      return added ? updated : prev;
    });
  }, [invites, currentUserId, currentUser.email, users, channels]);

  const typingUsers = users.filter((u) => typingUserIds.includes(u.id));

  return (
    <ChatContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        switchUser,
        isAuthenticated,
        login,
        socialLogin,
        register,
        logout,
        updateCurrentUserProfile,
        users,

        // Chat Invitations (Slack style)
        invites,
        sendChatInvite,
        acceptInvite,
        declineInvite,
        isInviteChannelMembersOpen,
        setIsInviteChannelMembersOpen,
        inviteUsersToChannel,

        // Themes
        theme,
        setTheme,

        workspaces: userWorkspaces,
        activeWorkspace,
        setActiveWorkspaceId,
        createWorkspace,
        updateWorkspace,
        deleteWorkspace,

        channels,
        dms,
        activeView,
        setActiveView,
        createChannel,
        toggleStarChannel,
        toggleStarDM,
        createOrOpenDM,
        updateChannelDetails,
        deleteChannel,
        deleteDM,
        inviteToDMByEmail,

        blockedUserIds,
        blockUser,
        unblockUser,
        isUserBlocked,

        blockedChannelIds,
        blockChannel,
        unblockChannel,
        isChannelBlocked,

        blockedWorkspaceIds,
        blockWorkspace,
        unblockWorkspace,
        isWorkspaceBlocked,

        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebarCollapsed,

        messages,
        activeConversationMessages,
        sendMessage,
        editMessage,
        deleteMessage,
        toggleReaction,
        togglePinMessage,
        isMessagePinnedByMe,

        activeThreadMessage,
        setActiveThreadMessageId,
        threadReplies,
        sendThreadReply,

        typingUsers,
        setSelfTyping,

        isGoogleMeetOpen,
        setIsGoogleMeetOpen,
        startGoogleMeet,
        huddle,
        toggleHuddle,
        toggleHuddleMute,
        toggleHuddleScreenShare,
        leaveHuddle,

        isTranslationOpen,
        setIsTranslationOpen,
        selectedLanguage,
        setSelectedLanguage,
        autoTranslateEnabled,
        setAutoTranslateEnabled,
        translateActiveConversation,
        translateSingleMessage,
        restoreOriginalSingleMessage,
        resetTranslations,
        t,

        isAIAssistantOpen,
        setIsAIAssistantOpen,
        toggleAIAssistant,

        notifications,
        unreadNotificationsCount,
        markNotificationAsRead,
        removeNotification,
        markAllNotificationsAsRead,
        clearAllNotifications,
        triggerLiveNotification,

        isRightPanelOpen,
        setIsRightPanelOpen,
        rightPanelTab,
        setRightPanelTab,

        isCreateChannelOpen,
        setIsCreateChannelOpen,
        isBrowseChannelsOpen,
        setIsBrowseChannelsOpen,
        isNewDMOpen,
        setIsNewDMOpen,
        isCreateWorkspaceOpen,
        setIsCreateWorkspaceOpen,
        isWorkspaceSettingsOpen,
        setIsWorkspaceSettingsOpen,
        isUserProfileOpen,
        setIsUserProfileOpen,
        isGlobalSearchOpen,
        setIsGlobalSearchOpen,
        isKeyboardShortcutsOpen,
        setIsKeyboardShortcutsOpen,
        isSecurityModalOpen,
        setIsSecurityModalOpen,

        isSupabaseConfigured,
        isSupabaseConnected,

        searchQuery,
        setSearchQuery,

        toasts,
        addToast,
        removeToast,

        resetToDemoData,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
