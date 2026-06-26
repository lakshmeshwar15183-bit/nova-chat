'use client';

import { useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppPage } from '@/components/app-page';
import { Avatar } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { searchService, conversationService } from '@/lib/services';
import { useChatStore } from '@/store/chat-store';

interface Results {
  messages: any[];
  contacts: any[];
  groups: any[];
  media: any[];
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const setActive = useChatStore((s) => s.setActiveConversation);

  const run = async (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) return setResults(null);
    setLoading(true);
    try {
      setResults((await searchService.all(value.trim())) as Results);
    } finally {
      setLoading(false);
    }
  };

  const openContact = async (userId: string) => {
    const c = await conversationService.createDirect(userId);
    setActive(c.id);
    router.push('/chat');
  };

  return (
    <AppPage title="Search">
      <div className="relative mb-4">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => run(e.target.value)}
          placeholder="Search messages, people and groups"
          className="input pl-9"
        />
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Spinner className="text-nova-600" />
        </div>
      )}

      {results && (
        <div className="space-y-6">
          {results.contacts.length > 0 && (
            <Group title="People">
              {results.contacts.map((u) => (
                <button
                  key={u.id}
                  onClick={() => openContact(u.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Avatar src={u.profile?.avatarUrl} name={u.profile?.displayName} size="md" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {u.profile?.displayName}
                    </p>
                    <p className="text-xs text-slate-500">@{u.username}</p>
                  </div>
                </button>
              ))}
            </Group>
          )}

          {results.groups.length > 0 && (
            <Group title="Groups">
              {results.groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    setActive(g.conversationId);
                    router.push('/chat');
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Avatar src={g.avatarUrl} name={g.name} size="md" />
                  <p className="font-medium text-slate-900 dark:text-white">{g.name}</p>
                </button>
              ))}
            </Group>
          )}

          {results.messages.length > 0 && (
            <Group title="Messages">
              {results.messages.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setActive(m.conversationId);
                    router.push('/chat');
                  }}
                  className="block w-full rounded-lg px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <p className="text-sm text-slate-900 dark:text-white">{m.content}</p>
                  <p className="text-xs text-slate-500">
                    {m.sender?.profile?.displayName || m.sender?.username}
                    {m.conversation?.group?.name ? ` · ${m.conversation.group.name}` : ''}
                  </p>
                </button>
              ))}
            </Group>
          )}

          {results.contacts.length === 0 &&
            results.groups.length === 0 &&
            results.messages.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-500">No results found</p>
            )}
        </div>
      )}
    </AppPage>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-3">
      <h3 className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h3>
      {children}
    </div>
  );
}
