import { Injectable } from '@nestjs/common';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuditActor } from '../audit-log/types';
import { PrismaService } from '../prisma/prisma.service';

type CreateOrganizationUnitInput = {
  name?: string;
  code?: string;
  unitType?: string;
  parentId?: string | null;
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
      throw new Error('name, code, and unitType are required.');
    }

    // هذه نسخة تأسيسية بسيطة؛ لاحقاً يمكن إضافة صلاحيات وموافقات قبل إنشاء جهة.
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
}
