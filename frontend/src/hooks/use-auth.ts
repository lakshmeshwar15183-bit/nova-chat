'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

/** Initialises auth state once on mount. */
export function useAuthInit() {
  const { initialized, loadMe } = useAuthStore();
  useEffect(() => {
    if (!initialized) void loadMe();
  }, [initialized, loadMe]);
  return useAuthStore();
}

/** Redirects unauthenticated users to /login. */
export function useRequireAuth() {
  const router = useRouter();
  const { user, initialized, loading } = useAuthInit();

  useEffect(() => {
    if (initialized && !loading && !user) {
      router.replace('/login');
    }
  }, [initialized, loading, user, router]);

  return { user, loading: loading || !initialized };
}
