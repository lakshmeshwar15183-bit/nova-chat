import { AuditService } from './audit.service';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let rows: any[];
  let prisma: PrismaService;

  beforeEach(() => {
    rows = [];
    prisma = {
      auditLog: {
        create: jest.fn(async ({ data }: any) => {
          const row = { id: `a${rows.length + 1}`, createdAt: new Date(), ...data };
          rows.push(row);
          return row;
        }),
        findMany: jest.fn(async ({ take }: any) => rows.slice(0, take)),
      },
    } as unknown as PrismaService;
    service = new AuditService(prisma);
  });

  it('persists an audit entry', async () => {
    await service.record({ userId: 'u1', action: 'TEST', ipAddress: '127.0.0.1' });
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('TEST');
    expect(rows[0].userId).toBe('u1');
  });

  it('never throws when the write fails', async () => {
    (prisma.auditLog.create as jest.Mock).mockRejectedValueOnce(new Error('db down'));
    await expect(service.record({ action: 'X' })).resolves.toBeUndefined();
  });

  it('paginates with a nextCursor when more results exist', async () => {
    for (let i = 0; i < 5; i++) await service.record({ userId: 'u1', action: `A${i}` });
    const result = await service.listForUser('u1', { limit: 2 } as any);
    expect(result.items).toHaveLength(2);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBeTruthy();
  });
});
