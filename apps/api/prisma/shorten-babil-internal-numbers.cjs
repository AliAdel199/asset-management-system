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

const internalNumberMap = {
  'HOS-HILLA-DEV-11111111-1111-4111-8111-111111111111':
    'HILLA-DEV-26-100001',
  'CENTER-DEV-22222222-2222-4222-8222-222222222222':
    'CENTER-DEV-26-100002',
  'HOS-MERJAN-DEV-33333333-3333-4333-8333-333333333333':
    'MERJAN-DEV-26-100003',
  'HOS-BABIL-FUR-44444444-4444-4444-8444-444444444444':
    'BABIL-FUR-26-100004',
  'HOS-QASIM-FUR-55555555-5555-4555-8555-555555555555':
    'QASIM-FUR-26-100005',
  'SEC-MHWL-VEH-66666666-6666-4666-8666-666666666666':
    'MHWL-VEH-26-100006',
  'HOS-ISK-VEH-77777777-7777-4777-8777-777777777777':
    'ISK-VEH-26-100007',
  'SEC-HASH-VEH-88888888-8888-4888-8888-888888888888':
    'HASH-VEH-26-100008',
  'SEC-HILLA1-LND-99999999-9999-4999-8999-999999999999':
    'HILLA1-LND-26-100009',
  'HOS-KIFL-LND-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa':
    'KIFL-LND-26-100010',
  'HOS-MERJAN-BLD-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb':
    'MERJAN-BLD-26-100011',
  'CENTER-BLD-cccccccc-cccc-4ccc-8ccc-cccccccccccc':
    'CENTER-BLD-26-100012',
  'HOS-HILLA-BLD-dddddddd-dddd-4ddd-8ddd-dddddddddddd':
    'HILLA-BLD-26-100013',
};

async function main() {
  let updatedCount = 0;

  for (const [oldInternalNumber, newInternalNumber] of Object.entries(
    internalNumberMap,
  )) {
    const oldAsset = await prisma.asset.findUnique({
      where: { internalNumber: oldInternalNumber },
      select: { id: true },
    });

    if (!oldAsset) {
      continue;
    }

    const existingNewAsset = await prisma.asset.findUnique({
      where: { internalNumber: newInternalNumber },
      select: { id: true },
    });

    if (existingNewAsset && existingNewAsset.id !== oldAsset.id) {
      throw new Error(`Cannot use duplicate internal number ${newInternalNumber}.`);
    }

    await prisma.asset.update({
      where: { id: oldAsset.id },
      data: {
        internalNumber: newInternalNumber,
        qrCodeValue: newInternalNumber,
      },
    });
    updatedCount += 1;
  }

  console.log(`Shortened ${updatedCount} Babil internal numbers.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
