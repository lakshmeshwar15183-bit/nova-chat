import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'auditAction';

/** Overrides the auto-generated audit action label for a route. */
export const AuditAction = (action: string) => SetMetadata(AUDIT_ACTION_KEY, action);
