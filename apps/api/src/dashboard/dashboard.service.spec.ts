import { DashboardService } from './dashboard.service';

function createService() {
  const prisma = {
    asset: { count: jest.fn().mockResolvedValue(0) },
    organizationUnit: { count: jest.fn().mockResolvedValue(0) },
    assetCategory: { count: jest.fn().mockResolvedValue(0) },
    assetStatus: { count: jest.fn().mockResolvedValue(0) },
    maintenanceRequest: { count: jest.fn().mockResolvedValue(0) },
  };

  const service = new DashboardService(prisma as any);

  return { service, prisma };
}

describe('DashboardService.getSummary', () => {
  it('scopes asset and maintenance counts by the allowed organization units', async () => {
    const { service, prisma } = createService();

    await service.getSummary(['unit-a']);

    expect(prisma.asset.count).toHaveBeenCalledWith({
      where: { owningOrganizationUnitId: { in: ['unit-a'] } },
    });
    expect(prisma.maintenanceRequest.count).toHaveBeenCalledWith({
      where: {
        asset: { owningOrganizationUnitId: { in: ['unit-a'] } },
      },
    });
  });

  it('does not scope counts for a central caller', async () => {
    const { service, prisma } = createService();

    await service.getSummary(null);

    expect(prisma.asset.count).toHaveBeenCalledWith({ where: {} });
    expect(prisma.maintenanceRequest.count).toHaveBeenCalledWith({
      where: {},
    });
  });

  it('assembles the summary from the individual counts', async () => {
    const { service, prisma } = createService();
    prisma.asset.count.mockResolvedValue(10);
    prisma.organizationUnit.count.mockResolvedValue(3);
    prisma.assetCategory.count.mockResolvedValue(5);
    prisma.assetStatus.count.mockResolvedValue(6);
    prisma.maintenanceRequest.count.mockResolvedValue(2);

    const result = await service.getSummary(null);

    expect(result).toEqual({
      assetsCount: 10,
      maintenanceRequestsCount: 2,
      movementRequestsCount: 0,
      attachmentsCount: 0,
      organizationUnitsCount: 3,
      assetCategoriesCount: 5,
      assetStatusesCount: 6,
    });
  });
});
