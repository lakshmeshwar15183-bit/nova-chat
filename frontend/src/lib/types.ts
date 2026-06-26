export type ConversationType = 'DIRECT' | 'GROUP';
export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'VOICE' | 'DOCUMENT' | 'SYSTEM';
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';
export type AttachmentType =
  | 'IMAGE'
  | 'VIDEO'
  | 'AUDIO'
  | 'VOICE'
  | 'PDF'
  | 'ZIP'
  | 'DOCUMENT';
export type GroupRole = 'MEMBER' | 'ADMIN' | 'OWNER';
export type ThemePreference = 'LIGHT' | 'DARK' | 'SYSTEM';

export interface Profile {
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  readReceiptsEnabled?: boolean;
}

export interface User {
  id: string;
  email: string;
  username: string;
  status: 'ONLINE' | 'OFFLINE' | 'AWAY';
  lastSeenAt?: string | null;
  profile: Profile;
  isOnline?: boolean;
  settings?: UserSettings;
}

export interface UserSettings {
  theme: ThemePreference;
  language: string;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  desktopNotifications: boolean;
  enterToSend: boolean;
}

export interface Attachment {
  id: string;
  type: AttachmentType;
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  thumbnailUrl?: string;
}

export interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  user?: { id: string; username: string };
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string | null;
  sender?: { id: string; username: string; profile?: Profile } | null;
  type: MessageType;
  content: string | null;
  status: MessageStatus;
  isEdited: boolean;
  editedAt?: string | null;
  deletedForEveryone: boolean;
  replyTo?: Partial<Message> & { sender?: { username: string; profile?: Profile } };
  forwardedFromId?: string | null;
  attachments: Attachment[];
  reactions: Reaction[];
  starred?: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  title?: string;
  avatarUrl?: string | null;
  counterpart?: User | null;
  group?: Group | null;
  participants: User[];
  lastMessage?: Message | null;
  lastMessageAt?: string | null;
  isPinned: boolean;
  isArchived: boolean;
  isMuted: boolean;
  lastReadAt?: string | null;
  unreadCount: number;
  online: boolean;
}

export interface GroupMember {
  id: string;
  userId: string;
  role: GroupRole;
  user?: { id: string; username: string; profile?: Profile };
}

export interface Group {
  id: string;
  conversationId: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  ownerId: string;
  onlyAdminsCanMessage: boolean;
  onlyAdminsCanEditInfo: boolean;
  members?: GroupMember[];
}

export interface Contact {
  id: string;
  username: string;
  alias?: string | null;
  profile: Profile;
  status?: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface PaginatedMessages {
  items: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}
