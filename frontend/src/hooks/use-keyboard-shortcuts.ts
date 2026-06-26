'use client';

import { useEffect } from 'react';

export interface ShortcutHandlers {
  /** Cmd/Ctrl+K — open search. */
  onSearch?: () => void;
  /** Escape — close/deselect. */
  onEscape?: () => void;
  /** Cmd/Ctrl+N — new chat. */
  onNewChat?: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

/** Registers global keyboard shortcuts; ignores typing inside inputs (except Escape). */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      if (e.key === 'Escape') {
        handlers.onEscape?.();
        return;
      }

      if (isEditableTarget(e.target)) return;

      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handlers.onSearch?.();
      } else if (meta && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handlers.onNewChat?.();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers]);
}
