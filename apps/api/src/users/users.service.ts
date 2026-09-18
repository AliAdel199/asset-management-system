import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuditActor } from '../audit-log/types';
import { PrismaService } from '../prisma/prisma.service';

type CreateUserInput = {
  fullName?: string;
  username?: string;
  password?: string;
  organizationUnitId?: string;
  isActive?: boolean;
  roleIds?: string[];
};

type UpdateUserInput = {
  fullName?: string;
  organizationUnitId?: string;
  isActive?: boolean;
  password?: string | null;
  roleIds?: string[];
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private readonly userSelect = {
    id: true,
    fullName: true,
    username: true,
    isActive: true,
    lastLoginAt: true,
    createdAt: true,
    organizationUnit: { select: { id: true, name: true, code: true } },
    roles: {
      select: {
        id: true,
        organizationUnitId: true,
        role: {
          select: { id: true, name: true, scopeLevel: true, isActive: true },
        },
      },
    },
  };

  findAll() {
    return this.prisma.user.findMany({
      orderBy: { fullName: 'asc' },
      select: this.userSelect,
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.userSelect,
    });

    if (!user) {
      throw new BadRequestException('المستخدم المحدد غير موجود.');
    }

    return user;
  }

  async create(input: CreateUserInput, actor: AuditActor) {
    const fullName = this.normalizeRequiredString(
      input.fullName,
      'الاسم الكامل مطلوب.',
    );
    const username = this.normalizeRequiredString(
      input.username,
      'اسم المستخدم مطلوب.',
    );
    const password = input.password?.trim() ?? '';

    if (password.length < 8) {
      throw new BadRequestException(
        'كلمة المرور يجب أن تكون 8 أحرف على الأقل.',
      );
    }

    if (!input.organizationUnitId) {
      throw new BadRequestException('الجهة التنظيمية مطلوبة للمستخدم.');
    }

    const [organizationUnit, existingUser, roles] = await Promise.all([
      this.prisma.organizationUnit.findUnique({
        where: { id: input.organizationUnitId },
      }),
      this.prisma.user.findUnique({ where: { username } }),
      this.resolveRoles(input.roleIds),
    ]);

    if (!organizationUnit) {
      throw new BadRequestException('الجهة التنظيمية المحددة غير موجودة.');
    }

    if (existingUser) {
      throw new BadRequestException('اسم المستخدم مستخدم بالفعل.');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const createdUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName,
          username,
          passwordHash,
          organizationUnitId: organizationUnit.id,
          isActive: input.isActive ?? true,
        },
      });

      if (roles.length > 0) {
        await tx.userRole.createMany({
          data: roles.map((role) => ({ userId: user.id, roleId: role.id })),
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        select: this.userSelect,
      });
    });

    await this.auditLogService.record({
      ...actor,
      action: 'USER_CREATE',
      module: 'admin',
      entityType: 'User',
      entityId: createdUser.id,
      description: `إنشاء مستخدم جديد: ${createdUser.fullName} (${createdUser.username}).`,
    });

    return createdUser;
  }

  async update(id: string, input: UpdateUserInput, actor: AuditActor) {
    const existingUser = await this.prisma.user.findUnique({ where: { id } });

    if (!existingUser) {
      throw new BadRequestException('المستخدم المحدد غير موجود.');
    }

    if (actor.userId === id && input.isActive === false) {
      throw new BadRequestException('لا يمكن للمستخدم تعطيل حسابه الخاص.');
    }

    const fullName = input.fullName
      ? this.normalizeRequiredString(input.fullName, 'الاسم الكامل مطلوب.')
      : existingUser.fullName;

    const organizationUnitId =
      input.organizationUnitId ?? existingUser.organizationUnitId;

    const [organizationUnit, roles] = await Promise.all([
      this.prisma.organizationUnit.findUnique({
        where: { id: organizationUnitId },
      }),
      input.roleIds ? this.resolveRoles(input.roleIds) : null,
    ]);

    if (!organizationUnit) {
      throw new BadRequestException('الجهة التنظيمية المحددة غير موجودة.');
    }

    let passwordHash: string | undefined;
    const newPassword = input.password?.trim();

    if (newPassword) {
      if (newPassword.length < 8) {
        throw new BadRequestException(
          'كلمة المرور يجب أن تكون 8 أحرف على الأقل.',
        );
      }

      passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          fullName,
          organizationUnitId,
          isActive: input.isActive ?? existingUser.isActive,
          ...(passwordHash ? { passwordHash } : {}),
        },
      });

      if (roles) {
        await tx.userRole.deleteMany({ where: { userId: id } });

        if (roles.length > 0) {
          await tx.userRole.createMany({
            data: roles.map((role) => ({ userId: id, roleId: role.id })),
          });
        }
      }

      return tx.user.findUniqueOrThrow({
        where: { id },
        select: this.userSelect,
      });
    });

    await this.auditLogService.record({
      ...actor,
      action: 'USER_UPDATE',
      module: 'admin',
      entityType: 'User',
      entityId: updatedUser.id,
      description: `تعديل بيانات المستخدم ${updatedUser.username}.`,
    });

    return updatedUser;
  }

  private async resolveRoles(roleIds: string[] | undefined) {
    const uniqueRoleIds = Array.from(new Set(roleIds ?? []));

    if (uniqueRoleIds.length === 0) {
      return [];
    }

    const roles = await this.prisma.role.findMany({
      where: { id: { in: uniqueRoleIds } },
    });

    if (roles.length !== uniqueRoleIds.length) {
      throw new BadRequestException('أحد الأدوار المحددة غير موجود.');
    }

    return roles;
  }

  private normalizeRequiredString(
    value: string | undefined,
    errorMessage: string,
  ) {
    const trimmed = value?.trim();

    if (!trimmed) {
      throw new BadRequestException(errorMessage);
    }

    return trimmed;
  }
}
