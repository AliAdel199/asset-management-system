import { randomBytes } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuditActor } from '../audit-log/types';
import { PrismaService } from '../prisma/prisma.service';

const CATEGORY_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

type CreateCategoryInput = {
  name?: string;
  code?: string;
  description?: string | null;
};

type UpdateCategoryInput = {
  name?: string;
  description?: string | null;
  isActive?: boolean;
};

type CreateTypeInput = {
  name?: string;
  description?: string | null;
};

type UpdateTypeInput = {
  name?: string;
  description?: string | null;
  isActive?: boolean;
};

@Injectable()
export class AssetCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  findAll() {
    return this.prisma.assetCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        assetTypes: { orderBy: { name: 'asc' } },
        _count: { select: { assets: true } },
      },
    });
  }

  async createCategory(input: CreateCategoryInput, actor: AuditActor) {
    const name = this.normalizeRequiredString(input.name, 'اسم الصنف مطلوب.');
    const providedCode = input.code?.trim();

    if (providedCode) {
      const code = providedCode.toUpperCase();
      const existingCategory = await this.prisma.assetCategory.findUnique({
        where: { code },
      });

      if (existingCategory) {
        throw new BadRequestException('رمز الصنف مستخدم بالفعل.');
      }

      return this.saveNewCategory(code, name, input, actor);
    }

    // بدون رمز مُدخل: نولّد رمزاً فريداً تلقائياً بدل إجبار المستخدم على اختراع واحد،
    // ونعيد المحاولة برمز جديد عند تصادم نادر (P2002) بدل فشل الطلب.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = this.generateRandomCategoryCode(attempt < 3 ? 3 : 4);

      try {
        return await this.saveNewCategory(code, name, input, actor);
      } catch (error) {
        const isDuplicateCode =
          typeof error === 'object' &&
          error !== null &&
          (error as { code?: unknown }).code === 'P2002';

        if (!isDuplicateCode || attempt === 4) {
          throw error;
        }
      }
    }

    throw new BadRequestException('تعذر توليد رمز صنف فريد، حاول مرة أخرى.');
  }

  private async saveNewCategory(
    code: string,
    name: string,
    input: CreateCategoryInput,
    actor: AuditActor,
  ) {
    const createdCategory = await this.prisma.assetCategory.create({
      data: {
        name,
        code,
        description: input.description?.trim() || null,
      },
    });

    await this.auditLogService.record({
      ...actor,
      action: 'ASSET_CATEGORY_CREATE',
      module: 'admin',
      entityType: 'AssetCategory',
      entityId: createdCategory.id,
      description: `إنشاء صنف موجودات جديد: ${createdCategory.name} (${createdCategory.code}).`,
    });

    return createdCategory;
  }

  private generateRandomCategoryCode(length: number): string {
    const bytes = randomBytes(length);
    let code = '';

    for (let i = 0; i < length; i += 1) {
      code += CATEGORY_CODE_ALPHABET[bytes[i] % CATEGORY_CODE_ALPHABET.length];
    }

    return code;
  }

  async updateCategory(
    id: string,
    input: UpdateCategoryInput,
    actor: AuditActor,
  ) {
    const existingCategory = await this.prisma.assetCategory.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      throw new BadRequestException('الصنف المحدد غير موجود.');
    }

    // رمز الصنف (code) لا يتغير بعد الإنشاء لأن منطق تسجيل الموجودات (الأراضي والمباني تحديدًا) يعتمد عليه.
    const updatedCategory = await this.prisma.assetCategory.update({
      where: { id },
      data: {
        name: input.name?.trim() || existingCategory.name,
        description:
          input.description !== undefined
            ? input.description?.trim() || null
            : existingCategory.description,
        isActive: input.isActive ?? existingCategory.isActive,
      },
    });

    await this.auditLogService.record({
      ...actor,
      action: 'ASSET_CATEGORY_UPDATE',
      module: 'admin',
      entityType: 'AssetCategory',
      entityId: updatedCategory.id,
      description: `تعديل صنف الموجودات ${updatedCategory.name}.`,
    });

    return updatedCategory;
  }

  async removeCategory(id: string, actor: AuditActor) {
    const existingCategory = await this.prisma.assetCategory.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      throw new BadRequestException('الصنف المحدد غير موجود.');
    }

    const [typesCount, assetsCount] = await Promise.all([
      this.prisma.assetType.count({ where: { assetCategoryId: id } }),
      this.prisma.asset.count({ where: { assetCategoryId: id } }),
    ]);

    if (typesCount > 0 || assetsCount > 0) {
      throw new BadRequestException(
        'لا يمكن حذف الصنف نهائياً لارتباطه بأنواع مواد أو موجودات مسجلة. عطّل الصنف بدلاً من ذلك.',
      );
    }

    await this.prisma.assetCategory.delete({ where: { id } });

    await this.auditLogService.record({
      ...actor,
      action: 'ASSET_CATEGORY_DELETE',
      module: 'admin',
      entityType: 'AssetCategory',
      entityId: id,
      description: `حذف صنف الموجودات ${existingCategory.name}.`,
    });

    return { success: true };
  }

  async createType(
    categoryId: string,
    input: CreateTypeInput,
    actor: AuditActor,
  ) {
    const name = this.normalizeRequiredString(
      input.name,
      'اسم نوع المادة مطلوب.',
    );

    const category = await this.prisma.assetCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new BadRequestException('الصنف المحدد غير موجود.');
    }

    const existingType = await this.prisma.assetType.findUnique({
      where: { assetCategoryId_name: { assetCategoryId: categoryId, name } },
    });

    if (existingType) {
      throw new BadRequestException('يوجد نوع مادة بنفس الاسم لهذا الصنف.');
    }

    const createdType = await this.prisma.assetType.create({
      data: {
        assetCategoryId: categoryId,
        name,
        description: input.description?.trim() || null,
      },
    });

    await this.auditLogService.record({
      ...actor,
      action: 'ASSET_TYPE_CREATE',
      module: 'admin',
      entityType: 'AssetType',
      entityId: createdType.id,
      description: `إنشاء نوع مادة جديد: ${createdType.name} ضمن صنف ${category.name}.`,
    });

    return createdType;
  }

  async updateType(id: string, input: UpdateTypeInput, actor: AuditActor) {
    const existingType = await this.prisma.assetType.findUnique({
      where: { id },
    });

    if (!existingType) {
      throw new BadRequestException('نوع المادة المحدد غير موجود.');
    }

    const name = input.name?.trim() || existingType.name;

    if (name !== existingType.name) {
      const duplicateType = await this.prisma.assetType.findUnique({
        where: {
          assetCategoryId_name: {
            assetCategoryId: existingType.assetCategoryId,
            name,
          },
        },
      });

      if (duplicateType) {
        throw new BadRequestException('يوجد نوع مادة بنفس الاسم لهذا الصنف.');
      }
    }

    const updatedType = await this.prisma.assetType.update({
      where: { id },
      data: {
        name,
        description:
          input.description !== undefined
            ? input.description?.trim() || null
            : existingType.description,
        isActive: input.isActive ?? existingType.isActive,
      },
    });

    await this.auditLogService.record({
      ...actor,
      action: 'ASSET_TYPE_UPDATE',
      module: 'admin',
      entityType: 'AssetType',
      entityId: updatedType.id,
      description: `تعديل نوع المادة ${updatedType.name}.`,
    });

    return updatedType;
  }

  async removeType(id: string, actor: AuditActor) {
    const existingType = await this.prisma.assetType.findUnique({
      where: { id },
    });

    if (!existingType) {
      throw new BadRequestException('نوع المادة المحدد غير موجود.');
    }

    const assetsCount = await this.prisma.asset.count({
      where: { assetTypeId: id },
    });

    if (assetsCount > 0) {
      throw new BadRequestException(
        'لا يمكن حذف نوع المادة نهائياً لارتباطه بموجودات مسجلة. عطّله بدلاً من ذلك.',
      );
    }

    await this.prisma.assetType.delete({ where: { id } });

    await this.auditLogService.record({
      ...actor,
      action: 'ASSET_TYPE_DELETE',
      module: 'admin',
      entityType: 'AssetType',
      entityId: id,
      description: `حذف نوع المادة ${existingType.name}.`,
    });

    return { success: true };
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
