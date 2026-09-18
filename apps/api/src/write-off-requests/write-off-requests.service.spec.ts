import { BadRequestException } from '@nestjs/common';
import { WriteOffRequestsService } from './write-off-requests.service';

function createService() {
  const txPrisma = {
    asset: { update: jest.fn() },
    assetMovement: { create: jest.fn() },
    assetWriteOffRequest: { update: jest.fn() },
  };

  const prisma = {
    assetWriteOffRequest: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((callback: any) => callback(txPrisma)),
  };

  const auditLogService = { record: jest.fn() };

  const service = new WriteOffRequestsService(
    prisma as any,
    auditLogService as any,
  );

  return { service, prisma, txPrisma, auditLogService };
}

const actor = { userId: 'approver-1', username: 'approver', ipAddress: null };

describe('WriteOffRequestsService.findMany', () => {
  it('scopes results by the allowed organization units', async () => {
    const { service, prisma } = createService();
    prisma.assetWriteOffRequest.findMany.mockResolvedValue([]);

    await service.findMany(['unit-a'], 'PENDING');

    expect(prisma.assetWriteOffRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'PENDING',
          organizationUnitId: { in: ['unit-a'] },
        }),
      }),
    );
  });

  it('does not filter by organization unit for a central caller', async () => {
    const { service, prisma } = createService();
    prisma.assetWriteOffRequest.findMany.mockResolvedValue([]);

    await service.findMany(null, undefined);

    expect(prisma.assetWriteOffRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationUnitId: undefined }),
      }),
    );
  });
});

describe('WriteOffRequestsService.approve', () => {
  it("masks a request outside the caller's allowed scope as not-found", async () => {
    const { service, prisma } = createService();
    prisma.assetWriteOffRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      organizationUnitId: 'unit-outside',
      status: 'PENDING',
      asset: { isDeleted: false },
    });

    await expect(service.approve('req-1', actor, ['unit-a'])).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects a request that already has a decision', async () => {
    const { service, prisma } = createService();
    prisma.assetWriteOffRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      organizationUnitId: 'unit-a',
      status: 'APPROVED',
      asset: { isDeleted: false },
    });

    await expect(service.approve('req-1', actor, null)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects when the asset has already been deactivated by another decision', async () => {
    const { service, prisma } = createService();
    prisma.assetWriteOffRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      organizationUnitId: 'unit-a',
      status: 'PENDING',
      asset: { isDeleted: true },
    });

    await expect(service.approve('req-1', actor, null)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('deactivates the asset, records the movement, marks the request approved, and audits it', async () => {
    const { service, prisma, txPrisma, auditLogService } = createService();
    prisma.assetWriteOffRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      organizationUnitId: 'unit-a',
      status: 'PENDING',
      assetId: 'asset-1',
      documentNumber: 'WO-1',
      reason: 'سبب الشطب',
      asset: { isDeleted: false, internalNumber: 'A-1' },
    });
    txPrisma.assetWriteOffRequest.update.mockResolvedValue({
      id: 'req-1',
      status: 'APPROVED',
    });

    const result = await service.approve('req-1', actor, ['unit-a']);

    expect(result).toEqual({ id: 'req-1', status: 'APPROVED' });
    expect(txPrisma.asset.update).toHaveBeenCalledWith({
      where: { id: 'asset-1' },
      data: { isDeleted: true },
    });
    expect(txPrisma.assetMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assetId: 'asset-1',
          movementType: 'DEACTIVATE',
          documentNumber: 'WO-1',
          notes: 'سبب الشطب',
        }),
      }),
    );
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ASSET_WRITEOFF_APPROVE' }),
    );
  });
});

describe('WriteOffRequestsService.reject', () => {
  it("masks a request outside the caller's allowed scope as not-found", async () => {
    const { service, prisma } = createService();
    prisma.assetWriteOffRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      organizationUnitId: 'unit-outside',
      status: 'PENDING',
      asset: { internalNumber: 'A-1' },
    });

    await expect(
      service.reject('req-1', undefined, actor, ['unit-a']),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a request that already has a decision', async () => {
    const { service, prisma } = createService();
    prisma.assetWriteOffRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      organizationUnitId: 'unit-a',
      status: 'REJECTED',
      asset: { internalNumber: 'A-1' },
    });

    await expect(
      service.reject('req-1', undefined, actor, null),
    ).rejects.toThrow(BadRequestException);
  });

  it('marks the request rejected with notes and audits it, without touching the asset', async () => {
    const { service, prisma, txPrisma, auditLogService } = createService();
    prisma.assetWriteOffRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      organizationUnitId: 'unit-a',
      status: 'PENDING',
      assetId: 'asset-1',
      asset: { internalNumber: 'A-1' },
    });
    prisma.assetWriteOffRequest.update.mockResolvedValue({
      id: 'req-1',
      status: 'REJECTED',
    });

    const result = await service.reject('req-1', '  سبب الرفض  ', actor, null);

    expect(result.status).toBe('REJECTED');
    expect(prisma.assetWriteOffRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'REJECTED',
          decisionNotes: 'سبب الرفض',
        }),
      }),
    );
    expect(txPrisma.asset.update).not.toHaveBeenCalled();
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ASSET_WRITEOFF_REJECT' }),
    );
  });
});
