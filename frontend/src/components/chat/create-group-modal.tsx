'use client';

import { useState } from 'react';
import { Check, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/modal';
import { Avatar } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { groupService, userService } from '@/lib/services';
import { apiErrorMessage } from '@/lib/api';
import { useChatStore } from '@/store/chat-store';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/types';

export function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<User[]>([]);
  const [creating, setCreating] = useState(false);
  const { upsertConversation, setActiveConversation } = useChatStore();

  const search = async (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) return setResults([]);
    try {
      setResults(await userService.search(value.trim()));
    } catch {
      /* ignore */
    }
  };

  const toggle = (user: User) => {
    setSelected((prev) =>
      prev.some((u) => u.id === user.id) ? prev.filter((u) => u.id !== user.id) : [...prev, user],
    );
  };

  const create = async () => {
    if (!name.trim() || selected.length === 0) {
      toast.error('Add a name and at least one member');
      return;
    }
    setCreating(true);
    try {
      const group = await groupService.create({
        name: name.trim(),
        memberIds: selected.map((u) => u.id),
      });
      const conversation = await import('@/lib/services').then((m) =>
        m.conversationService.get(group.conversationId),
      );
      upsertConversation(conversation);
      setActiveConversation(group.conversationId);
      toast.success('Group created');
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal title="New group" onClose={onClose}>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Group name"
        className="input mb-3"
      />

      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selected.map((u) => (
            <span
              key={u.id}
              className="flex items-center gap-1.5 rounded-full bg-nova-100 px-2.5 py-1 text-xs font-medium text-nova-700 dark:bg-nova-900/40 dark:text-nova-300"
            >
              {u.profile?.displayName}
              <button onClick={() => toggle(u)}>×</button>
            </span>
          ))}
        </div>
      )}

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Add members"
          className="input pl-9"
        />
      </div>

      <div className="chat-scrollbar max-h-60 overflow-y-auto">
        {results.map((u) => {
          const isSelected = selected.some((s) => s.id === u.id);
          return (
            <button
              key={u.id}
              onClick={() => toggle(u)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Avatar src={u.profile?.avatarUrl} name={u.profile?.displayName} size="md" />
              <span className="min-w-0 flex-1 truncate font-medium text-slate-900 dark:text-white">
                {u.profile?.displayName}
              </span>
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full border',
                  isSelected
                    ? 'border-nova-600 bg-nova-600 text-white'
                    : 'border-slate-300 dark:border-slate-600',
                )}
              >
                {isSelected && <Check className="h-3 w-3" />}
              </span>
            </button>
          );
        })}
      </div>

      <button onClick={create} className="btn-primary mt-4 w-full py-2.5" disabled={creating}>
        {creating ? <Spinner className="h-4 w-4" /> : `Create group (${selected.length})`}
      </button>
    </Modal>
  );
}
