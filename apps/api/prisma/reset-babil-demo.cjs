require('dotenv/config');

const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function clearAssetData() {
  await prisma.maintenanceMaterial.deleteMany();
  await prisma.maintenanceRequest.deleteMany();
  await prisma.assetAttachment.deleteMany();
  await prisma.assetMovement.deleteMany();
  await prisma.generalAssetDetail.deleteMany();
  await prisma.vehicleAssetDetail.deleteMany();
  await prisma.landAssetDetail.deleteMany();
  await prisma.realEstateAssetDetail.deleteMany();
  await prisma.asset.deleteMany();
}

async function main() {
  await clearAssetData();
  await prisma.$disconnect();

  const prismaDir = __dirname;
  execFileSync(process.execPath, [path.join(prismaDir, 'seed-organization-units.cjs')], {
    stdio: 'inherit',
  });
  execFileSync(process.execPath, [path.join(prismaDir, 'seed-babil-demo.cjs')], {
    stdio: 'inherit',
  });

  console.log('Reset asset data and seeded fresh Babil demo data.');
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
