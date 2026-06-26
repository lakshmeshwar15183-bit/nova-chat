import { io, Socket } from 'socket.io-client';
import { API_URL, tokenStore } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      autoConnect: false,
      transports: ['websocket'],
      auth: { token: tokenStore.get() },
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  s.auth = { token: tokenStore.get() };
  if (!s.connected) s.connect();
  return s;
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
