import { io, Socket } from 'socket.io-client';
import { API_URL, tokenStore } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      autoConnect: false,
      transports: ['websocket'],
      auth: { token: tokenStore.get() },
      // Resilient reconnection with exponential backoff (no polling).
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
      timeout: 10000,
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  // Always attach the freshest access token before (re)connecting.
  s.auth = { token: tokenStore.get() };
  if (!s.connected) s.connect();
  return s;
}

/** Refreshes the auth token on the live socket so reconnects stay authenticated. */
export function refreshSocketAuth(): void {
  if (socket) socket.auth = { token: tokenStore.get() };
}

export function disconnectSocket() {
  socket?.disconnect();
}

/** Socket event names shared with the backend gateway. */
export const SocketEvents = {
  MessageReceived: 'message_received',
  MessageUpdated: 'message_updated',
  MessageDeleted: 'message_deleted',
  MessageReaction: 'message_reaction',
  MessagePinned: 'message_pinned',
  MessageUnpinned: 'message_unpinned',
  PollUpdated: 'poll_updated',
  Typing: 'typing',
  StopTyping: 'stop_typing',
  ReadReceipt: 'read_receipt',
  UserOnline: 'user_online',
  UserOffline: 'user_offline',
  Notification: 'notification',
  CallStarted: 'call_started',
  CallSignal: 'call_signal',
  CallEnded: 'call_ended',
  GroupUpdated: 'group_updated',
  GroupMembersChanged: 'group_members_changed',
} as const;
