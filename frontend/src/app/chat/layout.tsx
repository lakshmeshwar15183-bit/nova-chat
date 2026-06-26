'use client';

import { useRequireAuth } from '@/hooks/use-auth';
import { useSocket } from '@/hooks/use-socket';
import { FullPageSpinner } from '@/components/ui/spinner';
import { ConnectionBanner } from '@/components/connection-banner';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useRequireAuth();
  useSocket();

  if (loading || !user) return <FullPageSpinner />;
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
      <ConnectionBanner />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
