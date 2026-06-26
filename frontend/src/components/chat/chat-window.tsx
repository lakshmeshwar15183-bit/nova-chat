'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { conversationService } from '@/lib/services';
import { useMessages } from '@/hooks/use-messages';
import { useChatStore } from '@/store/chat-store';
import { useAuthStore } from '@/store/auth-store';
import { getSocket } from '@/lib/socket';
import { FullPageSpinner, Spinner } from '@/components/ui/spinner';
import { ChatHeader } from './chat-header';
import { MessageBubble } from './message-bubble';
import { MessageInput } from './message-input';
import { ForwardModal } from './forward-modal';
import type { Message } from '@/lib/types';

export function ChatWindow({ conversationId }: { conversationId: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { messages, loading, loadingMore, hasMore, loadMore } = useMessages(conversationId);
  const typing = useChatStore((s) => s.typing[conversationId]) || [];

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [forwarding, setForwarding] = useState<Message | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(0);

  const { data: conversation } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => conversationService.get(conversationId),
  });

  // Mark read + join room when opening.
  useEffect(() => {
    getSocket().emit('join_conversation', { conversationId });
    getSocket().emit('mark_read', { conversationId });
    void conversationService.markRead(conversationId);
  }, [conversationId]);

  // Auto-scroll to bottom on new messages (if already near bottom).
  useEffect(() => {
    const grew = messages.length > prevLenRef.current;
    prevLenRef.current = messages.length;
    if (grew) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Infinite scroll upward.
  const onScroll = () => {
    const el = scrollRef.current;
    if (el && el.scrollTop < 80 && hasMore && !loadingMore) {
      const prevHeight = el.scrollHeight;
      void loadMore().then(() => {
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevHeight;
          }
        });
      });
    }
  };

  if (!conversation) return <FullPageSpinner />;

  return (
    <div className="flex h-full flex-col">
      <ChatHeader conversation={conversation} />

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="chat-scrollbar chat-bg flex-1 space-y-1 overflow-y-auto py-3"
      >
        {loadingMore && (
          <div className="flex justify-center py-2">
            <Spinner className="h-4 w-4 text-nova-600" />
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner className="text-nova-600" />
          </div>
        ) : (
          messages.map((m, i) => (
            <MessageBubble
              key={m.id}
              message={m}
              isOwn={m.senderId === userId}
              showSender={
                conversation.type === 'GROUP' &&
                m.senderId !== userId &&
                messages[i - 1]?.senderId !== m.senderId
              }
              onReply={setReplyTo}
              onEdit={setEditing}
              onForward={setForwarding}
            />
          ))
        )}
        {typing.length > 0 && (
          <div className="px-4 py-1 text-sm italic text-slate-400">
            {typing.map((t) => t.username).join(', ')} typing…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <MessageInput
        conversationId={conversationId}
        replyTo={replyTo}
        editing={editing}
        onClearReply={() => setReplyTo(null)}
        onClearEdit={() => setEditing(null)}
      />

      {forwarding && (
        <ForwardModal message={forwarding} onClose={() => setForwarding(null)} />
      )}
    </div>
  );
}
