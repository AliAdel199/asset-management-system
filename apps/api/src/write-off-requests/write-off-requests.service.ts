import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuditActor } from '../audit-log/types';
import { PrismaService } from '../prisma/prisma.service';

type AddWriteOffAttachmentInput = {
  attachmentType?: string;
  title?: string;
  notes?: string | null;
};

@Injectable()
export class WriteOffRequestsService {
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
    organizationUnit: { select: { id: true, name: true, code: true } },
    requestedByUser: { select: { id: true, fullName: true } },
    decidedByUser: { select: { id: true, fullName: true } },
    attachments: {
      orderBy: { createdAt: 'desc' as const },
    },
  };

  findMany(allowedOrganizationUnitIds: string[] | null, status?: string) {
    return this.prisma.assetWriteOffRequest.findMany({
      where: {
        status: status || undefined,
        organizationUnitId: allowedOrganizationUnitIds
          ? { in: allowedOrganizationUnitIds }
          : undefined,
      },
      orderBy: { requestedAt: 'desc' },
      include: this.requestInclude,
    });
  }

  async approve(
    id: string,
    actor: AuditActor,
    allowedOrganizationUnitIds: string[] | null,
  ) {
    const request = await this.prisma.assetWriteOffRequest.findUnique({
      where: { id },
      include: { asset: true },
    });

    if (
      !request ||
      (allowedOrganizationUnitIds &&
        !allowedOrganizationUnitIds.includes(request.organizationUnitId))
    ) {
      throw new BadRequestException('طلب الشطب المحدد غير موجود.');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('تم اتخاذ قرار بهذا الطلب مسبقاً.');
    }

    if (request.asset.isDeleted) {
      throw new BadRequestException('الموجود مشطوب بالفعل.');
    }

    const approvedRequest = await this.prisma.$transaction(async (tx) => {
      await tx.asset.update({
        where: { id: request.assetId },
        data: { isDeleted: true },
      });

      await tx.assetMovement.create({
        data: {
          assetId: request.assetId,
          movementType: 'DEACTIVATE',
          documentNumber: request.documentNumber,
          notes: request.reason,
          createdByUserId: actor.userId ?? null,
        },
      });

      return tx.assetWriteOffRequest.update({
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
      action: 'ASSET_WRITEOFF_APPROVE',
      module: 'assets',
      entityType: 'Asset',
      entityId: request.assetId,
      description: `اعتماد شطب الموجود ${request.asset.internalNumber}.`,
    });

    return approvedRequest;
  }

  async reject(
    id: string,
    notes: string | undefined,
    actor: AuditActor,
    allowedOrganizationUnitIds: string[] | null,
  ) {
    const request = await this.prisma.assetWriteOffRequest.findUnique({
      where: { id },
      include: { asset: { select: { internalNumber: true } } },
    });

    if (
      !request ||
      (allowedOrganizationUnitIds &&
        !allowedOrganizationUnitIds.includes(request.organizationUnitId))
    ) {
      throw new BadRequestException('طلب الشطب المحدد غير موجود.');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('تم اتخاذ قرار بهذا الطلب مسبقاً.');
    }

    const rejectedRequest = await this.prisma.assetWriteOffRequest.update({
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
      action: 'ASSET_WRITEOFF_REJECT',
      module: 'assets',
      entityType: 'Asset',
      entityId: request.assetId,
      description: `رفض طلب شطب الموجود ${request.asset.internalNumber}.`,
    });

    return rejectedRequest;
  }

  async addAttachment(
    id: string,
    input: AddWriteOffAttachmentInput,
    file: Express.Multer.File | undefined,
    actor: AuditActor,
  ) {
    const writeOffRequest = await this.prisma.assetWriteOffRequest.findUnique({
      where: { id },
    });

    if (!writeOffRequest) {
      throw new BadRequestException('طلب الشطب المحدد غير موجود.');
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
        writeOffRequestId: id,
        attachmentType,
        title,
        fileUrl,
        notes: this.normalizeOptionalString(input.notes),
      },
    });

    await this.auditLogService.record({
      ...actor,
      action: 'ASSET_WRITEOFF_ATTACHMENT_UPLOAD',
      module: 'assets',
      entityType: 'Asset',
      entityId: writeOffRequest.assetId,
      description: `رفع مرفق (${attachmentType}) بعنوان "${title}" لطلب الشطب.`,
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
