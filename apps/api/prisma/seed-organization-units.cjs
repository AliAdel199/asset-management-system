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

const organizationUnits = [
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
];

async function main() {
  const rootUnit = await prisma.organizationUnit.upsert({
    where: { code: 'ROOT' },
    update: {},
    create: {
      code: 'ROOT',
      name: 'المؤسسة الرئيسية',
      unitType: 'مؤسسة',
    },
  });

  for (const unit of organizationUnits) {
    await prisma.organizationUnit.upsert({
      where: { code: unit.code },
      update: {
        name: unit.name,
        unitType: unit.unitType,
        parentId: rootUnit.id,
        isActive: true,
      },
      create: {
        ...unit,
        parentId: rootUnit.id,
      },
    });
  }

  const savedUnits = await prisma.organizationUnit.findMany({
    where: { code: { in: organizationUnits.map((unit) => unit.code) } },
    orderBy: { name: 'asc' },
    select: { code: true, name: true, unitType: true },
  });

  console.log(`Seeded ${savedUnits.length} organization units.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
