import type { Message } from './types';

/**
 * Produces a short, human-friendly preview of a message for lists, banners and
 * notifications. Centralised so every surface renders previews identically.
 */
export function messagePreview(message?: Message | null): string {
  if (!message) return 'No messages yet';
  if (message.deletedForEveryone) return '🚫 This message was deleted';
  switch (message.type) {
    case 'IMAGE':
      return '📷 Photo';
    case 'VIDEO':
      return '🎥 Video';
    case 'VOICE':
      return '🎤 Voice message';
    case 'AUDIO':
      return '🎵 Audio';
    case 'DOCUMENT':
      return '📄 Document';
    case 'POLL':
      return `📊 Poll: ${message.content ?? ''}`.trim();
    case 'SYSTEM':
      return message.content ?? '';
    default:
      return message.content ?? '';
  }
}
