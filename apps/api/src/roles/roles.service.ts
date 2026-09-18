import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuditActor } from '../audit-log/types';
import { PrismaService } from '../prisma/prisma.service';

const SCOPE_LEVELS = ['central', 'unit', 'read_only'] as const;
type ScopeLevel = (typeof SCOPE_LEVELS)[number];

type CreateRoleInput = {
  name?: string;
  description?: string | null;
  scopeLevel?: string;
  permissionCodes?: string[];
};

type UpdateRoleInput = {
  name?: string;
  description?: string | null;
  scopeLevel?: string;
  isActive?: boolean;
  permissionCodes?: string[];
};

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private readonly roleInclude = {
    permissions: { select: { permission: true } },
    _count: { select: { users: true } },
  };

  findAll() {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: this.roleInclude,
    });
  }

  findAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { name: 'asc' }],
    });
  }

  async create(input: CreateRoleInput, actor: AuditActor) {
    const name = input.name?.trim();

    if (!name) {
      throw new BadRequestException('اسم الدور مطلوب.');
    }

    const scopeLevel = this.normalizeScopeLevel(input.scopeLevel);
    const existingRole = await this.prisma.role.findUnique({
      where: { name },
    });

    if (existingRole) {
      throw new BadRequestException('اسم الدور مستخدم بالفعل.');
    }

    const permissions = await this.resolvePermissions(input.permissionCodes);

    const createdRole = await this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          name,
          description: input.description?.trim() || null,
          scopeLevel,
        },
      });

      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((permission) => ({
            roleId: role.id,
            permissionId: permission.id,
          })),
        });
      }

      return tx.role.findUniqueOrThrow({
        where: { id: role.id },
        include: this.roleInclude,
      });
    });

    await this.auditLogService.record({
      ...actor,
      action: 'ROLE_CREATE',
      module: 'admin',
      entityType: 'Role',
      entityId: createdRole.id,
      description: `إنشاء دور جديد: ${createdRole.name}.`,
    });

    return createdRole;
  }

  async update(id: string, input: UpdateRoleInput, actor: AuditActor) {
    const existingRole = await this.prisma.role.findUnique({ where: { id } });

    if (!existingRole) {
      throw new BadRequestException('الدور المحدد غير موجود.');
    }

    const name = input.name?.trim() || existingRole.name;
    const scopeLevel = input.scopeLevel
      ? this.normalizeScopeLevel(input.scopeLevel)
      : existingRole.scopeLevel;

    if (name !== existingRole.name) {
      const duplicateRole = await this.prisma.role.findUnique({
        where: { name },
      });

      if (duplicateRole) {
        throw new BadRequestException('اسم الدور مستخدم بالفعل.');
      }
    }

    const permissions =
      input.permissionCodes !== undefined
        ? await this.resolvePermissions(input.permissionCodes)
        : null;

    const updatedRole = await this.prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id },
        data: {
          name,
          description:
            input.description !== undefined
              ? input.description?.trim() || null
              : existingRole.description,
          scopeLevel,
          isActive: input.isActive ?? existingRole.isActive,
        },
      });

      if (permissions) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });

        if (permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: permissions.map((permission) => ({
              roleId: id,
              permissionId: permission.id,
            })),
          });
        }
      }

      return tx.role.findUniqueOrThrow({
        where: { id },
        include: this.roleInclude,
      });
    });

    await this.auditLogService.record({
      ...actor,
      action: 'ROLE_UPDATE',
      module: 'admin',
      entityType: 'Role',
      entityId: updatedRole.id,
      description: `تعديل الدور ${updatedRole.name} وصلاحياته.`,
    });

    return updatedRole;
  }

  private async resolvePermissions(codes: string[] | undefined) {
    const uniqueCodes = Array.from(new Set(codes ?? []));

    if (uniqueCodes.length === 0) {
      return [];
    }

    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: uniqueCodes } },
    });

    if (permissions.length !== uniqueCodes.length) {
      throw new BadRequestException('إحدى الصلاحيات المحددة غير موجودة.');
    }

    return permissions;
  }

  private normalizeScopeLevel(value: string | undefined): ScopeLevel {
    if (!value || !SCOPE_LEVELS.includes(value as ScopeLevel)) {
      throw new BadRequestException('نطاق الدور غير صحيح.');
    }

    return value as ScopeLevel;
  }
}
