import { ReferenceDataService } from './reference-data.service';

function createService() {
  const prisma = {
    assetCategory: { findMany: jest.fn().mockResolvedValue([]) },
    usageNature: { findMany: jest.fn().mockResolvedValue([]) },
    assetStatus: { findMany: jest.fn().mockResolvedValue([]) },
    maintenanceType: { findMany: jest.fn().mockResolvedValue([]) },
    maintenanceInterval: { findMany: jest.fn().mockResolvedValue([]) },
    supplier: { findMany: jest.fn().mockResolvedValue([]) },
    employee: { findMany: jest.fn().mockResolvedValue([]) },
  };

  const service = new ReferenceDataService(prisma as any);

  return { service, prisma };
}

describe('ReferenceDataService.findAll', () => {
  it('scopes employees by the allowed organization units', async () => {
    const { service, prisma } = createService();

    await service.findAll(['unit-a']);

    expect(prisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationUnitId: { in: ['unit-a'] },
        }),
      }),
    );
  });

  it('does not scope employees for a central caller', async () => {
    const { service, prisma } = createService();

    await service.findAll(null);

    expect(prisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationUnitId: undefined }),
      }),
    );
  });

  it('returns all seven reference-data collections', async () => {
    const { service } = createService();

    const result = await service.findAll(null);

    expect(Object.keys(result)).toEqual([
      'assetCategories',
      'usageNatures',
      'assetStatuses',
      'maintenanceTypes',
      'maintenanceIntervals',
      'suppliers',
      'employees',
    ]);
  });
});
