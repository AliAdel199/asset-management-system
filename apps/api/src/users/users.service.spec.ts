import { BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';

function createService() {
  const txPrisma = {
    user: {
      create: jest.fn(),
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    userRole: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const prisma = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    organizationUnit: { findUnique: jest.fn() },
    role: { findMany: jest.fn() },
    $transaction: jest.fn((callback: any) => callback(txPrisma)),
  };

  const auditLogService = { record: jest.fn() };

  const service = new UsersService(prisma as any, auditLogService as any);

  return { service, prisma, txPrisma, auditLogService };
}

const actor = { userId: 'admin-1', username: 'admin', ipAddress: '127.0.0.1' };

describe('UsersService.findAll', () => {
  it('does not filter by organization unit for a central (null-scope) caller', async () => {
    const { service, prisma } = createService();
    prisma.user.findMany.mockResolvedValue([]);

    await service.findAll(null);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationUnitId: undefined }),
      }),
    );
  });

  it('filters to the allowed organization units for a scoped caller', async () => {
    const { service, prisma } = createService();
    prisma.user.findMany.mockResolvedValue([]);

    await service.findAll(['unit-a', 'unit-b']);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationUnitId: { in: ['unit-a', 'unit-b'] },
        }),
      }),
    );
  });
});

describe('UsersService.findOne', () => {
  it("masks a user outside the caller's allowed scope as not-found", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      organizationUnit: { id: 'unit-outside' },
    });

    await expect(
      service.findOne('user-1', ['unit-a', 'unit-b']),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns the user when within the allowed scope', async () => {
    const { service, prisma } = createService();
    const user = { id: 'user-1', organizationUnit: { id: 'unit-a' } };
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(service.findOne('user-1', ['unit-a'])).resolves.toBe(user);
  });
});

describe('UsersService.create', () => {
  it("rejects an organization unit outside the caller's allowed scope", async () => {
    const { service, prisma } = createService();
    prisma.organizationUnit.findUnique.mockResolvedValue({
      id: 'unit-outside',
    });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.role.findMany.mockResolvedValue([]);

    await expect(
      service.create(
        {
          fullName: 'مستخدم جديد',
          username: 'newuser',
          password: 'password123',
          organizationUnitId: 'unit-outside',
        },
        actor,
        ['unit-a'],
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects assigning a central-scope role when the caller is not central', async () => {
    const { service, prisma } = createService();
    prisma.organizationUnit.findUnique.mockResolvedValue({ id: 'unit-a' });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.role.findMany.mockResolvedValue([
      { id: 'role-central', scopeLevel: 'central' },
    ]);

    await expect(
      service.create(
        {
          fullName: 'مستخدم جديد',
          username: 'newuser',
          password: 'password123',
          organizationUnitId: 'unit-a',
          roleIds: ['role-central'],
        },
        actor,
        ['unit-a'],
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('allows a central caller (null scope) to assign a central-scope role', async () => {
    const { service, prisma, txPrisma } = createService();
    prisma.organizationUnit.findUnique.mockResolvedValue({ id: 'unit-a' });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.role.findMany.mockResolvedValue([
      { id: 'role-central', scopeLevel: 'central' },
    ]);
    txPrisma.user.create.mockResolvedValue({ id: 'new-user' });
    txPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'new-user',
      fullName: 'مستخدم جديد',
      username: 'newuser',
    });

    const result = await service.create(
      {
        fullName: 'مستخدم جديد',
        username: 'newuser',
        password: 'password123',
        organizationUnitId: 'unit-a',
        roleIds: ['role-central'],
      },
      actor,
      null,
    );

    expect(result.id).toBe('new-user');
    expect(txPrisma.userRole.createMany).toHaveBeenCalledWith({
      data: [{ userId: 'new-user', roleId: 'role-central' }],
    });
  });

  it('rejects a duplicate username', async () => {
    const { service, prisma } = createService();
    prisma.organizationUnit.findUnique.mockResolvedValue({ id: 'unit-a' });
    prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });
    prisma.role.findMany.mockResolvedValue([]);

    await expect(
      service.create(
        {
          fullName: 'مستخدم',
          username: 'taken',
          password: 'password123',
          organizationUnitId: 'unit-a',
        },
        actor,
        null,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a password shorter than 8 characters', async () => {
    const { service } = createService();

    await expect(
      service.create(
        {
          fullName: 'مستخدم',
          username: 'newuser',
          password: 'short',
          organizationUnitId: 'unit-a',
        },
        actor,
        null,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('UsersService.update', () => {
  it('masks a user outside the allowed scope as not-found', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      organizationUnitId: 'unit-outside',
    });

    await expect(
      service.update('user-1', {}, actor, ['unit-a']),
    ).rejects.toThrow(BadRequestException);
  });

  it('prevents a user from deactivating their own account', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      organizationUnitId: 'unit-a',
    });

    await expect(
      service.update('admin-1', { isActive: false }, actor, null),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects moving a user to an organization unit outside the caller's scope", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      organizationUnitId: 'unit-a',
    });

    await expect(
      service.update('user-1', { organizationUnitId: 'unit-outside' }, actor, [
        'unit-a',
      ]),
    ).rejects.toThrow(BadRequestException);
  });

  it('updates the user and records an audit entry on success', async () => {
    const { service, prisma, txPrisma, auditLogService } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-2',
      organizationUnitId: 'unit-a',
      fullName: 'قديم',
      isActive: true,
    });
    prisma.organizationUnit.findUnique.mockResolvedValue({ id: 'unit-a' });
    txPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-2',
      username: 'someone',
      fullName: 'جديد',
    });

    const result = await service.update(
      'user-2',
      { fullName: 'جديد' },
      actor,
      null,
    );

    expect(result.fullName).toBe('جديد');
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'USER_UPDATE' }),
    );
  });
});
