import { BadRequestException } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';

function createService() {
  const txPrisma = {
    maintenanceMaterial: { deleteMany: jest.fn(), create: jest.fn() },
    asset: { update: jest.fn() },
    assetMovement: { create: jest.fn() },
    maintenanceRequest: {
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
  };

  const prisma = {
    asset: { findUnique: jest.fn(), findMany: jest.fn() },
    maintenanceType: { findUnique: jest.fn() },
    assetStatus: { findUnique: jest.fn() },
    maintenanceRequest: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    assetMovement: { findFirst: jest.fn() },
    $transaction: jest.fn((callback: any) => callback(txPrisma)),
  };

  const auditLogService = { record: jest.fn() };

  const service = new MaintenanceService(prisma as any, auditLogService as any);

  return { service, prisma, txPrisma, auditLogService };
}

const actor = { userId: 'tech-1', username: 'tech', ipAddress: null };

describe('MaintenanceService.create', () => {
  it('rejects when required fields are missing', async () => {
    const { service } = createService();

    await expect(
      service.create({ assetId: 'asset-1' } as any, actor),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a maintenance request for an inactive asset', async () => {
    const { service, prisma } = createService();
    prisma.asset.findUnique.mockResolvedValue({
      id: 'asset-1',
      isDeleted: true,
    });
    prisma.maintenanceType.findUnique.mockResolvedValue({ id: 'type-1' });
    prisma.assetStatus.findUnique.mockResolvedValue({ id: 'status-1' });

    await expect(
      service.create(
        {
          assetId: 'asset-1',
          maintenanceTypeId: 'type-1',
          description: 'عطل',
        } as any,
        actor,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates the request and moves the asset into maintenance status', async () => {
    const { service, prisma, txPrisma } = createService();
    prisma.asset.findUnique.mockResolvedValue({
      id: 'asset-1',
      isDeleted: false,
      statusId: 'status-working',
    });
    prisma.maintenanceType.findUnique.mockResolvedValue({ id: 'type-1' });
    prisma.assetStatus.findUnique.mockResolvedValue({ id: 'status-maint' });
    txPrisma.maintenanceRequest.create.mockResolvedValue({
      id: 'req-1',
      requestNumber: 'MTN-2026-00001',
    });
    txPrisma.maintenanceRequest.findUniqueOrThrow.mockResolvedValue({
      id: 'req-1',
    });

    await service.create(
      {
        assetId: 'asset-1',
        maintenanceTypeId: 'type-1',
        description: 'عطل',
      },
      actor,
    );

    expect(txPrisma.asset.update).toHaveBeenCalledWith({
      where: { id: 'asset-1' },
      data: { statusId: 'status-maint' },
    });
    expect(txPrisma.assetMovement.create).toHaveBeenCalled();
  });
});

describe('MaintenanceService.updateStatus', () => {
  it('rejects an unrecognized target status', async () => {
    const { service } = createService();

    await expect(
      service.updateStatus('req-1', { status: 'BOGUS' } as any, actor),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects completing a request without result notes', async () => {
    const { service, prisma } = createService();
    prisma.maintenanceRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      status: 'OPEN',
      assetId: 'asset-1',
      asset: { statusId: 'status-maint' },
    });

    await expect(
      service.updateStatus('req-1', { status: 'COMPLETED' } as any, actor),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects updating a request that is already closed', async () => {
    const { service, prisma } = createService();
    prisma.maintenanceRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      status: 'COMPLETED',
      assetId: 'asset-1',
      asset: { statusId: 'status-working' },
    });

    await expect(
      service.updateStatus('req-1', { status: 'CANCELLED' } as any, actor),
    ).rejects.toThrow(BadRequestException);
  });

  it('requires a quantity for every expensed material on completion', async () => {
    const { service, prisma } = createService();
    prisma.maintenanceRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      status: 'OPEN',
      assetId: 'asset-1',
      requestNumber: 'MTN-2026-00001',
      asset: { statusId: 'status-maint' },
    });
    prisma.assetStatus.findUnique.mockResolvedValue({ id: 'status-working' });

    await expect(
      service.updateStatus(
        'req-1',
        {
          status: 'COMPLETED',
          resultNotes: 'تم الإصلاح',
          materials: [{ materialName: 'فلتر زيت', unitCost: 10 }],
        } as any,
        actor,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('completes the request, saves materials, and audits it', async () => {
    const { service, prisma, txPrisma, auditLogService } = createService();
    prisma.maintenanceRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      status: 'OPEN',
      assetId: 'asset-1',
      requestNumber: 'MTN-2026-00001',
      asset: { statusId: 'status-maint' },
    });
    prisma.assetStatus.findUnique.mockResolvedValue({ id: 'status-working' });
    txPrisma.maintenanceRequest.update.mockResolvedValue({
      id: 'req-1',
      requestNumber: 'MTN-2026-00001',
      status: 'COMPLETED',
    });

    await service.updateStatus(
      'req-1',
      {
        status: 'COMPLETED',
        resultNotes: 'تم الإصلاح',
        materials: [{ materialName: 'فلتر زيت', unitCost: 10, quantity: 2 }],
      },
      actor,
    );

    expect(txPrisma.maintenanceMaterial.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          materialName: 'فلتر زيت',
          unitCost: 10,
          quantity: 2,
        }),
      }),
    );
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'MAINTENANCE_COMPLETE' }),
    );
  });
});

describe('MaintenanceService.getAlerts', () => {
  it('flags an asset overdue when its interval has elapsed since the last service', async () => {
    const { service, prisma } = createService();
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    prisma.asset.findMany.mockResolvedValue([
      {
        id: 'asset-1',
        internalNumber: 'A-1',
        model: null,
        serviceEntryDate: twoYearsAgo,
        createdAt: twoYearsAgo,
        assetCategory: { name: 'مركبات', code: 'VEH' },
        assetType: { name: 'سيارة' },
        owningOrganizationUnit: { id: 'u1', name: 'وحدة', code: 'U1' },
        maintenanceInterval: { id: 'int-1', name: 'سنوية', monthsCount: 12 },
        maintenanceRequests: [],
      },
    ]);

    const alerts = await service.getAlerts(null);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].status).toBe('OVERDUE');
  });

  it('omits assets that are not yet due', async () => {
    const { service, prisma } = createService();
    const now = new Date();

    prisma.asset.findMany.mockResolvedValue([
      {
        id: 'asset-1',
        internalNumber: 'A-1',
        model: null,
        serviceEntryDate: now,
        createdAt: now,
        assetCategory: { name: 'مركبات', code: 'VEH' },
        assetType: { name: 'سيارة' },
        owningOrganizationUnit: { id: 'u1', name: 'وحدة', code: 'U1' },
        maintenanceInterval: { id: 'int-1', name: 'سنوية', monthsCount: 12 },
        maintenanceRequests: [],
      },
    ]);

    const alerts = await service.getAlerts(null);

    expect(alerts).toHaveLength(0);
  });
});
