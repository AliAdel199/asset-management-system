require('dotenv/config');

const bcrypt = require('bcrypt');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const assetCategories = [
  { code: 'DEV', name: 'أجهزة' },
  { code: 'FUR', name: 'أثاث' },
  { code: 'VEH', name: 'سيارات' },
  { code: 'LND', name: 'أراضٍ' },
  { code: 'BLD', name: 'مبانٍ' },
];

const assetTypesByCategory = {
  DEV: ['حاسوب', 'كاميرا'],
  FUR: ['ميز'],
  VEH: ['سيارة'],
  LND: ['أرض'],
  BLD: ['مبنى'],
};

const usageNatures = ['طبية', 'خدمية'];

const assetStatuses = [
  { code: 'IN_STORE', name: 'مخزني', isTerminal: false },
  { code: 'WORKING', name: 'صالح ويعمل', isTerminal: false },
  { code: 'UNUSED', name: 'صالح وغير مستخدم', isTerminal: false },
  { code: 'NOT_INSTALLED', name: 'غير منصوب', isTerminal: false },
  { code: 'INSTALLING', name: 'قيد التنصيب', isTerminal: false },
  { code: 'BROKEN', name: 'عاطل', isTerminal: false },
  { code: 'IN_MAINTENANCE', name: 'قيد الصيانة', isTerminal: false },
  { code: 'TEMP_STOPPED', name: 'متوقف مؤقتًا', isTerminal: false },
  { code: 'MISSING', name: 'مفقود', isTerminal: false },
  { code: 'WRITTEN_OFF', name: 'مشطوب', isTerminal: true },
];

const maintenanceTypes = [
  { code: 'PERIODIC', name: 'دورية' },
  { code: 'PREVENTIVE', name: 'وقائية' },
  { code: 'EMERGENCY', name: 'طارئة' },
];

const maintenanceIntervals = [
  { code: 'MONTHLY', name: 'شهرية', monthsCount: 1 },
  { code: 'QUARTERLY', name: 'ربع سنوية', monthsCount: 3 },
  { code: 'SEMI_ANNUAL', name: 'نصف سنوية', monthsCount: 6 },
  { code: 'ANNUAL', name: 'سنوية', monthsCount: 12 },
];

const additionalAssetTypesByCategory = {
  DEV: [
    'حاسوب مكتبي',
    'حاسوب محمول',
    'طابعة',
    'ماسح ضوئي',
    'جهاز شبكات',
    'جهاز عرض',
    'منظومة مراقبة',
    'جهاز طبي',
    'جهاز كهربائي',
    'جهاز دفع إلكتروني',
  ],
  FUR: [
    'مكتب',
    'كرسي',
    'خزانة',
    'طاولة اجتماعات',
    'رفوف',
    'أثاث استقبال',
  ],
  VEH: ['صالون', 'بيك أب', 'حافلة', 'شاحنة', 'دراجة', 'آلية اختصاصية'],
  LND: [
    'أرض سكنية',
    'أرض تجارية',
    'أرض زراعية',
    'أرض مخصصة للخدمات',
    'ساحة',
  ],
  BLD: ['مبنى إداري', 'مخزن', 'ورشة', 'دار سكنية', 'مجمع خدمي'],
};

const additionalUsageNatures = [
  'إداري',
  'تشغيلي',
  'ميداني',
  'تعليمي',
  'مخزني',
];

const organizationUnits = [
  { code: 'FIN', name: 'قسم المالية', unitType: 'قسم' },
  { code: 'IT', name: 'قسم تقنية المعلومات', unitType: 'قسم' },
  { code: 'ADM', name: 'قسم الإدارة', unitType: 'قسم' },
  { code: 'STORE', name: 'المخزن المركزي', unitType: 'مخزن' },
  { code: 'MNT', name: 'شعبة الصيانة', unitType: 'شعبة' },
  { code: 'TRN', name: 'شعبة النقل', unitType: 'شعبة' },
  { code: 'PROP', name: 'وحدة الأملاك والعقار', unitType: 'وحدة' },
  { code: 'BR01', name: 'فرع الرصافة', unitType: 'فرع' },
  { code: 'BR02', name: 'فرع الكرخ', unitType: 'فرع' },
];

