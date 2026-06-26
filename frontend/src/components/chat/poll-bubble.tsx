'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { pollService } from '@/lib/services';
import { apiErrorMessage } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { cn, formatMessageTime } from '@/lib/utils';
import type { Message, PollResult } from '@/lib/types';

interface Props {
  message: Message;
  isOwn: boolean;
  showSender: boolean;
}

/** Renders a POLL message with live, interactive results. */
export function PollBubble({ message, isOwn, showSender }: Props) {
  const initial = message.poll ?? null;
  const [poll, setPoll] = useState<PollResult | null>(initial);
  const [loading, setLoading] = useState(!initial);
  const [voting, setVoting] = useState<string | null>(null);

  const pollId = message.pollId ?? message.poll?.id ?? null;

  useEffect(() => {
    if (!pollId) return;
    let cancelled = false;
    if (!message.poll) {
      pollService
        .results(pollId)
        .then((res) => !cancelled && setPoll(res))
        .catch(() => undefined)
        .finally(() => !cancelled && setLoading(false));
    }

    const socket = getSocket();
    const onUpdated = (payload: { messageId: string; poll: PollResult }) => {
      if (payload.messageId === message.id) setPoll(payload.poll);
    };
    socket.on('poll_updated', onUpdated);
    return () => {
      cancelled = true;
      socket.off('poll_updated', onUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollId, message.id]);

  const vote = async (optionId: string) => {
    if (!poll || poll.closed || voting) return;
    const next = poll.allowMultiple ? toggleMultiple(poll, optionId) : [optionId];
    // The API requires at least one option; ignore an attempt to clear the last vote.
    if (next.length === 0) return;
    setVoting(optionId);
    try {
      const updated = await pollService.vote(poll.id, next);
      setPoll(updated);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setVoting(null);
    }
  };

  return (
    <div className={cn('group flex px-3', isOwn ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'w-72 max-w-[80%] rounded-2xl px-3 py-2.5 shadow-sm',
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

        <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <BarChart3 className="h-4 w-4 shrink-0" />
          <span className="break-words">{poll?.question ?? message.content}</span>
        </div>

        {loading || !poll ? (
          <div className="space-y-2 py-1">
            {[0, 1].map((i) => (
              <div key={i} className="h-8 animate-pulse rounded-lg bg-black/10 dark:bg-white/10" />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {poll.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => vote(opt.id)}
                disabled={poll.closed || voting !== null}
                className={cn(
                  'relative w-full overflow-hidden rounded-lg border px-2.5 py-1.5 text-left text-sm transition disabled:cursor-default',
                  isOwn
                    ? 'border-white/30 hover:bg-white/10'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700/50',
                )}
              >
                <span
                  className={cn(
                    'absolute inset-y-0 left-0 -z-0 rounded-lg transition-all',
                    isOwn ? 'bg-white/20' : 'bg-nova-500/15',
                  )}
                  style={{ width: `${opt.percentage}%` }}
                  aria-hidden="true"
                />
                <span className="relative z-10 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 truncate">
                    {opt.votedByMe && <Check className="h-3.5 w-3.5 shrink-0" />}
                    <span className="truncate">{opt.text}</span>
                  </span>
                  <span className="shrink-0 text-xs opacity-80">{opt.percentage}%</span>
                </span>
              </button>
            ))}
          </div>
        )}

        <div
          className={cn(
            'mt-2 flex items-center justify-between text-[10px]',
            isOwn ? 'text-white/70' : 'text-slate-400',
          )}
        >
          <span>
            {poll?.totalVotes ?? 0} vote{(poll?.totalVotes ?? 0) === 1 ? '' : 's'}
            {poll?.allowMultiple ? ' · multiple choice' : ''}
            {poll?.closed ? ' · closed' : ''}
          </span>
          <span>{formatMessageTime(message.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

function toggleMultiple(poll: PollResult, optionId: string): string[] {
  const current = poll.options.filter((o) => o.votedByMe).map((o) => o.id);
  return current.includes(optionId)
    ? current.filter((id) => id !== optionId)
    : [...current, optionId];
}
