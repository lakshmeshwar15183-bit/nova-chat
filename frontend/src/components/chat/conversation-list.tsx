'use client';

import { useMemo, useState } from 'react';
import { Archive, PenSquare, Search, Users } from 'lucide-react';
import { useConversations } from '@/hooks/use-conversations';
import { useChatStore } from '@/store/chat-store';
import { conversationService } from '@/lib/services';
import { cn, formatConversationTime } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { NewChatModal } from './new-chat-modal';
import { CreateGroupModal } from './create-group-modal';
import type { Conversation } from '@/lib/types';

export function ConversationListPanel() {
  const { isLoading } = useConversations();
  const conversations = useChatStore((s) => s.conversations);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const activeId = useChatStore((s) => s.activeConversationId);
  const setActive = useChatStore((s) => s.setActiveConversation);

  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);

  const filtered = useMemo(
    () =>
      conversations.filter((c) =>
        (c.title || '').toLowerCase().includes(search.toLowerCase()),
      ),
    [conversations, search],
  );

  const openConversation = async (c: Conversation) => {
    setActive(c.id);
    if (c.unreadCount > 0) {
      void conversationService.markRead(c.id);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between px-4 py-3.5">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Chats</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowNewGroup(true)}
            className="btn-ghost h-9 w-9 p-0"
            title="New group"
          >
            <Users className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowNewChat(true)}
            className="btn-ghost h-9 w-9 p-0"
            title="New chat"
          >
            <PenSquare className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations"
            className="input pl-9 py-2"
          />
        </div>
      </div>

      <div className="chat-scrollbar flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="text-nova-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            No conversations yet. Start a new chat!
          </div>
        ) : (
          filtered.map((c) => {
            const online =
              c.type === 'DIRECT' && c.counterpart
                ? c.online || onlineUsers.has(c.counterpart.id)
                : undefined;
            return (
              <button
                key={c.id}
                onClick={() => openConversation(c)}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60',
                  activeId === c.id && 'bg-nova-50 dark:bg-slate-800',
                )}
              >
                <Avatar src={c.avatarUrl} name={c.title} size="lg" online={online} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-slate-900 dark:text-white">
                      {c.title || 'Conversation'}
                    </span>
                    {c.lastMessageAt && (
                      <span
                        className={cn(
                          'shrink-0 text-xs',
                          c.unreadCount > 0
                            ? 'font-semibold text-nova-600'
                            : 'text-slate-400',
                        )}
                      >
                        {formatConversationTime(c.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-slate-500 dark:text-slate-400">
                      {previewText(c)}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      {c.isPinned && <span className="text-xs text-slate-400">📌</span>}
                      {c.unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-nova-600 px-1.5 text-xs font-semibold text-white">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
      {showNewGroup && <CreateGroupModal onClose={() => setShowNewGroup(false)} />}
    </div>
  );
}

function previewText(c: Conversation): string {
  const m = c.lastMessage;
  if (!m) return 'No messages yet';
  if (m.deletedForEveryone) return '🚫 This message was deleted';
  if (m.type === 'IMAGE') return '📷 Photo';
  if (m.type === 'VIDEO') return '🎥 Video';
  if (m.type === 'VOICE') return '🎤 Voice message';
  if (m.type === 'AUDIO') return '🎵 Audio';
  if (m.type === 'DOCUMENT') return '📄 Document';
  if (m.type === 'SYSTEM') return m.content || '';
  return m.content || '';
}
