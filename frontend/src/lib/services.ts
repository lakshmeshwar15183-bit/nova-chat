import { api, unwrap } from './api';
import type {
  AppNotification,
  AuthResponse,
  Contact,
  Conversation,
  Draft,
  Group,
  LinkPreview,
  LoginResult,
  Message,
  PaginatedMessages,
  PollResult,
  ScheduledMessage,
  TwoFactorSetup,
  TwoFactorStatus,
  User,
  UserSettings,
} from './types';

// ---- Auth -------------------------------------------------------------------

export const authService = {
  register: (data: { email: string; username: string; displayName: string; password: string }) =>
    unwrap<{ message: string; userId: string; email: string }>(api.post('/auth/register', data)),
  login: (data: { identifier: string; password: string }) =>
    unwrap<LoginResult>(api.post('/auth/login', data)),
  verifyTwoFactorLogin: (data: { challengeToken: string; code: string }) =>
    unwrap<AuthResponse>(api.post('/auth/2fa/verify-login', data)),
  verifyEmail: (data: { email: string; code: string }) =>
    unwrap<AuthResponse>(api.post('/auth/verify-email', data)),
  resendOtp: (email: string) => unwrap(api.post('/auth/resend-otp', { email })),
  forgotPassword: (email: string) => unwrap(api.post('/auth/forgot-password', { email })),
  resetPassword: (data: { email: string; code: string; newPassword: string }) =>
    unwrap(api.post('/auth/reset-password', data)),
  logout: () => unwrap(api.post('/auth/logout')),
  sessions: () => unwrap(api.get('/auth/sessions')),
};

// ---- Two-factor authentication ---------------------------------------------

export const twoFactorService = {
  status: () => unwrap<TwoFactorStatus>(api.get('/auth/2fa/status')),
  setup: () => unwrap<TwoFactorSetup>(api.post('/auth/2fa/setup')),
  enable: (code: string) =>
    unwrap<{ backupCodes: string[] }>(api.post('/auth/2fa/enable', { code })),
  disable: (code: string) => unwrap<{ disabled: true }>(api.post('/auth/2fa/disable', { code })),
};

// ---- Users / profile --------------------------------------------------------

export const userService = {
  me: () => unwrap<User>(api.get('/users/me')),
  search: (q: string) => unwrap<User[]>(api.get('/users/search', { params: { q } })),
  getById: (id: string) => unwrap<User>(api.get(`/users/${id}`)),
  updateProfile: (data: Partial<{ displayName: string; bio: string; avatarUrl: string }>) =>
    unwrap<User>(api.patch('/users/me/profile', data)),
  updatePrivacy: (data: Record<string, unknown>) =>
    unwrap<User>(api.patch('/users/me/privacy', data)),
};

// ---- Contacts ---------------------------------------------------------------

export const contactService = {
  list: () => unwrap<Contact[]>(api.get('/contacts')),
  blocked: () => unwrap<Contact[]>(api.get('/contacts/blocked')),
  add: (targetId: string, alias?: string) => unwrap(api.post('/contacts', { targetId, alias })),
  remove: (targetId: string) => unwrap(api.delete(`/contacts/${targetId}`)),
  block: (targetId: string) => unwrap(api.post('/contacts/block', { targetId })),
  unblock: (targetId: string) => unwrap(api.post('/contacts/unblock', { targetId })),
};

// ---- Conversations ----------------------------------------------------------

export const conversationService = {
  list: (archived = false) =>
    unwrap<Conversation[]>(api.get('/conversations', { params: { archived } })),
  get: (id: string) => unwrap<Conversation>(api.get(`/conversations/${id}`)),
  createDirect: (participantId: string) =>
    unwrap<Conversation>(api.post('/conversations/direct', { participantId })),
  updateState: (
    id: string,
    data: Partial<{ isPinned: boolean; isArchived: boolean; isMuted: boolean }>,
  ) => unwrap<Conversation>(api.patch(`/conversations/${id}/state`, data)),
  markRead: (id: string) => unwrap(api.post(`/conversations/${id}/read`)),
};

// ---- Messages ---------------------------------------------------------------

export const messageService = {
  list: (conversationId: string, cursor?: string, limit = 30) =>
    unwrap<PaginatedMessages>(
      api.get(`/conversations/${conversationId}/messages`, { params: { cursor, limit } }),
    ),
  send: (
    conversationId: string,
    data: { content?: string; type?: string; replyToId?: string; attachments?: unknown[] },
  ) => unwrap<Message>(api.post(`/conversations/${conversationId}/messages`, data)),
  edit: (id: string, content: string, version?: number) =>
    unwrap<Message>(api.patch(`/messages/${id}`, { content, version })),
  deleteForMe: (id: string) => unwrap(api.delete(`/messages/${id}/me`)),
  deleteForEveryone: (id: string) => unwrap(api.delete(`/messages/${id}/everyone`)),
  forward: (id: string, conversationIds: string[]) =>
    unwrap<Message[]>(api.post(`/messages/${id}/forward`, { conversationIds })),
  react: (id: string, emoji: string) => unwrap(api.post(`/messages/${id}/react`, { emoji })),
  star: (id: string) =>
    unwrap<{ messageId: string; starred: boolean }>(api.post(`/messages/${id}/star`)),
  starred: () => unwrap(api.get('/messages/starred')),
  pin: (id: string) =>
    unwrap<{ messageId: string; pinned: boolean }>(api.post(`/messages/${id}/pin`)),
  listPinned: (conversationId: string) =>
    unwrap<Message[]>(api.get(`/conversations/${conversationId}/pinned`)),
  history: (id: string) =>
    unwrap<{ id: string; previousContent: string | null; editedAt: string }[]>(
      api.get(`/messages/${id}/history`),
    ),
};

