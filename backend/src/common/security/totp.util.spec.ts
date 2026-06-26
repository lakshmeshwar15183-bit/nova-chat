import {
  base32Decode,
  base32Encode,
  buildOtpAuthUrl,
  generateBase32Secret,
  hotp,
  totp,
  verifyTotp,
} from './totp.util';

describe('base32', () => {
  it('round-trips arbitrary bytes', () => {
    const original = Buffer.from('NovaChat 2FA secret payload!');
    expect(base32Decode(base32Encode(original)).equals(original)).toBe(true);
  });

  it('encodes the RFC 4648 example "foobar"', () => {
    // RFC 4648 §10 test vector.
    expect(base32Encode(Buffer.from('foobar'))).toBe('MZXW6YTBOI');
  });

  it('decodes case-insensitively and ignores padding/spaces', () => {
    expect(base32Decode('mzxw6ytboi').toString()).toBe('foobar');
    expect(base32Decode('MZXW6YTBOI======').toString()).toBe('foobar');
  });
});

describe('HOTP (RFC 4226 Appendix D)', () => {
  // Secret "12345678901234567890" (ASCII).
  const secret = Buffer.from('12345678901234567890', 'ascii');
  const expected = [
    '755224',
    '287082',
    '359152',
    '969429',
    '338314',
    '254676',
    '287922',
    '162583',
    '399871',
    '520489',
  ];

  it.each(expected.map((code, counter) => [counter, code]))('counter %i => %s', (counter, code) => {
    expect(hotp(secret, counter as number, 6)).toBe(code);
  });
});

describe('TOTP (RFC 6238 Appendix B, SHA-1)', () => {
  const secret = Buffer.from('12345678901234567890', 'ascii');
  const vectors: Array<[number, string]> = [
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
    [20000000000, '65353130'],
  ];

  it.each(vectors)('time %is => %s (8 digits)', (timeSeconds, code) => {
    expect(totp(secret, { now: timeSeconds * 1000, digits: 8 })).toBe(code);
  });
});

describe('verifyTotp', () => {
  const secret = generateBase32Secret();
  const secretBuffer = base32Decode(secret);

  it('accepts the current code', () => {
    const now = Date.now();
    const code = totp(secretBuffer, { now });
    expect(verifyTotp(code, secretBuffer, { now })).toBe(true);
  });

  it('tolerates one step of clock drift within the window', () => {
    const now = Date.now();
    const previousStepCode = totp(secretBuffer, { now: now - 30_000 });
    expect(verifyTotp(previousStepCode, secretBuffer, { now, window: 1 })).toBe(true);
  });

  it('rejects an out-of-window code', () => {
    const now = Date.now();
    const oldCode = totp(secretBuffer, { now: now - 5 * 60_000 });
    expect(verifyTotp(oldCode, secretBuffer, { now, window: 1 })).toBe(false);
  });

  it('rejects malformed tokens', () => {
    const now = Date.now();
    expect(verifyTotp('abc', secretBuffer, { now })).toBe(false);
    expect(verifyTotp('12345', secretBuffer, { now })).toBe(false);
  });
});

describe('buildOtpAuthUrl', () => {
  it('produces a valid provisioning URI', () => {
    const url = buildOtpAuthUrl({
      secret: 'JBSWY3DPEHPK3PXP',
      accountName: 'jane@novachat.dev',
      issuer: 'NovaChat',
    });
    expect(url.startsWith('otpauth://totp/NovaChat:jane%40novachat.dev?')).toBe(true);
    expect(url).toContain('secret=JBSWY3DPEHPK3PXP');
    expect(url).toContain('issuer=NovaChat');
    expect(url).toContain('digits=6');
    expect(url).toContain('period=30');
  });
});
