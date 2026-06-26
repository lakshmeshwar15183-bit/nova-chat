import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * RFC 4226 (HOTP) / RFC 6238 (TOTP) implementation backed by Node's crypto.
 * No third-party dependency, so the algorithm can be unit-tested directly
 * against the official RFC test vectors.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export interface TotpOptions {
  /** Time step in seconds (default 30). */
  step?: number;
  /** Unix epoch offset in seconds (default 0). */
  t0?: number;
  /** Number of digits in the code (default 6). */
  digits?: number;
  /** Time in ms to evaluate against (default Date.now()). */
  now?: number;
}

/** Encodes a buffer to an unpadded, uppercase RFC 4648 base32 string. */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

/** Decodes a (possibly padded / lowercase / spaced) base32 string to a buffer. */
export function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/=+$/g, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error('Invalid base32 character');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** RFC 4226 HOTP. `counter` is a 64-bit unsigned integer. */
export function hotp(secret: Buffer, counter: number, digits = 6): string {
  const counterBuffer = Buffer.alloc(8);
  // Write the 64-bit counter big-endian (high/low 32-bit halves).
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuffer.writeUInt32BE(counter >>> 0, 4);

  const digest = createHmac('sha1', secret).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return (binary % 10 ** digits).toString().padStart(digits, '0');
}

/** RFC 6238 TOTP for the current (or supplied) time. */
export function totp(secret: Buffer, options: TotpOptions = {}): string {
  const { step = 30, t0 = 0, digits = 6, now = Date.now() } = options;
  const counter = Math.floor((Math.floor(now / 1000) - t0) / step);
  return hotp(secret, counter, digits);
}

/**
 * Verifies a token within a sliding window of `window` steps either side of the
 * current time (default ±1 step => tolerates clock drift). Uses constant-time
 * comparison to avoid timing leaks.
 */
export function verifyTotp(
  token: string,
  secret: Buffer,
  options: TotpOptions & { window?: number } = {},
): boolean {
  const { step = 30, t0 = 0, digits = 6, now = Date.now(), window = 1 } = options;
  const normalized = token.replace(/\s+/g, '');
  if (!/^\d+$/.test(normalized) || normalized.length !== digits) return false;

  const counter = Math.floor((Math.floor(now / 1000) - t0) / step);
  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const candidate = hotp(secret, counter + errorWindow, digits);
    if (constantTimeEqual(candidate, normalized)) return true;
  }
  return false;
}

/** Generates a new random base32 secret (default 20 bytes => 160 bits). */
export function generateBase32Secret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

/** Builds an otpauth:// provisioning URI for authenticator apps / QR codes. */
export function buildOtpAuthUrl(params: {
  secret: string;
  accountName: string;
  issuer: string;
  digits?: number;
  period?: number;
}): string {
  const { secret, accountName, issuer, digits = 6, period = 30 } = params;
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}`;
  const query = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(digits),
    period: String(period),
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}

function constantTimeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
