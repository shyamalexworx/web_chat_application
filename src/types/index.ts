export type UserRole = 'owner' | 'admin' | 'member' | 'guest';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  role: UserRole;
  title: string;
  isOnline: boolean;
  statusEmoji?: string;
  statusText?: string;
  joinedDate: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  icon: string; // URL or abbreviation
  iconBg?: string;
  avatar?: string;
  memberIds?: string[];
  description: string;
  ownerId: string;
  membersCount: number;
  plan: 'Enterprise' | 'Pro' | 'Free';
  createdAt: string;
}

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  topic: string;
  description: string;
  avatar?: string;
  isPrivate: boolean;
  memberIds: string[];
  adminIds?: string[];
  createdBy: string;
  createdAt: string;
  unreadCount: number;
  isStarred: boolean;
  isMuted?: boolean;
}

export interface DirectMessageConversation {
  id: string;
  workspaceId: string;
  participantIds: string[];
  isGroup: boolean;
  groupName?: string;
  unreadCount: number;
  isStarred: boolean;
  lastActivity: string;
  status?: 'pending' | 'accepted' | 'declined';
  invitedBy?: string;
}

export interface ChatInvite {
  id: string;
  workspaceId?: string;
  senderId: string;
  receiverId: string;
  conversationId?: string;
  channelId?: string;
  inviteType: 'dm' | 'channel';
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  type: 'image' | 'video' | 'code' | 'document' | 'audio';
  url: string;
  previewUrl?: string;
  codeLanguage?: string;
  duration?: number; // Duration in seconds for audio/voice recordings
}

export interface ReactionMap {
  [emoji: string]: string[]; // array of userIds who reacted
}

export interface Message {
  id: string;
  conversationType: 'channel' | 'dm';
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: string; // ISO string
  editedAt?: string;
  attachments?: Attachment[];
  reactions: ReactionMap;
  replyCount?: number;
  lastReplyAt?: string;
  isPinned?: boolean;
  parentId?: string; // If this message is a reply in a thread
  isTranslated?: boolean;
  originalContent?: string;
  translatedLanguage?: string;
  hiddenForUserIds?: string[];
  isEncrypted?: boolean;
  encryptedPayload?: {
    ciphertext: string;
    iv: string;
    algorithm: string;
    keyFingerprint: string;
    timestamp?: string;
    authTagValid?: boolean;
  };
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'mention' | 'dm' | 'reaction' | 'invite' | 'system' | 'meet' | 'channel';
  timestamp: string;
  isRead: boolean;
  targetType: 'channel' | 'dm';
  targetId: string;
  messageId?: string;
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error' | 'warning';
}

export interface HuddleState {
  isActive: boolean;
  channelId?: string;
  channelName?: string;
  participants: string[];
  isMuted: boolean;
  isScreenSharing: boolean;
  startedAt?: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export type ActiveView = 
  | { type: 'channel'; id: string }
  | { type: 'dm'; id: string };
