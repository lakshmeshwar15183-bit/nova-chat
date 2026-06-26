'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FullPageSpinner } from '@/components/ui/spinner';
import { tokenStore } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const loadMe = useAuthStore((s) => s.loadMe);

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      tokenStore.set(token);
      void loadMe().then(() => router.replace('/chat'));
    } else {
      router.replace('/login');
    }
  }, [params, router, loadMe]);

  return <FullPageSpinner />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <CallbackInner />
    </Suspense>
  );
}