// ---- Drafts -----------------------------------------------------------------

export const draftService = {
  get: (conversationId: string) =>
    unwrap<Draft | null>(api.get(`/conversations/${conversationId}/draft`)),
  save: (conversationId: string, content: string) =>
    unwrap<Draft>(api.put(`/conversations/${conversationId}/draft`, { content })),
  remove: (conversationId: string) => unwrap(api.delete(`/conversations/${conversationId}/draft`)),
};

// ---- Polls ------------------------------------------------------------------

export const pollService = {
  create: (
    conversationId: string,
    data: {
      question: string;
      options: string[];
      allowMultiple?: boolean;
      closesInSeconds?: number;
    },
  ) => unwrap<PollResult>(api.post(`/conversations/${conversationId}/polls`, data)),
  results: (pollId: string) => unwrap<PollResult>(api.get(`/polls/${pollId}`)),
  vote: (pollId: string, optionIds: string[]) =>
    unwrap<PollResult>(api.post(`/polls/${pollId}/vote`, { optionIds })),
  close: (pollId: string) => unwrap<PollResult>(api.post(`/polls/${pollId}/close`)),
};

// ---- Scheduled messages -----------------------------------------------------

export const scheduledService = {
  list: () => unwrap<ScheduledMessage[]>(api.get('/scheduled-messages')),
  create: (conversationId: string, data: { content: string; scheduledFor: string }) =>
    unwrap<ScheduledMessage>(api.post(`/conversations/${conversationId}/scheduled-messages`, data)),
  cancel: (id: string) => unwrap(api.delete(`/scheduled-messages/${id}`)),
};

// ---- Link previews ----------------------------------------------------------

export const linkPreviewService = {
  get: (url: string) => unwrap<LinkPreview>(api.get('/link-preview', { params: { url } })),
};

// ---- Groups -----------------------------------------------------------------

export const groupService = {
  create: (data: { name: string; description?: string; avatarUrl?: string; memberIds: string[] }) =>
    unwrap<Group>(api.post('/groups', data)),
  get: (id: string) => unwrap<Group>(api.get(`/groups/${id}`)),
  update: (id: string, data: Record<string, unknown>) =>
    unwrap<Group>(api.patch(`/groups/${id}`, data)),
  addMembers: (id: string, memberIds: string[]) =>
    unwrap<Group>(api.post(`/groups/${id}/members`, { memberIds })),
  removeMember: (id: string, memberId: string) =>
    unwrap(api.delete(`/groups/${id}/members/${memberId}`)),
  updateRole: (id: string, memberId: string, role: string) =>
    unwrap<Group>(api.patch(`/groups/${id}/members/${memberId}/role`, { role })),
  leave: (id: string) => unwrap(api.post(`/groups/${id}/leave`)),
  createInvite: (id: string, data: { maxUses?: number; expiresInSeconds?: number }) =>
    unwrap<{ code: string }>(api.post(`/groups/${id}/invites`, data)),
  join: (code: string) => unwrap<{ conversationId: string }>(api.post(`/groups/join/${code}`)),
};

// ---- Uploads ----------------------------------------------------------------

export const uploadService = {
  avatar: (file: File) => uploadFile('/uploads/avatar', file),
  media: (file: File) => uploadFile('/uploads/media', file),
};

async function uploadFile(url: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  return unwrap<{ url: string; fileName: string; mimeType: string; size: number; type: string }>(
    api.post(url, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  );
}

// ---- Search / notifications / settings -------------------------------------

export const searchService = {
  all: (q: string) => unwrap(api.get('/search', { params: { q } })),
  media: (conversationId: string) => unwrap(api.get(`/search/media/${conversationId}`)),
};

export const notificationService = {
  list: () => unwrap<AppNotification[]>(api.get('/notifications')),
  count: () => unwrap<number>(api.get('/notifications/count')),
  markRead: (id: string) => unwrap(api.post(`/notifications/${id}/read`)),
  markAllRead: () => unwrap(api.post('/notifications/read-all')),
};

export const settingsService = {
  get: () => unwrap<UserSettings>(api.get('/settings')),
  update: (data: Partial<UserSettings>) => unwrap<UserSettings>(api.patch('/settings', data)),
};
