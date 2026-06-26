import { collectProductionIssues, validateEnv } from './env.validation';

const STRONG_ACCESS = 'a'.repeat(40);
const STRONG_REFRESH = 'b'.repeat(40);

const validProdEnv = (): Record<string, string> => ({
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:pass@db.internal:5432/novachat',
  REDIS_URL: 'rediss://cache.internal:6379',
  JWT_ACCESS_SECRET: STRONG_ACCESS,
  JWT_REFRESH_SECRET: STRONG_REFRESH,
  CORS_ORIGINS: 'https://app.novachat.dev',
  FRONTEND_URL: 'https://app.novachat.dev',
});

describe('collectProductionIssues', () => {
  it('accepts a valid production configuration', () => {
    expect(collectProductionIssues(validProdEnv())).toEqual([]);
  });

  it('rejects missing secrets', () => {
    const env = validProdEnv();
    delete (env as Record<string, string | undefined>).JWT_ACCESS_SECRET;
    expect(collectProductionIssues(env)).toContain('JWT_ACCESS_SECRET is required in production');
  });

  it('rejects short secrets', () => {
    const env = { ...validProdEnv(), JWT_ACCESS_SECRET: 'tooshort' };
    expect(collectProductionIssues(env).some((i) => i.includes('at least 32'))).toBe(true);
  });

  it('rejects insecure default secrets', () => {
    const env = { ...validProdEnv(), JWT_REFRESH_SECRET: 'dev-refresh-secret-change-me' };
    expect(collectProductionIssues(env).some((i) => i.includes('insecure default'))).toBe(true);
  });

  it('rejects identical access and refresh secrets', () => {
    const env = { ...validProdEnv(), JWT_REFRESH_SECRET: STRONG_ACCESS };
    expect(collectProductionIssues(env)).toContain(
      'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different',
    );
  });

  it('requires a postgres DATABASE_URL', () => {
    const env = { ...validProdEnv(), DATABASE_URL: 'mysql://x' };
    expect(collectProductionIssues(env).some((i) => i.includes('DATABASE_URL'))).toBe(true);
  });

  it('requires REDIS_URL', () => {
    const env = validProdEnv();
    delete (env as Record<string, string | undefined>).REDIS_URL;
    expect(collectProductionIssues(env).some((i) => i.includes('REDIS_URL is required'))).toBe(
      true,
    );
  });

  it('requires HTTPS CORS origins (localhost exempted)', () => {
    expect(
      collectProductionIssues({ ...validProdEnv(), CORS_ORIGINS: 'http://evil.example.com' }).some(
        (i) => i.includes('must use HTTPS'),
      ),
    ).toBe(true);
    expect(
      collectProductionIssues({ ...validProdEnv(), CORS_ORIGINS: 'http://localhost:3000' }),
    ).toEqual([]);
  });
});

describe('validateEnv', () => {
  it('passes in development with minimal config', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://localhost:5432/novachat',
        JWT_ACCESS_SECRET: 'dev-access-secret-change-me',
        JWT_REFRESH_SECRET: 'dev-refresh-secret-change-me',
      }),
    ).not.toThrow();
  });

  it('throws an aggregated error in production with insecure secrets', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://localhost:5432/novachat',
        JWT_ACCESS_SECRET: 'dev-access-secret-change-me',
        JWT_REFRESH_SECRET: 'dev-refresh-secret-change-me',
      }),
    ).toThrow(/Invalid environment configuration/);
  });

  it('passes in production with a valid configuration', () => {
    expect(() => validateEnv(validProdEnv())).not.toThrow();
  });
});