organizationUnits.push(
  { code: 'SEC-MHWL', name: 'قطاع المحاويل', unitType: 'قطاع' },
  { code: 'SEC-HILLA1', name: 'قطاع الحلة الاول', unitType: 'قطاع' },
  { code: 'SEC-HILLA2', name: 'قطاع الحلة الثاني', unitType: 'قطاع' },
  { code: 'SEC-MSYB', name: 'قطاع المسيب', unitType: 'قطاع' },
  { code: 'SEC-HASH', name: 'قطاع الهاشمية', unitType: 'قطاع' },
  { code: 'SEC-KOTHA', name: 'قطاع كوثى', unitType: 'قطاع' },
  { code: 'HOS-IBNSF', name: 'مستشفى ابن سيف', unitType: 'مستشفى' },
  { code: 'HOS-ISK', name: 'مستشفى الاسكندرية', unitType: 'مستشفى' },
  { code: 'HOS-IMAMALI', name: 'مستشفى الامام علي', unitType: 'مستشفى' },
  { code: 'HOS-HILLA', name: 'مستشفى الحلة', unitType: 'مستشفى' },
  { code: 'HOS-ZAHRA', name: 'مستشفى الزهراء', unitType: 'مستشفى' },
  { code: 'HOS-SHOMLI', name: 'مستشفى الشوملي', unitType: 'مستشفى' },
  { code: 'HOS-SADIQ', name: 'مستشفى الصادق', unitType: 'مستشفى' },
  { code: 'HOS-QASIM', name: 'مستشفى القاسم', unitType: 'مستشفى' },
  { code: 'HOS-MHWL', name: 'مستشفى المحاويل', unitType: 'مستشفى' },
  { code: 'HOS-MSYB', name: 'مستشفى المسيب', unitType: 'مستشفى' },
  { code: 'HOS-NOOR', name: 'مستشفى النور', unitType: 'مستشفى' },
  { code: 'HOS-HASH', name: 'مستشفى الهاشمية', unitType: 'مستشفى' },
  { code: 'HOS-BABIL', name: 'مستشفى بابل', unitType: 'مستشفى' },
  { code: 'HOS-KIFL', name: 'مستشفى الكفل', unitType: 'مستشفى' },
  { code: 'HOS-ALIEBIS', name: 'مستشفى علي عبيس', unitType: 'مستشفى' },
  { code: 'HOS-MERJAN', name: 'مستشفى مرجان', unitType: 'مستشفى' },
  { code: 'CENTER', name: 'مركز الدائرة', unitType: 'مركز' },
);

const employees = [
  { employeeNumber: 'EMP-001', fullName: 'أحمد علي', organizationCode: 'IT' },
  { employeeNumber: 'EMP-002', fullName: 'سارة حسن', organizationCode: 'FIN' },
  { employeeNumber: 'EMP-003', fullName: 'محمد كريم', organizationCode: 'ADM' },
  { employeeNumber: 'EMP-004', fullName: 'نور عبد الله', organizationCode: 'STORE' },
  { employeeNumber: 'EMP-005', fullName: 'حيدر جاسم', organizationCode: 'MNT' },
  { employeeNumber: 'EMP-006', fullName: 'زينب قاسم', organizationCode: 'BR01' },
];

const roles = [
  { name: 'مسؤول النظام', scopeLevel: 'central' },
  { name: 'مستخدم مركزي', scopeLevel: 'central' },
  { name: 'مسؤول موجودات', scopeLevel: 'unit' },
  { name: 'مسؤول صيانة', scopeLevel: 'unit' },
  { name: 'مستخدم جهة', scopeLevel: 'unit' },
  { name: 'مدقق', scopeLevel: 'read_only' },
];

