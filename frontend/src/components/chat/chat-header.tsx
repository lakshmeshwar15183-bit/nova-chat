'use client';

import { ArrowLeft, Phone, Video } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { useChatStore } from '@/store/chat-store';
import { formatLastSeen } from '@/lib/utils';
import { getSocket } from '@/lib/socket';
import toast from 'react-hot-toast';
import type { Conversation } from '@/lib/types';

export function ChatHeader({ conversation }: { conversation: Conversation }) {
  const router = useRouter();
  const setActive = useChatStore((s) => s.setActiveConversation);
  const typing = useChatStore((s) => s.typing[conversation.id]) || [];
  const onlineUsers = useChatStore((s) => s.onlineUsers);

  const isGroup = conversation.type === 'GROUP';
  const online =
    !isGroup && conversation.counterpart
      ? conversation.online || onlineUsers.has(conversation.counterpart.id)
      : false;

  const subtitle = typing.length
    ? `${typing[0].username} is typing…`
    : isGroup
      ? `${conversation.participants.length} members`
      : formatLastSeen(conversation.counterpart?.lastSeenAt, online);

  const startCall = (type: 'VOICE' | 'VIDEO') => {
    getSocket().emit('call_started', { conversationId: conversation.id, type });
    toast(`${type === 'VIDEO' ? 'Video' : 'Voice'} call started (signaling ready)`, { icon: '📞' });
  };

  const openInfo = () => {
    if (isGroup && conversation.group) router.push(`/groups/${conversation.group.id}`);
  };

  return (
    <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
      <button onClick={() => setActive(null)} className="btn-ghost h-9 w-9 p-0 md:hidden">
        <ArrowLeft className="h-5 w-5" />
      </button>

      <button onClick={openInfo} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <Avatar
          src={conversation.avatarUrl}
          name={conversation.title}
          size="md"
          online={isGroup ? undefined : online}
        />
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900 dark:text-white">
            {conversation.title}
          </p>
          <p className="truncate text-xs text-nova-600 dark:text-nova-400">{subtitle}</p>
        </div>
      </button>

      <div className="flex items-center gap-1">
        <button
          onClick={() => startCall('VOICE')}
          className="btn-ghost h-9 w-9 p-0"
          title="Voice call"
        >
          <Phone className="h-5 w-5" />
        </button>
        <button
          onClick={() => startCall('VIDEO')}
          className="btn-ghost h-9 w-9 p-0"
          title="Video call"
        >
          <Video className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
