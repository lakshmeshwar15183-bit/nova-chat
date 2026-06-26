import { create } from 'zustand';
import type { Conversation, Message } from '@/lib/types';

interface TypingState {
  [conversationId: string]: { userId: string; username: string }[];
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  typing: TypingState;
  onlineUsers: Set<string>;

  setConversations: (conversations: Conversation[]) => void;
  upsertConversation: (conversation: Conversation) => void;
  setActiveConversation: (id: string | null) => void;

  setMessages: (conversationId: string, messages: Message[]) => void;
  prependMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (message: Partial<Message> & { id: string; conversationId: string }) => void;
  removeMessage: (conversationId: string, messageId: string) => void;

  setTyping: (conversationId: string, user: { userId: string; username: string }) => void;
  clearTyping: (conversationId: string, userId: string) => void;

  setUserOnline: (userId: string, online: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  typing: {},
  onlineUsers: new Set(),

  setConversations: (conversations) => set({ conversations }),

  upsertConversation: (conversation) =>
    set((state) => {
      const others = state.conversations.filter((c) => c.id !== conversation.id);
      const next = [conversation, ...others];
      next.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bt - at;
      });
      return { conversations: next };
    }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setMessages: (conversationId, messages) =>
    set((state) => ({ messages: { ...state.messages, [conversationId]: messages } })),

  prependMessages: (conversationId, older) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...older, ...(state.messages[conversationId] || [])],
      },
    })),

  addMessage: (message) =>
    set((state) => {
      const existing = state.messages[message.conversationId] || [];
      if (existing.some((m) => m.id === message.id)) return state;
      // Replace optimistic temp message if present.
      const withoutTemp = existing.filter((m) => !m.id.startsWith('temp-'));
      return {
        messages: {
          ...state.messages,
          [message.conversationId]: [...withoutTemp, message],
        },
        conversations: state.conversations.map((c) =>
          c.id === message.conversationId
            ? { ...c, lastMessage: message, lastMessageAt: message.createdAt }
            : c,
        ),
      };
    }),

  updateMessage: (message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [message.conversationId]: (state.messages[message.conversationId] || []).map((m) =>
          m.id === message.id ? { ...m, ...message } : m,
        ),
      },
    })),

  removeMessage: (conversationId, messageId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((m) =>
          m.id === messageId
            ? { ...m, deletedForEveryone: true, content: null, attachments: [] }
            : m,
        ),
      },
    })),

  setTyping: (conversationId, user) =>
    set((state) => {
      const current = state.typing[conversationId] || [];
      if (current.some((u) => u.userId === user.userId)) return state;
      return { typing: { ...state.typing, [conversationId]: [...current, user] } };
    }),

  clearTyping: (conversationId, userId) =>
    set((state) => ({
      typing: {
        ...state.typing,
        [conversationId]: (state.typing[conversationId] || []).filter((u) => u.userId !== userId),
      },
    })),

  setUserOnline: (userId, online) =>
    set((state) => {
      const next = new Set(state.onlineUsers);
      if (online) next.add(userId);
      else next.delete(userId);
      return { onlineUsers: next };
    }),
}));
