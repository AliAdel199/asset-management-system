import { InventoryService } from './inventory.service';

function createService() {
  const prisma = {
    asset: { findMany: jest.fn().mockResolvedValue([]) },
  };

  const service = new InventoryService(prisma as any);

  return { service, prisma };
}

describe('InventoryService.getSummary', () => {
  it('scopes by the allowed organization units when none is requested', async () => {
    const { service, prisma } = createService();

    await service.getSummary({
      allowedOrganizationUnitIds: ['unit-a'],
    });

    expect(prisma.asset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          owningOrganizationUnitId: { in: ['unit-a'] },
        }),
      }),
    );
  });

  it('falls back to the allowed scope when the requested unit is outside it', async () => {
    const { service, prisma } = createService();

    await service.getSummary({
      organizationUnitId: 'unit-outside',
      allowedOrganizationUnitIds: ['unit-a'],
    });

    expect(prisma.asset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          owningOrganizationUnitId: { in: ['unit-a'] },
        }),
      }),
    );
  });

  it('excludes archived assets by default', async () => {
    const { service, prisma } = createService();

    await service.getSummary({ allowedOrganizationUnitIds: null });

    expect(prisma.asset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isDeleted: false }),
      }),
    );
  });

  it('aggregates counts and book value by category, type, and status', async () => {
    const { service, prisma } = createService();
    prisma.asset.findMany.mockResolvedValue([
      {
        bookValue: '100',
        isDeleted: false,
        assetCategory: { id: 'cat-1', code: 'DEV', name: 'أجهزة' },
        assetType: { id: 'type-1', name: 'حاسوب' },
        status: { id: 'status-1', name: 'صالح' },
        owningOrganizationUnit: { id: 'unit-1', code: 'U1', name: 'وحدة 1' },
      },
      {
        bookValue: '50',
        isDeleted: false,
        assetCategory: { id: 'cat-1', code: 'DEV', name: 'أجهزة' },
        assetType: { id: 'type-1', name: 'حاسوب' },
        status: { id: 'status-2', name: 'قيد الصيانة' },
        owningOrganizationUnit: { id: 'unit-1', code: 'U1', name: 'وحدة 1' },
      },
    ]);

    const result = await service.getSummary({
      allowedOrganizationUnitIds: null,
    });

    expect(result.totalCount).toBe(2);
    expect(result.totalBookValue).toBe(150);
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].count).toBe(2);
    expect(result.categories[0].bookValue).toBe(150);
    expect(result.categories[0].types).toEqual([
      { id: 'type-1', name: 'حاسوب', count: 2, bookValue: 150 },
    ]);
    expect(result.categories[0].statuses).toHaveLength(2);
  });
});