const permissions = [
  { code: 'ASSETS_VIEW', name: 'عرض الموجودات', module: 'assets' },
  { code: 'ASSETS_CREATE', name: 'إضافة موجود', module: 'assets' },
  { code: 'ASSETS_UPDATE', name: 'تعديل بيانات موجود', module: 'assets' },
  { code: 'ASSETS_TRANSFER', name: 'طلب نقل موجود بين الجهات', module: 'assets' },
  {
    code: 'ASSETS_TRANSFER_APPROVE',
    name: 'اعتماد أو رفض طلب نقل موجود',
    module: 'assets',
  },
  { code: 'ASSETS_ASSIGN', name: 'تسليم/إرجاع عهدة', module: 'assets' },
  { code: 'ASSETS_CHANGE_STATUS', name: 'تغيير حالة موجود', module: 'assets' },
  { code: 'ASSETS_DEACTIVATE', name: 'طلب شطب موجود', module: 'assets' },
  {
    code: 'ASSETS_WRITEOFF_APPROVE',
    name: 'اعتماد أو رفض طلب شطب موجود',
    module: 'assets',
  },
  {
    code: 'ASSETS_ATTACHMENTS_UPLOAD',
    name: 'رفع مرفق للموجود',
    module: 'assets',
  },
  { code: 'MAINTENANCE_VIEW', name: 'عرض طلبات الصيانة', module: 'maintenance' },
  {
    code: 'MAINTENANCE_CREATE',
    name: 'إنشاء طلب صيانة',
    module: 'maintenance',
  },
  {
    code: 'MAINTENANCE_UPDATE_STATUS',
    name: 'تعديل/إكمال طلب صيانة',
    module: 'maintenance',
  },
  {
    code: 'MAINTENANCE_APPROVE',
    name: 'اعتماد أو رفض طلب صيانة',
    module: 'maintenance',
  },
  { code: 'REPORTS_VIEW', name: 'عرض التقارير', module: 'reports' },
  {
    code: 'AUDIT_LOG_VIEW',
    name: 'عرض سجل العمليات (التدقيق)',
    module: 'admin',
  },
  {
    code: 'ORG_UNITS_MANAGE',
    name: 'إدارة الهيكل الإداري',
    module: 'admin',
  },
  { code: 'USERS_MANAGE', name: 'إدارة المستخدمين', module: 'admin' },
  { code: 'ROLES_MANAGE', name: 'إدارة الأدوار والصلاحيات', module: 'admin' },
  {
    code: 'ASSET_CATALOG_MANAGE',
    name: 'إدارة أصناف وأنواع الموجودات',
    module: 'admin',
  },
];

const allPermissionCodes = permissions.map((permission) => permission.code);

const rolePermissionsByRoleName = {
  'مسؤول النظام': allPermissionCodes,
  'مستخدم مركزي': [
    'ASSETS_VIEW',
    'ASSETS_CREATE',
    'ASSETS_UPDATE',
    'ASSETS_TRANSFER',
    'ASSETS_TRANSFER_APPROVE',
    'ASSETS_ASSIGN',
    'ASSETS_CHANGE_STATUS',
    'ASSETS_DEACTIVATE',
    'ASSETS_WRITEOFF_APPROVE',
    'ASSETS_ATTACHMENTS_UPLOAD',
    'MAINTENANCE_VIEW',
    'MAINTENANCE_CREATE',
    'MAINTENANCE_UPDATE_STATUS',
    'MAINTENANCE_APPROVE',
    'REPORTS_VIEW',
    'AUDIT_LOG_VIEW',
  ],
  'مسؤول موجودات': [
    'ASSETS_VIEW',
    'ASSETS_CREATE',
    'ASSETS_UPDATE',
    'ASSETS_TRANSFER',
    'ASSETS_ASSIGN',
    'ASSETS_CHANGE_STATUS',
    'ASSETS_DEACTIVATE',
    'ASSETS_ATTACHMENTS_UPLOAD',
    'MAINTENANCE_VIEW',
    'MAINTENANCE_CREATE',
    'REPORTS_VIEW',
  ],
  'مسؤول صيانة': [
    'ASSETS_VIEW',
    'ASSETS_CHANGE_STATUS',
    'ASSETS_ATTACHMENTS_UPLOAD',
    'MAINTENANCE_VIEW',
    'MAINTENANCE_CREATE',
    'MAINTENANCE_UPDATE_STATUS',
    'MAINTENANCE_APPROVE',
    'REPORTS_VIEW',
  ],
  'مستخدم جهة': ['ASSETS_VIEW', 'REPORTS_VIEW'],
  'مدقق': [
    'ASSETS_VIEW',
    'MAINTENANCE_VIEW',
    'REPORTS_VIEW',
    'AUDIT_LOG_VIEW',
  ],
};

