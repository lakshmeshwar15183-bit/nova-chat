import { cn } from '@/lib/utils';

/** Base shimmering placeholder block. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-700/60',
        className,
      )}
    />
  );
}

/** Placeholder rows for the conversation list while it loads. */
export function ConversationListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-1 px-3 py-2" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-1 py-2.5">
          <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Placeholder message bubbles while a conversation loads. */
export function MessageListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-4 px-4 py-6" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => {
        const own = i % 3 === 0;
        return (
          <div key={i} className={cn('flex', own ? 'justify-end' : 'justify-start')}>
            <Skeleton
              className={cn(
                'h-12 rounded-2xl',
                own ? 'w-48 rounded-br-md' : 'w-56 rounded-bl-md',
                i % 2 === 0 ? 'h-12' : 'h-16',
              )}
            />
          </div>
        );
      })}
    </div>
  );
}
