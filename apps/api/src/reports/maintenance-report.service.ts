import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type MaintenanceReportFilters = {
  organizationUnitId?: string;
  from?: string;
  to?: string;
  allowedOrganizationUnitIds: string[] | null;
};

type CountBucket = {
  id: string;
  name: string;
  count: number;
  cost: number;
};

export type MaintenanceReportRequest = {
  id: string;
  requestNumber: string;
  status: string;
  cost: number;
  requestedAt: string;
  performedAt: string | null;
  assetInternalNumber: string;
  maintenanceTypeName: string;
  organizationUnitName: string;
};

export type MaintenanceReportResult = {
  generatedAt: string;
  totalCount: number;
  totalCost: number;
  byStatus: CountBucket[];
  byMaintenanceType: CountBucket[];
  requests: MaintenanceReportRequest[];
};

@Injectable()
export class MaintenanceReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    filters: MaintenanceReportFilters,
  ): Promise<MaintenanceReportResult> {
    const allowedIds = filters.allowedOrganizationUnitIds;
    const organizationUnitIdCondition =
      filters.organizationUnitId &&
      (!allowedIds || allowedIds.includes(filters.organizationUnitId))
        ? filters.organizationUnitId
        : allowedIds
          ? { in: allowedIds }
          : undefined;

    const requests = await this.prisma.maintenanceRequest.findMany({
      where: {
        asset: { owningOrganizationUnitId: organizationUnitIdCondition },
        requestedAt: {
          gte: filters.from ? new Date(filters.from) : undefined,
          lte: filters.to ? new Date(filters.to) : undefined,
        },
      },
      orderBy: { requestedAt: 'desc' },
      select: {
        id: true,
        requestNumber: true,
        status: true,
        cost: true,
        requestedAt: true,
        performedAt: true,
        maintenanceType: { select: { id: true, name: true } },
        asset: {
          select: {
            internalNumber: true,
            owningOrganizationUnit: { select: { name: true } },
          },
        },
      },
    });

    const statusBuckets = new Map<string, CountBucket>();
    const typeBuckets = new Map<string, CountBucket>();
    let totalCost = 0;

    for (const request of requests) {
      const cost = Number(request.cost ?? 0);
      totalCost += cost;

      const statusBucket = statusBuckets.get(request.status) ?? {
        id: request.status,
        name: request.status,
        count: 0,
        cost: 0,
      };
      statusBucket.count += 1;
      statusBucket.cost += cost;
      statusBuckets.set(request.status, statusBucket);

      const typeBucket = typeBuckets.get(request.maintenanceType.id) ?? {
        id: request.maintenanceType.id,
        name: request.maintenanceType.name,
        count: 0,
        cost: 0,
      };
      typeBucket.count += 1;
      typeBucket.cost += cost;
      typeBuckets.set(request.maintenanceType.id, typeBucket);
    }

    return {
      generatedAt: new Date().toISOString(),
      totalCount: requests.length,
      totalCost,
      byStatus: Array.from(statusBuckets.values()),
      byMaintenanceType: Array.from(typeBuckets.values()).sort((a, b) =>
        a.name.localeCompare(b.name, 'ar'),
      ),
      requests: requests.map((request) => ({
        id: request.id,
        requestNumber: request.requestNumber,
        status: request.status,
        cost: Number(request.cost ?? 0),
        requestedAt: request.requestedAt.toISOString(),
        performedAt: request.performedAt?.toISOString() ?? null,
        assetInternalNumber: request.asset.internalNumber,
        maintenanceTypeName: request.maintenanceType.name,
        organizationUnitName: request.asset.owningOrganizationUnit.name,
      })),
    };
  }
}
