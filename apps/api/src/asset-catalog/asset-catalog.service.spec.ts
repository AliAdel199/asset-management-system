import { BadRequestException } from '@nestjs/common';
import { AssetCatalogService } from './asset-catalog.service';

function createService() {
  const prisma = {
    assetCategory: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    assetType: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    asset: { count: jest.fn() },
  };

  const auditLogService = { record: jest.fn() };

  const service = new AssetCatalogService(
    prisma as any,
    auditLogService as any,
  );

  return { service, prisma, auditLogService };
}

const actor = { userId: 'admin-1', username: 'admin', ipAddress: null };

describe('AssetCatalogService.createCategory', () => {
  it('rejects a duplicate category code', async () => {
    const { service, prisma } = createService();
    prisma.assetCategory.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.createCategory({ name: 'أجهزة', code: 'dev' } as any, actor),
    ).rejects.toThrow(BadRequestException);
  });

  it('uppercases the code and audits the creation', async () => {
    const { service, prisma, auditLogService } = createService();
    prisma.assetCategory.findUnique.mockResolvedValue(null);
    prisma.assetCategory.create.mockResolvedValue({
      id: 'cat-1',
      name: 'أجهزة',
      code: 'DEV',
    });

    await service.createCategory({ name: 'أجهزة', code: 'dev' }, actor);

    expect(prisma.assetCategory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ code: 'DEV' }),
      }),
    );
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ASSET_CATEGORY_CREATE' }),
    );
  });
});

describe('AssetCatalogService.removeCategory', () => {
  it('blocks deletion when types or assets are still linked', async () => {
    const { service, prisma } = createService();
    prisma.assetCategory.findUnique.mockResolvedValue({ id: 'cat-1' });
    prisma.assetType.count.mockResolvedValue(1);
    prisma.asset.count.mockResolvedValue(0);

    await expect(service.removeCategory('cat-1', actor)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.assetCategory.delete).not.toHaveBeenCalled();
  });

  it('deletes an unreferenced category', async () => {
    const { service, prisma } = createService();
    prisma.assetCategory.findUnique.mockResolvedValue({
      id: 'cat-1',
      name: 'أجهزة',
    });
    prisma.assetType.count.mockResolvedValue(0);
    prisma.asset.count.mockResolvedValue(0);

    const result = await service.removeCategory('cat-1', actor);

    expect(result).toEqual({ success: true });
    expect(prisma.assetCategory.delete).toHaveBeenCalledWith({
      where: { id: 'cat-1' },
    });
  });
});

describe('AssetCatalogService.createType', () => {
  it('rejects when the parent category does not exist', async () => {
    const { service, prisma } = createService();
    prisma.assetCategory.findUnique.mockResolvedValue(null);

    await expect(
      service.createType('missing-cat', { name: 'حاسوب' } as any, actor),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a duplicate type name within the same category', async () => {
    const { service, prisma } = createService();
    prisma.assetCategory.findUnique.mockResolvedValue({ id: 'cat-1' });
    prisma.assetType.findUnique.mockResolvedValue({ id: 'type-1' });

    await expect(
      service.createType('cat-1', { name: 'حاسوب' } as any, actor),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('AssetCatalogService.removeType', () => {
  it('blocks deletion when assets still use the type', async () => {
    const { service, prisma } = createService();
    prisma.assetType.findUnique.mockResolvedValue({ id: 'type-1' });
    prisma.asset.count.mockResolvedValue(2);

    await expect(service.removeType('type-1', actor)).rejects.toThrow(
      BadRequestException,
    );
  });
});
