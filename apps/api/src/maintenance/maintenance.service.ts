import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuditActor } from '../audit-log/types';
import { PrismaService } from '../prisma/prisma.service';

type CreateMaintenanceRequestInput = {
  assetId?: string;
  maintenanceTypeId?: string;
  description?: string | null;
  cost?: string | number | null;
};

type UpdateMaintenanceStatusInput = {
  status?: string;
  cost?: string | number | null;
  finalAssetStatusId?: string | null;
  resultNotes?: string | null;
  materials?: MaintenanceMaterialInput[];
};

type MaintenanceMaterialInput = {
  materialName?: string | null;
  quantity?: string | number | null;
  unitCost?: string | number | null;
  notes?: string | null;
};

type AddMaintenanceAttachmentInput = {
  attachmentType?: string;
  title?: string;
  notes?: string | null;
};

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private readonly requestInclude = {
    asset: {
      select: {
        id: true,
        internalNumber: true,
        model: true,
        assetCategory: {
          select: {
            code: true,
            name: true,
          },
        },
        owningOrganizationUnit: {
          select: {
            name: true,
            code: true,
          },
        },
        status: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    },
    maintenanceType: true,
    materials: {
      orderBy: { createdAt: 'asc' as const },
    },
    attachments: {
      orderBy: { createdAt: 'desc' as const },
    },
  };

  findAll(allowedOrganizationUnitIds: string[] | null) {
    return this.prisma.maintenanceRequest.findMany({
      where: allowedOrganizationUnitIds
        ? {
            asset: {
              owningOrganizationUnitId: { in: allowedOrganizationUnitIds },
            },
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      include: this.requestInclude,
    });
  }

  async getAlerts(allowedOrganizationUnitIds: string[] | null) {
    // تنبيهات الصيانة الدورية: نحسبها من تاريخ آخر صيانة مكتملة (أو دخول الخدمة إن لم توجد) + دورية الموجود.
    const dueSoonThresholdDays = 30;
    const now = new Date();

    const assets = await this.prisma.asset.findMany({
      where: {
        isDeleted: false,
        maintenanceIntervalId: { not: null },
        owningOrganizationUnitId: allowedOrganizationUnitIds
          ? { in: allowedOrganizationUnitIds }
          : undefined,
      },
      select: {
        id: true,
        internalNumber: true,
        model: true,
        serviceEntryDate: true,
        createdAt: true,
        assetCategory: { select: { name: true, code: true } },
        assetType: { select: { name: true } },
        owningOrganizationUnit: {
          select: { id: true, name: true, code: true },
        },
        maintenanceInterval: {
          select: { id: true, name: true, monthsCount: true },
        },
        maintenanceRequests: {
          where: { status: 'COMPLETED' },
          orderBy: { performedAt: 'desc' },
          take: 1,
          select: { performedAt: true },
        },
      },
    });

    const alerts = assets
      .filter((asset) => asset.maintenanceInterval)
      .map((asset) => {
        const lastServiceDate =
          asset.maintenanceRequests[0]?.performedAt ??
          asset.serviceEntryDate ??
          asset.createdAt;

        const nextDueDate = new Date(lastServiceDate);
        nextDueDate.setMonth(
          nextDueDate.getMonth() + asset.maintenanceInterval!.monthsCount,
        );

        const daysUntilDue = Math.ceil(
          (nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        const status: 'OVERDUE' | 'DUE_SOON' | 'OK' =
          daysUntilDue < 0
            ? 'OVERDUE'
            : daysUntilDue <= dueSoonThresholdDays
              ? 'DUE_SOON'
              : 'OK';

        return {
          assetId: asset.id,
          internalNumber: asset.internalNumber,
          model: asset.model,
          assetCategory: asset.assetCategory,
          assetType: asset.assetType,
          owningOrganizationUnit: asset.owningOrganizationUnit,
          maintenanceIntervalName: asset.maintenanceInterval!.name,
          lastServiceDate,
          nextDueDate,
          daysUntilDue,
          status,
        };
      })
      .filter((alert) => alert.status !== 'OK')
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

    return alerts;
  }

  async findOne(id: string, allowedOrganizationUnitIds: string[] | null) {
    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id },
      include: this.requestInclude,
    });

    if (!request) {
      throw new BadRequestException('طلب الصيانة المحدد غير موجود.');
    }

    if (
      allowedOrganizationUnitIds &&
      !(await this.prisma.asset.findFirst({
        where: {
          id: request.assetId,
          owningOrganizationUnitId: { in: allowedOrganizationUnitIds },
        },
        select: { id: true },
      }))
    ) {
      throw new BadRequestException('طلب الصيانة المحدد غير موجود.');
    }

    return request;
  }

  async create(input: CreateMaintenanceRequestInput, actor: AuditActor) {
    this.assertRequired(input);

    const [asset, maintenanceType, maintenanceStatus] = await Promise.all([
      this.prisma.asset.findUnique({ where: { id: input.assetId } }),
      this.prisma.maintenanceType.findUnique({
        where: { id: input.maintenanceTypeId },
      }),
      this.prisma.assetStatus.findUnique({
        where: { code: 'IN_MAINTENANCE' },
      }),
    ]);

    if (!asset) {
      throw new BadRequestException('الموجود المحدد غير موجود.');
    }

    if (asset.isDeleted) {
      throw new BadRequestException(
        'Cannot create maintenance request for an inactive asset.',
      );
    }

    if (!maintenanceType) {
      throw new BadRequestException('نوع الصيانة المحدد غير موجود.');
    }

    if (!maintenanceStatus) {
      throw new BadRequestException('حالة قيد الصيانة غير معرفة في النظام.');
    }

    const requestNumber = await this.generateRequestNumber();

    const createdRequest = await this.prisma.$transaction(async (tx) => {
      const request = await tx.maintenanceRequest.create({
        data: {
          requestNumber,
          assetId: asset.id,
          maintenanceTypeId: maintenanceType.id,
          description: input.description!.trim(),
          cost: this.normalizeOptionalNumber(input.cost),
          resultNotes: null,
        },
      });

      if (asset.statusId !== maintenanceStatus.id) {
        await tx.asset.update({
          where: { id: asset.id },
          data: { statusId: maintenanceStatus.id },
        });

        await tx.assetMovement.create({
          data: {
            assetId: asset.id,
            movementType: 'STATUS_CHANGE',
            fromStatusId: asset.statusId,
            toStatusId: maintenanceStatus.id,
            documentNumber: request.requestNumber,
            notes: 'تم تحويل الموجود إلى قيد الصيانة عند فتح طلب صيانة.',
          },
        });
      }

      return tx.maintenanceRequest.findUniqueOrThrow({
        where: { id: request.id },
        include: this.requestInclude,
      });
    });

    await this.auditLogService.record({
      ...actor,
      action: 'MAINTENANCE_CREATE',
      module: 'maintenance',
      entityType: 'MaintenanceRequest',
      entityId: createdRequest.id,
      description: `فتح طلب صيانة ${createdRequest.requestNumber} للموجود ${asset.internalNumber}.`,
    });

    return createdRequest;
  }

  async updateStatus(
    id: string,
    input: UpdateMaintenanceStatusInput,
    actor: AuditActor,
  ) {
    const nextStatus = this.normalizeStatus(input.status);
    const resultNotes = this.normalizeOptionalString(input.resultNotes);
    const existingRequest = await this.prisma.maintenanceRequest.findUnique({
      where: { id },
      include: {
        asset: true,
      },
    });

    if (!existingRequest) {
      throw new BadRequestException('طلب الصيانة المحدد غير موجود.');
    }

    if (existingRequest.status !== 'OPEN') {
      throw new BadRequestException('لا يمكن تحديث طلب صيانة مغلق.');
    }

    if (nextStatus === 'COMPLETED' && !resultNotes) {
      throw new BadRequestException('نتيجة الصيانة مطلوبة عند إكمال الطلب.');
    }

    const finalAssetStatus = await this.resolveFinalAssetStatus(
      existingRequest.assetId,
      nextStatus,
      input.finalAssetStatusId,
    );

    const updatedRequest = await this.prisma.$transaction(async (tx) => {
      if (nextStatus === 'COMPLETED') {
        await tx.maintenanceMaterial.deleteMany({
          where: { maintenanceRequestId: id },
        });

        for (const material of this.normalizeMaterials(input.materials)) {
          await tx.maintenanceMaterial.create({
            data: {
              maintenanceRequestId: id,
              materialName: material.materialName,
              quantity: material.quantity,
              unitCost: material.unitCost,
              notes: material.notes,
            },
          });
        }
      }

      await tx.asset.update({
        where: { id: existingRequest.assetId },
        data: { statusId: finalAssetStatus.id },
      });

      await tx.assetMovement.create({
        data: {
          assetId: existingRequest.assetId,
          movementType: 'STATUS_CHANGE',
          fromStatusId: existingRequest.asset.statusId,
          toStatusId: finalAssetStatus.id,
          documentNumber: existingRequest.requestNumber,
          notes:
            nextStatus === 'COMPLETED'
              ? `تم إكمال الصيانة: ${resultNotes}`
              : 'تم إلغاء طلب الصيانة وإرجاع حالة الموجود.',
        },
      });

      return tx.maintenanceRequest.update({
        where: { id },
        data: {
          status: nextStatus,
          cost: this.normalizeOptionalNumber(input.cost),
          resultNotes,
          performedAt: nextStatus === 'COMPLETED' ? new Date() : null,
        },
        include: this.requestInclude,
      });
    });

    await this.auditLogService.record({
      ...actor,
      action:
        nextStatus === 'COMPLETED'
          ? 'MAINTENANCE_COMPLETE'
          : 'MAINTENANCE_CANCEL',
      module: 'maintenance',
      entityType: 'MaintenanceRequest',
      entityId: updatedRequest.id,
      description: `تحديث طلب الصيانة ${updatedRequest.requestNumber} إلى ${nextStatus}.`,
    });

    return updatedRequest;
  }

  async addAttachment(
    id: string,
    input: AddMaintenanceAttachmentInput,
    file: Express.Multer.File | undefined,
    actor: AuditActor,
  ) {
    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new BadRequestException('طلب الصيانة المحدد غير موجود.');
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
        maintenanceRequestId: id,
        attachmentType,
        title,
        fileUrl,
        notes: this.normalizeOptionalString(input.notes),
      },
    });

    await this.auditLogService.record({
      ...actor,
      action: 'MAINTENANCE_ATTACHMENT_UPLOAD',
      module: 'maintenance',
      entityType: 'MaintenanceRequest',
      entityId: id,
      description: `رفع مرفق (${attachmentType}) بعنوان "${title}" لطلب الصيانة ${request.requestNumber}.`,
    });

    return attachment;
  }

  private assertRequired(input: CreateMaintenanceRequestInput) {
    if (
      !input.assetId ||
      !input.maintenanceTypeId ||
      !input.description ||
      input.description.trim().length === 0
    ) {
      throw new BadRequestException(
        'الموجود، نوع الصيانة، ووصف المشكلة حقول إلزامية.',
      );
    }
  }

  private async resolveFinalAssetStatus(
    assetId: string,
    requestStatus: 'COMPLETED' | 'CANCELLED',
    finalAssetStatusId?: string | null,
  ) {
    if (requestStatus === 'COMPLETED' && finalAssetStatusId) {
      const status = await this.prisma.assetStatus.findUnique({
        where: { id: finalAssetStatusId },
      });

      if (!status) {
        throw new BadRequestException('حالة الموجود النهائية غير موجودة.');
      }

      return status;
    }

    if (requestStatus === 'CANCELLED') {
      const maintenanceStatus = await this.prisma.assetStatus.findUnique({
        where: { code: 'IN_MAINTENANCE' },
      });
      const lastMaintenanceMovement = maintenanceStatus
        ? await this.prisma.assetMovement.findFirst({
            where: {
              assetId,
              movementType: 'STATUS_CHANGE',
              toStatusId: maintenanceStatus.id,
              fromStatusId: { not: null },
            },
            orderBy: { createdAt: 'desc' },
          })
        : null;

      if (lastMaintenanceMovement?.fromStatusId) {
        const previousStatus = await this.prisma.assetStatus.findUnique({
          where: { id: lastMaintenanceMovement.fromStatusId },
        });

        if (previousStatus) {
          return previousStatus;
        }
      }
    }

    const workingStatus = await this.prisma.assetStatus.findUnique({
      where: { code: 'WORKING' },
    });

    if (!workingStatus) {
      throw new BadRequestException('حالة صالح ويعمل غير معرفة في النظام.');
    }

    return workingStatus;
  }

  private async generateRequestNumber() {
    const year = new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const startOfNextYear = new Date(year + 1, 0, 1);

    const count = await this.prisma.maintenanceRequest.count({
      where: {
        createdAt: {
          gte: startOfYear,
          lt: startOfNextYear,
        },
      },
    });

    const sequence = String(count + 1).padStart(5, '0');

    return `MTN-${year}-${sequence}`;
  }

  private normalizeOptionalString(value: string | null | undefined) {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeStatus(value: string | undefined) {
    if (value === 'COMPLETED' || value === 'CANCELLED') {
      return value;
    }

    throw new BadRequestException('حالة طلب الصيانة غير صحيحة.');
  }

  private normalizeOptionalNumber(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);

    if (Number.isNaN(parsed) || parsed < 0) {
      throw new BadRequestException('الكلفة يجب أن تكون رقماً صحيحاً.');
    }

    return parsed;
  }

  private normalizeMaterials(
    materials: MaintenanceMaterialInput[] | undefined,
  ) {
    if (!Array.isArray(materials)) {
      return [];
    }

    return materials
      .filter(
        (material) =>
          this.normalizeOptionalString(material.materialName) !== null,
      )
      .map((material) => ({
        materialName: this.normalizeOptionalString(material.materialName),
        notes: this.normalizeOptionalString(material.notes),
        quantity: this.normalizeRequiredQuantity(material.quantity),
        unitCost: this.normalizeRequiredNumber(material.unitCost),
      }))
      .map((material) => ({
        ...material,
        materialName: material.materialName!,
      }));
  }

  private normalizeRequiredNumber(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === '') {
      throw new BadRequestException(
        'كلفة مادة الصيانة مطلوبة عند إدخال المادة.',
      );
    }

    return this.normalizeOptionalNumber(value)!;
  }

  private normalizeRequiredQuantity(value: string | number | null | undefined) {
    // BR-045: لا يجوز تسجيل مادة مصروفة دون كمية.
    if (value === null || value === undefined || value === '') {
      throw new BadRequestException(
        'كمية مادة الصيانة مطلوبة عند إدخال المادة.',
      );
    }

    const quantity = this.normalizeOptionalNumber(value)!;

    if (quantity <= 0) {
      throw new BadRequestException(
        'كمية مادة الصيانة يجب أن تكون أكبر من صفر.',
      );
    }

    return quantity;
  }
}
