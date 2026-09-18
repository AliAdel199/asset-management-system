import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuditActor } from '../audit-log/types';
import { PrismaService } from '../prisma/prisma.service';

type AddTransferAttachmentInput = {
  attachmentType?: string;
  title?: string;
  notes?: string | null;
};

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
    attachments: {
      orderBy: { createdAt: 'desc' as const },
    },
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

  async addAttachment(
    id: string,
    input: AddTransferAttachmentInput,
    file: Express.Multer.File | undefined,
    actor: AuditActor,
  ) {
    const transferRequest = await this.prisma.assetTransferRequest.findUnique({
      where: { id },
    });

    if (!transferRequest) {
      throw new BadRequestException('طلب النقل المحدد غير موجود.');
    }

    const attachmentType = this.normalizeOptionalString(input.attachmentType);
    const title = this.normalizeOptionalString(input.title);

    if (!attachmentType || !title) {
      throw new BadRequestException('Attachment type and title are required.');
    }

    if (!file) {
      throw new BadRequestException('يجب اختيار ملف لرفعه.');
    }

    const fileUrl = `/uploads/attachments/${file.filename}`;

    const attachment = await this.prisma.assetAttachment.create({
      data: {
        transferRequestId: id,
        attachmentType,
        title,
        fileUrl,
        notes: this.normalizeOptionalString(input.notes),
      },
    });

    await this.auditLogService.record({
      ...actor,
      action: 'ASSET_TRANSFER_ATTACHMENT_UPLOAD',
      module: 'assets',
      entityType: 'Asset',
      entityId: transferRequest.assetId,
      description: `رفع مرفق (${attachmentType}) بعنوان "${title}" لطلب النقل.`,
    });

    return attachment;
  }

  private normalizeOptionalString(value: string | null | undefined) {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
