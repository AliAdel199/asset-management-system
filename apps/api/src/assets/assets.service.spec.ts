import { BadRequestException } from '@nestjs/common';
import { AssetsService } from './assets.service';

function createService() {
  const prisma = {
    asset: { findUnique: jest.fn() },
    organizationUnit: { findUnique: jest.fn() },
    assetTransferRequest: { findFirst: jest.fn(), create: jest.fn() },
    assetWriteOffRequest: { findFirst: jest.fn(), create: jest.fn() },
  };

  const auditLogService = { record: jest.fn() };

  const service = new AssetsService(prisma as any, auditLogService as any);

  return { service, prisma, auditLogService };
}

const actor = { userId: 'officer-1', username: 'officer', ipAddress: null };

describe('AssetsService.move (transfer request creation)', () => {
  it('rejects when no destination organization unit is given', async () => {
    const { service } = createService();

    await expect(service.move('asset-1', {}, actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects when the asset does not exist', async () => {
    const { service, prisma } = createService();
    prisma.asset.findUnique.mockResolvedValue(null);
    prisma.organizationUnit.findUnique.mockResolvedValue({ id: 'unit-b' });
    prisma.assetTransferRequest.findFirst.mockResolvedValue(null);

    await expect(
      service.move('asset-1', { toOrganizationUnitId: 'unit-b' }, actor),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects moving an already-deactivated asset', async () => {
    const { service, prisma } = createService();
    prisma.asset.findUnique.mockResolvedValue({ id: 'asset-1', isDeleted: true });
    prisma.organizationUnit.findUnique.mockResolvedValue({ id: 'unit-b' });
    prisma.assetTransferRequest.findFirst.mockResolvedValue(null);

    await expect(
      service.move('asset-1', { toOrganizationUnitId: 'unit-b' }, actor),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects when a transfer request is already pending for this asset', async () => {
    const { service, prisma } = createService();
    prisma.asset.findUnique.mockResolvedValue({ id: 'asset-1', isDeleted: false });
    prisma.organizationUnit.findUnique.mockResolvedValue({ id: 'unit-b' });
    prisma.assetTransferRequest.findFirst.mockResolvedValue({ id: 'existing-req' });

    await expect(
      service.move('asset-1', { toOrganizationUnitId: 'unit-b' }, actor),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.assetTransferRequest.create).not.toHaveBeenCalled();
  });

  it('creates a pending transfer request (does not move the asset immediately) and audits it', async () => {
    const { service, prisma, auditLogService } = createService();
    prisma.asset.findUnique.mockResolvedValue({
      id: 'asset-1',
      isDeleted: false,
      internalNumber: 'A-1',
      currentHolderOrganizationUnitId: null,
      owningOrganizationUnitId: 'unit-a',
    });
    prisma.organizationUnit.findUnique.mockResolvedValue({
      id: 'unit-b',
      name: 'الجهة الجديدة',
    });
    prisma.assetTransferRequest.findFirst.mockResolvedValue(null);
    prisma.assetTransferRequest.create.mockResolvedValue({
      id: 'req-1',
      status: 'PENDING',
    });

    const result = await service.move(
      'asset-1',
      { toOrganizationUnitId: 'unit-b', documentNumber: 'DOC-1' },
      actor,
    );

    expect(result).toEqual({ id: 'req-1', status: 'PENDING' });
    expect(prisma.assetTransferRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assetId: 'asset-1',
        fromOrganizationUnitId: 'unit-a',
        toOrganizationUnitId: 'unit-b',
        documentNumber: 'DOC-1',
      }),
    });
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ASSET_TRANSFER_REQUEST' }),
    );
  });
});

describe('AssetsService.requestWriteOff', () => {
  it('rejects when the document number is missing', async () => {
    const { service } = createService();

    await expect(
      service.requestWriteOff('asset-1', { reason: 'سبب' }, actor),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects when the reason is missing', async () => {
    const { service } = createService();

    await expect(
      service.requestWriteOff(
        'asset-1',
        { documentNumber: 'WO-1' },
        actor,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects when the asset does not exist or is already inactive', async () => {
    const { service, prisma } = createService();
    prisma.asset.findUnique.mockResolvedValue({ id: 'asset-1', isDeleted: true });
    prisma.assetWriteOffRequest.findFirst.mockResolvedValue(null);

    await expect(
      service.requestWriteOff(
        'asset-1',
        { documentNumber: 'WO-1', reason: 'سبب' },
        actor,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects when a write-off request is already pending for this asset', async () => {
    const { service, prisma } = createService();
    prisma.asset.findUnique.mockResolvedValue({ id: 'asset-1', isDeleted: false });
    prisma.assetWriteOffRequest.findFirst.mockResolvedValue({ id: 'existing-req' });

    await expect(
      service.requestWriteOff(
        'asset-1',
        { documentNumber: 'WO-1', reason: 'سبب' },
        actor,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.assetWriteOffRequest.create).not.toHaveBeenCalled();
  });

  it('creates a pending write-off request (does not deactivate the asset immediately) and audits it', async () => {
    const { service, prisma, auditLogService } = createService();
    prisma.asset.findUnique.mockResolvedValue({
      id: 'asset-1',
      isDeleted: false,
      internalNumber: 'A-1',
      currentHolderOrganizationUnitId: 'unit-b',
      owningOrganizationUnitId: 'unit-a',
    });
    prisma.assetWriteOffRequest.findFirst.mockResolvedValue(null);
    prisma.assetWriteOffRequest.create.mockResolvedValue({
      id: 'wo-1',
      status: 'PENDING',
    });

    const result = await service.requestWriteOff(
      'asset-1',
      { documentNumber: 'WO-1', reason: '  سبب الشطب  ' },
      actor,
    );

    expect(result).toEqual({ id: 'wo-1', status: 'PENDING' });
    expect(prisma.assetWriteOffRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assetId: 'asset-1',
        organizationUnitId: 'unit-b',
        documentNumber: 'WO-1',
        reason: 'سبب الشطب',
      }),
    });
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ASSET_WRITEOFF_REQUEST' }),
    );
  });

  it('falls back to the owning organization unit when there is no current holder', async () => {
    const { service, prisma } = createService();
    prisma.asset.findUnique.mockResolvedValue({
      id: 'asset-1',
      isDeleted: false,
      internalNumber: 'A-1',
      currentHolderOrganizationUnitId: null,
      owningOrganizationUnitId: 'unit-owner',
    });
    prisma.assetWriteOffRequest.findFirst.mockResolvedValue(null);
    prisma.assetWriteOffRequest.create.mockResolvedValue({ id: 'wo-1' });

    await service.requestWriteOff(
      'asset-1',
      { documentNumber: 'WO-1', reason: 'سبب' },
      actor,
    );

    expect(prisma.assetWriteOffRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ organizationUnitId: 'unit-owner' }),
    });
  });
});
