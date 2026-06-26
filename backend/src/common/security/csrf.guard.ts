import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Origin-based CSRF protection. For state-changing requests, the `Origin`
 * (or `Referer`) header must match one of the configured allowed origins.
 *
 * This is the modern, framework-agnostic defence: cross-site form/JS requests
 * always carry an attacker-controlled Origin which will not match the allow
 * list, while legitimate first-party requests (and token-only API clients that
 * send no Origin and no cookies) are permitted.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly allowedOrigins: string[];

  constructor(config: ConfigService) {
    this.allowedOrigins = config.get<string[]>('app.corsOrigins') ?? [];
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    if (!MUTATING_METHODS.has(req.method)) return true;

    const origin = this.resolveOrigin(req);

    // No Origin/Referer header => not a browser cross-site request (e.g. a
    // native client using a Bearer token). Such requests never carry cookies,
    // so they are not exposed to CSRF.
    if (!origin) return true;

    if (this.allowedOrigins.includes(origin)) return true;

    throw new ForbiddenException('CSRF validation failed: origin not allowed');
  }

  private resolveOrigin(req: Request): string | null {
    const origin = req.headers.origin;
    if (typeof origin === 'string' && origin.length > 0) return origin;

    const referer = req.headers.referer;
    if (typeof referer === 'string' && referer.length > 0) {
      try {
        return new URL(referer).origin;
      } catch {
        return null;
      }
    }
    return null;
  }
}
