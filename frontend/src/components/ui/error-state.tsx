'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

/** Reusable error placeholder with an optional retry action. */
export function ErrorState({
  title = 'Something went wrong',
  message = 'We could not load this content. Please try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-12 text-center animate-fade-in',
        className,
      )}
      role="alert"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h3 className="mt-5 text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm text-slate-500 dark:text-slate-400">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost mt-5 text-nova-600">
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      )}
    </div>
  );
}
