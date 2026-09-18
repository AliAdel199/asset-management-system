require('dotenv/config');

const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const demoAssets = [
  {
    categoryCode: 'DEV',
    internalNumber: 'HILLA-DEV-26-100001',
    model: 'حاسبة مكتبية Dell OptiPlex',
    origin: 'USA',
    manufactureYear: 2023,
    serialNumber: 'BABIL-DEV-HILLA-001',
    bookValue: 1450000,
    organizationCode: 'HOS-HILLA',
    statusCode: 'WORKING',
    generalDetails: {
      assetName: 'حاسبة شعبة الحسابات',
      brand: 'Dell',
      inventoryNumber: 'HILLA-IT-001',
      locationName: 'محافظة بابل - الحلة - مستشفى الحلة - شعبة الحسابات',
      custodianName: 'موظف الحسابات',
      conditionNotes: 'صالحة وتعمل ضمن الشبكة الداخلية',
    },
  },
  {
    categoryCode: 'DEV',
    internalNumber: 'CENTER-DEV-26-100002',
    model: 'طابعة ليزر HP LaserJet',
    origin: 'China',
    manufactureYear: 2024,
    serialNumber: 'BABIL-DEV-CENTER-001',
    bookValue: 620000,
    organizationCode: 'CENTER',
    statusCode: 'WORKING',
    generalDetails: {
      assetName: 'طابعة كتب رسمية',
      brand: 'HP',
      inventoryNumber: 'CENTER-PRN-001',
      locationName: 'محافظة بابل - الحلة - مركز الدائرة - الصادرة والواردة',
      custodianName: 'موظف الصادرة',
      conditionNotes: 'صالحة للطباعة اليومية',
    },
  },
  {
    categoryCode: 'DEV',
    internalNumber: 'MERJAN-DEV-26-100003',
    model: 'جهاز UPS 3KVA',
    origin: 'Taiwan',
    manufactureYear: 2022,
    serialNumber: 'BABIL-UPS-MERJAN-001',
    bookValue: 980000,
    organizationCode: 'HOS-MERJAN',
    statusCode: 'WORKING',
    generalDetails: {
      assetName: 'مزود طاقة احتياطي',
      brand: 'APC',
      inventoryNumber: 'MERJAN-UPS-001',
      locationName: 'محافظة بابل - الحلة - مستشفى مرجان - غرفة السيرفر',
      custodianName: 'مسؤول تقنية المعلومات',
      conditionNotes: 'يحتاج فحص بطاريات دوري',
    },
  },
  {
    categoryCode: 'FUR',
    internalNumber: 'BABIL-FUR-26-100004',
    model: 'أثاث غرفة انتظار',
    origin: 'محلي',
    manufactureYear: 2021,
    serialNumber: null,
    bookValue: 2100000,
    organizationCode: 'HOS-BABIL',
    statusCode: 'WORKING',
    generalDetails: {
      assetName: 'كراسي انتظار معدنية',
      brand: 'محلي',
      inventoryNumber: 'BABIL-FUR-001',
      locationName: 'محافظة بابل - مستشفى بابل - صالة المراجعين',
      custodianName: 'مسؤول الخدمات',
      conditionNotes: 'بحالة جيدة',
    },
  },
  {
    categoryCode: 'FUR',
    internalNumber: 'QASIM-FUR-26-100005',
    model: 'مكتب إداري خشبي',
    origin: 'محلي',
    manufactureYear: 2020,
    serialNumber: null,
    bookValue: 450000,
    organizationCode: 'HOS-QASIM',
    statusCode: 'IN_STORE',
    generalDetails: {
      assetName: 'مكتب مدير وحدة',
      brand: 'محلي',
      inventoryNumber: 'QASIM-FUR-001',
      locationName: 'محافظة بابل - القاسم - مخزن مستشفى القاسم',
      custodianName: null,
      conditionNotes: 'مخزني وجاهز للتوزيع',
    },
  },
  {
    categoryCode: 'VEH',
    internalNumber: 'MHWL-VEH-26-100006',
    model: 'Toyota Hilux',
    origin: 'Japan',
    manufactureYear: 2022,
    serialNumber: 'BABIL-VEH-MHWL-001',
    bookValue: 46500000,
    organizationCode: 'SEC-MHWL',
    statusCode: 'WORKING',
    vehicleDetails: {
      plateNumber: 'بابل حكومي 2187',
      chassisNumber: 'MHWL-CH-2022-001',
      engineNumber: 'MHWL-EN-2022-001',
      vehicleType: 'بيك أب',
      color: 'أبيض',
    },
  },
  {
    categoryCode: 'VEH',
    internalNumber: 'ISK-VEH-26-100007',
    model: 'Hyundai H1 Ambulance',
    origin: 'Korea',
    manufactureYear: 2021,
    serialNumber: 'BABIL-AMB-ISK-001',
    bookValue: 72000000,
    organizationCode: 'HOS-ISK',
    statusCode: 'WORKING',
    vehicleDetails: {
      plateNumber: 'بابل إسعاف 1042',
      chassisNumber: 'ISK-AMB-CH-001',
      engineNumber: 'ISK-AMB-EN-001',
      vehicleType: 'إسعاف',
      color: 'أبيض وأحمر',
    },
  },
  {
    categoryCode: 'VEH',
    internalNumber: 'HASH-VEH-26-100008',
    model: 'Nissan Urvan',
    origin: 'Japan',
    manufactureYear: 2020,
    serialNumber: 'BABIL-VEH-HASH-001',
    bookValue: 38500000,
    organizationCode: 'SEC-HASH',
    statusCode: 'WORKING',
    vehicleDetails: {
      plateNumber: 'بابل حكومي 3310',
      chassisNumber: 'HASH-CH-2020-001',
      engineNumber: 'HASH-EN-2020-001',
      vehicleType: 'باص صغير',
      color: 'فضي',
    },
  },
  {
    categoryCode: 'LND',
    internalNumber: 'HILLA1-LND-26-100009',
    model: null,
    origin: null,
    manufactureYear: null,
    serialNumber: null,
    bookValue: 180000000,
    organizationCode: 'SEC-HILLA1',
    statusCode: 'WORKING',
    landDetails: {
      plotNumber: '12/45',
      district: 'الحلة الأولى',
      municipality: 'بلدية الحلة',
      areaSquareMeters: 2400,
      landUse: 'مركز صحي',
    },
  },
  {
    categoryCode: 'LND',
    internalNumber: 'KIFL-LND-26-100010',
    model: null,
    origin: null,
    manufactureYear: null,
    serialNumber: null,
    bookValue: 95000000,
    organizationCode: 'HOS-KIFL',
    statusCode: 'WORKING',
    landDetails: {
      plotNumber: '8/112',
      district: 'الكفل',
      municipality: 'بلدية الكفل',
      areaSquareMeters: 1600,
      landUse: 'توسعة مستشفى',
    },
  },
  {
    categoryCode: 'BLD',
    internalNumber: 'MERJAN-BLD-26-100011',
    model: null,
    origin: null,
    manufactureYear: null,
    serialNumber: null,
    bookValue: 520000000,
    organizationCode: 'HOS-MERJAN',
    statusCode: 'WORKING',
    realEstateDetails: {
      propertyNumber: 'MERJAN-BLD-01',
      address: 'محافظة بابل - الحلة - مستشفى مرجان - مجمع الطوارئ',
      floorsCount: 2,
      buildingAreaSquareMeters: 1350,
      constructionYear: 2016,
    },
  },
  {
    categoryCode: 'BLD',
    internalNumber: 'CENTER-BLD-26-100012',
    model: null,
    origin: null,
    manufactureYear: null,
    serialNumber: null,
    bookValue: 780000000,
    organizationCode: 'CENTER',
    statusCode: 'WORKING',
    realEstateDetails: {
      propertyNumber: 'CENTER-BLD-01',
      address: 'محافظة بابل - الحلة - مركز الدائرة - الشارع الخدمي',
      floorsCount: 3,
      buildingAreaSquareMeters: 2200,
      constructionYear: 2014,
    },
  },
  {
    categoryCode: 'BLD',
    internalNumber: 'HILLA-BLD-26-100013',
    model: null,
    origin: null,
    manufactureYear: null,
    serialNumber: null,
    bookValue: 310000000,
    organizationCode: 'HOS-HILLA',
    statusCode: 'WORKING',
    realEstateDetails: {
      propertyNumber: 'HILLA-LAB-01',
      address: 'محافظة بابل - الحلة - مستشفى الحلة - بناية المختبرات',
      floorsCount: 2,
      buildingAreaSquareMeters: 900,
      constructionYear: 2018,
    },
  },
];