// كلمة مرور تجريبية موحدة لكل مستخدمي البذر - يجب تغييرها فوراً قبل أي استخدام فعلي.
const seedUserPassword = 'Passw0rd!2026';

const users = [
  {
    username: 'admin',
    fullName: 'مدير النظام',
    roleName: 'مسؤول النظام',
    organizationCode: 'ROOT',
  },
  {
    username: 'central.user',
    fullName: 'مستخدم مركزي تجريبي',
    roleName: 'مستخدم مركزي',
    organizationCode: 'ROOT',
  },
  {
    username: 'assets.officer',
    fullName: 'مسؤول موجودات تجريبي',
    roleName: 'مسؤول موجودات',
    organizationCode: 'IT',
  },
  {
    username: 'maintenance.officer',
    fullName: 'مسؤول صيانة تجريبي',
    roleName: 'مسؤول صيانة',
    organizationCode: 'MNT',
  },
  {
    username: 'unit.user',
    fullName: 'مستخدم جهة تجريبي',
    roleName: 'مستخدم جهة',
    organizationCode: 'STORE',
  },
  {
    username: 'auditor',
    fullName: 'مدقق تجريبي',
    roleName: 'مدقق',
    organizationCode: 'ROOT',
  },
];

async function getRequiredReferenceData() {
  const [
    organizationUnit,
    workingStatus,
    maintenanceStatus,
    storeStatus,
    periodicMaintenance,
    emergencyMaintenance,
  ] = await Promise.all([
    prisma.organizationUnit.findUnique({ where: { code: 'ROOT' } }),
    prisma.assetStatus.findUnique({ where: { code: 'WORKING' } }),
    prisma.assetStatus.findUnique({ where: { code: 'IN_MAINTENANCE' } }),
    prisma.assetStatus.findUnique({ where: { code: 'IN_STORE' } }),
    prisma.maintenanceType.findUnique({ where: { code: 'PERIODIC' } }),
    prisma.maintenanceType.findUnique({ where: { code: 'EMERGENCY' } }),
  ]);

  if (
    !organizationUnit ||
    !workingStatus ||
    !maintenanceStatus ||
    !storeStatus ||
    !periodicMaintenance ||
    !emergencyMaintenance
  ) {
    throw new Error('Required seed reference data is missing.');
  }

  const categories = await prisma.assetCategory.findMany({
    include: { assetTypes: true },
  });

  const categoryByCode = Object.fromEntries(
    categories.map((category) => [category.code, category]),
  );

  return {
    categoryByCode,
    emergencyMaintenance,
    maintenanceStatus,
    organizationUnit,
    periodicMaintenance,
    storeStatus,
    workingStatus,
  };
}

function getFirstType(category) {
  const assetType = category?.assetTypes[0];

  if (!assetType) {
    throw new Error(`Missing asset type for category ${category?.code}.`);
  }

  return assetType;
}

async function upsertDemoAsset({
  assetCategory,
  assetType,
  bookValue,
  internalNumber,
  manufactureYear,
  model,
  organizationUnit,
  origin,
  serialNumber,
  status,
}) {
  let nextSerialNumber = serialNumber;

  if (serialNumber) {
    const duplicateSerialAsset = await prisma.asset.findFirst({
      where: {
        serialNumber,
        internalNumber: { not: internalNumber },
        isDeleted: false,
      },
      select: { id: true },
    });

    if (duplicateSerialAsset) {
      nextSerialNumber = `${serialNumber}-${internalNumber.split('-').at(-1)}`;
    }
  }

  return prisma.asset.upsert({
    where: { internalNumber },
    update: {
      assetCategoryId: assetCategory.id,
      assetTypeId: assetType.id,
      bookValue,
      manufactureYear,
      model,
      origin,
      serialNumber: nextSerialNumber,
      statusId: status.id,
    },
    create: {
      internalNumber,
      qrCodeValue: internalNumber,
      assetCategoryId: assetCategory.id,
      assetTypeId: assetType.id,
      statusId: status.id,
      owningOrganizationUnitId: organizationUnit.id,
      bookValue,
      manufactureYear,
      model,
      origin,
      serialNumber: nextSerialNumber,
    },
  });
}

