import { BadRequestException } from '@nestjs/common';
import { TransferRequestsService } from './transfer-requests.service';

function createService() {
  const txPrisma = {
    asset: { update: jest.fn() },
    assetMovement: { create: jest.fn() },
    assetTransferRequest: { update: jest.fn() },
  };

  const prisma = {
    assetTransferRequest: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    organizationUnit: { findUnique: jest.fn() },
    $transaction: jest.fn((callback: any) => callback(txPrisma)),
  };

  const auditLogService = { record: jest.fn() };

  const service = new TransferRequestsService(
    prisma as any,
    auditLogService as any,
  );

  return { service, prisma, txPrisma, auditLogService };
}

const actor = { userId: 'approver-1', username: 'approver', ipAddress: null };

describe('TransferRequestsService.findMany', () => {
  it('scopes results by the destination organization unit', async () => {
    const { service, prisma } = createService();
    prisma.assetTransferRequest.findMany.mockResolvedValue([]);

    await service.findMany(['unit-a'], 'PENDING');

    expect(prisma.assetTransferRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'PENDING',
          toOrganizationUnitId: { in: ['unit-a'] },
        }),
      }),
    );
  });
});

describe('TransferRequestsService.approve', () => {
  it('rejects when the request does not exist', async () => {
    const { service, prisma } = createService();
    prisma.assetTransferRequest.findUnique.mockResolvedValue(null);

    await expect(service.approve('missing', actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects a request that already has a decision', async () => {
    const { service, prisma } = createService();
    prisma.assetTransferRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      status: 'APPROVED',
      asset: { isDeleted: false },
    });

    await expect(service.approve('req-1', actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects transferring an asset that has since been deactivated', async () => {
    const { service, prisma } = createService();
    prisma.assetTransferRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      status: 'PENDING',
      asset: { isDeleted: true },
    });

    await expect(service.approve('req-1', actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects when the destination organization unit no longer exists', async () => {
    const { service, prisma } = createService();
    prisma.assetTransferRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      status: 'PENDING',
      toOrganizationUnitId: 'unit-b',
      asset: { isDeleted: false, internalNumber: 'A-1' },
    });
    prisma.organizationUnit.findUnique.mockResolvedValue(null);

    await expect(service.approve('req-1', actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('moves the asset, records the movement, marks the request approved, and audits it', async () => {
    const { service, prisma, txPrisma, auditLogService } = createService();
    prisma.assetTransferRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      status: 'PENDING',
      assetId: 'asset-1',
      fromOrganizationUnitId: 'unit-a',
      toOrganizationUnitId: 'unit-b',
      documentNumber: 'DOC-1',
      notes: 'ملاحظة',
      asset: { isDeleted: false, internalNumber: 'A-1' },
    });
    prisma.organizationUnit.findUnique.mockResolvedValue({
      id: 'unit-b',
      name: 'الجهة الجديدة',
    });
    txPrisma.assetTransferRequest.update.mockResolvedValue({
      id: 'req-1',
      status: 'APPROVED',
    });

    const result = await service.approve('req-1', actor);

    expect(result).toEqual({ id: 'req-1', status: 'APPROVED' });
    expect(txPrisma.asset.update).toHaveBeenCalledWith({
      where: { id: 'asset-1' },
      data: {
        currentHolderOrganizationUnitId: 'unit-b',
        currentHolderEmployeeId: null,
      },
    });
    expect(txPrisma.assetMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assetId: 'asset-1',
          movementType: 'TRANSFER',
          toOrganizationUnitId: 'unit-b',
        }),
      }),
    );
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ASSET_TRANSFER_APPROVE' }),
    );
  });
});

describe('TransferRequestsService.reject', () => {
  it('rejects when the request does not exist', async () => {
    const { service, prisma } = createService();
    prisma.assetTransferRequest.findUnique.mockResolvedValue(null);

    await expect(service.reject('missing', undefined, actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects a request that already has a decision', async () => {
    const { service, prisma } = createService();
    prisma.assetTransferRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      status: 'REJECTED',
      asset: { internalNumber: 'A-1' },
    });

    await expect(service.reject('req-1', undefined, actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('marks the request rejected with notes and audits it', async () => {
    const { service, prisma, auditLogService } = createService();
    prisma.assetTransferRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      status: 'PENDING',
      assetId: 'asset-1',
      asset: { internalNumber: 'A-1' },
    });
    prisma.assetTransferRequest.update.mockResolvedValue({
      id: 'req-1',
      status: 'REJECTED',
    });

    const result = await service.reject('req-1', '  سبب الرفض  ', actor);

    expect(result.status).toBe('REJECTED');
    expect(prisma.assetTransferRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'REJECTED',
          decisionNotes: 'سبب الرفض',
        }),
      }),
    );
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ASSET_TRANSFER_REJECT' }),
    );
  });
});
