import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReferenceDataService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(allowedOrganizationUnitIds: string[] | null) {
    // نجمع القوائم المرجعية بطلب واحد حتى تمتلئ قوائم نموذج الموجود بسرعة.
    const [
      assetCategories,
      usageNatures,
      assetStatuses,
      maintenanceTypes,
      maintenanceIntervals,
      suppliers,
      employees,
    ] = await Promise.all([
      this.prisma.assetCategory.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        include: {
          assetTypes: {
            where: { isActive: true },
            orderBy: { name: 'asc' },
          },
        },
      }),
      this.prisma.usageNature.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.assetStatus.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.maintenanceType.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.maintenanceInterval.findMany({
        where: { isActive: true },
        orderBy: { monthsCount: 'asc' },
      }),
      this.prisma.supplier.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.employee.findMany({
        where: {
          isActive: true,
          organizationUnitId: allowedOrganizationUnitIds
            ? { in: allowedOrganizationUnitIds }
            : undefined,
        },
        orderBy: { fullName: 'asc' },
        include: {
          organizationUnit: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      }),
    ]);

    return {
      assetCategories,
      usageNatures,
      assetStatuses,
      maintenanceTypes,
      maintenanceIntervals,
      suppliers,
      employees,
    };
  }
}
