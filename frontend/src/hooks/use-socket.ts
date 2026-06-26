'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { connectSocket, disconnectSocket, refreshSocketAuth, SocketEvents } from '@/lib/socket';
import { useChatStore } from '@/store/chat-store';
import { useAuthStore } from '@/store/auth-store';
import { useConnectionStore } from '@/store/connection-store';
import type { Message } from '@/lib/types';

/**
 * Establishes the authenticated socket connection, binds gateway events to the
 * chat store, and manages connection resilience: exponential-backoff reconnect,
 * token re-auth, browser online/offline detection and offline sync (a full
 * conversation refetch once connectivity returns).
 */
export function useSocket() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { addMessage, updateMessage, removeMessage, setTyping, clearTyping, setUserOnline } =
    useChatStore();
  const { setStatus, markConnected } = useConnectionStore();

  useEffect(() => {
    if (!user) return;
    const socket = connectSocket();

    // ---- Connection lifecycle ---------------------------------------------
    const onConnect = () => {
      markConnected();
      // Offline sync: pull anything missed while disconnected.
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      const { activeConversationId } = useChatStore.getState();
      if (activeConversationId) {
        socket.emit('join_conversation', { conversationId: activeConversationId });
        socket.emit('mark_read', { conversationId: activeConversationId });
      }
    };
    const onDisconnect = () => setStatus('disconnected');
    const onReconnectAttempt = () => {
      refreshSocketAuth();
      setStatus('connecting');
    };

    // ---- Domain events -----------------------------------------------------
    const onMessage = (message: Message) => {
      addMessage(message);
      const { activeConversationId } = useChatStore.getState();
      if (message.conversationId !== activeConversationId && message.senderId !== user.id) {
        if (useAuthStore.getState().user?.settings?.soundEnabled) void playPing();
      }
    };
    const onUpdated = (message: Message) => updateMessage(message);
    const onDeleted = (p: { conversationId: string; messageId: string }) =>
      removeMessage(p.conversationId, p.messageId);
    const onReaction = (p: { messageId: string; reactions: Message['reactions'] }) => {
      const state = useChatStore.getState();
      for (const [cid, list] of Object.entries(state.messages)) {
        if (list.some((m) => m.id === p.messageId)) {
          updateMessage({ id: p.messageId, conversationId: cid, reactions: p.reactions });
          break;
        }
      }
    };
    const onTyping = (p: { conversationId: string; userId: string; username: string }) =>
      setTyping(p.conversationId, { userId: p.userId, username: p.username });
    const onStopTyping = (p: { conversationId: string; userId: string }) =>
      clearTyping(p.conversationId, p.userId);
    const onOnline = (p: { userId: string }) => setUserOnline(p.userId, true);
    const onOffline = (p: { userId: string }) => setUserOnline(p.userId, false);
    const onNotification = (n: { title: string; body?: string }) => {
      toast(n.title, { icon: '🔔' });
      showBrowserNotification(n.title, n.body);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.on(SocketEvents.MessageReceived, onMessage);
    socket.on(SocketEvents.MessageUpdated, onUpdated);
    socket.on(SocketEvents.MessageDeleted, onDeleted);
    socket.on(SocketEvents.MessageReaction, onReaction);
    socket.on(SocketEvents.Typing, onTyping);
    socket.on(SocketEvents.StopTyping, onStopTyping);
    socket.on(SocketEvents.UserOnline, onOnline);
    socket.on(SocketEvents.UserOffline, onOffline);
    socket.on(SocketEvents.Notification, onNotification);

    // ---- Browser connectivity ---------------------------------------------
    const onBrowserOffline = () => setStatus('offline');
    const onBrowserOnline = () => {
      setStatus('connecting');
      connectSocket();
    };
    window.addEventListener('offline', onBrowserOffline);
    window.addEventListener('online', onBrowserOnline);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.off(SocketEvents.MessageReceived, onMessage);
      socket.off(SocketEvents.MessageUpdated, onUpdated);
      socket.off(SocketEvents.MessageDeleted, onDeleted);
      socket.off(SocketEvents.MessageReaction, onReaction);
      socket.off(SocketEvents.Typing, onTyping);
      socket.off(SocketEvents.StopTyping, onStopTyping);
      socket.off(SocketEvents.UserOnline, onOnline);
      socket.off(SocketEvents.UserOffline, onOffline);
      socket.off(SocketEvents.Notification, onNotification);
      window.removeEventListener('offline', onBrowserOffline);
      window.removeEventListener('online', onBrowserOnline);
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
}

function showBrowserNotification(title: string, body?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/icon.png' });
  }
}

async function playPing() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    /* ignore */
  }
}
