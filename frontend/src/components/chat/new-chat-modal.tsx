'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/modal';
import { Avatar } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { conversationService, userService } from '@/lib/services';
import { apiErrorMessage } from '@/lib/api';
import { useChatStore } from '@/store/chat-store';
import type { User } from '@/lib/types';

export function NewChatModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const { upsertConversation, setActiveConversation } = useChatStore();

  const search = async (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      setResults(await userService.search(value.trim()));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSearching(false);
    }
  };

  const startChat = async (user: User) => {
    try {
      const conversation = await conversationService.createDirect(user.id);
      upsertConversation(conversation);
      setActiveConversation(conversation.id);
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <Modal title="New chat" onClose={onClose}>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Search by name or username"
          className="input pl-9"
        />
      </div>

      <div className="chat-scrollbar max-h-80 overflow-y-auto">
        {searching ? (
          <div className="flex justify-center py-6">
            <Spinner className="text-nova-600" />
          </div>
        ) : results.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {query.length >= 2 ? 'No users found' : 'Type to search for people'}
          </p>
        ) : (
          results.map((u) => (
            <button
              key={u.id}
              onClick={() => startChat(u)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Avatar src={u.profile?.avatarUrl} name={u.profile?.displayName} size="md" />
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900 dark:text-white">
                  {u.profile?.displayName}
                </p>
                <p className="truncate text-sm text-slate-500">@{u.username}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}
