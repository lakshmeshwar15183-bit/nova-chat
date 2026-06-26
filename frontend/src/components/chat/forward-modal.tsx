'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/modal';
import { Avatar } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { messageService } from '@/lib/services';
import { apiErrorMessage } from '@/lib/api';
import { useChatStore } from '@/store/chat-store';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/types';

export function ForwardModal({ message, onClose }: { message: Message; onClose: () => void }) {
  const conversations = useChatStore((s) => s.conversations);
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const forward = async () => {
    if (!selected.length) return;
    setSending(true);
    try {
      await messageService.forward(message.id, selected);
      toast.success(`Forwarded to ${selected.length} chat(s)`);
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal title="Forward to" onClose={onClose}>
      <div className="chat-scrollbar max-h-80 overflow-y-auto">
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => toggle(c.id)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800',
              selected.includes(c.id) && 'bg-nova-50 dark:bg-slate-800',
            )}
          >
            <Avatar src={c.avatarUrl} name={c.title} size="md" />
            <span className="flex-1 truncate font-medium text-slate-900 dark:text-white">
              {c.title}
            </span>
            {selected.includes(c.id) && <span className="text-nova-600">✓</span>}
          </button>
        ))}
      </div>
      <button onClick={forward} className="btn-primary mt-4 w-full py-2.5" disabled={sending || !selected.length}>
        {sending ? <Spinner className="h-4 w-4" /> : `Forward (${selected.length})`}
      </button>
    </Modal>
  );
}
