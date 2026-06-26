'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MessagesSquare } from 'lucide-react';
import { useChatStore } from '@/store/chat-store';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { Sidebar } from '@/components/chat/sidebar';
import { ConversationListPanel } from '@/components/chat/conversation-list';
import { ChatWindow } from '@/components/chat/chat-window';
import { cn } from '@/lib/utils';

export default function ChatPage() {
  const router = useRouter();
  const activeId = useChatStore((s) => s.activeConversationId);
  const setActive = useChatStore((s) => s.setActiveConversation);

  useKeyboardShortcuts({
    onSearch: useCallback(() => router.push('/search'), [router]),
    onEscape: useCallback(() => setActive(null), [setActive]),
  });

  return (
    <div className="flex h-full">
      {/* Slim app rail (desktop) */}
      <Sidebar />

      {/* Conversation list — hidden on mobile when a chat is open */}
      <div
        className={cn(
          'w-full border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:w-[360px] md:shrink-0',
          activeId ? 'hidden md:block' : 'block',
        )}
      >
        <ConversationListPanel />
      </div>

      {/* Chat window */}
      <div className={cn('flex-1', activeId ? 'block' : 'hidden md:block')}>
        {activeId ? (
          <ChatWindow conversationId={activeId} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-slate-50 text-center dark:bg-slate-950">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-nova-100 text-nova-600 dark:bg-nova-900/30">
              <MessagesSquare className="h-10 w-10" />
            </div>
            <h2 className="mt-6 text-xl font-semibold text-slate-700 dark:text-slate-200">
              Welcome to NovaChat
            </h2>
            <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Select a conversation from the list or start a new one to begin messaging.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
