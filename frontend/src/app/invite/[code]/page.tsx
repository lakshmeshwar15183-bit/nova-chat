'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useRequireAuth } from '@/hooks/use-auth';
import { FullPageSpinner } from '@/components/ui/spinner';
import { groupService } from '@/lib/services';
import { apiErrorMessage } from '@/lib/api';
import { useChatStore } from '@/store/chat-store';

export default function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { user, loading } = useRequireAuth();
  const setActive = useChatStore((s) => s.setActiveConversation);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (loading || !user || joining) return;
    setJoining(true);
    groupService
      .join(code)
      .then((res) => {
        toast.success('Joined the group!');
        setActive(res.conversationId);
        router.replace('/chat');
      })
      .catch((err) => {
        toast.error(apiErrorMessage(err));
        router.replace('/chat');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  return <FullPageSpinner />;
}
