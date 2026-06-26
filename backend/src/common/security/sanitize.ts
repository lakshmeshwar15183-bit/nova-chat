import { Transform } from 'class-transformer';

/**
 * Removes HTML tags and control characters from a string to harden against
 * stored XSS and broken payloads. Frontend rendering still escapes output, so
 * this is defence-in-depth rather than the sole protection.
 */
export function sanitizeText(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return (
    value
      .replace(/<\/?[a-z][\s\S]*?>/gi, '') // strip HTML tags
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // control chars
      .trim()
  );
}

/**
 * Class-transformer decorator that sanitizes a string DTO property.
 * Usage: `@Sanitize() content: string;`
 */
export function Sanitize() {
  return Transform(({ value }) => sanitizeText(value));
}
