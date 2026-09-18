import { BadRequestException } from '@nestjs/common';
import { OrganizationUnitsService } from './organization-units.service';

function createService() {
  const prisma = {
    organizationUnit: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: { count: jest.fn() },
    asset: { count: jest.fn() },
    employee: { count: jest.fn() },
  };
  const auditLogService = { record: jest.fn() };

  const service = new OrganizationUnitsService(
    prisma as any,
    auditLogService as any,
  );

  return { service, prisma, auditLogService };
}

const actor = { userId: 'admin-1', username: 'admin', ipAddress: '127.0.0.1' };

describe('OrganizationUnitsService.create', () => {
  it('rejects when required fields are missing', async () => {
    const { service } = createService();

    await expect(
      service.create({ name: '', code: '', unitType: '' }, actor),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a duplicate code', async () => {
    const { service, prisma } = createService();
    prisma.organizationUnit.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create(
        { name: 'قسم', code: 'DUP', unitType: 'department' },
        actor,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a parentId that does not exist', async () => {
    const { service, prisma } = createService();
    prisma.organizationUnit.findUnique
      .mockResolvedValueOnce(null) // code uniqueness check
      .mockResolvedValueOnce(null); // parent lookup

    await expect(
      service.create(
        {
          name: 'قسم',
          code: 'NEW',
          unitType: 'department',
          parentId: 'missing-parent',
        },
        actor,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates the unit and records an audit entry on success', async () => {
    const { service, prisma, auditLogService } = createService();
    prisma.organizationUnit.findUnique
      .mockResolvedValueOnce(null) // code uniqueness
      .mockResolvedValueOnce({ id: 'parent-1' }); // parent lookup
    prisma.organizationUnit.create.mockResolvedValue({
      id: 'new-unit',
      name: 'قسم',
      code: 'NEW',
    });

    const result = await service.create(
      { name: 'قسم', code: 'NEW', unitType: 'department', parentId: 'parent-1' },
      actor,
    );

    expect(result).toEqual({ id: 'new-unit', name: 'قسم', code: 'NEW' });
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ORG_UNIT_CREATE' }),
    );
  });
});

describe('OrganizationUnitsService.update', () => {
  it('rejects when the unit does not exist', async () => {
    const { service, prisma } = createService();
    prisma.organizationUnit.findUnique.mockResolvedValue(null);

    await expect(service.update('missing', {}, actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects setting a unit as its own parent', async () => {
    const { service, prisma } = createService();
    prisma.organizationUnit.findUnique.mockResolvedValue({
      id: 'unit-1',
      name: 'X',
      code: 'X',
      unitType: 't',
      parentId: null,
    });

    await expect(
      service.update('unit-1', { parentId: 'unit-1' }, actor),
    ).rejects.toThrow(BadRequestException);
    // يجب أن يُرفض قبل حتى جلب شجرة الجهات الكاملة.
    expect(prisma.organizationUnit.findMany).not.toHaveBeenCalled();
  });

  it('rejects choosing a descendant as the new parent (would create a cycle)', async () => {
    const { service, prisma } = createService();
    prisma.organizationUnit.findUnique.mockResolvedValue({
      id: 'root',
      name: 'Root',
      code: 'ROOT',
      unitType: 't',
      parentId: null,
    });
    prisma.organizationUnit.findMany.mockResolvedValue([
      { id: 'root', parentId: null },
      { id: 'child', parentId: 'root' },
      { id: 'grandchild', parentId: 'child' },
    ]);

    await expect(
      service.update('root', { parentId: 'grandchild' }, actor),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a parentId that does not exist', async () => {
    const { service, prisma } = createService();
    prisma.organizationUnit.findUnique
      .mockResolvedValueOnce({
        id: 'unit-1',
        name: 'X',
        code: 'X',
        unitType: 't',
        parentId: null,
      })
      .mockResolvedValueOnce(null); // parent lookup fails
    prisma.organizationUnit.findMany.mockResolvedValue([
      { id: 'unit-1', parentId: null },
    ]);

    await expect(
      service.update('unit-1', { parentId: 'missing' }, actor),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a duplicate code on update', async () => {
    const { service, prisma } = createService();
    prisma.organizationUnit.findUnique
      .mockResolvedValueOnce({
        id: 'unit-1',
        name: 'X',
        code: 'OLD',
        unitType: 't',
        parentId: null,
      })
      .mockResolvedValueOnce({ id: 'other-unit', code: 'NEW' }); // duplicate code lookup

    await expect(
      service.update('unit-1', { code: 'NEW' }, actor),
    ).rejects.toThrow(BadRequestException);
  });

  it('updates the unit and records an audit entry on success', async () => {
    const { service, prisma, auditLogService } = createService();
    prisma.organizationUnit.findUnique.mockResolvedValueOnce({
      id: 'unit-1',
      name: 'قديم',
      code: 'OLD',
      unitType: 't',
      parentId: null,
      isActive: true,
    });
    prisma.organizationUnit.update.mockResolvedValue({
      id: 'unit-1',
      name: 'جديد',
      code: 'OLD',
    });

    const result = await service.update('unit-1', { name: 'جديد' }, actor);

    expect(result.name).toBe('جديد');
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ORG_UNIT_UPDATE' }),
    );
  });
});

describe('OrganizationUnitsService.remove', () => {
  it('rejects when the unit does not exist', async () => {
    const { service, prisma } = createService();
    prisma.organizationUnit.findUnique.mockResolvedValue(null);

    await expect(service.remove('missing', actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects deleting a unit that still has children', async () => {
    const { service, prisma } = createService();
    prisma.organizationUnit.findUnique.mockResolvedValue({
      id: 'unit-1',
      name: 'X',
      code: 'X',
    });
    prisma.organizationUnit.count.mockResolvedValue(2); // children
    prisma.user.count.mockResolvedValue(0);
    prisma.asset.count.mockResolvedValue(0);
    prisma.employee.count.mockResolvedValue(0);

    await expect(service.remove('unit-1', actor)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.organizationUnit.delete).not.toHaveBeenCalled();
  });

  it('rejects deleting a unit that still owns assets', async () => {
    const { service, prisma } = createService();
    prisma.organizationUnit.findUnique.mockResolvedValue({
      id: 'unit-1',
      name: 'X',
      code: 'X',
    });
    prisma.organizationUnit.count.mockResolvedValue(0);
    prisma.user.count.mockResolvedValue(0);
    prisma.asset.count.mockResolvedValue(3); // owned assets
    prisma.employee.count.mockResolvedValue(0);

    await expect(service.remove('unit-1', actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('deletes the unit and records an audit entry when nothing references it', async () => {
    const { service, prisma, auditLogService } = createService();
    prisma.organizationUnit.findUnique.mockResolvedValue({
      id: 'unit-1',
      name: 'X',
      code: 'X',
    });
    prisma.organizationUnit.count.mockResolvedValue(0);
    prisma.user.count.mockResolvedValue(0);
    prisma.asset.count.mockResolvedValue(0);
    prisma.employee.count.mockResolvedValue(0);

    const result = await service.remove('unit-1', actor);

    expect(result).toEqual({ success: true });
    expect(prisma.organizationUnit.delete).toHaveBeenCalledWith({
      where: { id: 'unit-1' },
    });
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ORG_UNIT_DELETE' }),
    );
  });
});
