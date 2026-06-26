export interface AppConfig {
  env: string;
  port: number;
  apiPrefix: string;
  corsOrigins: string[];
  frontendUrl: string;
}

export default () => ({
  app: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '4000', 10),
    apiPrefix: process.env.API_PREFIX || 'api',
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim()),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback',
  },
  mail: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'NovaChat <no-reply@novachat.dev>',
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
    bucket: process.env.SUPABASE_BUCKET || 'novachat-media',
  },
  security: {
    twoFactorKey:
      process.env.TWO_FACTOR_ENCRYPTION_KEY ||
      process.env.JWT_ACCESS_SECRET ||
      'dev-two-factor-key-change-me',
    twoFactorIssuer: process.env.TWO_FACTOR_ISSUER || 'NovaChat',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '120', 10),
  },
});
