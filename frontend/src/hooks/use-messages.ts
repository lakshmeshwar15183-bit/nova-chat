'use client';

import { useCallback, useEffect, useState } from 'react';
import { messageService } from '@/lib/services';
import { useChatStore } from '@/store/chat-store';

/** Loads (and paginates) messages for a conversation into the chat store. */
export function useMessages(conversationId: string | null) {
  const { messages, setMessages, prependMessages } = useChatStore();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    setLoading(true);
    messageService
      .list(conversationId)
      .then((res) => {
        if (cancelled) return;
        setMessages(conversationId, res.items);
        setCursor(res.nextCursor);
        setHasMore(res.hasMore);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [conversationId, setMessages]);

  const loadMore = useCallback(async () => {
    if (!conversationId || !cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await messageService.list(conversationId, cursor);
      prependMessages(conversationId, res.items);
      setCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }, [conversationId, cursor, loadingMore, prependMessages]);

  return {
    messages: conversationId ? messages[conversationId] || [] : [],
    loading,
    loadingMore,
    hasMore,
    loadMore,
  };
}
