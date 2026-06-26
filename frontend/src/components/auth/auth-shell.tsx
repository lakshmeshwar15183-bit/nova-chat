import Link from 'next/link';
import { MessagesSquare } from 'lucide-react';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-nova-50 to-white px-4 py-10 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nova-600 text-white">
            <MessagesSquare className="h-5 w-5" />
          </div>
          <span className="text-2xl font-bold text-slate-900 dark:text-white">NovaChat</span>
        </Link>

        <div className="card animate-slide-up p-7">
          <h1 className="text-center text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          {subtitle && (
            <p className="mt-1.5 text-center text-sm text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
          <div className="mt-6">{children}</div>
        </div>

        {footer && (
          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">{footer}</p>
        )}
      </div>
    </div>
  );
}
