import { BadRequestException } from '@nestjs/common';
import { RolesService } from './roles.service';

function createService() {
  const txPrisma = {
    role: {
      create: jest.fn(),
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    rolePermission: { createMany: jest.fn(), deleteMany: jest.fn() },
  };

  const prisma = {
    role: { findUnique: jest.fn(), findMany: jest.fn() },
    permission: { findMany: jest.fn() },
    $transaction: jest.fn((callback: any) => callback(txPrisma)),
  };

  const auditLogService = { record: jest.fn() };

  const service = new RolesService(prisma as any, auditLogService as any);

  return { service, prisma, txPrisma, auditLogService };
}

const actor = { userId: 'admin-1', username: 'admin', ipAddress: '127.0.0.1' };

describe('RolesService.create', () => {
  it('rejects a missing name', async () => {
    const { service } = createService();

    await expect(
      service.create({ name: '', scopeLevel: 'unit' }, actor),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an invalid scope level', async () => {
    const { service } = createService();

    await expect(
      service.create({ name: 'دور جديد', scopeLevel: 'nonsense' }, actor),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a duplicate role name', async () => {
    const { service, prisma } = createService();
    prisma.role.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create({ name: 'مكرر', scopeLevel: 'unit' }, actor),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an unknown permission code', async () => {
    const { service, prisma } = createService();
    prisma.role.findUnique.mockResolvedValue(null);
    prisma.permission.findMany.mockResolvedValue([{ id: 'p1', code: 'A' }]);

    await expect(
      service.create(
        { name: 'دور', scopeLevel: 'unit', permissionCodes: ['A', 'B'] },
        actor,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates the role with its permissions and records an audit entry', async () => {
    const { service, prisma, txPrisma, auditLogService } = createService();
    prisma.role.findUnique.mockResolvedValue(null);
    prisma.permission.findMany.mockResolvedValue([
      { id: 'p1', code: 'ASSETS_VIEW' },
    ]);
    txPrisma.role.create.mockResolvedValue({ id: 'role-1' });
    txPrisma.role.findUniqueOrThrow.mockResolvedValue({
      id: 'role-1',
      name: 'دور',
    });

    const result = await service.create(
      { name: 'دور', scopeLevel: 'unit', permissionCodes: ['ASSETS_VIEW'] },
      actor,
    );

    expect(result).toEqual({ id: 'role-1', name: 'دور' });
    expect(txPrisma.rolePermission.createMany).toHaveBeenCalledWith({
      data: [{ roleId: 'role-1', permissionId: 'p1' }],
    });
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ROLE_CREATE' }),
    );
  });
});

describe('RolesService.update', () => {
  it('rejects when the role does not exist', async () => {
    const { service, prisma } = createService();
    prisma.role.findUnique.mockResolvedValue(null);

    await expect(service.update('missing', {}, actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects renaming to a name already used by another role', async () => {
    const { service, prisma } = createService();
    prisma.role.findUnique
      .mockResolvedValueOnce({
        id: 'role-1',
        name: 'قديم',
        scopeLevel: 'unit',
        isActive: true,
        description: null,
      })
      .mockResolvedValueOnce({ id: 'other-role', name: 'جديد' });

    await expect(
      service.update('role-1', { name: 'جديد' }, actor),
    ).rejects.toThrow(BadRequestException);
  });

  it('replaces permissions and records an audit entry on success', async () => {
    const { service, prisma, txPrisma, auditLogService } = createService();
    prisma.role.findUnique.mockResolvedValueOnce({
      id: 'role-1',
      name: 'دور',
      scopeLevel: 'unit',
      isActive: true,
      description: null,
    });
    prisma.permission.findMany.mockResolvedValue([
      { id: 'p2', code: 'ASSETS_CREATE' },
    ]);
    txPrisma.role.findUniqueOrThrow.mockResolvedValue({
      id: 'role-1',
      name: 'دور',
    });

    await service.update(
      'role-1',
      { permissionCodes: ['ASSETS_CREATE'] },
      actor,
    );

    expect(txPrisma.rolePermission.deleteMany).toHaveBeenCalledWith({
      where: { roleId: 'role-1' },
    });
    expect(txPrisma.rolePermission.createMany).toHaveBeenCalledWith({
      data: [{ roleId: 'role-1', permissionId: 'p2' }],
    });
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ROLE_UPDATE' }),
    );
  });
});