async function seedDemoData() {
  const {
    categoryByCode,
    emergencyMaintenance,
    maintenanceStatus,
    organizationUnit,
    periodicMaintenance,
    storeStatus,
    workingStatus,
  } = await getRequiredReferenceData();

  const deviceAsset = await upsertDemoAsset({
    assetCategory: categoryByCode.DEV,
    assetType: getFirstType(categoryByCode.DEV),
    bookValue: 1500000,
    internalNumber: 'ROOT-DEV-2026-DEMO01',
    manufactureYear: 2024,
    model: 'حاسبة مكتبية Dell OptiPlex',
    organizationUnit,
    origin: 'USA',
    serialNumber: 'DEV-DEMO-001',
    status: workingStatus,
  });

  await prisma.generalAssetDetail.upsert({
    where: { assetId: deviceAsset.id },
    update: {
      assetName: 'حاسبة مكتبية',
      brand: 'Dell',
      conditionNotes: 'صالحة وتعمل',
      custodianName: 'أحمد علي',
      inventoryNumber: 'INV-DEV-001',
      locationName: 'شعبة تقنية المعلومات',
    },
    create: {
      assetId: deviceAsset.id,
      assetName: 'حاسبة مكتبية',
      brand: 'Dell',
      conditionNotes: 'صالحة وتعمل',
      custodianName: 'أحمد علي',
      inventoryNumber: 'INV-DEV-001',
      locationName: 'شعبة تقنية المعلومات',
    },
  });

  const furnitureAsset = await upsertDemoAsset({
    assetCategory: categoryByCode.FUR,
    assetType: getFirstType(categoryByCode.FUR),
    bookValue: 350000,
    internalNumber: 'ROOT-FUR-2026-DEMO01',
    manufactureYear: 2022,
    model: 'مكتب خشبي إداري',
    organizationUnit,
    origin: 'محلي',
    serialNumber: null,
    status: storeStatus,
  });

  await prisma.generalAssetDetail.upsert({
    where: { assetId: furnitureAsset.id },
    update: {
      assetName: 'مكتب إداري',
      brand: 'محلي',
      conditionNotes: 'مخزني وجاهز للتوزيع',
      custodianName: null,
      inventoryNumber: 'INV-FUR-001',
      locationName: 'المخزن المركزي',
    },
    create: {
      assetId: furnitureAsset.id,
      assetName: 'مكتب إداري',
      brand: 'محلي',
      conditionNotes: 'مخزني وجاهز للتوزيع',
      custodianName: null,
      inventoryNumber: 'INV-FUR-001',
      locationName: 'المخزن المركزي',
    },
  });

  const vehicleAsset = await upsertDemoAsset({
    assetCategory: categoryByCode.VEH,
    assetType: getFirstType(categoryByCode.VEH),
    bookValue: 42000000,
    internalNumber: 'ROOT-VEH-2026-DEMO01',
    manufactureYear: 2023,
    model: 'Toyota Hilux',
    organizationUnit,
    origin: 'Japan',
    serialNumber: 'VIN-DEMO-001',
    status: maintenanceStatus,
  });

  await prisma.vehicleAssetDetail.upsert({
    where: { assetId: vehicleAsset.id },
    update: {
      chassisNumber: 'CH-DEMO-001',
      color: 'أبيض',
      engineNumber: 'EN-DEMO-001',
      plateNumber: 'حكومي-12345',
      vehicleType: 'بيك أب',
    },
    create: {
      assetId: vehicleAsset.id,
      chassisNumber: 'CH-DEMO-001',
      color: 'أبيض',
      engineNumber: 'EN-DEMO-001',
      plateNumber: 'حكومي-12345',
      vehicleType: 'بيك أب',
    },
  });

  const buildingAsset = await upsertDemoAsset({
    assetCategory: categoryByCode.BLD,
    assetType: getFirstType(categoryByCode.BLD),
    bookValue: 250000000,
    internalNumber: 'ROOT-BLD-2026-DEMO01',
    manufactureYear: null,
    model: 'مبنى إداري رئيسي',
    organizationUnit,
    origin: 'العراق',
    serialNumber: null,
    status: workingStatus,
  });

  await prisma.realEstateAssetDetail.upsert({
    where: { assetId: buildingAsset.id },
    update: {
      address: 'بغداد - المركز الإداري',
      buildingAreaSquareMeters: 1800,
      constructionYear: 2018,
      floorsCount: 3,
      propertyNumber: 'RE-1001',
    },
    create: {
      assetId: buildingAsset.id,
      address: 'بغداد - المركز الإداري',
      buildingAreaSquareMeters: 1800,
      constructionYear: 2018,
      floorsCount: 3,
      propertyNumber: 'RE-1001',
    },
  });

  await prisma.maintenanceRequest.upsert({
    where: { requestNumber: 'MTN-2026-DEMO01' },
    update: {
      assetId: deviceAsset.id,
      cost: 25000,
      description: 'الجهاز يعمل ببطء ويحتاج فحص النظام',
      maintenanceTypeId: emergencyMaintenance.id,
      resultNotes: null,
      status: 'OPEN',
    },
    create: {
      assetId: deviceAsset.id,
      cost: 25000,
      description: 'الجهاز يعمل ببطء ويحتاج فحص النظام',
      maintenanceTypeId: emergencyMaintenance.id,
      requestNumber: 'MTN-2026-DEMO01',
      status: 'OPEN',
    },
  });

  await prisma.maintenanceRequest.upsert({
    where: { requestNumber: 'MTN-2026-DEMO02' },
    update: {
      assetId: vehicleAsset.id,
      cost: 175000,
      description: 'فحص دوري للمحرك وتبديل زيوت',
      maintenanceTypeId: periodicMaintenance.id,
      performedAt: new Date('2026-07-20T09:00:00.000Z'),
      resultNotes: 'تمت الصيانة وتبديل الزيت والفلاتر',
      status: 'COMPLETED',
    },
    create: {
      assetId: vehicleAsset.id,
      cost: 175000,
      description: 'فحص دوري للمحرك وتبديل زيوت',
      maintenanceTypeId: periodicMaintenance.id,
      performedAt: new Date('2026-07-20T09:00:00.000Z'),
      requestNumber: 'MTN-2026-DEMO02',
      resultNotes: 'تمت الصيانة وتبديل الزيت والفلاتر',
      status: 'COMPLETED',
    },
  });

  await prisma.maintenanceRequest.upsert({
    where: { requestNumber: 'MTN-2026-DEMO03' },
    update: {
      assetId: buildingAsset.id,
      cost: 500000,
      description: 'تسرب ماء في الطابق الثاني',
      maintenanceTypeId: emergencyMaintenance.id,
      resultNotes: null,
      status: 'OPEN',
    },
    create: {
      assetId: buildingAsset.id,
      cost: 500000,
      description: 'تسرب ماء في الطابق الثاني',
      maintenanceTypeId: emergencyMaintenance.id,
      requestNumber: 'MTN-2026-DEMO03',
      status: 'OPEN',
    },
  });
}

