import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/** Insecure placeholder secrets shipped as dev defaults — never allowed in prod. */
const FORBIDDEN_PRODUCTION_SECRETS = new Set([
  'dev-access-secret-change-me',
  'dev-refresh-secret-change-me',
  'dev-two-factor-key-change-me',
  'change-me',
  'secret',
]);

const MIN_SECRET_LENGTH = 32;

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT = 4000;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  @IsOptional()
  REDIS_URL?: string;

  @IsString()
  JWT_ACCESS_SECRET: string;

  @IsString()
  JWT_REFRESH_SECRET: string;
}

function isHttpsOrLocalhost(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') return true;
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extra invariants that only apply when running in production. Returns a list of
 * human-readable problems (empty when the configuration is acceptable). Exported
 * separately so it can be unit-tested with plain objects.
 */
export function collectProductionIssues(env: Record<string, string | undefined>): string[] {
  const issues: string[] = [];

  const checkSecret = (name: string) => {
    const value = env[name];
    if (!value) {
      issues.push(`${name} is required in production`);
      return;
    }
    if (value.length < MIN_SECRET_LENGTH) {
      issues.push(`${name} must be at least ${MIN_SECRET_LENGTH} characters in production`);
    }
    if (FORBIDDEN_PRODUCTION_SECRETS.has(value)) {
      issues.push(`${name} is using an insecure default value; set a strong secret`);
    }
  };

  checkSecret('JWT_ACCESS_SECRET');
  checkSecret('JWT_REFRESH_SECRET');

  if (
    env.JWT_ACCESS_SECRET &&
    env.JWT_REFRESH_SECRET &&
    env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET
  ) {
    issues.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
  }

  const dbUrl = env.DATABASE_URL;
  if (!dbUrl || !/^postgres(ql)?:\/\//.test(dbUrl)) {
    issues.push('DATABASE_URL must be a valid postgres(ql):// connection string');
  }

  const redisUrl = env.REDIS_URL;
  if (!redisUrl) {
    issues.push('REDIS_URL is required in production (used for cache, presence and WS scaling)');
  } else if (!/^rediss?:\/\//.test(redisUrl)) {
    issues.push('REDIS_URL must start with redis:// or rediss://');
  }

  const corsOrigins = env.CORS_ORIGINS;
  if (!corsOrigins || corsOrigins.trim().length === 0) {
    issues.push('CORS_ORIGINS is required in production');
  } else {
    const insecure = corsOrigins
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0 && !isHttpsOrLocalhost(o));
    if (insecure.length > 0) {
      issues.push(`CORS_ORIGINS must use HTTPS in production: ${insecure.join(', ')}`);
    }
  }

  if (env.FRONTEND_URL && !isHttpsOrLocalhost(env.FRONTEND_URL)) {
    issues.push('FRONTEND_URL must use HTTPS in production');
  }

  return issues;
}

/**
 * Validates environment variables at boot so the process fails fast with a clear,
 * aggregated error instead of misbehaving at runtime. Applies stricter security
 * invariants when NODE_ENV=production.
 */
export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  const messages = errors.map((e) => Object.values(e.constraints || {}).join(', '));

  if ((validated.NODE_ENV ?? Environment.Development) === Environment.Production) {
    messages.push(...collectProductionIssues(config as Record<string, string | undefined>));
  }

  if (messages.length > 0) {
    throw new Error(`Invalid environment configuration:\n- ${messages.join('\n- ')}`);
  }
  return validated;
}
