import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

type RoleFixture = {
  scopeLevel: string;
  isActive?: boolean;
  organizationUnitId?: string | null;
  permissionCodes?: string[];
};

function buildUser(overrides: {
  isActive?: boolean;
  organizationUnitId?: string;
  roles?: RoleFixture[];
}) {
  const roles = overrides.roles ?? [];

  return {
    id: 'user-1',
    fullName: 'مستخدم تجريبي',
    username: 'tester',
    passwordHash: 'hash',
    isActive: overrides.isActive ?? true,
    organizationUnitId: overrides.organizationUnitId ?? 'unit-root',
    roles: roles.map((role, index) => ({
      organizationUnitId: role.organizationUnitId,
      role: {
        isActive: role.isActive ?? true,
        scopeLevel: role.scopeLevel,
        permissions: (role.permissionCodes ?? [`PERM_${index}`]).map(
          (code) => ({ permission: { code } }),
        ),
      },
    })),
  };
}

function createService(overrides: {
  findUnique?: jest.Mock;
  findManyOrgUnits?: jest.Mock;
}) {
  const prisma = {
    user: {
      findUnique: overrides.findUnique ?? jest.fn(),
      update: jest.fn(),
    },
    organizationUnit: {
      findMany: overrides.findManyOrgUnits ?? jest.fn(),
    },
  };
  const jwtService = { signAsync: jest.fn().mockResolvedValue('signed-jwt') };
  const auditLogService = { record: jest.fn() };

  const service = new AuthService(
    prisma as any,
    jwtService as any,
    auditLogService as any,
  );

  return { service, prisma, jwtService, auditLogService };
}

describe('AuthService.loadAuthenticatedUser', () => {
  it('returns null when the user does not exist', async () => {
    const { service } = createService({
      findUnique: jest.fn().mockResolvedValue(null),
    });

    expect(await service.loadAuthenticatedUser('missing')).toBeNull();
  });

  it('returns null when the user is inactive', async () => {
    const { service } = createService({
      findUnique: jest.fn().mockResolvedValue(buildUser({ isActive: false })),
    });

    expect(await service.loadAuthenticatedUser('user-1')).toBeNull();
  });

  it('grants unrestricted access when the user has a central-scope role', async () => {
    const findManyOrgUnits = jest.fn();
    const { service } = createService({
      findUnique: jest.fn().mockResolvedValue(
        buildUser({
          roles: [{ scopeLevel: 'central', permissionCodes: ['ASSETS_VIEW'] }],
        }),
      ),
      findManyOrgUnits,
    });

    const result = await service.loadAuthenticatedUser('user-1');

    expect(result?.allowedOrganizationUnitIds).toBeNull();
    expect(result?.permissions.has('ASSETS_VIEW')).toBe(true);
    // النطاق المركزي لا يحتاج شجرة الجهات إطلاقاً.
    expect(findManyOrgUnits).not.toHaveBeenCalled();
  });

  it('restricts a "unit"-scoped role to exactly its own organization unit, without expanding to descendants', async () => {
    const findManyOrgUnits = jest.fn();
    const { service } = createService({
      findUnique: jest.fn().mockResolvedValue(
        buildUser({
          roles: [
            {
              scopeLevel: 'unit',
              organizationUnitId: 'unit-a',
            },
          ],
        }),
      ),
      findManyOrgUnits,
    });

    const result = await service.loadAuthenticatedUser('user-1');

    expect(result?.allowedOrganizationUnitIds).toEqual(['unit-a']);
    // هذا هو الخطأ الذي وُجد سابقاً: نطاق "unit" لا يجوز أن يوسّع الشجرة عبر organizationUnit.findMany.
    expect(findManyOrgUnits).not.toHaveBeenCalled();
  });

  it('expands a broad (non-unit, non-central) scope role to include descendant organization units', async () => {
    const findManyOrgUnits = jest.fn().mockResolvedValue([
      { id: 'unit-root', parentId: null },
      { id: 'unit-child', parentId: 'unit-root' },
      { id: 'unit-grandchild', parentId: 'unit-child' },
      { id: 'unrelated-unit', parentId: null },
    ]);
    const { service } = createService({
      findUnique: jest.fn().mockResolvedValue(
        buildUser({
          roles: [
            {
              scopeLevel: 'read_only',
              organizationUnitId: 'unit-root',
            },
          ],
        }),
      ),
      findManyOrgUnits,
    });

    const result = await service.loadAuthenticatedUser('user-1');

    expect(result?.allowedOrganizationUnitIds).toEqual(
      expect.arrayContaining(['unit-root', 'unit-child', 'unit-grandchild']),
    );
    expect(result?.allowedOrganizationUnitIds).not.toContain('unrelated-unit');
  });

  it('combines a unit-scoped role (unexpanded) with a broad-scoped role (expanded)', async () => {
    const findManyOrgUnits = jest.fn().mockResolvedValue([
      { id: 'unit-a', parentId: null },
      { id: 'unit-b', parentId: null },
      { id: 'unit-b-child', parentId: 'unit-b' },
    ]);
    const { service } = createService({
      findUnique: jest.fn().mockResolvedValue(
        buildUser({
          roles: [
            { scopeLevel: 'unit', organizationUnitId: 'unit-a' },
            { scopeLevel: 'read_only', organizationUnitId: 'unit-b' },
          ],
        }),
      ),
      findManyOrgUnits,
    });

    const result = await service.loadAuthenticatedUser('user-1');

    expect(result?.allowedOrganizationUnitIds).toEqual(
      expect.arrayContaining(['unit-a', 'unit-b', 'unit-b-child']),
    );
  });

  it('ignores inactive roles entirely (permissions and scope)', async () => {
    const { service } = createService({
      findUnique: jest.fn().mockResolvedValue(
        buildUser({
          organizationUnitId: 'fallback-unit',
          roles: [
            {
              scopeLevel: 'central',
              isActive: false,
              permissionCodes: ['SHOULD_NOT_APPEAR'],
            },
          ],
        }),
      ),
    });

    const result = await service.loadAuthenticatedUser('user-1');

    expect(result?.permissions.has('SHOULD_NOT_APPEAR')).toBe(false);
    // بلا أدوار مفعّلة، النطاق يقتصر على جهة المستخدم نفسه ولا يكون مركزياً.
    expect(result?.allowedOrganizationUnitIds).toEqual(['fallback-unit']);
  });

  it("falls back to the user's own organization unit when there are no active roles at all", async () => {
    const findManyOrgUnits = jest.fn();
    const { service } = createService({
      findUnique: jest
        .fn()
        .mockResolvedValue(
          buildUser({ organizationUnitId: 'fallback-unit', roles: [] }),
        ),
      findManyOrgUnits,
    });

    const result = await service.loadAuthenticatedUser('user-1');

    expect(result?.allowedOrganizationUnitIds).toEqual(['fallback-unit']);
    expect(findManyOrgUnits).not.toHaveBeenCalled();
  });

  it("uses the role assignment's own organizationUnitId override instead of the user's home unit", async () => {
    const { service } = createService({
      findUnique: jest.fn().mockResolvedValue(
        buildUser({
          organizationUnitId: 'home-unit',
          roles: [{ scopeLevel: 'unit', organizationUnitId: 'assigned-unit' }],
        }),
      ),
    });

    const result = await service.loadAuthenticatedUser('user-1');

    expect(result?.allowedOrganizationUnitIds).toEqual(['assigned-unit']);
  });
});

