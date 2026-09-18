import { MovementReportService } from './movement-report.service';

function createService() {
  const prisma = {
    assetMovement: { findMany: jest.fn().mockResolvedValue([]) },
  };

  const service = new MovementReportService(prisma as any);

  return { service, prisma };
}

describe('MovementReportService.getSummary', () => {
  it('scopes by the allowed organization units and an optional movement type', async () => {
    const { service, prisma } = createService();

    await service.getSummary({
      allowedOrganizationUnitIds: ['unit-a'],
      movementType: 'TRANSFER',
    });

    expect(prisma.assetMovement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          movementType: 'TRANSFER',
          asset: { owningOrganizationUnitId: { in: ['unit-a'] } },
        }),
      }),
    );
  });

  it('labels movement types in Arabic and buckets counts by type', async () => {
    const { service, prisma } = createService();
    prisma.assetMovement.findMany.mockResolvedValue([
      {
        id: 'mv-1',
        movementType: 'TRANSFER',
        documentNumber: 'DOC-1',
        createdAt: new Date('2026-01-01'),
        asset: { internalNumber: 'A-1' },
        fromOrganizationUnit: { name: 'وحدة 1' },
        toOrganizationUnit: { name: 'وحدة 2' },
        fromEmployee: null,
        toEmployee: null,
      },
      {
        id: 'mv-2',
        movementType: 'ASSIGN',
        documentNumber: null,
        createdAt: new Date('2026-01-02'),
        asset: { internalNumber: 'A-2' },
        fromOrganizationUnit: null,
        toOrganizationUnit: null,
        fromEmployee: null,
        toEmployee: { fullName: 'أحمد' },
      },
    ]);

    const result = await service.getSummary({
      allowedOrganizationUnitIds: null,
    });

    expect(result.totalCount).toBe(2);
    expect(result.byMovementType).toEqual(
      expect.arrayContaining([
        { id: 'TRANSFER', name: 'نقل بين جهات', count: 1 },
        { id: 'ASSIGN', name: 'تسليم لموظف', count: 1 },
      ]),
    );
    expect(result.movements[0].movementType).toBe('نقل بين جهات');
    expect(result.movements[1].toEmployeeName).toBe('أحمد');
  });
});
