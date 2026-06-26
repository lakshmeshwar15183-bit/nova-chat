import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaginationDto, PaginatedResult } from '@/common/dto/pagination.dto';

export interface AuditEntry {
  userId?: string | null;
  action: string;
  resource?: string | null;
  resourceId?: string | null;
  method?: string | null;
  path?: string | null;
  statusCode?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Persists immutable audit records. Writes are fire-and-forget from the caller's
 * perspective (failures are logged, never thrown) so auditing can never break a
 * primary request.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId ?? null,
          action: entry.action,
          resource: entry.resource ?? null,
          resourceId: entry.resourceId ?? null,
          method: entry.method ?? null,
          path: entry.path ?? null,
          statusCode: entry.statusCode ?? null,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
          metadata: entry.metadata,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to write audit log: ${(err as Error).message}`);
    }
  }

  async listForUser(
    userId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<unknown>> {
    const items = await this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: pagination.limit + 1,
      ...(pagination.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
    });
    return this.paginate(items, pagination.limit);
  }

  async listAll(pagination: PaginationDto): Promise<PaginatedResult<unknown>> {
    const items = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: pagination.limit + 1,
      ...(pagination.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
    });
    return this.paginate(items, pagination.limit);
  }

  private paginate<T extends { id: string }>(items: T[], limit: number): PaginatedResult<T> {
    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    return {
      items: page,
      nextCursor: hasMore ? page[page.length - 1].id : null,
      hasMore,
    };
  }
}
