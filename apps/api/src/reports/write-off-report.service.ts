import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type WriteOffReportFilters = {
  organizationUnitId?: string;
  status?: string;
  from?: string;
  to?: string;
  allowedOrganizationUnitIds: string[] | null;
};

type CountBucket = {
  id: string;
  name: string;
  count: number;
};

export type WriteOffReportEntry = {
  id: string;
  assetInternalNumber: string;
  organizationUnitName: string;
  documentNumber: string;
  reason: string;
  status: string;
  requestedAt: string;
  decidedAt: string | null;
};

export type WriteOffReportResult = {
  generatedAt: string;
  totalCount: number;
  byStatus: CountBucket[];
  requests: WriteOffReportEntry[];
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'بانتظار الموافقة',
  APPROVED: 'معتمد',
  REJECTED: 'مرفوض',
};

@Injectable()
export class WriteOffReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    filters: WriteOffReportFilters,
  ): Promise<WriteOffReportResult> {
    const allowedIds = filters.allowedOrganizationUnitIds;
    const organizationUnitIdCondition =
      filters.organizationUnitId &&
      (!allowedIds || allowedIds.includes(filters.organizationUnitId))
        ? filters.organizationUnitId
        : allowedIds
          ? { in: allowedIds }
          : undefined;

    const requests = await this.prisma.assetWriteOffRequest.findMany({
      where: {
        status: filters.status || undefined,
        organizationUnitId: organizationUnitIdCondition,
        requestedAt: {
          gte: filters.from ? new Date(filters.from) : undefined,
          lte: filters.to ? new Date(filters.to) : undefined,
        },
      },
      orderBy: { requestedAt: 'desc' },
      select: {
        id: true,
        documentNumber: true,
        reason: true,
        status: true,
        requestedAt: true,
        decidedAt: true,
        asset: { select: { internalNumber: true } },
        organizationUnit: { select: { name: true } },
      },
    });

    const statusBuckets = new Map<string, CountBucket>();

    for (const request of requests) {
      const bucket = statusBuckets.get(request.status) ?? {
        id: request.status,
        name: STATUS_LABELS[request.status] ?? request.status,
        count: 0,
      };
      bucket.count += 1;
      statusBuckets.set(request.status, bucket);
    }

    return {
      generatedAt: new Date().toISOString(),
      totalCount: requests.length,
      byStatus: Array.from(statusBuckets.values()),
      requests: requests.map((request) => ({
        id: request.id,
        assetInternalNumber: request.asset.internalNumber,
        organizationUnitName: request.organizationUnit.name,
        documentNumber: request.documentNumber,
        reason: request.reason,
        status: STATUS_LABELS[request.status] ?? request.status,
        requestedAt: request.requestedAt.toISOString(),
        decidedAt: request.decidedAt?.toISOString() ?? null,
      })),
    };
  }
}
