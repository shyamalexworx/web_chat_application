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
import {
  isSupabaseConfigured,
  supabase,
  supabaseSignUp,
  supabaseSignIn,
  supabaseSignOut,
  fetchProfilesFromSupabase,
  fetchChannelsFromSupabase,
  saveChannelToSupabase,
  fetchConversationsFromSupabase,
  saveConversationToSupabase,
  fetchMessagesFromSupabase,
  saveMessageToSupabase,
  deleteMessageFromSupabase,
} from '../lib/supabase';

const STORAGE_KEY_PREFIX = 'pulsechat_v5_';

const GUEST_FALLBACK_USER: User = {
  id: 'guest',
  name: 'Team Member',
  username: 'member',
  email: 'member@pulsechat.io',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
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
  register: (name: string, email: string, username: string, password?: string) => Promise<boolean> | boolean;
  logout: () => void;
  updateCurrentUserProfile: (updates: Partial<User>) => void;
  users: User[];

  // Supabase Cloud State
  isSupabaseConfigured: boolean;
  isSupabaseConnected: boolean;

  // Workspaces
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  setActiveWorkspaceId: (id: string) => void;
  createWorkspace: (name: string, description: string, iconBg?: string) => Workspace;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;

  // Navigation & Channels
  channels: Channel[];
  dms: DirectMessageConversation[];
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  createChannel: (name: string, topic: string, description: string, isPrivate: boolean) => Channel;
  toggleStarChannel: (channelId: string) => void;
  toggleStarDM: (dmId: string) => void;
  createOrOpenDM: (participantIds: string[], groupName?: string) => string;
  updateChannelDetails: (channelId: string, updates: Partial<Channel>) => void;

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
    return localStorage.getItem(STORAGE_KEY_PREFIX + 'active_workspace') || 'ws-pulse';
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

  const [activeView, setActiveView] = useState<ActiveView>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'active_view');
    return saved ? JSON.parse(saved) : { type: 'channel', id: 'ch-general' };
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
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(isSupabaseConfigured);

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

        // 2. Fetch Profiles from Supabase
        const remoteProfiles = await fetchProfilesFromSupabase();
        if (isMounted && remoteProfiles.length > 0) {
          const mappedUsers: User[] = remoteProfiles.map((p) => ({
            id: p.id,
            name: p.full_name || p.username,
            username: p.username,
            email: p.username + '@pulsechat.io',
            avatar: p.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.username)}`,
            role: p.role || 'member',
            title: p.title || 'Product Engineer',
            isOnline: Boolean(p.is_online),
            joinedDate: 'Joined recently',
          }));
          setUsers(mappedUsers);
        }

        // 3. Fetch Channels for workspace & user
        const remoteChannels = await fetchChannelsFromSupabase(activeWorkspaceId, uid);
        if (isMounted && remoteChannels.length > 0) {
          setChannels(remoteChannels);
        }

        // 4. Fetch Conversations (DMs & Groups) for user
        if (uid) {
          const remoteDMs = await fetchConversationsFromSupabase(activeWorkspaceId, uid);
          if (isMounted && remoteDMs.length > 0) {
            setDms(remoteDMs);
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

    // Realtime channel across messages, channels, conversations, profiles
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
                email: p.username + '@pulsechat.io',
                avatar: p.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.username)}`,
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
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
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
      const cleanEmail = email.trim();

      if (isSupabaseConfigured) {
        try {
          const res = await supabaseSignIn(cleanEmail, password);
          if (res?.user) {
            const uid = res.user.id;
            setCurrentUserId(uid);
            setIsAuthenticated(true);
            localStorage.setItem('pulsechat_auth', 'true');
            addToast(`Welcome back!`, 'success');
            return true;
          }
        } catch (err: any) {
          console.warn('Sign in error:', err);
          addToast(err.message || 'Invalid email or password', 'error');
          return false;
        }
      }

      // Local fallback
      const existing = users.find((u) => u.email.toLowerCase() === cleanEmail.toLowerCase());
      if (existing) {
        setCurrentUserId(existing.id);
        setIsAuthenticated(true);
        localStorage.setItem('pulsechat_auth', 'true');
        addToast(`Welcome back, ${existing.name}!`, 'success');
        return true;
      }
      const newUser: User = {
        id: 'user-' + Date.now(),
        name: cleanEmail.split('@')[0],
        username: cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, ''),
        email: cleanEmail,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        role: 'member',
        title: 'Product Engineer',
        isOnline: true,
        joinedDate: 'Just now',
      };
      setUsers((prev) => [...prev, newUser]);
      setCurrentUserId(newUser.id);
      setIsAuthenticated(true);
      localStorage.setItem('pulsechat_auth', 'true');
      addToast(`Account created. Welcome to PulseChat!`, 'success');
      return true;
    },
    [users, addToast]
  );

  const register = useCallback(
    async (name: string, email: string, username: string, password?: string) => {
      const cleanEmail = email.trim();
      const cleanName = name.trim();
      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'member';

      if (isSupabaseConfigured) {
        try {
          const res = await supabaseSignUp({
            email: cleanEmail,
            password,
            fullName: cleanName,
            username: cleanUsername,
          });
          if (res?.user) {
            const uid = res.user.id;
            const newUser: User = {
              id: uid,
              name: cleanName,
              username: cleanUsername,
              email: cleanEmail,
              avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`,
              role: 'member',
              title: 'Fullstack Engineer',
              isOnline: true,
              joinedDate: 'Today',
            };
            setUsers((prev) => [newUser, ...prev.filter((u) => u.id !== uid)]);
            setCurrentUserId(uid);
            setIsAuthenticated(true);
            localStorage.setItem('pulsechat_auth', 'true');
            addToast(`Welcome to PulseChat, ${cleanName}!`, 'success');
            return true;
          }
        } catch (err: any) {
          console.warn('Sign up error:', err);
          addToast(err.message || 'Registration failed', 'error');
          return false;
        }
      }

      // Local fallback
      const newUser: User = {
        id: 'user-' + Date.now(),
        name: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`,
        role: 'member',
        title: 'Fullstack Engineer',
        isOnline: true,
        joinedDate: 'Just now',
      };
      setUsers((prev) => [...prev, newUser]);
      setCurrentUserId(newUser.id);
      setIsAuthenticated(true);
      localStorage.setItem('pulsechat_auth', 'true');
      addToast(`Welcome to PulseChat, ${cleanName}!`, 'success');
      return true;
    },
    [addToast]
  );

  const logout = useCallback(() => {
    if (isSupabaseConfigured) {
      supabaseSignOut(currentUserId).catch(() => {});
    }
    setIsAuthenticated(false);
    localStorage.setItem('pulsechat_auth', 'false');
    addToast('Logged out successfully', 'info');
  }, [currentUserId, addToast]);

  // Active Workspace
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || INITIAL_WORKSPACES[0];

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
    return newWs;
  }, [currentUserId, addToast]);

  const updateWorkspace = useCallback((id: string, updates: Partial<Workspace>) => {
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
    );
    addToast('Workspace settings saved', 'success');
  }, [addToast]);

  // Channels
  const createChannel = useCallback(
    (name: string, topic: string, description: string, isPrivate: boolean): Channel => {
      const cleanName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      const newChannel: Channel = {
        id: 'ch-' + Date.now(),
        workspaceId: activeWorkspaceId,
        name: cleanName,
        topic: topic || `Discussion topic for #${cleanName}`,
        description: description || `Welcome to #${cleanName}!`,
        isPrivate,
        memberIds: [currentUserId],
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
    addToast('Channel details updated', 'success');
  }, [addToast]);

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
    const newDM: DirectMessageConversation = {
      id: 'dm-' + Date.now(),
      workspaceId: activeWorkspaceId,
      participantIds: allParticipants,
      isGroup,
      groupName: isGroup ? (groupName || 'Group Discussion') : undefined,
      unreadCount: 0,
      isStarred: false,
      lastActivity: new Date().toISOString(),
    };

    setDms((prev) => [newDM, ...prev]);
    setActiveView({ type: 'dm', id: newDM.id });
    addToast('Conversation started', 'info');

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

  // Toggle Reaction
  const toggleReaction = useCallback((messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;

        const currentReactors = m.reactions[emoji] || [];
        const hasReacted = currentReactors.includes(currentUserId);

        const newReactions = { ...m.reactions };
        if (hasReacted) {
          const filtered = currentReactors.filter((id) => id !== currentUserId);
          if (filtered.length === 0) {
            delete newReactions[emoji];
          } else {
            newReactions[emoji] = filtered;
          }
        } else {
          newReactions[emoji] = [...currentReactors, currentUserId];
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

  const typingUsers = users.filter((u) => typingUserIds.includes(u.id));

  return (
    <ChatContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        switchUser,
        isAuthenticated,
        login,
        register,
        logout,
        updateCurrentUserProfile,
        users,

        workspaces,
        activeWorkspace,
        setActiveWorkspaceId,
        createWorkspace,
        updateWorkspace,

        channels,
        dms,
        activeView,
        setActiveView,
        createChannel,
        toggleStarChannel,
        toggleStarDM,
        createOrOpenDM,
        updateChannelDetails,

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
