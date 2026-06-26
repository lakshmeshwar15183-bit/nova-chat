'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pin, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { messageService } from '@/lib/services';
import { apiErrorMessage } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { messagePreview } from '@/lib/message-preview';
import type { Message } from '@/lib/types';

/**
 * Shows the conversation's pinned messages as a compact banner. Refreshes in
 * real time when messages are pinned/unpinned by anyone in the conversation.
 */
export function PinnedBanner({ conversationId }: { conversationId: string }) {
  const [pinned, setPinned] = useState<Message[]>([]);
  const [index, setIndex] = useState(0);

  const load = useCallback(() => {
    messageService
      .listPinned(conversationId)
      .then((items) => {
        setPinned(items);
        setIndex((i) => (items.length === 0 ? 0 : Math.min(i, items.length - 1)));
      })
      .catch(() => undefined);
  }, [conversationId]);

  useEffect(() => {
    load();
    const socket = getSocket();
    const refresh = () => load();
    socket.on('message_pinned', refresh);
    socket.on('message_unpinned', refresh);
    return () => {
      socket.off('message_pinned', refresh);
      socket.off('message_unpinned', refresh);
    };
  }, [load]);

  if (pinned.length === 0) return null;

  const current = pinned[Math.min(index, pinned.length - 1)];

  const unpin = async () => {
    try {
      await messageService.pin(current.id);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const cycle = () => {
    if (pinned.length > 1) setIndex((i) => (i + 1) % pinned.length);
  };

  return (
    <div className="flex items-center gap-3 border-b border-slate-200 bg-nova-50/70 px-4 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-800/60">
      <Pin className="h-4 w-4 shrink-0 text-nova-600" />
      <button onClick={cycle} className="min-w-0 flex-1 text-left">
        <p className="text-xs font-semibold text-nova-600">
          Pinned message{pinned.length > 1 ? ` (${index + 1}/${pinned.length})` : ''}
        </p>
        <p className="truncate text-sm text-slate-600 dark:text-slate-300">
          {messagePreview(current)}
        </p>
      </button>
      <button onClick={unpin} className="btn-ghost h-7 w-7 shrink-0 p-0" title="Unpin">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
