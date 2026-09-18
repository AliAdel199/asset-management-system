import { AuditLogService } from './audit-log.service';

function createService() {
  const prisma = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const service = new AuditLogService(prisma as any);

  return { service, prisma };
}

describe('AuditLogService.record', () => {
  it('writes an entry with null defaults for missing optional fields', async () => {
    const { service, prisma } = createService();
    prisma.auditLog.create.mockResolvedValue({});

    await service.record({
      action: 'ASSET_CREATE',
      module: 'assets',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: null,
        username: null,
        action: 'ASSET_CREATE',
        module: 'assets',
        entityType: null,
        entityId: null,
        description: null,
        ipAddress: null,
      },
    });
  });

  it('never throws even if the write fails, so it cannot break the calling operation', async () => {
    const { service, prisma } = createService();
    prisma.auditLog.create.mockRejectedValue(new Error('db down'));

    await expect(
      service.record({ action: 'ASSET_CREATE', module: 'assets' } as any),
    ).resolves.toBeUndefined();
  });
});

describe('AuditLogService.findMany', () => {
  it('clamps the page size between 1 and 200', async () => {
    const { service, prisma } = createService();
    prisma.auditLog.findMany.mockResolvedValue([]);

    await service.findMany({ limit: 5000 });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 201 }),
    );
  });

  it('reports hasMore via nextCursor when an extra row is fetched', async () => {
    const { service, prisma } = createService();
    const rows = Array.from({ length: 3 }, (_, index) => ({
      id: `row-${index}`,
    }));
    prisma.auditLog.findMany.mockResolvedValue(rows);

    const result = await service.findMany({ limit: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe('row-1');
  });

  it('returns a null cursor when there is no further page', async () => {
    const { service, prisma } = createService();
    prisma.auditLog.findMany.mockResolvedValue([{ id: 'row-0' }]);

    const result = await service.findMany({ limit: 2 });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeNull();
  });
});
