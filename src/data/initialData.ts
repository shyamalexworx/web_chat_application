import type { User, Workspace, Channel, DirectMessageConversation, Message, NotificationItem } from '../types';

export const INITIAL_USERS: User[] = [];

export const INITIAL_WORKSPACES: Workspace[] = [
  {
    id: 'ws-pulse',
    name: 'PulseChat Workspace',
    slug: 'pulsechat-workspace',
    icon: 'PC',
    iconBg: '#4F8CFF',
    description: 'Main Team Workspace',
    ownerId: '',
    membersCount: 1,
    plan: 'Enterprise',
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_CHANNELS: Channel[] = [
  {
    id: 'ch-general',
    workspaceId: 'ws-pulse',
    name: 'general',
    topic: 'Company-wide announcements and team collaboration',
    description: 'Welcome to the #general channel. Start the conversation here!',
    isPrivate: false,
    memberIds: [],
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    unreadCount: 0,
    isStarred: true,
  },
  {
    id: 'ch-random',
    workspaceId: 'ws-pulse',
    name: 'random',
    topic: 'Casual chatter, links, and discussions',
    description: 'Non-work banter and friendly talk.',
    isPrivate: false,
    memberIds: [],
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    unreadCount: 0,
    isStarred: false,
  },
];

export const INITIAL_DMS: DirectMessageConversation[] = [];

export const INITIAL_MESSAGES: Message[] = [];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
