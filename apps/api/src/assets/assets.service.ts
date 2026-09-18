import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuditActor } from '../audit-log/types';
import { PrismaService } from '../prisma/prisma.service';

type CreateAssetInput = {
  assetCategoryId?: string;
  assetTypeId?: string;
  usageNatureId?: string | null;
  maintenanceIntervalId?: string | null;
  statusId?: string;
  owningOrganizationUnitId?: string;
  bookValue?: string | number | null;
  model?: string | null;
  origin?: string | null;
  manufactureYear?: string | number | null;
  serialNumber?: string | null;
  serialNumberMissing?: boolean;
  notes?: string | null;
  generalAssetName?: string | null;
  generalBrand?: string | null;
  generalInventoryNumber?: string | null;
  generalLocationName?: string | null;
  generalCustodianName?: string | null;
  generalConditionNotes?: string | null;
  vehiclePlateNumber?: string | null;
  vehicleChassisNumber?: string | null;
  vehicleEngineNumber?: string | null;
  vehicleType?: string | null;
  vehicleColor?: string | null;
  landPlotNumber?: string | null;
  landDistrict?: string | null;
  landMunicipality?: string | null;
  landAreaSquareMeters?: string | number | null;
  landUse?: string | null;
  landTitleDeedNumber?: string | null;
  landCadastralNumber?: string | null;
  landPropertyGenre?: string | null;
  landOwnershipType?: string | null;
  landOccupancyStatus?: string | null;
  landBoundaries?: string | null;
  landLatitude?: string | number | null;
  landLongitude?: string | number | null;
  realEstatePropertyNumber?: string | null;
  realEstateAddress?: string | null;
  realEstateFloorsCount?: string | number | null;
  realEstateBuildingAreaSquareMeters?: string | number | null;
  realEstateConstructionYear?: string | number | null;
  realEstateTitleDeedNumber?: string | null;
  realEstateCadastralNumber?: string | null;
  realEstatePropertyGenre?: string | null;
  realEstateOwnershipType?: string | null;
  realEstateOccupancyStatus?: string | null;
  realEstateBoundaries?: string | null;
  realEstateLatitude?: string | number | null;
  realEstateLongitude?: string | number | null;
};

type MoveAssetInput = {
  toOrganizationUnitId?: string;
  documentNumber?: string | null;
  notes?: string | null;
};

type AssignAssetInput = {
  toEmployeeId?: string | null;
  toOrganizationUnitId?: string | null;
  documentNumber?: string | null;
  notes?: string | null;
};

type ChangeAssetStatusInput = {
  statusId?: string;
  documentNumber?: string | null;
  notes?: string | null;
};

type AddAssetAttachmentInput = {
  attachmentType?: string;
  title?: string;
  notes?: string | null;
};

