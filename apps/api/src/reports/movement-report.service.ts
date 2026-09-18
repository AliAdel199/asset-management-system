import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type MovementReportFilters = {
  organizationUnitId?: string;
  movementType?: string;
  from?: string;
  to?: string;
  allowedOrganizationUnitIds: string[] | null;
};

type CountBucket = {
  id: string;
  name: string;
  count: number;
};

export type MovementReportEntry = {
  id: string;
  movementType: string;
  assetInternalNumber: string;
  fromOrganizationUnitName: string | null;
  toOrganizationUnitName: string | null;
  fromEmployeeName: string | null;
  toEmployeeName: string | null;
  documentNumber: string | null;
  createdAt: string;
};

export type MovementReportResult = {
  generatedAt: string;
  totalCount: number;
  byMovementType: CountBucket[];
  movements: MovementReportEntry[];
};

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  TRANSFER: 'نقل بين جهات',
  ASSIGN: 'تسليم لموظف',
  RETURN: 'استرجاع',
  STATUS_CHANGE: 'تغيير حالة',
  DEACTIVATE: 'شطب',
};

@Injectable()
export class MovementReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    filters: MovementReportFilters,
  ): Promise<MovementReportResult> {
    const allowedIds = filters.allowedOrganizationUnitIds;
    const organizationUnitIdCondition =
      filters.organizationUnitId &&
      (!allowedIds || allowedIds.includes(filters.organizationUnitId))
        ? filters.organizationUnitId
        : allowedIds
          ? { in: allowedIds }
          : undefined;

    const movements = await this.prisma.assetMovement.findMany({
      where: {
        movementType: filters.movementType || undefined,
        asset: { owningOrganizationUnitId: organizationUnitIdCondition },
        createdAt: {
          gte: filters.from ? new Date(filters.from) : undefined,
          lte: filters.to ? new Date(filters.to) : undefined,
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        movementType: true,
        documentNumber: true,
        createdAt: true,
        asset: { select: { internalNumber: true } },
        fromOrganizationUnit: { select: { name: true } },
        toOrganizationUnit: { select: { name: true } },
        fromEmployee: { select: { fullName: true } },
        toEmployee: { select: { fullName: true } },
      },
    });

    const typeBuckets = new Map<string, CountBucket>();

    for (const movement of movements) {
      const bucket = typeBuckets.get(movement.movementType) ?? {
        id: movement.movementType,
        name:
          MOVEMENT_TYPE_LABELS[movement.movementType] ?? movement.movementType,
        count: 0,
      };
      bucket.count += 1;
      typeBuckets.set(movement.movementType, bucket);
    }

    return {
      generatedAt: new Date().toISOString(),
      totalCount: movements.length,
      byMovementType: Array.from(typeBuckets.values()),
      movements: movements.map((movement) => ({
        id: movement.id,
        movementType:
          MOVEMENT_TYPE_LABELS[movement.movementType] ?? movement.movementType,
        assetInternalNumber: movement.asset.internalNumber,
        fromOrganizationUnitName: movement.fromOrganizationUnit?.name ?? null,
        toOrganizationUnitName: movement.toOrganizationUnit?.name ?? null,
        fromEmployeeName: movement.fromEmployee?.fullName ?? null,
        toEmployeeName: movement.toEmployee?.fullName ?? null,
        documentNumber: movement.documentNumber,
        createdAt: movement.createdAt.toISOString(),
      })),
    };
  }
}
