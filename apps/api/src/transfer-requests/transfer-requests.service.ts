import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuditActor } from '../audit-log/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransferRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private readonly requestInclude = {
    asset: {
      select: {
        id: true,
        internalNumber: true,
        isDeleted: true,
        assetCategory: { select: { name: true, code: true } },
        assetType: { select: { name: true } },
      },
    },
    fromOrganizationUnit: { select: { id: true, name: true, code: true } },
    toOrganizationUnit: { select: { id: true, name: true, code: true } },
    requestedByUser: { select: { id: true, fullName: true } },
    decidedByUser: { select: { id: true, fullName: true } },
  };

  findMany(allowedOrganizationUnitIds: string[] | null, status?: string) {
    // نطاق الموافقة يتبع نطاق الجهة المستلمة (الجهة الجديدة) لا الجهة الحالية.
    return this.prisma.assetTransferRequest.findMany({
      where: {
        status: status || undefined,
        toOrganizationUnitId: allowedOrganizationUnitIds
          ? { in: allowedOrganizationUnitIds }
          : undefined,
      },
      orderBy: { requestedAt: 'desc' },
      include: this.requestInclude,
    });
  }

  async approve(id: string, actor: AuditActor) {
    const request = await this.prisma.assetTransferRequest.findUnique({
      where: { id },
      include: { asset: true },
    });

    if (!request) {
      throw new BadRequestException('طلب النقل المحدد غير موجود.');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('تم اتخاذ قرار بهذا الطلب مسبقاً.');
    }

    if (request.asset.isDeleted) {
      throw new BadRequestException('لا يمكن تنفيذ نقل لموجود معطل.');
    }

    const toOrganizationUnit = await this.prisma.organizationUnit.findUnique({
      where: { id: request.toOrganizationUnitId },
    });

    if (!toOrganizationUnit) {
      throw new BadRequestException('الجهة الجديدة غير موجودة.');
    }

    const updatedRequest = await this.prisma.$transaction(async (tx) => {
      await tx.asset.update({
        where: { id: request.assetId },
        data: {
          currentHolderOrganizationUnitId: request.toOrganizationUnitId,
          currentHolderEmployeeId: null,
        },
      });

      await tx.assetMovement.create({
        data: {
          assetId: request.assetId,
          movementType: 'TRANSFER',
          fromOrganizationUnitId: request.fromOrganizationUnitId,
          toOrganizationUnitId: request.toOrganizationUnitId,
          documentNumber: request.documentNumber,
          notes: request.notes,
          createdByUserId: actor.userId ?? null,
        },
      });

      return tx.assetTransferRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          decidedByUserId: actor.userId ?? null,
          decidedAt: new Date(),
        },
        include: this.requestInclude,
      });
    });

    await this.auditLogService.record({
      ...actor,
      action: 'ASSET_TRANSFER_APPROVE',
      module: 'assets',
      entityType: 'Asset',
      entityId: request.assetId,
      description: `اعتماد نقل الموجود ${request.asset.internalNumber} إلى ${toOrganizationUnit.name}.`,
    });

    return updatedRequest;
  }

  async reject(id: string, notes: string | undefined, actor: AuditActor) {
    const request = await this.prisma.assetTransferRequest.findUnique({
      where: { id },
      include: { asset: { select: { internalNumber: true } } },
    });

    if (!request) {
      throw new BadRequestException('طلب النقل المحدد غير موجود.');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('تم اتخاذ قرار بهذا الطلب مسبقاً.');
    }

    const updatedRequest = await this.prisma.assetTransferRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        decidedByUserId: actor.userId ?? null,
        decidedAt: new Date(),
        decisionNotes: this.normalizeOptionalString(notes),
      },
      include: this.requestInclude,
    });

    await this.auditLogService.record({
      ...actor,
      action: 'ASSET_TRANSFER_REJECT',
      module: 'assets',
      entityType: 'Asset',
      entityId: request.assetId,
      description: `رفض طلب نقل الموجود ${request.asset.internalNumber}.`,
    });

    return updatedRequest;
  }

  private normalizeOptionalString(value: string | null | undefined) {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
