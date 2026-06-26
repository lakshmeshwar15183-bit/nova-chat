'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { conversationService } from '@/lib/services';
import { useChatStore } from '@/store/chat-store';

export function useConversations(archived = false) {
  const setConversations = useChatStore((s) => s.setConversations);
  const query = useQuery({
    queryKey: ['conversations', { archived }],
    queryFn: () => conversationService.list(archived),
  });

  useEffect(() => {
    if (query.data) setConversations(query.data);
  }, [query.data, setConversations]);

  return query;
}
