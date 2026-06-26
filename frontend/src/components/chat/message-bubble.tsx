'use client';

import { useState } from 'react';
import {
  Check,
  CheckCheck,
  CornerUpLeft,
  Forward,
  MoreVertical,
  Pencil,
  Pin,
  Smile,
  Star,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { messageService } from '@/lib/services';
import { apiErrorMessage } from '@/lib/api';
import { cn, formatFileSize, formatMessageTime } from '@/lib/utils';
import { useChatStore } from '@/store/chat-store';
import type { Message } from '@/lib/types';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface Props {
  message: Message;
  isOwn: boolean;
  showSender: boolean;
  onReply: (m: Message) => void;
  onEdit: (m: Message) => void;
  onForward: (m: Message) => void;
}

export function MessageBubble({ message, isOwn, showSender, onReply, onEdit, onForward }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const updateMessage = useChatStore((s) => s.updateMessage);

  if (message.type === 'SYSTEM') {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {message.content}
        </span>
      </div>
    );
  }

  const react = async (emoji: string) => {
    setPickerOpen(false);
    setMenuOpen(false);
    try {
      await messageService.react(message.id, emoji);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const star = async () => {
    setMenuOpen(false);
    try {
      const res = await messageService.star(message.id);
      updateMessage({ id: message.id, conversationId: message.conversationId, starred: res.starred });
      toast.success(res.starred ? 'Starred' : 'Unstarred');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const pin = async () => {
    setMenuOpen(false);
    try {
      const res = await messageService.pin(message.id);
      toast.success(res.pinned ? 'Pinned' : 'Unpinned');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const remove = async (everyone: boolean) => {
    setMenuOpen(false);
    try {
      if (everyone) await messageService.deleteForEveryone(message.id);
      else {
        await messageService.deleteForMe(message.id);
        // optimistic local removal handled by store
      }
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const grouped = groupReactions(message.reactions);

  return (
    <div className={cn('group flex px-3', isOwn ? 'justify-end' : 'justify-start')}>
      <div className={cn('relative max-w-[78%] sm:max-w-[65%]')}>
        <div
          className={cn(
            'relative rounded-2xl px-3 py-2 shadow-sm',
            isOwn
              ? 'rounded-br-md bg-nova-600 text-white'
              : 'rounded-bl-md bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100',
          )}
        >
          {showSender && !isOwn && message.sender && (
            <p className="mb-0.5 text-xs font-semibold text-nova-600 dark:text-nova-400">
              {message.sender.profile?.displayName || message.sender.username}
            </p>
          )}

          {message.replyTo && (
            <div
              className={cn(
                'mb-1.5 border-l-2 pl-2 text-xs',
                isOwn ? 'border-white/60 text-white/80' : 'border-nova-500 text-slate-500',
              )}
            >
              <p className="font-medium">
                {message.replyTo.sender?.profile?.displayName ||
                  message.replyTo.sender?.username ||
                  'Reply'}
              </p>
              <p className="truncate">{message.replyTo.content || 'Attachment'}</p>
            </div>
          )}

          {message.deletedForEveryone ? (
            <p className="italic opacity-70">🚫 This message was deleted</p>
          ) : (
            <>
              {message.attachments?.map((a) => (
                <Attachment key={a.id} attachment={a} />
              ))}
              {message.content && (
                <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">
                  {message.content}
                </p>
              )}
            </>
          )}

          <div
            className={cn(
              'mt-1 flex items-center justify-end gap-1 text-[10px]',
              isOwn ? 'text-white/70' : 'text-slate-400',
            )}
          >
            {message.starred && <Star className="h-3 w-3 fill-current" />}
            {message.isEdited && <span>edited</span>}
            <span>{formatMessageTime(message.createdAt)}</span>
            {isOwn && !message.deletedForEveryone && <StatusTicks status={message.status} />}
          </div>
        </div>

        {grouped.length > 0 && (
          <div
            className={cn(
              '-mt-1 flex flex-wrap gap-1',
              isOwn ? 'justify-end' : 'justify-start',
            )}
          >
            {grouped.map((r) => (
              <button
                key={r.emoji}
                onClick={() => react(r.emoji)}
                className="rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {r.emoji} {r.count}
              </button>
            ))}
          </div>
        )}

        {/* Hover actions */}
        {!message.deletedForEveryone && (
          <div
            className={cn(
              'absolute top-0 hidden items-center gap-0.5 group-hover:flex',
              isOwn ? '-left-16' : '-right-16',
            )}
          >
            <button onClick={() => setPickerOpen((v) => !v)} className="rounded-full bg-white p-1.5 shadow dark:bg-slate-700">
              <Smile className="h-4 w-4 text-slate-500 dark:text-slate-300" />
            </button>
            <button onClick={() => onReply(message)} className="rounded-full bg-white p-1.5 shadow dark:bg-slate-700">
              <CornerUpLeft className="h-4 w-4 text-slate-500 dark:text-slate-300" />
            </button>
            <button onClick={() => setMenuOpen((v) => !v)} className="rounded-full bg-white p-1.5 shadow dark:bg-slate-700">
              <MoreVertical className="h-4 w-4 text-slate-500 dark:text-slate-300" />
            </button>
          </div>
        )}

        {pickerOpen && (
          <div
            className={cn(
              'absolute z-20 mt-1 flex gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800',
              isOwn ? 'right-0' : 'left-0',
            )}
          >
            {QUICK_REACTIONS.map((e) => (
              <button key={e} onClick={() => react(e)} className="text-lg transition hover:scale-125">
                {e}
              </button>
            ))}
          </div>
        )}

        {menuOpen && (
          <div
            className={cn(
              'absolute z-20 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-xl dark:border-slate-700 dark:bg-slate-800',
              isOwn ? 'right-0' : 'left-0',
            )}
          >
            <MenuItem icon={CornerUpLeft} label="Reply" onClick={() => { setMenuOpen(false); onReply(message); }} />
            <MenuItem icon={Forward} label="Forward" onClick={() => { setMenuOpen(false); onForward(message); }} />
            <MenuItem icon={Star} label={message.starred ? 'Unstar' : 'Star'} onClick={star} />
            <MenuItem icon={Pin} label={message.pinned ? 'Unpin' : 'Pin'} onClick={pin} />
            {isOwn && message.type === 'TEXT' && (
              <MenuItem icon={Pencil} label="Edit" onClick={() => { setMenuOpen(false); onEdit(message); }} />
            )}
            <MenuItem icon={Trash2} label="Delete for me" danger onClick={() => remove(false)} />
            {isOwn && (
              <MenuItem icon={Trash2} label="Delete for everyone" danger onClick={() => remove(true)} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Star;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-700',
        danger ? 'text-red-500' : 'text-slate-700 dark:text-slate-200',
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function StatusTicks({ status }: { status: Message['status'] }) {
  if (status === 'READ') return <CheckCheck className="h-3.5 w-3.5 text-sky-300" />;
  if (status === 'DELIVERED') return <CheckCheck className="h-3.5 w-3.5" />;
  return <Check className="h-3.5 w-3.5" />;
}

function Attachment({ attachment: a }: { attachment: Message['attachments'][number] }) {
  if (a.type === 'IMAGE') {
    return <img src={a.url} alt={a.fileName} className="mb-1 max-h-72 rounded-lg object-cover" />;
  }
  if (a.type === 'VIDEO') {
    return <video src={a.url} controls className="mb-1 max-h-72 rounded-lg" />;
  }
  if (a.type === 'VOICE' || a.type === 'AUDIO') {
    return <audio src={a.url} controls className="mb-1 w-56" />;
  }
  return (
    <a
      href={a.url}
      target="_blank"
      rel="noreferrer"
      download
      className="mb-1 flex items-center gap-2 rounded-lg bg-black/5 px-3 py-2 dark:bg-white/10"
    >
      <span className="text-2xl">📄</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{a.fileName}</span>
        <span className="block text-xs opacity-70">{formatFileSize(a.size)}</span>
      </span>
    </a>
  );
}

function groupReactions(reactions: Message['reactions']) {
  const map = new Map<string, number>();
  reactions?.forEach((r) => map.set(r.emoji, (map.get(r.emoji) || 0) + 1));
  return Array.from(map.entries()).map(([emoji, count]) => ({ emoji, count }));
}
