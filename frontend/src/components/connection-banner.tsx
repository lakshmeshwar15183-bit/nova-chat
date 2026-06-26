'use client';

import { Loader2, WifiOff } from 'lucide-react';
import { useConnectionStore } from '@/store/connection-store';
import { cn } from '@/lib/utils';

/**
 * A slim banner that surfaces connection state. Hidden while connected so it
 * never distracts during normal use.
 */
export function ConnectionBanner() {
  const status = useConnectionStore((s) => s.status);

  if (status === 'connected') return null;

  const offline = status === 'offline';
  const label =
    status === 'offline'
      ? 'You are offline — messages will sync when you reconnect'
      : status === 'disconnected'
        ? 'Connection lost — reconnecting…'
        : 'Connecting…';

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 px-4 py-1.5 text-center text-xs font-medium text-white transition-all',
        offline ? 'bg-slate-600' : 'bg-amber-500',
      )}
      role="status"
    >
      {offline ? (
        <WifiOff className="h-3.5 w-3.5" />
      ) : (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      )}
      {label}
    </div>
  );
}
