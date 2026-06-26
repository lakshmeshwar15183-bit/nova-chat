import { decryptSecret, deriveKey, encryptSecret, safeEqual } from './crypto.util';

describe('crypto.util', () => {
  const key = deriveKey('test-application-secret');

  it('encrypts and decrypts round-trip', () => {
    const plaintext = 'JBSWY3DPEHPK3PXP';
    const encrypted = encryptSecret(plaintext, key);
    expect(encrypted).not.toContain(plaintext);
    expect(decryptSecret(encrypted, key)).toBe(plaintext);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const a = encryptSecret('same', key);
    const b = encryptSecret('same', key);
    expect(a).not.toBe(b);
    expect(decryptSecret(a, key)).toBe('same');
    expect(decryptSecret(b, key)).toBe('same');
  });

  it('fails to decrypt with the wrong key', () => {
    const encrypted = encryptSecret('secret', key);
    expect(() => decryptSecret(encrypted, deriveKey('other-secret'))).toThrow();
  });

  it('rejects a tampered payload (GCM auth tag)', () => {
    const encrypted = encryptSecret('secret', key);
    const tampered = `${encrypted.slice(0, -2)}AA`;
    expect(() => decryptSecret(tampered, key)).toThrow();
  });

  it('safeEqual compares correctly', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
