import { MaintenanceReportService } from './maintenance-report.service';

function createService() {
  const prisma = {
    maintenanceRequest: { findMany: jest.fn().mockResolvedValue([]) },
  };

  const service = new MaintenanceReportService(prisma as any);

  return { service, prisma };
}

describe('MaintenanceReportService.getSummary', () => {
  it('scopes by the allowed organization units', async () => {
    const { service, prisma } = createService();

    await service.getSummary({ allowedOrganizationUnitIds: ['unit-a'] });

    expect(prisma.maintenanceRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          asset: { owningOrganizationUnitId: { in: ['unit-a'] } },
        }),
      }),
    );
  });

  it('aggregates totals, and buckets by status and maintenance type', async () => {
    const { service, prisma } = createService();
    prisma.maintenanceRequest.findMany.mockResolvedValue([
      {
        id: 'req-1',
        requestNumber: 'MTN-1',
        status: 'OPEN',
        cost: '100',
        requestedAt: new Date('2026-01-01'),
        performedAt: null,
        maintenanceType: { id: 'type-1', name: 'دورية' },
        asset: {
          internalNumber: 'A-1',
          owningOrganizationUnit: { name: 'وحدة 1' },
        },
      },
      {
        id: 'req-2',
        requestNumber: 'MTN-2',
        status: 'COMPLETED',
        cost: '50',
        requestedAt: new Date('2026-01-02'),
        performedAt: new Date('2026-01-03'),
        maintenanceType: { id: 'type-1', name: 'دورية' },
        asset: {
          internalNumber: 'A-2',
          owningOrganizationUnit: { name: 'وحدة 1' },
        },
      },
    ]);

    const result = await service.getSummary({
      allowedOrganizationUnitIds: null,
    });

    expect(result.totalCount).toBe(2);
    expect(result.totalCost).toBe(150);
    expect(result.byStatus).toEqual(
      expect.arrayContaining([
        { id: 'OPEN', name: 'OPEN', count: 1, cost: 100 },
        { id: 'COMPLETED', name: 'COMPLETED', count: 1, cost: 50 },
      ]),
    );
    expect(result.byMaintenanceType).toEqual([
      { id: 'type-1', name: 'دورية', count: 2, cost: 150 },
    ]);
    expect(result.requests).toHaveLength(2);
  });
});