async function loadReferences() {
  const [categories, statuses, organizationUnits] = await Promise.all([
    prisma.assetCategory.findMany({ include: { assetTypes: true } }),
    prisma.assetStatus.findMany(),
    prisma.organizationUnit.findMany(),
  ]);

  return {
    categoryByCode: Object.fromEntries(
      categories.map((category) => [category.code, category]),
    ),
    organizationUnitByCode: Object.fromEntries(
      organizationUnits.map((unit) => [unit.code, unit]),
    ),
    statusByCode: Object.fromEntries(statuses.map((status) => [status.code, status])),
  };
}

function getFirstAssetType(category) {
  const assetType = category?.assetTypes[0];

  if (!assetType) {
    throw new Error(`Missing asset type for category ${category?.code}.`);
  }

  return assetType;
}

async function upsertAsset(asset, references) {
  const category = references.categoryByCode[asset.categoryCode];
  const organizationUnit = references.organizationUnitByCode[asset.organizationCode];
  const status = references.statusByCode[asset.statusCode];

  if (!category || !organizationUnit || !status) {
    throw new Error(`Missing reference data for ${asset.internalNumber}.`);
  }

  const savedAsset = await prisma.asset.upsert({
    where: { internalNumber: asset.internalNumber },
    update: {
      assetCategoryId: category.id,
      assetTypeId: getFirstAssetType(category).id,
      statusId: status.id,
      owningOrganizationUnitId: organizationUnit.id,
      bookValue: asset.bookValue,
      manufactureYear: asset.manufactureYear,
      model: asset.model,
      origin: asset.origin,
      serialNumber: asset.serialNumber,
      serialNumberMissing: asset.serialNumber === null,
      isDeleted: false,
    },
    create: {
      internalNumber: asset.internalNumber,
      qrCodeValue: asset.internalNumber,
      assetCategoryId: category.id,
      assetTypeId: getFirstAssetType(category).id,
      statusId: status.id,
      owningOrganizationUnitId: organizationUnit.id,
      bookValue: asset.bookValue,
      manufactureYear: asset.manufactureYear,
      model: asset.model,
      origin: asset.origin,
      serialNumber: asset.serialNumber,
      serialNumberMissing: asset.serialNumber === null,
    },
  });

  if (asset.generalDetails) {
    await prisma.generalAssetDetail.upsert({
      where: { assetId: savedAsset.id },
      update: asset.generalDetails,
      create: { assetId: savedAsset.id, ...asset.generalDetails },
    });
  }

  if (asset.vehicleDetails) {
    await prisma.vehicleAssetDetail.upsert({
      where: { assetId: savedAsset.id },
      update: asset.vehicleDetails,
      create: { assetId: savedAsset.id, ...asset.vehicleDetails },
    });
  }

  if (asset.landDetails) {
    await prisma.landAssetDetail.upsert({
      where: { assetId: savedAsset.id },
      update: asset.landDetails,
      create: { assetId: savedAsset.id, ...asset.landDetails },
    });
  }

  if (asset.realEstateDetails) {
    await prisma.realEstateAssetDetail.upsert({
      where: { assetId: savedAsset.id },
      update: asset.realEstateDetails,
      create: { assetId: savedAsset.id, ...asset.realEstateDetails },
    });
  }
}

async function main() {
  const references = await loadReferences();

  for (const asset of demoAssets) {
    await upsertAsset(asset, references);
  }

  console.log(`Seeded ${demoAssets.length} Babil demo assets.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
