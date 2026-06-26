'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/hooks/use-auth';
import { FullPageSpinner } from '@/components/ui/spinner';

export function AppPage({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useRequireAuth();

  if (loading || !user) return <FullPageSpinner />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-2xl">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <button onClick={() => router.push('/chat')} className="btn-ghost h-9 w-9 p-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h1>
        </header>
        <main className="p-4">{children}</main>
      </div>
    </div>
  );
}
