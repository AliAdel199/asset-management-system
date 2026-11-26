import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { authHeader, bootstrapTestApp, loginAs } from './utils/bootstrap-app';
import { createTestPrismaClient } from './utils/test-prisma-client';

describe('Pending approvals notification count (e2e)', () => {
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
    await prisma.maintenanceRequest.deleteMany({
      where: { assetId: { in: createdAssetIds } },
    });
    await prisma.assetTransferRequest.deleteMany({
      where: { assetId: { in: createdAssetIds } },
    });
    await prisma.assetWriteOffRequest.deleteMany({
      where: { assetId: { in: createdAssetIds } },
    });
    await prisma.asset.deleteMany({ where: { id: { in: createdAssetIds } } });
    await prisma.$disconnect();
    await app.close();
  });

  it('returns all zeros for a user with none of the approval permissions', async () => {
    // assets.officer يملك MAINTENANCE_CREATE/ASSETS_TRANSFER/ASSETS_DEACTIVATE
    // لتقديم الطلبات، لكن ليس أياً من صلاحيات الاعتماد الثلاث.
    const officerToken = await loginAs(app, 'assets.officer');

    const response = await request(app.getHttpServer())
      .get('/api/notifications/pending-approvals')
      .set(authHeader(officerToken))
      .expect(200);

    expect(response.body).toEqual({
      transferRequests: 0,
      writeOffRequests: 0,
      maintenanceRequests: 0,
      total: 0,
    });
  });

  it('reflects newly submitted pending requests for an approver, and drops back down after a decision', async () => {
    // central.user نطاقه مركزي (بلا قيد جهة)، وملفات e2e الأخرى تُنشئ وتعتمد طلباتها
    // الخاصة بالتوازي على نفس القاعدة. هذا يجعل أي مقارنة رقمية على المجموع الكلي
    // (before/after) غير موثوقة في الاتجاهين، لذا نتحقق بدلاً من ذلك من: (أ) أن العدّاد
    // يعكس على الأقل طلبنا نحن بعد إنشائه، و(ب) أن طلبنا نحن تحديداً يختفي من قائمة
    // المعلّق بعد اعتماده — بغض النظر عمّا يفعله بقية العمّال بالتوازي.
    const officerToken = await loginAs(app, 'assets.officer');
    const approverToken = await loginAs(app, 'central.user');

    const transferAsset = await createFixtureAsset(
      `E2E-NOTIF-TR-${Date.now()}`,
    );
    const transferResponse = await request(app.getHttpServer())
      .post(`/api/assets/${transferAsset.id}/movements/transfer`)
      .set(authHeader(officerToken))
      .send({ toOrganizationUnitId: br01UnitId })
      .expect(201);

    const woAsset = await createFixtureAsset(`E2E-NOTIF-WO-${Date.now()}`);
    await request(app.getHttpServer())
      .patch(`/api/assets/${woAsset.id}/deactivate`)
      .set(authHeader(officerToken))
      .send({ documentNumber: 'NOTIF-DOC', reason: 'اختبار الإشعارات' })
      .expect(200);

    const mntAsset = await createFixtureAsset(`E2E-NOTIF-MNT-${Date.now()}`);
    await request(app.getHttpServer())
      .post('/api/maintenance-requests')
      .set(authHeader(officerToken))
      .send({
        assetId: mntAsset.id,
        maintenanceTypeId,
        description: 'اختبار الإشعارات',
      })
      .expect(201);

    const after = await request(app.getHttpServer())
      .get('/api/notifications/pending-approvals')
      .set(authHeader(approverToken))
      .expect(200);

    expect(after.body.transferRequests).toBeGreaterThanOrEqual(1);
    expect(after.body.writeOffRequests).toBeGreaterThanOrEqual(1);
    expect(after.body.maintenanceRequests).toBeGreaterThanOrEqual(1);
    expect(after.body.total).toBe(
      after.body.transferRequests +
        after.body.writeOffRequests +
        after.body.maintenanceRequests,
    );

    const pendingTransfers = await request(app.getHttpServer())
      .get('/api/transfer-requests?status=PENDING')
      .set(authHeader(approverToken))
      .expect(200);
    expect(
      pendingTransfers.body.some(
        (item: { id: string }) => item.id === transferResponse.body.id,
      ),
    ).toBe(true);

    await request(app.getHttpServer())
      .post(`/api/transfer-requests/${transferResponse.body.id}/approve`)
      .set(authHeader(approverToken))
      .expect(201);

    const pendingTransfersAfterApprove = await request(app.getHttpServer())
      .get('/api/transfer-requests?status=PENDING')
      .set(authHeader(approverToken))
      .expect(200);
    expect(
      pendingTransfersAfterApprove.body.some(
        (item: { id: string }) => item.id === transferResponse.body.id,
      ),
    ).toBe(false);
  });
});