async function main() {
  const rootUnit = await prisma.organizationUnit.upsert({
    where: { code: 'ROOT' },
    update: {},
    create: {
      name: 'المؤسسة الرئيسية',
      code: 'ROOT',
      unitType: 'مؤسسة',
    },
  });

  for (const unit of organizationUnits) {
    await prisma.organizationUnit.upsert({
      where: { code: unit.code },
      update: {
        name: unit.name,
        parentId: rootUnit.id,
        unitType: unit.unitType,
      },
      create: {
        ...unit,
        parentId: rootUnit.id,
      },
    });
  }

  const unitsByCode = await prisma.organizationUnit.findMany();
  const unitIdByCode = Object.fromEntries(
    unitsByCode.map((unit) => [unit.code, unit.id]),
  );

  for (const employee of employees) {
    const organizationUnitId = unitIdByCode[employee.organizationCode];

    if (!organizationUnitId) {
      throw new Error(
        `Missing organization unit ${employee.organizationCode} for employee seed.`,
      );
    }

    await prisma.employee.upsert({
      where: { employeeNumber: employee.employeeNumber },
      update: {
        fullName: employee.fullName,
        organizationUnitId,
        isActive: true,
      },
      create: {
        employeeNumber: employee.employeeNumber,
        fullName: employee.fullName,
        organizationUnitId,
      },
    });
  }

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { scopeLevel: role.scopeLevel },
      create: role,
    });
  }

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { name: permission.name, module: permission.module },
      create: permission,
    });
  }

  const savedRoles = await prisma.role.findMany();
  const roleIdByName = Object.fromEntries(
    savedRoles.map((role) => [role.name, role.id]),
  );
  const savedPermissions = await prisma.permission.findMany();
  const permissionIdByCode = Object.fromEntries(
    savedPermissions.map((permission) => [permission.code, permission.id]),
  );

  for (const [roleName, codes] of Object.entries(rolePermissionsByRoleName)) {
    const roleId = roleIdByName[roleName];

    if (!roleId) {
      throw new Error(`Missing role ${roleName} for permission seed.`);
    }

    for (const code of codes) {
      const permissionId = permissionIdByCode[code];

      if (!permissionId) {
        throw new Error(`Missing permission ${code} for role ${roleName}.`);
      }

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    }
  }

  const seedPasswordHash = await bcrypt.hash(seedUserPassword, 10);

  for (const seedUser of users) {
    const organizationUnitId = unitIdByCode[seedUser.organizationCode];
    const roleId = roleIdByName[seedUser.roleName];

    if (!organizationUnitId) {
      throw new Error(
        `Missing organization unit ${seedUser.organizationCode} for user seed.`,
      );
    }

    if (!roleId) {
      throw new Error(`Missing role ${seedUser.roleName} for user seed.`);
    }

    const savedUser = await prisma.user.upsert({
      where: { username: seedUser.username },
      update: {
        fullName: seedUser.fullName,
        organizationUnitId,
        isActive: true,
      },
      create: {
        username: seedUser.username,
        fullName: seedUser.fullName,
        organizationUnitId,
        passwordHash: seedPasswordHash,
      },
    });

    const existingUserRole = await prisma.userRole.findFirst({
      where: { userId: savedUser.id, roleId, organizationUnitId: null },
    });

    if (!existingUserRole) {
      await prisma.userRole.create({
        data: { userId: savedUser.id, roleId, organizationUnitId: null },
      });
    }
  }

  for (const category of assetCategories) {
    const savedCategory = await prisma.assetCategory.upsert({
      where: { code: category.code },
      update: { name: category.name },
      create: category,
    });

    for (const typeName of assetTypesByCategory[category.code] ?? []) {
      await prisma.assetType.upsert({
        where: {
          assetCategoryId_name: {
            assetCategoryId: savedCategory.id,
            name: typeName,
          },
        },
        update: {},
        create: {
          assetCategoryId: savedCategory.id,
          name: typeName,
        },
      });
    }

    for (const typeName of additionalAssetTypesByCategory[category.code] ?? []) {
      await prisma.assetType.upsert({
        where: {
          assetCategoryId_name: {
            assetCategoryId: savedCategory.id,
            name: typeName,
          },
        },
        update: { isActive: true },
        create: {
          assetCategoryId: savedCategory.id,
          name: typeName,
        },
      });
    }
  }

  for (const name of usageNatures) {
    await prisma.usageNature.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  for (const name of additionalUsageNatures) {
    await prisma.usageNature.upsert({
      where: { name },
      update: { isActive: true },
      create: { name },
    });
  }

  for (const status of assetStatuses) {
    await prisma.assetStatus.upsert({
      where: { code: status.code },
      update: { name: status.name, isTerminal: status.isTerminal },
      create: status,
    });
  }

  for (const type of maintenanceTypes) {
    await prisma.maintenanceType.upsert({
      where: { code: type.code },
      update: { name: type.name },
      create: type,
    });
  }

  for (const interval of maintenanceIntervals) {
    await prisma.maintenanceInterval.upsert({
      where: { code: interval.code },
      update: {
        name: interval.name,
        monthsCount: interval.monthsCount,
      },
      create: interval,
    });
  }

  await seedDemoData();
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seed completed.');
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