type DeactivateAssetInput = {
  documentNumber?: string | null;
  reason?: string | null;
};

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private readonly assetInclude = {
    assetCategory: true,
    assetType: true,
    status: true,
    usageNature: true,
    maintenanceInterval: true,
    owningOrganizationUnit: {
      select: {
        id: true,
        name: true,
        code: true,
      },
    },
    currentHolderOrganizationUnit: {
      select: {
        id: true,
        name: true,
        code: true,
      },
    },
    currentHolderEmployee: {
      include: {
        organizationUnit: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    },
    supplier: true,
    attachments: {
      orderBy: { createdAt: 'desc' as const },
    },
    transferRequests: {
      where: { status: 'PENDING' as const },
      orderBy: { requestedAt: 'desc' as const },
      include: {
        fromOrganizationUnit: { select: { id: true, name: true, code: true } },
        toOrganizationUnit: { select: { id: true, name: true, code: true } },
        requestedByUser: { select: { id: true, fullName: true } },
      },
    },
    generalDetails: true,
    vehicleDetails: true,
    landDetails: true,
    realEstateDetails: true,
    maintenanceRequests: {
      orderBy: { createdAt: 'desc' as const },
      include: { maintenanceType: true },
    },
    movements: {
      orderBy: { createdAt: 'desc' as const },
      include: {
        fromOrganizationUnit: { select: { id: true, name: true, code: true } },
        toOrganizationUnit: { select: { id: true, name: true, code: true } },
        fromEmployee: {
          include: {
            organizationUnit: { select: { id: true, name: true, code: true } },
          },
        },
        toEmployee: {
          include: {
            organizationUnit: { select: { id: true, name: true, code: true } },
          },
        },
        fromStatus: true,
        toStatus: true,
      },
    },
  };

  findAll(allowedOrganizationUnitIds: string[] | null) {
    // نرجع الموجودات مع بياناتها المرتبطة حتى تعرض الواجهة الجدول بدون طلبات إضافية.
    return this.prisma.asset.findMany({
      where: {
        isDeleted: false,
        owningOrganizationUnitId: allowedOrganizationUnitIds
          ? { in: allowedOrganizationUnitIds }
          : undefined,
      },
      orderBy: { createdAt: 'desc' },
      include: this.assetInclude,
    });
  }

  findArchived(allowedOrganizationUnitIds: string[] | null) {
    return this.prisma.asset.findMany({
      where: {
        isDeleted: true,
        owningOrganizationUnitId: allowedOrganizationUnitIds
          ? { in: allowedOrganizationUnitIds }
          : undefined,
      },
      orderBy: { updatedAt: 'desc' },
      include: this.assetInclude,
    });
  }

  async findOne(id: string, allowedOrganizationUnitIds: string[] | null) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: this.assetInclude,
    });

    if (!asset) {
      throw new BadRequestException('الموجود المحدد غير موجود.');
    }

    if (
      allowedOrganizationUnitIds &&
      !allowedOrganizationUnitIds.includes(asset.owningOrganizationUnitId)
    ) {
      throw new BadRequestException('الموجود المحدد غير موجود.');
    }

    return asset;
  }

  async create(input: CreateAssetInput, actor: AuditActor) {
    // قبل الحفظ نتأكد من الحقول الأساسية حتى لا يدخل سجل ناقص لقاعدة البيانات.
    this.assertRequired(input);

    // نقرأ المراجع المطلوبة بالتوازي: الجهة، التصنيف، نوع المادة، والحالة.
    const [organizationUnit, assetCategory, assetType, status] =
      await Promise.all([
        this.prisma.organizationUnit.findUnique({
          where: { id: input.owningOrganizationUnitId },
        }),
        this.prisma.assetCategory.findUnique({
          where: { id: input.assetCategoryId },
        }),
        this.prisma.assetType.findUnique({
          where: { id: input.assetTypeId },
        }),
        this.prisma.assetStatus.findUnique({
          where: { id: input.statusId },
        }),
      ]);

    if (!organizationUnit) {
      throw new BadRequestException('الجهة المحددة غير موجودة.');
    }

    if (!assetCategory) {
      throw new BadRequestException('تصنيف الموجود غير موجود.');
    }

    if (!assetType || assetType.assetCategoryId !== assetCategory.id) {
      // نوع المادة يجب أن يكون تابعاً لنفس التصنيف المختار من المستخدم.
      throw new BadRequestException('نوع المادة لا يتبع التصنيف المحدد.');
    }

    if (!status) {
      throw new BadRequestException('حالة الموجود غير موجودة.');
    }

    const internalNumber = await this.generateInternalNumber(
      organizationUnit.code,
      assetCategory.code,
    );
    await this.assertSerialNumberAvailable(input.serialNumber);

    const createdAsset = await this.prisma.$transaction(async (tx) => {
      // نفس الرقم الداخلي يستخدم كبداية لقيمة QR Code إلى أن نضيف مولد QR فعلي.
      const savedAsset = await tx.asset.create({
        data: {
          internalNumber,
          qrCodeValue: internalNumber,
          assetCategoryId: assetCategory.id,
          assetTypeId: assetType.id,
          usageNatureId: input.usageNatureId || null,
          maintenanceIntervalId: input.maintenanceIntervalId || null,
          statusId: status.id,
          owningOrganizationUnitId: organizationUnit.id,
          bookValue: this.normalizeOptionalNumber(input.bookValue),
          model:
            assetCategory.code === 'LND' || assetCategory.code === 'BLD'
              ? null
              : (this.normalizeOptionalString(input.generalAssetName) ??
                this.normalizeOptionalString(input.model)),
          origin:
            assetCategory.code === 'LND' || assetCategory.code === 'BLD'
              ? null
              : this.normalizeOptionalString(input.origin),
          manufactureYear:
            assetCategory.code === 'LND' || assetCategory.code === 'BLD'
              ? null
              : this.normalizeOptionalInteger(input.manufactureYear),
          serialNumber:
            assetCategory.code === 'LND' || assetCategory.code === 'BLD'
              ? null
              : this.normalizeOptionalString(input.serialNumber),
          serialNumberMissing:
            assetCategory.code === 'LND' || assetCategory.code === 'BLD'
              ? true
              : (input.serialNumberMissing ?? false),
          notes: this.normalizeOptionalString(input.notes),
        },
      });

      await this.createSectionDetails(
        tx,
        savedAsset.id,
        assetCategory.code,
        input,
      );

      return tx.asset.findUniqueOrThrow({
        where: { id: savedAsset.id },
        include: this.assetInclude,
      });
    });

    await this.auditLogService.record({
      ...actor,
      action: 'ASSET_CREATE',
      module: 'assets',
      entityType: 'Asset',
      entityId: createdAsset.id,
      description: `إضافة موجود جديد برقم ${createdAsset.internalNumber}.`,
    });

    return createdAsset;
  }

  async update(id: string, input: CreateAssetInput, actor: AuditActor) {
    // التعديل يستخدم نفس قواعد الإضافة، لكن لا نعيد توليد الرقم الداخلي لأنه هوية الموجود.
    this.assertRequired(input);

    const existingAsset = await this.prisma.asset.findUnique({
      where: { id },
    });

    if (existingAsset?.isDeleted) {
      throw new BadRequestException('Cannot update an inactive asset.');
    }

    if (!existingAsset) {
      throw new BadRequestException('الموجود المحدد غير موجود.');
    }

    const [organizationUnit, assetCategory, assetType, status] =
      await Promise.all([
        this.prisma.organizationUnit.findUnique({
          where: { id: input.owningOrganizationUnitId },
        }),
        this.prisma.assetCategory.findUnique({
          where: { id: input.assetCategoryId },
        }),
        this.prisma.assetType.findUnique({
          where: { id: input.assetTypeId },
        }),
        this.prisma.assetStatus.findUnique({
          where: { id: input.statusId },
        }),
      ]);

    if (!organizationUnit) {
      throw new BadRequestException('الجهة المحددة غير موجودة.');
    }

    if (!assetCategory) {
      throw new BadRequestException('تصنيف الموجود غير موجود.');
    }

    if (!assetType || assetType.assetCategoryId !== assetCategory.id) {
      throw new BadRequestException('نوع المادة لا يتبع التصنيف المحدد.');
    }

    if (!status) {
      throw new BadRequestException('حالة الموجود غير موجودة.');
    }

    await this.assertSerialNumberAvailable(input.serialNumber, id);

    const updatedAsset = await this.prisma.$transaction(async (tx) => {
      await tx.asset.update({
        where: { id },
        data: {
          assetCategoryId: assetCategory.id,
          assetTypeId: assetType.id,
          usageNatureId: input.usageNatureId || null,
          maintenanceIntervalId: input.maintenanceIntervalId || null,
          statusId: status.id,
          owningOrganizationUnitId: organizationUnit.id,
          bookValue: this.normalizeOptionalNumber(input.bookValue),
          model:
            assetCategory.code === 'LND' || assetCategory.code === 'BLD'
              ? null
              : (this.normalizeOptionalString(input.generalAssetName) ??
                this.normalizeOptionalString(input.model)),
          origin:
            assetCategory.code === 'LND' || assetCategory.code === 'BLD'
              ? null
              : this.normalizeOptionalString(input.origin),
          manufactureYear:
            assetCategory.code === 'LND' || assetCategory.code === 'BLD'
              ? null
              : this.normalizeOptionalInteger(input.manufactureYear),
          serialNumber:
            assetCategory.code === 'LND' || assetCategory.code === 'BLD'
              ? null
              : this.normalizeOptionalString(input.serialNumber),
          serialNumberMissing:
            assetCategory.code === 'LND' || assetCategory.code === 'BLD'
              ? true
              : (input.serialNumberMissing ?? false),
          notes: this.normalizeOptionalString(input.notes),
        },
      });

      await this.updateSectionDetails(tx, id, assetCategory.code, input);

      return tx.asset.findUniqueOrThrow({
        where: { id },
        include: this.assetInclude,
      });
    });

    await this.auditLogService.record({
      ...actor,
      action: 'ASSET_UPDATE',
      module: 'assets',
      entityType: 'Asset',
      entityId: updatedAsset.id,
      description: `تعديل بيانات الموجود ${updatedAsset.internalNumber}.`,
    });

    return updatedAsset;
  }

  async move(id: string, input: MoveAssetInput, actor: AuditActor) {
    // النقل بين الجهات يحتاج موافقة مركزية؛ هذا الإجراء يسجل طلب النقل فقط ولا ينفذه فوراً.
    if (!input.toOrganizationUnitId) {
      throw new BadRequestException('الجهة الجديدة مطلوبة لنقل الموجود.');
    }

    const [asset, toOrganizationUnit, existingPendingRequest] =
      await Promise.all([
        this.prisma.asset.findUnique({ where: { id } }),
        this.prisma.organizationUnit.findUnique({
          where: { id: input.toOrganizationUnitId },
        }),
        this.prisma.assetTransferRequest.findFirst({
          where: { assetId: id, status: 'PENDING' },
          select: { id: true },
        }),
      ]);

    if (!asset) {
      throw new BadRequestException('الموجود المحدد غير موجود.');
    }

    if (asset.isDeleted) {
      throw new BadRequestException('Cannot move an inactive asset.');
    }

    if (!toOrganizationUnit) {
      throw new BadRequestException('الجهة الجديدة غير موجودة.');
    }

    if (existingPendingRequest) {
      throw new BadRequestException(
        'يوجد طلب نقل بانتظار الموافقة لهذا الموجود بالفعل.',
      );
    }

    const transferRequest = await this.prisma.assetTransferRequest.create({
      data: {
        assetId: id,
        fromOrganizationUnitId:
          asset.currentHolderOrganizationUnitId ??
          asset.owningOrganizationUnitId,
        toOrganizationUnitId: toOrganizationUnit.id,
        documentNumber: this.normalizeOptionalString(input.documentNumber),
        notes: this.normalizeOptionalString(input.notes),
        requestedByUserId: actor.userId ?? null,
      },
    });

    await this.auditLogService.record({
      ...actor,
      action: 'ASSET_TRANSFER_REQUEST',
      module: 'assets',
      entityType: 'Asset',
      entityId: asset.id,
      description: `طلب نقل الموجود ${asset.internalNumber} إلى ${toOrganizationUnit.name} (بانتظار الموافقة).`,
    });

    return transferRequest;
  }

  async assign(id: string, input: AssignAssetInput, actor: AuditActor) {
    if (!input.toEmployeeId && !input.toOrganizationUnitId) {
      throw new BadRequestException('اختر موظفاً أو جهة لتسليم الموجود.');
    }

    const [asset, toEmployee, toOrganizationUnit] = await Promise.all([
      this.prisma.asset.findUnique({ where: { id } }),
      input.toEmployeeId
        ? this.prisma.employee.findUnique({ where: { id: input.toEmployeeId } })
        : null,
      input.toOrganizationUnitId
        ? this.prisma.organizationUnit.findUnique({
            where: { id: input.toOrganizationUnitId },
          })
        : null,
    ]);

    if (!asset) {
      throw new BadRequestException('الموجود المحدد غير موجود.');
    }

    if (asset.isDeleted) {
      throw new BadRequestException('Cannot assign an inactive asset.');
    }

    if (input.toEmployeeId && !toEmployee) {
      throw new BadRequestException('الموظف المحدد غير موجود.');
    }

    if (input.toOrganizationUnitId && !toOrganizationUnit) {
      throw new BadRequestException('الجهة المحددة غير موجودة.');
    }

    const nextOrganizationUnitId =
      toEmployee?.organizationUnitId ??
      toOrganizationUnit?.id ??
      asset.currentHolderOrganizationUnitId ??
      asset.owningOrganizationUnitId;

    const assignedAsset = await this.prisma.$transaction(async (tx) => {
      await tx.asset.update({
        where: { id },
        data: {
          currentHolderEmployeeId: toEmployee?.id ?? null,
          currentHolderOrganizationUnitId: nextOrganizationUnitId,
        },
      });

      await tx.assetMovement.create({
        data: {
          assetId: id,
          movementType: toEmployee ? 'ASSIGN' : 'RETURN',
          fromOrganizationUnitId:
            asset.currentHolderOrganizationUnitId ??
            asset.owningOrganizationUnitId,
          toOrganizationUnitId: nextOrganizationUnitId,
          fromEmployeeId: asset.currentHolderEmployeeId,
          toEmployeeId: toEmployee?.id ?? null,
          documentNumber: this.normalizeOptionalString(input.documentNumber),
          notes: this.normalizeOptionalString(input.notes),
        },
      });

      return tx.asset.findUniqueOrThrow({
        where: { id },
        include: this.assetInclude,
      });
    });

    await this.auditLogService.record({
      ...actor,
      action: toEmployee ? 'ASSET_ASSIGN' : 'ASSET_RETURN',
      module: 'assets',
      entityType: 'Asset',
      entityId: assignedAsset.id,
      description: toEmployee
        ? `تسليم الموجود ${assignedAsset.internalNumber} إلى ${toEmployee.fullName}.`
        : `إرجاع الموجود ${assignedAsset.internalNumber} إلى الجهة.`,
    });

    return assignedAsset;
  }

  async changeStatus(
    id: string,
    input: ChangeAssetStatusInput,
    actor: AuditActor,
  ) {
    if (!input.statusId) {
      throw new BadRequestException('الحالة الجديدة مطلوبة.');
    }

    const [asset, status] = await Promise.all([
      this.prisma.asset.findUnique({ where: { id } }),
      this.prisma.assetStatus.findUnique({ where: { id: input.statusId } }),
    ]);

    if (!asset) {
      throw new BadRequestException('الموجود المحدد غير موجود.');
    }

    if (asset.isDeleted) {
      throw new BadRequestException(
        'Cannot change status for an inactive asset.',
      );
    }

    if (!status) {
      throw new BadRequestException('الحالة الجديدة غير موجودة.');
    }

    const updatedAsset = await this.prisma.$transaction(async (tx) => {
      await tx.asset.update({
        where: { id },
        data: { statusId: status.id },
      });

      await tx.assetMovement.create({
        data: {
          assetId: id,
          movementType: 'STATUS_CHANGE',
          fromStatusId: asset.statusId,
          toStatusId: status.id,
          documentNumber: this.normalizeOptionalString(input.documentNumber),
          notes: this.normalizeOptionalString(input.notes),
        },
      });

      return tx.asset.findUniqueOrThrow({
        where: { id },
        include: this.assetInclude,
      });
    });

    await this.auditLogService.record({
      ...actor,
      action: 'ASSET_STATUS_CHANGE',
      module: 'assets',
      entityType: 'Asset',
      entityId: updatedAsset.id,
      description: `تغيير حالة الموجود ${updatedAsset.internalNumber} إلى ${status.name}.`,
    });

    return updatedAsset;
  }

  async addAttachment(
    id: string,
    input: AddAssetAttachmentInput,
    file: Express.Multer.File | undefined,
    actor: AuditActor,
  ) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });

    if (!asset || asset.isDeleted) {
      throw new BadRequestException('Asset is not available.');
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
        assetId: id,
        attachmentType,
        title,
        fileUrl,
        notes: this.normalizeOptionalString(input.notes),
      },
    });

    await this.auditLogService.record({
      ...actor,
      action: 'ASSET_ATTACHMENT_UPLOAD',
      module: 'assets',
      entityType: 'Asset',
      entityId: id,
      description: `رفع مرفق (${attachmentType}) بعنوان "${title}" للموجود ${asset.internalNumber}.`,
    });

    return attachment;
  }

  async deactivate(id: string, input: DeactivateAssetInput, actor: AuditActor) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });

    if (!asset || asset.isDeleted) {
      throw new BadRequestException(
        'Asset is not available or already inactive.',
      );
    }

    // BR-026 / BR-023: الشطب يجب أن يتضمن رقم مستند وسبباً موثقاً.
    const documentNumber = this.normalizeOptionalString(input.documentNumber);
    const reason = this.normalizeOptionalString(input.reason);

    if (!documentNumber) {
      throw new BadRequestException('رقم مستند الشطب مطلوب.');
    }

    if (!reason) {
      throw new BadRequestException('سبب الشطب مطلوب.');
    }

    const deactivatedAsset = await this.prisma.$transaction(async (tx) => {
      await tx.asset.update({
        where: { id },
        data: { isDeleted: true },
      });

      await tx.assetMovement.create({
        data: {
          assetId: id,
          movementType: 'DEACTIVATE',
          documentNumber,
          notes: reason,
        },
      });

      return tx.asset.findUniqueOrThrow({
        where: { id },
        include: this.assetInclude,
      });
    });

    await this.auditLogService.record({
      ...actor,
      action: 'ASSET_DEACTIVATE',
      module: 'assets',
      entityType: 'Asset',
      entityId: deactivatedAsset.id,
      description: `تعطيل/شطب الموجود ${deactivatedAsset.internalNumber}.`,
    });

    return deactivatedAsset;
  }

  private assertRequired(input: CreateAssetInput) {
    if (
      !input.assetCategoryId ||
      !input.assetTypeId ||
      !input.statusId ||
      !input.owningOrganizationUnitId
    ) {
      throw new BadRequestException(
        'التصنيف، نوع المادة، الحالة، والجهة حقول إلزامية.',
      );
    }
  }

  private async assertSerialNumberAvailable(
    serialNumber: string | null | undefined,
    ignoreAssetId?: string,
  ) {
    const normalizedSerial = this.normalizeOptionalString(serialNumber);

    if (!normalizedSerial) {
      return;
    }

    const duplicate = await this.prisma.asset.findFirst({
      where: {
        serialNumber: normalizedSerial,
        isDeleted: false,
        id: ignoreAssetId ? { not: ignoreAssetId } : undefined,
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new BadRequestException(
        'Serial number is already used by an active asset.',
      );
    }
  }

  private async generateInternalNumber(
    organizationCode: string,
    categoryCode: string,
  ) {
    // صيغة الرقم الداخلي: رمز الجهة - رمز التصنيف - السنة - تسلسل سنوي من 5 مراتب.
    const year = String(new Date().getFullYear()).slice(-2);
    const normalizedOrganizationCode = organizationCode.replace(
      /^(HOS|SEC)-/,
      '',
    );

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const suffix = randomBytes(3).toString('hex').toUpperCase();
      const internalNumber = `${normalizedOrganizationCode}-${categoryCode}-${year}-${suffix}`;
      const existingAsset = await this.prisma.asset.findUnique({
        where: { internalNumber },
        select: { id: true },
      });

      if (!existingAsset) {
        return internalNumber;
      }
    }

    return `${normalizedOrganizationCode}-${categoryCode}-${year}-${randomBytes(5).toString('hex').toUpperCase()}`;
  }

  private async createSectionDetails(
    tx: Prisma.TransactionClient,
    assetId: string,
    categoryCode: string,
    input: CreateAssetInput,
  ) {
    // كل قسم له جدول تفاصيل مستقل حتى نضيف حقوله مستقبلاً بدون تضخيم جدول assets.
    if (categoryCode === 'DEV' || categoryCode === 'FUR') {
      await tx.generalAssetDetail.create({
        data: {
          assetId,
          assetName: this.normalizeOptionalString(input.generalAssetName),
          brand: this.normalizeOptionalString(input.generalBrand),
          inventoryNumber: this.normalizeOptionalString(
            input.generalInventoryNumber,
          ),
          locationName: this.normalizeOptionalString(input.generalLocationName),
          custodianName: this.normalizeOptionalString(
            input.generalCustodianName,
          ),
          conditionNotes: this.normalizeOptionalString(
            input.generalConditionNotes,
          ),
        },
      });
    }

    if (categoryCode === 'VEH') {
      await tx.vehicleAssetDetail.create({
        data: {
          assetId,
          plateNumber: this.normalizeOptionalString(input.vehiclePlateNumber),
          chassisNumber: this.normalizeOptionalString(
            input.vehicleChassisNumber,
          ),
          engineNumber: this.normalizeOptionalString(input.vehicleEngineNumber),
          vehicleType: this.normalizeOptionalString(input.vehicleType),
          color: this.normalizeOptionalString(input.vehicleColor),
        },
      });
    }

    if (categoryCode === 'LND') {
      await tx.landAssetDetail.create({
        data: {
          assetId,
          plotNumber: this.normalizeOptionalString(input.landPlotNumber),
          district: this.normalizeOptionalString(input.landDistrict),
          municipality: this.normalizeOptionalString(input.landMunicipality),
          areaSquareMeters: this.normalizeOptionalNumber(
            input.landAreaSquareMeters,
          ),
          landUse: this.normalizeOptionalString(input.landUse),
          titleDeedNumber: this.normalizeOptionalString(
            input.landTitleDeedNumber,
          ),
          cadastralNumber: this.normalizeOptionalString(
            input.landCadastralNumber,
          ),
          propertyGenre: this.normalizeOptionalString(input.landPropertyGenre),
          ownershipType: this.normalizeOptionalString(input.landOwnershipType),
          occupancyStatus: this.normalizeOptionalString(
            input.landOccupancyStatus,
          ),
          boundaries: this.normalizeOptionalString(input.landBoundaries),
          latitude: this.normalizeOptionalLatitude(input.landLatitude),
          longitude: this.normalizeOptionalLongitude(input.landLongitude),
        },
      });
    }

    if (categoryCode === 'BLD') {
      await tx.realEstateAssetDetail.create({
        data: {
          assetId,
          propertyNumber: this.normalizeOptionalString(
            input.realEstatePropertyNumber,
          ),
          address: this.normalizeOptionalString(input.realEstateAddress),
          floorsCount: this.normalizeOptionalInteger(
            input.realEstateFloorsCount,
          ),
          buildingAreaSquareMeters: this.normalizeOptionalNumber(
            input.realEstateBuildingAreaSquareMeters,
          ),
          constructionYear: this.normalizeOptionalInteger(
            input.realEstateConstructionYear,
          ),
          titleDeedNumber: this.normalizeOptionalString(
            input.realEstateTitleDeedNumber,
          ),
          cadastralNumber: this.normalizeOptionalString(
            input.realEstateCadastralNumber,
          ),
          propertyGenre: this.normalizeOptionalString(
            input.realEstatePropertyGenre,
          ),
          ownershipType: this.normalizeOptionalString(
            input.realEstateOwnershipType,
          ),
          occupancyStatus: this.normalizeOptionalString(
            input.realEstateOccupancyStatus,
          ),
          boundaries: this.normalizeOptionalString(input.realEstateBoundaries),
          latitude: this.normalizeOptionalLatitude(input.realEstateLatitude),
          longitude: this.normalizeOptionalLongitude(input.realEstateLongitude),
        },
      });
    }
  }

  private async updateSectionDetails(
    tx: Prisma.TransactionClient,
    assetId: string,
    categoryCode: string,
    input: CreateAssetInput,
  ) {
    // عند تغيير القسم نحذف تفاصيل الأقسام الأخرى حتى لا تبقى معلومات قديمة مرتبطة بالموجود.
    if (categoryCode !== 'DEV' && categoryCode !== 'FUR') {
      await tx.generalAssetDetail.deleteMany({ where: { assetId } });
    }

    if (categoryCode !== 'VEH') {
      await tx.vehicleAssetDetail.deleteMany({ where: { assetId } });
    }

    if (categoryCode !== 'LND') {
      await tx.landAssetDetail.deleteMany({ where: { assetId } });
    }

    if (categoryCode !== 'BLD') {
      await tx.realEstateAssetDetail.deleteMany({ where: { assetId } });
    }

    if (categoryCode === 'DEV' || categoryCode === 'FUR') {
      await tx.generalAssetDetail.upsert({
        where: { assetId },
        create: {
          assetId,
          assetName: this.normalizeOptionalString(input.generalAssetName),
          brand: this.normalizeOptionalString(input.generalBrand),
          inventoryNumber: this.normalizeOptionalString(
            input.generalInventoryNumber,
          ),
          locationName: this.normalizeOptionalString(input.generalLocationName),
          custodianName: this.normalizeOptionalString(
            input.generalCustodianName,
          ),
          conditionNotes: this.normalizeOptionalString(
            input.generalConditionNotes,
          ),
        },
        update: {
          assetName: this.normalizeOptionalString(input.generalAssetName),
          brand: this.normalizeOptionalString(input.generalBrand),
          inventoryNumber: this.normalizeOptionalString(
            input.generalInventoryNumber,
          ),
          locationName: this.normalizeOptionalString(input.generalLocationName),
          custodianName: this.normalizeOptionalString(
            input.generalCustodianName,
          ),
          conditionNotes: this.normalizeOptionalString(
            input.generalConditionNotes,
          ),
        },
      });
    }

    if (categoryCode === 'VEH') {
      await tx.vehicleAssetDetail.upsert({
        where: { assetId },
        create: {
          assetId,
          plateNumber: this.normalizeOptionalString(input.vehiclePlateNumber),
          chassisNumber: this.normalizeOptionalString(
            input.vehicleChassisNumber,
          ),
          engineNumber: this.normalizeOptionalString(input.vehicleEngineNumber),
          vehicleType: this.normalizeOptionalString(input.vehicleType),
          color: this.normalizeOptionalString(input.vehicleColor),
        },
        update: {
          plateNumber: this.normalizeOptionalString(input.vehiclePlateNumber),
          chassisNumber: this.normalizeOptionalString(
            input.vehicleChassisNumber,
          ),
          engineNumber: this.normalizeOptionalString(input.vehicleEngineNumber),
          vehicleType: this.normalizeOptionalString(input.vehicleType),
          color: this.normalizeOptionalString(input.vehicleColor),
        },
      });
    }

    if (categoryCode === 'LND') {
      const landData = {
        plotNumber: this.normalizeOptionalString(input.landPlotNumber),
        district: this.normalizeOptionalString(input.landDistrict),
        municipality: this.normalizeOptionalString(input.landMunicipality),
        areaSquareMeters: this.normalizeOptionalNumber(
          input.landAreaSquareMeters,
        ),
        landUse: this.normalizeOptionalString(input.landUse),
        titleDeedNumber: this.normalizeOptionalString(
          input.landTitleDeedNumber,
        ),
        cadastralNumber: this.normalizeOptionalString(
          input.landCadastralNumber,
        ),
        propertyGenre: this.normalizeOptionalString(input.landPropertyGenre),
        ownershipType: this.normalizeOptionalString(input.landOwnershipType),
        occupancyStatus: this.normalizeOptionalString(
          input.landOccupancyStatus,
        ),
        boundaries: this.normalizeOptionalString(input.landBoundaries),
        latitude: this.normalizeOptionalLatitude(input.landLatitude),
        longitude: this.normalizeOptionalLongitude(input.landLongitude),
      };

      await tx.landAssetDetail.upsert({
        where: { assetId },
        create: { assetId, ...landData },
        update: landData,
      });
    }

    if (categoryCode === 'BLD') {
      const realEstateData = {
        propertyNumber: this.normalizeOptionalString(
          input.realEstatePropertyNumber,
        ),
        address: this.normalizeOptionalString(input.realEstateAddress),
        floorsCount: this.normalizeOptionalInteger(input.realEstateFloorsCount),
        buildingAreaSquareMeters: this.normalizeOptionalNumber(
          input.realEstateBuildingAreaSquareMeters,
        ),
        constructionYear: this.normalizeOptionalInteger(
          input.realEstateConstructionYear,
        ),
        titleDeedNumber: this.normalizeOptionalString(
          input.realEstateTitleDeedNumber,
        ),
        cadastralNumber: this.normalizeOptionalString(
          input.realEstateCadastralNumber,
        ),
        propertyGenre: this.normalizeOptionalString(
          input.realEstatePropertyGenre,
        ),
        ownershipType: this.normalizeOptionalString(
          input.realEstateOwnershipType,
        ),
        occupancyStatus: this.normalizeOptionalString(
          input.realEstateOccupancyStatus,
        ),
        boundaries: this.normalizeOptionalString(input.realEstateBoundaries),
        latitude: this.normalizeOptionalLatitude(input.realEstateLatitude),
        longitude: this.normalizeOptionalLongitude(input.realEstateLongitude),
      };

      await tx.realEstateAssetDetail.upsert({
        where: { assetId },
        create: { assetId, ...realEstateData },
        update: realEstateData,
      });
    }
  }

  private normalizeOptionalString(value: string | null | undefined) {
    // الحقول النصية الفارغة نخزنها null حتى تبقى الاستعلامات والتقارير أوضح.
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeOptionalInteger(value: string | number | null | undefined) {
    // سنة الصنع اختيارية، لكن إذا وصلت قيمة فيجب أن تكون رقماً صحيحاً.
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);

    if (!Number.isInteger(parsed)) {
      throw new BadRequestException('سنة الصنع يجب أن تكون رقمًا صحيحًا.');
    }

    return parsed;
  }

  private normalizeOptionalNumber(value: string | number | null | undefined) {
    // القيمة الدفترية اختيارية، وإذا أدخلت يجب أن تكون رقماً موجباً أو صفراً.
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);

    if (Number.isNaN(parsed) || parsed < 0) {
      throw new BadRequestException(
        'القيمة الدفترية يجب أن تكون رقمًا صحيحًا.',
      );
    }

    return parsed;
  }

  private normalizeOptionalLatitude(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);

    if (Number.isNaN(parsed) || parsed < -90 || parsed > 90) {
      throw new BadRequestException(
        'خط العرض (Latitude) يجب أن يكون رقمًا بين -90 و90.',
      );
    }

    return parsed;
  }

  private normalizeOptionalLongitude(
    value: string | number | null | undefined,
  ) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);

    if (Number.isNaN(parsed) || parsed < -180 || parsed > 180) {
      throw new BadRequestException(
        'خط الطول (Longitude) يجب أن يكون رقمًا بين -180 و180.',
      );
    }

    return parsed;
  }
}