describe('AuthService.login', () => {
  it('rejects immediately when username or password is missing, without touching the database', async () => {
    const findUnique = jest.fn();
    const { service, prisma } = createService({ findUnique });

    await expect(service.login('', 'password', '127.0.0.1')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects and records LOGIN_FAILED when the user does not exist', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const { service, auditLogService } = createService({ findUnique });

    await expect(
      service.login('ghost', 'password', '127.0.0.1'),
    ).rejects.toThrow(UnauthorizedException);
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN_FAILED' }),
    );
  });

  it('rejects and records LOGIN_FAILED when the user is inactive', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue(buildUser({ isActive: false }));
    const { service, auditLogService } = createService({ findUnique });

    await expect(
      service.login('tester', 'password', '127.0.0.1'),
    ).rejects.toThrow(UnauthorizedException);
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN_FAILED' }),
    );
  });

  it('rejects and records LOGIN_FAILED when the password is wrong', async () => {
    const realHash = await bcrypt.hash('correct-password', 4);
    const findUnique = jest.fn().mockResolvedValue({
      ...buildUser({}),
      passwordHash: realHash,
    });
    const { service, auditLogService } = createService({ findUnique });

    await expect(
      service.login('tester', 'wrong-password', '127.0.0.1'),
    ).rejects.toThrow(UnauthorizedException);
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LOGIN_FAILED',
        description: expect.stringContaining('كلمة مرور'),
      }),
    );
  });

  it('returns an access token and profile on successful login, and records LOGIN_SUCCESS', async () => {
    const realHash = await bcrypt.hash('correct-password', 4);
    const findUnique = jest.fn().mockResolvedValue({
      ...buildUser({
        roles: [{ scopeLevel: 'central', permissionCodes: ['ASSETS_VIEW'] }],
      }),
      passwordHash: realHash,
    });
    const { service, prisma, auditLogService, jwtService } = createService({
      findUnique,
    });

    const result = await service.login(
      'tester',
      'correct-password',
      '127.0.0.1',
    );

    expect(result.accessToken).toBe('signed-jwt');
    expect(result.user.username).toBe('tester');
    expect(result.user.hasFullAccess).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({ lastLoginAt: expect.any(Date) }),
      }),
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: 'user-1' });
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN_SUCCESS' }),
    );
  });
});
