'use client';

import { useRequireAuth } from '@/hooks/use-auth';
import { useSocket } from '@/hooks/use-socket';
import { FullPageSpinner } from '@/components/ui/spinner';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useRequireAuth();
  useSocket();

  if (loading || !user) return <FullPageSpinner />;
  return <div className="h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">{children}</div>;
}
