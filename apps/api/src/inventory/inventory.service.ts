import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type InventorySummaryFilters = {
  organizationUnitId?: string;
  includeArchived?: boolean;
  allowedOrganizationUnitIds: string[] | null;
};

type CountBucket = {
  id: string;
  code?: string;
  name: string;
  count: number;
  bookValue: number;
};

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(filters: InventorySummaryFilters) {
    // كشف الجرد يعتمد على بيانات الموجودات الحالية مباشرة، بدون جداول أو حالة إضافية.
    const allowedIds = filters.allowedOrganizationUnitIds;
    let organizationUnitIdCondition: { in: string[] } | string | undefined;

    if (filters.organizationUnitId) {
      // إذا طلب المستخدم جهة خارج نطاقه المسموح، نتجاهل الطلب ونعرض نطاقه فقط بدل تسريب بيانات جهة أخرى.
      organizationUnitIdCondition =
        allowedIds && !allowedIds.includes(filters.organizationUnitId)
          ? { in: allowedIds }
          : filters.organizationUnitId;
    } else if (allowedIds) {
      organizationUnitIdCondition = { in: allowedIds };
    }

    const assets = await this.prisma.asset.findMany({
      where: {
        isDeleted: filters.includeArchived ? undefined : false,
        owningOrganizationUnitId: organizationUnitIdCondition,
      },
      select: {
        bookValue: true,
        isDeleted: true,
        assetCategory: { select: { id: true, code: true, name: true } },
        assetType: { select: { id: true, name: true } },
        status: { select: { id: true, name: true } },
        owningOrganizationUnit: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    const categoryBuckets = new Map<
      string,
      CountBucket & {
        types: Map<string, CountBucket>;
        statuses: Map<string, CountBucket>;
      }
    >();

    let totalCount = 0;
    let totalBookValue = 0;

    for (const asset of assets) {
      totalCount += 1;
      const bookValue = Number(asset.bookValue ?? 0);
      totalBookValue += bookValue;

      let categoryBucket = categoryBuckets.get(asset.assetCategory.id);

      if (!categoryBucket) {
        categoryBucket = {
          id: asset.assetCategory.id,
          code: asset.assetCategory.code,
          name: asset.assetCategory.name,
          count: 0,
          bookValue: 0,
          types: new Map(),
          statuses: new Map(),
        };
        categoryBuckets.set(asset.assetCategory.id, categoryBucket);
      }

      categoryBucket.count += 1;
      categoryBucket.bookValue += bookValue;

      const typeBucket = categoryBucket.types.get(asset.assetType.id) ?? {
        id: asset.assetType.id,
        name: asset.assetType.name,
        count: 0,
        bookValue: 0,
      };
      typeBucket.count += 1;
      typeBucket.bookValue += bookValue;
      categoryBucket.types.set(asset.assetType.id, typeBucket);

      const statusBucket = categoryBucket.statuses.get(asset.status.id) ?? {
        id: asset.status.id,
        name: asset.status.name,
        count: 0,
        bookValue: 0,
      };
      statusBucket.count += 1;
      statusBucket.bookValue += bookValue;
      categoryBucket.statuses.set(asset.status.id, statusBucket);
    }

    const categories = Array.from(categoryBuckets.values())
      .map((category) => ({
        id: category.id,
        code: category.code,
        name: category.name,
        count: category.count,
        bookValue: category.bookValue,
        types: Array.from(category.types.values()).sort((a, b) =>
          a.name.localeCompare(b.name, 'ar'),
        ),
        statuses: Array.from(category.statuses.values()).sort((a, b) =>
          a.name.localeCompare(b.name, 'ar'),
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));

    return {
      generatedAt: new Date().toISOString(),
      totalCount,
      totalBookValue,
      categories,
    };
  }
}
