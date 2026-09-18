import { WriteOffReportService } from './write-off-report.service';

function createService() {
  const prisma = {
    assetWriteOffRequest: { findMany: jest.fn().mockResolvedValue([]) },
  };

  const service = new WriteOffReportService(prisma as any);

  return { service, prisma };
}

describe('WriteOffReportService.getSummary', () => {
  it('scopes by the allowed organization units and an optional status', async () => {
    const { service, prisma } = createService();

    await service.getSummary({
      allowedOrganizationUnitIds: ['unit-a'],
      status: 'PENDING',
    });

    expect(prisma.assetWriteOffRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'PENDING',
          organizationUnitId: { in: ['unit-a'] },
        }),
      }),
    );
  });

  it('labels statuses in Arabic and buckets counts by status', async () => {
    const { service, prisma } = createService();
    prisma.assetWriteOffRequest.findMany.mockResolvedValue([
      {
        id: 'wo-1',
        documentNumber: 'WO-1',
        reason: 'تالف',
        status: 'APPROVED',
        requestedAt: new Date('2026-01-01'),
        decidedAt: new Date('2026-01-02'),
        asset: { internalNumber: 'A-1' },
        organizationUnit: { name: 'وحدة 1' },
      },
    ]);

    const result = await service.getSummary({
      allowedOrganizationUnitIds: null,
    });

    expect(result.totalCount).toBe(1);
    expect(result.byStatus).toEqual([
      { id: 'APPROVED', name: 'معتمد', count: 1 },
    ]);
    expect(result.requests[0].status).toBe('معتمد');
  });
});
