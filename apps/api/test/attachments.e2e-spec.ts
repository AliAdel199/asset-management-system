import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { authHeader, bootstrapTestApp, loginAs } from './utils/bootstrap-app';
import { createTestPrismaClient } from './utils/test-prisma-client';

describe('Attachments on maintenance/transfer/write-off requests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let itUnitId: string;
  let br01UnitId: string;
  let maintenanceTypeId: string;
  const createdAssetIds: string[] = [];

  async function createFixtureAsset(internalNumber: string) {
    const category = await prisma.assetCategory.findFirstOrThrow();
    const status = await prisma.assetStatus.findFirstOrThrow();
    const assetType = await prisma.assetType.findFirstOrThrow({
      where: { assetCategoryId: category.id },
    });

    const asset = await prisma.asset.create({
      data: {
        internalNumber,
        assetCategoryId: category.id,
        assetTypeId: assetType.id,
        statusId: status.id,
        owningOrganizationUnitId: itUnitId,
      },
    });

    createdAssetIds.push(asset.id);
    return asset;
  }

  beforeAll(async () => {
    app = await bootstrapTestApp();
    prisma = createTestPrismaClient();

    const [itUnit, br01Unit, maintenanceType] = await Promise.all([
      prisma.organizationUnit.findUniqueOrThrow({ where: { code: 'IT' } }),
      prisma.organizationUnit.findUniqueOrThrow({ where: { code: 'BR01' } }),
      prisma.maintenanceType.findFirstOrThrow(),
    ]);
    itUnitId = itUnit.id;
    br01UnitId = br01Unit.id;
    maintenanceTypeId = maintenanceType.id;
  });

  afterAll(async () => {
    // حذف الطلبات (صيانة/نقل/شطب) يحذف مرفقاتها تلقائياً عبر onDelete: Cascade بالسكيمة.
    await prisma.maintenanceRequest.deleteMany({
      where: { assetId: { in: createdAssetIds } },
    });
    await prisma.assetTransferRequest.deleteMany({
      where: { assetId: { in: createdAssetIds } },
    });
    await prisma.assetWriteOffRequest.deleteMany({
      where: { assetId: { in: createdAssetIds } },
    });
    await prisma.assetMovement.deleteMany({
      where: { assetId: { in: createdAssetIds } },
    });
    await prisma.asset.deleteMany({ where: { id: { in: createdAssetIds } } });
    await prisma.$disconnect();
    await app.close();
  });

  it('attaches a file to a maintenance request and returns it with the Arabic title intact', async () => {
    const asset = await createFixtureAsset(`E2E-ATT-MTN-${Date.now()}`);
    const officerToken = await loginAs(app, 'assets.officer');

    const createResponse = await request(app.getHttpServer())
      .post('/api/maintenance-requests')
      .set(authHeader(officerToken))
      .send({
        assetId: asset.id,
        maintenanceTypeId,
        description: 'عطل في الشاشة',
      })
      .expect(201);

    const maintenanceRequestId = createResponse.body.id as string;

    const uploadResponse = await request(app.getHttpServer())
      .post(`/api/maintenance-requests/${maintenanceRequestId}/attachments`)
      .set(authHeader(officerToken))
      .field('attachmentType', 'invoice')
      .field('title', 'فاتورة الصيانة')
      .attach('file', Buffer.from('fixture content'), 'invoice.txt')
      .expect(201);

    expect(uploadResponse.body.maintenanceRequestId).toBe(maintenanceRequestId);
    expect(uploadResponse.body.assetId).toBeNull();
    expect(uploadResponse.body.title).toBe('فاتورة الصيانة');

    const detailResponse = await request(app.getHttpServer())
      .get(`/api/maintenance-requests/${maintenanceRequestId}`)
      .set(authHeader(officerToken))
      .expect(200);

    expect(detailResponse.body.attachments).toHaveLength(1);
    expect(detailResponse.body.attachments[0].title).toBe('فاتورة الصيانة');
  });

  it('attaches a file to a transfer request', async () => {
    const asset = await createFixtureAsset(`E2E-ATT-TR-${Date.now()}`);
    const officerToken = await loginAs(app, 'assets.officer');

    const transferResponse = await request(app.getHttpServer())
      .post(`/api/assets/${asset.id}/movements/transfer`)
      .set(authHeader(officerToken))
      .send({
        toOrganizationUnitId: br01UnitId,
        documentNumber: 'E2E-ATT-TR-DOC',
      })
      .expect(201);

    const transferRequestId = transferResponse.body.id as string;

    const uploadResponse = await request(app.getHttpServer())
      .post(`/api/transfer-requests/${transferRequestId}/attachments`)
      .set(authHeader(officerToken))
      .field('attachmentType', 'approval-letter')
      .field('title', 'كتاب الموافقة على النقل')
      .attach('file', Buffer.from('fixture content'), 'approval.txt')
      .expect(201);

    expect(uploadResponse.body.transferRequestId).toBe(transferRequestId);
    expect(uploadResponse.body.assetId).toBeNull();
  });

  it('attaches a file to a write-off request', async () => {
    const asset = await createFixtureAsset(`E2E-ATT-WO-${Date.now()}`);
    const officerToken = await loginAs(app, 'assets.officer');

    const writeOffResponse = await request(app.getHttpServer())
      .patch(`/api/assets/${asset.id}/deactivate`)
      .set(authHeader(officerToken))
      .send({ documentNumber: 'E2E-ATT-WO-DOC', reason: 'تالف بالكامل' })
      .expect(200);

    const writeOffRequestId = writeOffResponse.body.id as string;

    const uploadResponse = await request(app.getHttpServer())
      .post(`/api/write-off-requests/${writeOffRequestId}/attachments`)
      .set(authHeader(officerToken))
      .field('attachmentType', 'write-off-document')
      .field('title', 'مستند الشطب الرسمي')
      .attach('file', Buffer.from('fixture content'), 'write-off.txt')
      .expect(201);

    expect(uploadResponse.body.writeOffRequestId).toBe(writeOffRequestId);
    expect(uploadResponse.body.assetId).toBeNull();
  });

  it('rejects an attachment upload with no file', async () => {
    const asset = await createFixtureAsset(`E2E-ATT-NOFILE-${Date.now()}`);
    const officerToken = await loginAs(app, 'assets.officer');

    const createResponse = await request(app.getHttpServer())
      .post('/api/maintenance-requests')
      .set(authHeader(officerToken))
      .send({
        assetId: asset.id,
        maintenanceTypeId,
        description: 'عطل بسيط',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/maintenance-requests/${createResponse.body.id}/attachments`)
      .set(authHeader(officerToken))
      .field('attachmentType', 'invoice')
      .field('title', 'بدون ملف')
      .expect(400);
  });
});
