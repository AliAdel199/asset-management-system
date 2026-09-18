import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(allowedOrganizationUnitIds: string[] | null) {
    // هذه أرقام لوحة التحكم المبكرة؛ كل رقم يأتي مباشرة من قاعدة البيانات، ومحصورة بنطاق المستخدم.
    const assetsOrgFilter = allowedOrganizationUnitIds
      ? { owningOrganizationUnitId: { in: allowedOrganizationUnitIds } }
      : {};
    const maintenanceOrgFilter = allowedOrganizationUnitIds
      ? {
          asset: {
            owningOrganizationUnitId: { in: allowedOrganizationUnitIds },
          },
        }
      : {};

    const [
      assetsCount,
      organizationUnitsCount,
      assetCategoriesCount,
      assetStatusesCount,
      maintenanceRequestsCount,
    ] = await Promise.all([
      this.prisma.asset.count({ where: assetsOrgFilter }),
      this.prisma.organizationUnit.count(),
      this.prisma.assetCategory.count({ where: { isActive: true } }),
      this.prisma.assetStatus.count({ where: { isActive: true } }),
      this.prisma.maintenanceRequest.count({ where: maintenanceOrgFilter }),
    ]);

    return {
      assetsCount,
      maintenanceRequestsCount,
      // هذه العدادات محفوظة مكانها إلى أن نبني وحدات النقل والمرفقات.
      movementRequestsCount: 0,
      attachmentsCount: 0,
      organizationUnitsCount,
      assetCategoriesCount,
      assetStatusesCount,
    };
  }
}
