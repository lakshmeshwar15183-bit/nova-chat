import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

/**
 * Authenticated symmetric encryption (AES-256-GCM) for secrets at rest, such as
 * TOTP shared secrets. The 32-byte key is derived from an application secret via
 * scrypt so any-length configuration value can be used safely.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit nonce recommended for GCM
const KEY_LENGTH = 32;
const SCRYPT_SALT = 'novachat::secret-encryption::v1';

export function deriveKey(secret: string): Buffer {
  return scryptSync(secret, SCRYPT_SALT, KEY_LENGTH);
}

/** Encrypts plaintext; returns `iv.tag.ciphertext` as a single base64url string. */
export function encryptSecret(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((part) => part.toString('base64url')).join('.');
}

/** Reverses {@link encryptSecret}; throws if the payload was tampered with. */
export function decryptSecret(payload: string, key: Buffer): string {
  const parts = payload.split('.');
  if (parts.length !== 3) throw new Error('Malformed encrypted payload');
  const [iv, tag, ciphertext] = parts.map((part) => Buffer.from(part, 'base64url'));
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

/** Constant-time comparison for short secrets such as backup codes. */
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
