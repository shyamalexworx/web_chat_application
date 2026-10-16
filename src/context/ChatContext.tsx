import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  updateProfileInSupabase,
  fetchInvitesFromSupabase,
  saveInviteToSupabase,
  updateInviteStatusInSupabase,
} from '../lib/supabase';

const STORAGE_KEY_PREFIX = 'pulsechat_v6_fresh_';

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
  deleteChannel: (channelId: string) => void;

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
  // Load state or default
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('pulsechat_auth') === 'true';
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem('pulsechat_current_user') || '';
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'workspaces');
    return saved ? JSON.parse(saved) : INITIAL_WORKSPACES;
  });

  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_PREFIX + 'active_workspace') || '';
  });

  const [channels, setChannels] = useState<Channel[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'channels');
    return saved ? JSON.parse(saved) : INITIAL_CHANNELS;
  });

  const [dms, setDms] = useState<DirectMessageConversation[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'dms');
    return saved ? JSON.parse(saved) : INITIAL_DMS;
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'messages');
    return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [invites, setInvites] = useState<ChatInvite[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'invites');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeView, setActiveView] = useState<ActiveView>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'active_view');
    return saved ? JSON.parse(saved) : { type: 'channel', id: '' };
  });

  // Mac-style collapsible channel sidebar (responsive: collapsed by default on mobile)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  const [activeThreadMessageId, setActiveThreadMessageId] = useState<string | null>(null);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);

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

  // Synchronize to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'workspaces', JSON.stringify(workspaces));
  }, [workspaces]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'channels', JSON.stringify(channels));
  }, [channels]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'dms', JSON.stringify(dms));
  }, [dms]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'invites', JSON.stringify(invites));
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
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Current User helper
  const currentUser = users.find((u) => u.id === currentUserId) || users[0] || GUEST_FALLBACK_USER;

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
    setUsers((prev) =>
      prev.map((u) => (u.id === currentUserId ? { ...u, ...updates } : u))
    );
    if (isSupabaseConfigured) {
      updateProfileInSupabase(currentUserId, updates).catch((err) =>
        console.warn('Supabase profile update notice:', err)
      );
    }
    addToast('Profile updated successfully', 'success');
  }, [currentUserId, addToast]);

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
          setWorkspaces(remoteWorkspaces);
          if (!remoteWorkspaces.some((w) => w.id === activeWorkspaceId)) {
            setActiveWorkspaceIdState(remoteWorkspaces[0].id);
          }
        }

        // 3. Fetch Profiles from Supabase
        const remoteProfiles = await fetchProfilesFromSupabase();
        if (isMounted && remoteProfiles.length > 0) {
          const mappedUsers: User[] = remoteProfiles.map((p) => ({
            id: p.id,
            name: p.full_name || p.username,
            username: p.username,
            email: p.email || p.username + '@pulsechat.io',
            avatar: resolveUserAvatar(p.avatar_url, p.full_name || p.username),
            role: p.role || 'member',
            title: p.title || 'Product Engineer',
            isOnline: Boolean(p.is_online),
            joinedDate: 'Joined recently',
          }));
          setUsers(mappedUsers);
        }

        // 4. Fetch Channels for workspace & user
        const remoteChannels = await fetchChannelsFromSupabase(activeWorkspaceId, uid);
        if (isMounted && remoteChannels.length > 0) {
          setChannels(remoteChannels);
        }

        // 4. Fetch Conversations (DMs & Groups) and Chat Invites for user
        if (uid) {
          const remoteDMs = await fetchConversationsFromSupabase(activeWorkspaceId, uid);
          if (isMounted && remoteDMs.length > 0) {
            setDms(remoteDMs);
          }

          const remoteInvites = await fetchInvitesFromSupabase(uid, currentUser.email);
          if (isMounted && remoteInvites.length > 0) {
            setInvites(remoteInvites);
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

    // Realtime channel across messages, channels, conversations, profiles, chat_invites
    const channel = supabase
      .channel('pulsechat_live_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new as any;
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

          if (isMounted) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === incomingMsg.id)) return prev;
              return [...prev, incomingMsg];
            });
            if (row.sender_id !== currentUserId) {
              soundFX.playMessageReceived();
              const sender = users.find((u) => u.id === row.sender_id);
              const senderName = sender ? sender.name : 'Team member';
              const isChannel = row.conversation_type === 'channel';
              const targetChan = isChannel ? channels.find((c) => c.id === row.conversation_id) : null;
              const notifTitle = isChannel
                ? `${senderName} in #${targetChan?.name || 'channel'}`
                : `New message from ${senderName}`;
              const notifBody = row.content || (row.attachments?.length ? 'Sent an attachment' : 'New message');

              const liveNotif: NotificationItem = {
                id: 'notif-msg-' + row.id,
                userId: currentUserId,
                title: notifTitle,
                body: notifBody.slice(0, 90),
                type: isChannel ? 'channel' : 'dm',
                timestamp: row.created_at || new Date().toISOString(),
                isRead: false,
                targetType: row.conversation_type,
                targetId: row.conversation_id,
              };
              setNotifications((prev) => [liveNotif, ...prev.filter((n) => n.id !== liveNotif.id)]);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new as any;
          if (isMounted) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === row.id
                  ? {
                      ...m,
                      content: row.content,
                      isPinned: Boolean(row.is_pinned),
                      reactions: row.reactions || {},
                      attachments: row.attachments || [],
                    }
                  : m
              )
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.old as any;
          if (row?.id && isMounted) {
            setMessages((prev) => prev.filter((m) => m.id !== row.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channels' },
        async () => {
          if (isMounted) {
            const updated = await fetchChannelsFromSupabase(activeWorkspaceId, currentUserId);
            if (updated.length > 0) setChannels(updated);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        async () => {
          if (isMounted) {
            const updated = await fetchConversationsFromSupabase(activeWorkspaceId, currentUserId);
            if (updated.length > 0) setDms(updated);
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
              const mappedUsers: User[] = updated.map((p) => ({
                id: p.id,
                name: p.full_name || p.username,
                username: p.username,
                email: p.email || p.username + '@pulsechat.io',
                avatar: resolveUserAvatar(p.avatar_url, p.full_name || p.username),
                role: p.role || 'member',
                title: p.title || 'Product Engineer',
                isOnline: Boolean(p.is_online),
                joinedDate: 'Joined recently',
              }));
              setUsers(mappedUsers);
            }
          }
        }
      )
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
              const isForMe = row && (
                row.receiver_id === currentUserId ||
                (currentUser.email && row.receiver_id?.toLowerCase() === currentUser.email.toLowerCase())
              );
              if (isForMe && row.sender_id !== currentUserId) {
                soundFX.playMessageReceived();
                const sender = users.find((u) => u.id === row.sender_id);
                const senderName = sender ? sender.name : 'A team member';
                const isChan = row.invite_type === 'channel';
                const notifTitle = isChan
                  ? `${senderName} invited you to join a channel`
                  : `${senderName} sent you a chat invite`;
                const notif: NotificationItem = {
                  id: 'notif-inv-' + row.id,
                  userId: currentUserId,
                  title: notifTitle,
                  body: 'Review your invitations in the sidebar to accept and connect.',
                  type: 'invite',
                  timestamp: row.created_at || new Date().toISOString(),
                  isRead: false,
                  targetType: isChan ? 'channel' : 'dm',
                  targetId: row.conversation_id || '',
                };
                setNotifications((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)]);
                addToast(notifTitle, 'info');
              }
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
      .on(
        'broadcast',
        { event: 'new_invite' },
        (payload) => {
          const inv = payload?.payload as ChatInvite;
          if (!inv) return;
          const isForMe =
            inv.receiverId === currentUserId ||
            (currentUser.email && inv.receiverId.toLowerCase() === currentUser.email.toLowerCase());
          if (isForMe && inv.senderId !== currentUserId && isMounted) {
            setInvites((prev) => [inv, ...prev.filter((i) => i.id !== inv.id)]);
            soundFX.playMessageReceived();
            const sender = users.find((u) => u.id === inv.senderId);
            const senderName = sender ? sender.name : 'A team member';
            const isChan = inv.inviteType === 'channel';
            const targetChan = isChan ? channels.find((c) => c.id === inv.channelId || c.id === inv.conversationId) : null;
            const notifTitle = isChan
              ? `${senderName} invited you to join #${targetChan?.name || 'channel'}`
              : `${senderName} sent you a chat invite`;
            const liveNotif: NotificationItem = {
              id: 'notif-inv-' + inv.id,
              userId: currentUserId,
              title: notifTitle,
              body: 'Review your invitations in the notification bell to accept and connect.',
              type: 'invite',
              timestamp: inv.createdAt || new Date().toISOString(),
              isRead: false,
              targetType: isChan ? 'channel' : 'dm',
              targetId: inv.conversationId || inv.channelId || '',
            };
            setNotifications((prev) => [liveNotif, ...prev.filter((n) => n.id !== liveNotif.id)]);
            addToast(notifTitle, 'info');
          }
        }
      )
      .subscribe();

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
      supabase.removeChannel(channel);
      authSub?.subscription?.unsubscribe();
    };
  }, [activeWorkspaceId, currentUserId]);

  // Load conversation messages on conversation switch
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let isMounted = true;
    fetchMessagesFromSupabase(activeView.type, activeView.id).then((remoteMsgs) => {
      if (isMounted && remoteMsgs.length > 0) {
        setMessages((prev) => {
          const map = new Map(prev.map((m) => [m.id, m]));
          remoteMsgs.forEach((m) => map.set(m.id, m));
          return Array.from(map.values());
        });
      }
    });
    return () => { isMounted = false; };
  }, [activeView.type, activeView.id]);

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
    return workspaces.filter((ws: Workspace) => {
      if (ws.ownerId === currentUserId) return true;
      if (ws.memberIds && ws.memberIds.includes(currentUserId)) return true;
      return false;
    });
  }, [workspaces, currentUserId]);

  // Active Workspace
  const activeWorkspace: Workspace = React.useMemo(() => {
    return userWorkspaces.find((w: Workspace) => w.id === activeWorkspaceId) || userWorkspaces[0] || EMPTY_WORKSPACE;
  }, [userWorkspaces, activeWorkspaceId]);

  const setActiveWorkspaceId = useCallback((id: string) => {
    setActiveWorkspaceIdState(id);
    const firstChan = channels.find((c) => c.workspaceId === id);
    if (firstChan) {
      setActiveView({ type: 'channel', id: firstChan.id });
    }
  }, [channels]);

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
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
    );
    if (isSupabaseConfigured) {
      updateWorkspaceInSupabase(id, { name: updates.name, iconBg: updates.iconBg }).catch((err) =>
        console.warn('Supabase updateWorkspace notice:', err)
      );
    }
    addToast('Workspace settings saved', 'success');
  }, [addToast]);

  const deleteWorkspace = useCallback(
    async (workspaceId: string) => {
      const wsChannelIds = new Set(channels.filter((c) => c.workspaceId === workspaceId).map((c) => c.id));
      const wsDmIds = new Set(dms.filter((d) => d.workspaceId === workspaceId).map((d) => d.id));

      setWorkspaces((prev) => prev.filter((w) => w.id !== workspaceId));
      setChannels((prev) => prev.filter((c) => c.workspaceId !== workspaceId));
      setDms((prev) => prev.filter((d) => d.workspaceId !== workspaceId));
      setMessages((prev) => prev.filter((m) => !wsChannelIds.has(m.conversationId) && !wsDmIds.has(m.conversationId)));

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
    [userWorkspaces, channels, currentUser, currentUserId, isSupabaseConfigured, addToast, setIsWorkspaceSettingsOpen]
  );

  // Channels
  const createChannel = useCallback(
    (name: string, topic: string, description: string, isPrivate: boolean, initialMemberIds?: string[]): Channel => {
      const cleanName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
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
    [activeWorkspaceId, currentUserId, addToast]
  );

  const toggleStarChannel = useCallback((channelId: string) => {
    setChannels((prev) =>
      prev.map((c) =>
        c.id === channelId ? { ...c, isStarred: !c.isStarred } : c
      )
    );
  }, []);

  const toggleStarDM = useCallback((dmId: string) => {
    setDms((prev) =>
      prev.map((d) =>
        d.id === dmId ? { ...d, isStarred: !d.isStarred } : d
      )
    );
  }, []);

  const updateChannelDetails = useCallback((channelId: string, updates: Partial<Channel>) => {
    setChannels((prev) =>
      prev.map((c) => (c.id === channelId ? { ...c, ...updates } : c))
    );
    if (isSupabaseConfigured) {
      updateChannelInSupabase(channelId, {
        name: updates.name,
        topic: updates.topic,
        description: updates.description,
      }).catch((err) => console.warn('Supabase updateChannel notice:', err));
    }
    addToast('Channel details updated', 'success');
  }, [addToast]);

  const deleteChannel = useCallback((channelId: string) => {
    setChannels((prev) => prev.filter((c) => c.id !== channelId));
    setMessages((prev) => prev.filter((m) => !(m.conversationType === 'channel' && m.conversationId === channelId)));
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
    addToast('Channel deleted successfully', 'info');
  }, [channels, activeWorkspaceId, addToast, setIsRightPanelOpen]);

  // Direct Messages
  const createOrOpenDM = useCallback((participantIds: string[], groupName?: string): string => {
    const allParticipants = Array.from(new Set([...participantIds, currentUserId]));
    
    const existing = dms.find((d) => {
      if (allParticipants.length === 2 && !d.isGroup) {
        return (
          d.participantIds.length === 2 &&
          d.participantIds.includes(participantIds[0]) &&
          d.participantIds.includes(currentUserId)
        );
      }
      return false;
    });

    if (existing) {
      setActiveView({ type: 'dm', id: existing.id });
      return existing.id;
    }

    const isGroup = allParticipants.length > 2;
    const otherUserId = participantIds.find((id) => id !== currentUserId) || participantIds[0];
    const newDM: DirectMessageConversation = {
      id: 'dm-' + Date.now(),
      workspaceId: activeWorkspaceId,
      participantIds: allParticipants,
      isGroup,
      groupName: isGroup ? (groupName || 'Group Discussion') : undefined,
      unreadCount: 0,
      isStarred: false,
      lastActivity: new Date().toISOString(),
      status: isGroup ? 'accepted' : 'pending',
      invitedBy: currentUserId,
    };

    setDms((prev) => [newDM, ...prev]);
    setActiveView({ type: 'dm', id: newDM.id });

    if (!isGroup && otherUserId) {
      const newInvite: ChatInvite = {
        id: 'inv-' + Date.now(),
        workspaceId: activeWorkspaceId,
        senderId: currentUserId,
        receiverId: otherUserId,
        conversationId: newDM.id,
        inviteType: 'dm',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      setInvites((prev) => [newInvite, ...prev.filter((i) => i.id !== newInvite.id)]);
      if (isSupabaseConfigured) {
        saveInviteToSupabase(newInvite).catch(() => {});
        supabase.channel('pulsechat_live_realtime').send({
          type: 'broadcast',
          event: 'new_invite',
          payload: newInvite,
        }).catch(() => {});
      }
      addToast('Chat invitation sent! Conversation unlocks once accepted.', 'info');
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
  }, [currentUserId, dms, activeWorkspaceId, addToast]);

  const sendChatInvite = useCallback(async (receiverId: string): Promise<boolean> => {
    if (receiverId === currentUserId) return false;
    const dmId = createOrOpenDM([receiverId]);
    return Boolean(dmId);
  }, [currentUserId, createOrOpenDM]);

  const acceptInvite = useCallback(async (inviteId: string) => {
    const inv = invites.find((i) => i.id === inviteId);
    if (!inv) return;

    setInvites((prev) =>
      prev.map((i) => (i.id === inviteId ? { ...i, status: 'accepted' } : i))
    );
    setNotifications((prev) => prev.filter((n) => n.id !== 'notif-inv-' + inviteId));

    if (inv.inviteType === 'channel' && inv.conversationId) {
      setChannels((prev) =>
        prev.map((c) =>
          c.id === inv.conversationId
            ? { ...c, memberIds: Array.from(new Set([...c.memberIds, currentUserId])) }
            : c
        )
      );
      setActiveView({ type: 'channel', id: inv.conversationId });
      if (isSupabaseConfigured) {
        const chan = channels.find((c) => c.id === inv.conversationId);
        if (chan) {
          updateChannelInSupabase(chan.id, {
            memberIds: Array.from(new Set([...chan.memberIds, currentUserId])),
          }).catch(() => {});
        }
      }
    } else if (inv.conversationId) {
      setDms((prev) =>
        prev.map((d) => (d.id === inv.conversationId ? { ...d, status: 'accepted' } : d))
      );
      setActiveView({ type: 'dm', id: inv.conversationId });
    } else {
      setDms((prev) =>
        prev.map((d) =>
          !d.isGroup &&
          d.participantIds.includes(inv.senderId) &&
          (d.participantIds.includes(inv.receiverId) || d.participantIds.includes(currentUserId))
            ? { ...d, status: 'accepted' }
            : d
        )
      );
    }

    if (isSupabaseConfigured) {
      await updateInviteStatusInSupabase(inviteId, 'accepted');
    }

    soundFX.playMessageReceived();
    addToast('Invitation accepted! You are now connected.', 'success');
  }, [invites, channels, currentUserId, isSupabaseConfigured, addToast]);

  const inviteUsersToChannel = useCallback(
    async (channelId: string, userIds: string[], customEmail?: string): Promise<boolean> => {
      const channel = channels.find((c) => c.id === channelId);
      if (!channel) return false;

      if (userIds.length > 0) {
        const updatedMemberIds = Array.from(new Set([...channel.memberIds, ...userIds]));
        setChannels((prev) =>
          prev.map((c) => (c.id === channelId ? { ...c, memberIds: updatedMemberIds } : c))
        );

        if (isSupabaseConfigured) {
          updateChannelInSupabase(channelId, { memberIds: updatedMemberIds }).catch((err) =>
            console.warn('Supabase updateChannel error:', err)
          );
        }

        for (const uid of userIds) {
          const inv: ChatInvite = {
            id: 'inv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            workspaceId: channel.workspaceId,
            senderId: currentUserId,
            receiverId: uid,
            conversationId: channelId,
            channelId: channelId,
            inviteType: 'channel',
            status: 'pending',
            createdAt: new Date().toISOString(),
          };
          setInvites((prev) => [inv, ...prev.filter((i) => i.id !== inv.id)]);
          if (isSupabaseConfigured) {
            saveInviteToSupabase(inv).catch(() => {});
            supabase.channel('pulsechat_live_realtime').send({
              type: 'broadcast',
              event: 'new_invite',
              payload: inv,
            }).catch(() => {});
          }
        }
      }

      if (customEmail && customEmail.trim()) {
        const cleanEmail = customEmail.trim().toLowerCase();
        const matchedUser = users.find((u) => u.email.toLowerCase() === cleanEmail);
        const receiverTarget = matchedUser ? matchedUser.id : cleanEmail;

        const inv: ChatInvite = {
          id: 'inv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          workspaceId: channel.workspaceId,
          senderId: currentUserId,
          receiverId: receiverTarget,
          conversationId: channelId,
          channelId: channelId,
          inviteType: 'channel',
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        setInvites((prev) => [inv, ...prev.filter((i) => i.id !== inv.id)]);
        if (isSupabaseConfigured) {
          saveInviteToSupabase(inv).catch(() => {});
          supabase.channel('pulsechat_live_realtime').send({
            type: 'broadcast',
            event: 'new_invite',
            payload: inv,
          }).catch(() => {});
        }
      }

      soundFX.playMessageSent();
      addToast('Channel invitation sent successfully!', 'success');
      return true;
    },
    [channels, currentUserId, users, isSupabaseConfigured, addToast]
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
  }, [invites, addToast]);

  // Global screen localization helper
  const t = useCallback(
    (key: string) => {
      return getTranslation(key, selectedLanguage);
    },
    [selectedLanguage]
  );

  // Filter messages for active conversation and dynamically translate whole screen to selected language
  const activeConversationMessages = React.useMemo(() => {
    const raw = messages.filter((m) => {
      if (m.parentId) return false;
      if (m.hiddenForUserIds?.includes(currentUserId)) return false;
      if (activeView.type === 'channel') {
        return m.conversationType === 'channel' && m.conversationId === activeView.id;
      } else {
        return m.conversationType === 'dm' && m.conversationId === activeView.id;
      }
    });

    if (selectedLanguage === 'en') return raw;

    return raw.map((m) => ({
      ...m,
      content: translateText(m.content, selectedLanguage),
      isTranslated: true,
    }));
  }, [messages, activeView, selectedLanguage, currentUserId]);

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

      const newMsg: Message = {
        id: msgId,
        conversationType: activeView.type,
        conversationId: activeView.id,
        senderId: currentUserId,
        content: cleanContent,
        timestamp: new Date().toISOString(),
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
        reactions: {},
        isEncrypted: true,
      };

      // Encrypt message with AES-256-GCM and persist to Supabase
      encryptMessage(cleanContent, activeView.id).then((payload) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, encryptedPayload: payload } : m))
        );

        if (isSupabaseConfigured) {
          saveMessageToSupabase({
            id: msgId,
            workspaceId: activeWorkspaceId,
            conversationType: activeView.type,
            conversationId: activeView.id,
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

      setMessages((prev) => [...prev, newMsg]);
      soundFX.playMessageSent();

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
    [activeView, currentUserId, activeWorkspaceId, addToast]
  );

  // Edit Message
  const editMessage = useCallback((messageId: string, newContent: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, content: newContent, editedAt: new Date().toISOString() }
          : m
      )
    );
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

        return { ...m, reactions: newReactions };
      })
    );
  }, [currentUserId]);

  // Toggle Pin
  const togglePinMessage = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const isNowPinned = !m.isPinned;
        if (isSupabaseConfigured) {
          updateMessageInSupabase(messageId, { isPinned: isNowPinned }).catch((err) =>
            console.warn('Supabase pin notice:', err)
          );
        }
        addToast(isNowPinned ? 'Message pinned to conversation' : 'Message unpinned', 'info');
        return { ...m, isPinned: isNowPinned };
      })
    );
  }, [addToast]);

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

      soundFX.playMessageSent();
    },
    [currentUserId, messages, addToast]
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
