import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AUDIT_ACTION_KEY } from './audit.decorator';
import { AuditService } from './audit.service';

const AUDITED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Automatically records an audit entry for every successful state-changing
 * request. Read requests (GET/HEAD) are ignored to keep the audit trail
 * focused on mutations.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly audit: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { user?: { id: string } }>();

    if (context.getType() !== 'http' || !AUDITED_METHODS.has(req.method)) {
      return next.handle();
    }

    const explicitAction = this.reflector.get<string>(AUDIT_ACTION_KEY, context.getHandler());
    const action =
      explicitAction ?? `${req.method} ${context.getClass().name}.${context.getHandler().name}`;

    return next.handle().pipe(
      tap(() => {
        const res = http.getResponse<Response>();
        void this.audit.record({
          userId: req.user?.id ?? null,
          action,
          resource: context.getClass().name.replace('Controller', '').toLowerCase(),
          resourceId: this.extractResourceId(req),
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] ?? null,
        });
      }),
    );
  }

  private extractResourceId(req: Request): string | null {
    const params = req.params as Record<string, string>;
    return params.id ?? params.conversationId ?? params.groupId ?? null;
  }
}
