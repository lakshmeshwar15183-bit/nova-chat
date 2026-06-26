'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Paperclip, SendHorizonal, Smile, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { messageService, uploadService } from '@/lib/services';
import { apiErrorMessage } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth-store';
import { Spinner } from '@/components/ui/spinner';
import type { Message } from '@/lib/types';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface Props {
  conversationId: string;
  replyTo: Message | null;
  editing: Message | null;
  onClearReply: () => void;
  onClearEdit: () => void;
}

export function MessageInput({ conversationId, replyTo, editing, onClearReply, onClearEdit }: Props) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();
  const enterToSend = useAuthStore((s) => s.user?.settings?.enterToSend ?? true);

  useEffect(() => {
    if (editing) setText(editing.content || '');
  }, [editing]);

  const emitTyping = () => {
    const socket = getSocket();
    socket.emit('typing', { conversationId });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('stop_typing', { conversationId });
    }, 1500);
  };

  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      if (editing) {
        await messageService.edit(editing.id, content);
        onClearEdit();
      } else {
        await messageService.send(conversationId, {
          content,
          replyToId: replyTo?.id,
        });
        onClearReply();
      }
      setText('');
      setShowEmoji(false);
      getSocket().emit('stop_typing', { conversationId });
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && enterToSend) {
      e.preventDefault();
      void send();
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const toastId = toast.loading('Uploading...');
    try {
      for (const file of Array.from(files)) {
        const uploaded = await uploadService.media(file);
        await messageService.send(conversationId, {
          type: mapType(uploaded.type),
          content: '',
          attachments: [uploaded],
        });
      }
      toast.success('Sent', { id: toastId });
    } catch (err) {
      toast.error(apiErrorMessage(err), { id: toastId });
    }
  };

  return (
    <div
      className="border-t border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void handleFiles(e.dataTransfer.files);
      }}
    >
      {(replyTo || editing) && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-white px-3 py-2 dark:bg-slate-800">
          <div className="min-w-0 border-l-2 border-nova-500 pl-2">
            <p className="text-xs font-semibold text-nova-600">
              {editing ? 'Editing message' : `Replying to ${replyTo?.sender?.username || ''}`}
            </p>
            <p className="truncate text-sm text-slate-500">
              {editing?.content || replyTo?.content || 'Attachment'}
            </p>
          </div>
          <button
            onClick={editing ? onClearEdit : onClearReply}
            className="btn-ghost h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="relative flex items-end gap-2">
        {showEmoji && (
          <div className="absolute bottom-14 left-0 z-30">
            <EmojiPicker
              onEmojiClick={(e) => setText((t) => t + e.emoji)}
              width={320}
              height={400}
            />
          </div>
        )}

        <button onClick={() => setShowEmoji((v) => !v)} className="btn-ghost h-10 w-10 shrink-0 p-0">
          <Smile className="h-5 w-5" />
        </button>
        <button onClick={() => fileRef.current?.click()} className="btn-ghost h-10 w-10 shrink-0 p-0">
          <Paperclip className="h-5 w-5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />

        <textarea
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            emitTyping();
          }}
          onKeyDown={onKeyDown}
          placeholder="Type a message"
          className="input max-h-32 flex-1 resize-none py-2.5"
        />

        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="btn-primary h-10 w-10 shrink-0 rounded-full p-0"
        >
          {sending ? <Spinner className="h-4 w-4" /> : <SendHorizonal className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

function mapType(attachmentType: string): string {
  switch (attachmentType) {
    case 'IMAGE':
      return 'IMAGE';
    case 'VIDEO':
      return 'VIDEO';
    case 'VOICE':
      return 'VOICE';
    case 'AUDIO':
      return 'AUDIO';
    default:
      return 'DOCUMENT';
  }
}
