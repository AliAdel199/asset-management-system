import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuditActor } from '../audit-log/types';
import { PrismaService } from '../prisma/prisma.service';

type CreateOrganizationUnitInput = {
  name?: string;
  code?: string;
  unitType?: string;
  parentId?: string | null;
};

type UpdateOrganizationUnitInput = {
  name?: string;
  code?: string;
  unitType?: string;
  parentId?: string | null;
  isActive?: boolean;
};

@Injectable()
export class OrganizationUnitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  findAll() {
    // رمز الجهة يستخدم لاحقاً ضمن توليد الرقم الداخلي للموجود.
    return this.prisma.organizationUnit.findMany({
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            children: true,
            users: true,
            ownedAssets: true,
          },
        },
      },
    });
  }

  async create(input: CreateOrganizationUnitInput, actor: AuditActor) {
    if (!input.name || !input.code || !input.unitType) {
      throw new BadRequestException('الاسم والرمز والنوع حقول إلزامية.');
    }

    const existingUnit = await this.prisma.organizationUnit.findUnique({
      where: { code: input.code },
    });

    if (existingUnit) {
      throw new BadRequestException('رمز الجهة مستخدم بالفعل.');
    }

    if (input.parentId) {
      const parentUnit = await this.prisma.organizationUnit.findUnique({
        where: { id: input.parentId },
      });

      if (!parentUnit) {
        throw new BadRequestException('الجهة الأعلى المحددة غير موجودة.');
      }
    }

    const createdUnit = await this.prisma.organizationUnit.create({
      data: {
        name: input.name,
        code: input.code,
        unitType: input.unitType,
        parentId: input.parentId || null,
      },
    });

    await this.auditLogService.record({
      ...actor,
      action: 'ORG_UNIT_CREATE',
      module: 'admin',
      entityType: 'OrganizationUnit',
      entityId: createdUnit.id,
      description: `إنشاء جهة جديدة: ${createdUnit.name} (${createdUnit.code}).`,
    });

    return createdUnit;
  }

  async update(
    id: string,
    input: UpdateOrganizationUnitInput,
    actor: AuditActor,
  ) {
    const existingUnit = await this.prisma.organizationUnit.findUnique({
      where: { id },
    });

    if (!existingUnit) {
      throw new BadRequestException('الجهة المحددة غير موجودة.');
    }

    const name = input.name?.trim() || existingUnit.name;
    const code = input.code?.trim() || existingUnit.code;
    const unitType = input.unitType?.trim() || existingUnit.unitType;
    const parentId =
      input.parentId !== undefined ? input.parentId : existingUnit.parentId;

    if (parentId) {
      if (parentId === id) {
        throw new BadRequestException('لا يمكن أن تكون الجهة تابعة لنفسها.');
      }

      const allUnits = await this.prisma.organizationUnit.findMany({
        select: { id: true, parentId: true },
      });
      const descendants = this.collectDescendantIds(id, allUnits);

      if (descendants.includes(parentId)) {
        throw new BadRequestException(
          'لا يمكن اختيار جهة تابعة كجهة أعلى (سيسبب دورة في الهيكل).',
        );
      }

      const parentUnit = await this.prisma.organizationUnit.findUnique({
        where: { id: parentId },
      });

      if (!parentUnit) {
        throw new BadRequestException('الجهة الأعلى المحددة غير موجودة.');
      }
    }

    if (code !== existingUnit.code) {
      const duplicateUnit = await this.prisma.organizationUnit.findUnique({
        where: { code },
      });

      if (duplicateUnit) {
        throw new BadRequestException('رمز الجهة مستخدم بالفعل.');
      }
    }

    const updatedUnit = await this.prisma.organizationUnit.update({
      where: { id },
      data: {
        name,
        code,
        unitType,
        parentId,
        isActive: input.isActive ?? existingUnit.isActive,
      },
    });

    await this.auditLogService.record({
      ...actor,
      action: 'ORG_UNIT_UPDATE',
      module: 'admin',
      entityType: 'OrganizationUnit',
      entityId: updatedUnit.id,
      description: `تعديل بيانات الجهة ${updatedUnit.name} (${updatedUnit.code}).`,
    });

    return updatedUnit;
  }

  async remove(id: string, actor: AuditActor) {
    const existingUnit = await this.prisma.organizationUnit.findUnique({
      where: { id },
    });

    if (!existingUnit) {
      throw new BadRequestException('الجهة المحددة غير موجودة.');
    }

    const [childrenCount, usersCount, ownedAssetsCount, employeesCount] =
      await Promise.all([
        this.prisma.organizationUnit.count({ where: { parentId: id } }),
        this.prisma.user.count({ where: { organizationUnitId: id } }),
        this.prisma.asset.count({ where: { owningOrganizationUnitId: id } }),
        this.prisma.employee.count({ where: { organizationUnitId: id } }),
      ]);

    if (
      childrenCount > 0 ||
      usersCount > 0 ||
      ownedAssetsCount > 0 ||
      employeesCount > 0
    ) {
      throw new BadRequestException(
        'لا يمكن حذف الجهة نهائياً لارتباطها ببيانات أخرى (جهات فرعية، مستخدمون، موظفون، أو موجودات). عطّل الجهة بدلاً من ذلك.',
      );
    }

    await this.prisma.organizationUnit.delete({ where: { id } });

    await this.auditLogService.record({
      ...actor,
      action: 'ORG_UNIT_DELETE',
      module: 'admin',
      entityType: 'OrganizationUnit',
      entityId: id,
      description: `حذف الجهة ${existingUnit.name} (${existingUnit.code}).`,
    });

    return { success: true };
  }

  private collectDescendantIds(
    rootId: string,
    allUnits: { id: string; parentId: string | null }[],
  ) {
    const childrenByParent = new Map<string, string[]>();

    for (const unit of allUnits) {
      if (!unit.parentId) {
        continue;
      }

      const siblings = childrenByParent.get(unit.parentId) ?? [];
      siblings.push(unit.id);
      childrenByParent.set(unit.parentId, siblings);
    }

    const collected: string[] = [];
    const queue = [rootId];

    while (queue.length > 0) {
      const currentId = queue.shift();

      if (!currentId) {
        continue;
      }

      for (const childId of childrenByParent.get(currentId) ?? []) {
        collected.push(childId);
        queue.push(childId);
      }
    }

    return collected;
  }
}
