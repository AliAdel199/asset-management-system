import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { collectOrgUnitWithDescendants } from './org-scope.util';
import { AuthenticatedUser } from './types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async login(username: string, password: string, ipAddress?: string) {
    const normalizedUsername = username?.trim();

    if (!normalizedUsername || !password) {
      throw new UnauthorizedException('اسم المستخدم وكلمة المرور مطلوبان.');
    }

    const user = await this.prisma.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (!user || !user.isActive) {
      await this.auditLogService.record({
        username: normalizedUsername,
        action: 'LOGIN_FAILED',
        module: 'auth',
        description: 'محاولة دخول بمستخدم غير موجود أو معطل.',
        ipAddress,
      });
      throw new UnauthorizedException('اسم المستخدم أو كلمة المرور غير صحيحة.');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      await this.auditLogService.record({
        userId: user.id,
        username: user.username,
        action: 'LOGIN_FAILED',
        module: 'auth',
        description: 'كلمة مرور غير صحيحة.',
        ipAddress,
      });
      throw new UnauthorizedException('اسم المستخدم أو كلمة المرور غير صحيحة.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const authenticatedUser = await this.loadAuthenticatedUser(user.id);

    if (!authenticatedUser) {
      throw new UnauthorizedException('تعذر تحميل بيانات المستخدم.');
    }

    const accessToken = await this.jwtService.signAsync({ sub: user.id });

    await this.auditLogService.record({
      userId: user.id,
      username: user.username,
      action: 'LOGIN_SUCCESS',
      module: 'auth',
      ipAddress,
    });

    return {
      accessToken,
      user: this.toProfile(authenticatedUser),
    };
  }

  async getProfile(userId: string) {
    const authenticatedUser = await this.loadAuthenticatedUser(userId);

    if (!authenticatedUser) {
      throw new UnauthorizedException('المستخدم غير موجود أو معطل.');
    }

    return this.toProfile(authenticatedUser);
  }

  /**
   * يبني هوية المستخدم الكاملة (الصلاحيات ونطاق الجهات) لاستخدامها بالتحقق من كل طلب.
   */
  async loadAuthenticatedUser(
    userId: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const permissions = new Set<string>();
    let hasCentralScope = false;
    const explicitScopeOrgUnitIds = new Set<string>();

    for (const userRole of user.roles) {
      if (!userRole.role.isActive) {
        continue;
      }

      for (const rolePermission of userRole.role.permissions) {
        permissions.add(rolePermission.permission.code);
      }

      if (userRole.role.scopeLevel === 'central') {
        hasCentralScope = true;
      } else {
        explicitScopeOrgUnitIds.add(
          userRole.organizationUnitId ?? user.organizationUnitId,
        );
      }
    }

    let allowedOrganizationUnitIds: string[] | null = null;

    if (!hasCentralScope) {
      const allOrgUnits = await this.prisma.organizationUnit.findMany({
        select: { id: true, parentId: true },
      });

      const scopeRoots =
        explicitScopeOrgUnitIds.size > 0
          ? Array.from(explicitScopeOrgUnitIds)
          : [user.organizationUnitId];

      const combined = new Set<string>();
      for (const rootId of scopeRoots) {
        for (const id of collectOrgUnitWithDescendants(rootId, allOrgUnits)) {
          combined.add(id);
        }
      }

      allowedOrganizationUnitIds = Array.from(combined);
    }

    return {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      organizationUnitId: user.organizationUnitId,
      permissions,
      allowedOrganizationUnitIds,
    };
  }

  private toProfile(authenticatedUser: AuthenticatedUser) {
    return {
      id: authenticatedUser.id,
      fullName: authenticatedUser.fullName,
      username: authenticatedUser.username,
      organizationUnitId: authenticatedUser.organizationUnitId,
      permissions: Array.from(authenticatedUser.permissions),
      hasFullAccess: authenticatedUser.allowedOrganizationUnitIds === null,
    };
  }
}
