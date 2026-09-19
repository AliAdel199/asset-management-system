import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { authHeader, bootstrapTestApp, loginAs } from './utils/bootstrap-app';
import { createTestPrismaClient } from './utils/test-prisma-client';

describe('Write-off approval workflow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let itUnitId: string;
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

    const itUnit = await prisma.organizationUnit.findUniqueOrThrow({
      where: { code: 'IT' },
    });
    itUnitId = itUnit.id;
  });

  afterAll(async () => {
    // تنظيف كامل لبيانات الاختبار حتى لا تتراكم بقاعدة البيانات بين التشغيلات.
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

  it('submits a write-off request, blocks a second concurrent one, then an approver approves it and the asset is deactivated', async () => {
    const asset = await createFixtureAsset(`E2E-WO-APPROVE-${Date.now()}`);

    // assets.officer (مسؤول موجودات، جهة IT) يملك صلاحية طلب الشطب فقط، لا الاعتماد.
    const officerToken = await loginAs(app, 'assets.officer');

    const submitResponse = await request(app.getHttpServer())
      .patch(`/api/assets/${asset.id}/deactivate`)
      .set(authHeader(officerToken))
      .send({ documentNumber: 'E2E-DOC-1', reason: 'اختبار شامل للنظام' })
      .expect(200);

    expect(submitResponse.body.status).toBe('PENDING');

    // لا يجوز تقديم طلب شطب ثانٍ لنفس الموجود وهو بانتظار الموافقة.
    await request(app.getHttpServer())
      .patch(`/api/assets/${asset.id}/deactivate`)
      .set(authHeader(officerToken))
      .send({ documentNumber: 'E2E-DOC-2', reason: 'محاولة ثانية' })
      .expect(400);

    // مقدّم الطلب نفسه لا يملك صلاحية الاعتماد.
    await request(app.getHttpServer())
      .get('/api/write-off-requests')
      .set(authHeader(officerToken))
      .expect(403);

    // central.user (نطاق مركزي) يملك صلاحية الاعتماد.
    const approverToken = await loginAs(app, 'central.user');

    const pendingList = await request(app.getHttpServer())
      .get('/api/write-off-requests?status=PENDING')
      .set(authHeader(approverToken))
      .expect(200);

    const pendingRequest = pendingList.body.find(
      (item: { asset: { id: string } }) => item.asset.id === asset.id,
    );
    expect(pendingRequest).toBeDefined();

    await request(app.getHttpServer())
      .post(`/api/write-off-requests/${pendingRequest.id}/approve`)
      .set(authHeader(approverToken))
      .expect(201)
      .expect((res) => {
        expect(res.body.status).toBe('APPROVED');
      });

    const assetAfterApproval = await request(app.getHttpServer())
      .get(`/api/assets/${asset.id}`)
      .set(authHeader(approverToken))
      .expect(200);

    expect(assetAfterApproval.body.isDeleted).toBe(true);
  });

  it('submits a write-off request and an approver can reject it, leaving the asset active', async () => {
    const asset = await createFixtureAsset(`E2E-WO-REJECT-${Date.now()}`);
    const officerToken = await loginAs(app, 'assets.officer');

    await request(app.getHttpServer())
      .patch(`/api/assets/${asset.id}/deactivate`)
      .set(authHeader(officerToken))
      .send({ documentNumber: 'E2E-DOC-3', reason: 'اختبار الرفض' })
      .expect(200);

    const approverToken = await loginAs(app, 'central.user');
    const pendingList = await request(app.getHttpServer())
      .get('/api/write-off-requests?status=PENDING')
      .set(authHeader(approverToken))
      .expect(200);

    const pendingRequest = pendingList.body.find(
      (item: { asset: { id: string } }) => item.asset.id === asset.id,
    );
    expect(pendingRequest).toBeDefined();

    await request(app.getHttpServer())
      .post(`/api/write-off-requests/${pendingRequest.id}/reject`)
      .set(authHeader(approverToken))
      .send({ notes: 'سبب الرفض بالاختبار الشامل' })
      .expect(201)
      .expect((res) => {
        expect(res.body.status).toBe('REJECTED');
      });

    const assetAfterRejection = await request(app.getHttpServer())
      .get(`/api/assets/${asset.id}`)
      .set(authHeader(approverToken))
      .expect(200);

    expect(assetAfterRejection.body.isDeleted).toBe(false);
  });

  it('allows only one of two truly concurrent write-off requests for the same asset to succeed', async () => {
    const asset = await createFixtureAsset(`E2E-WO-RACE-${Date.now()}`);
    const officerToken = await loginAs(app, 'assets.officer');

    // نفس فحص التصادم الحقيقي المستخدم بطلبات النقل، لهذا المسار (AssetsService.requestWriteOff).
    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .patch(`/api/assets/${asset.id}/deactivate`)
        .set(authHeader(officerToken))
        .send({ documentNumber: 'RACE-A', reason: 'اختبار تصادم' }),
      request(app.getHttpServer())
        .patch(`/api/assets/${asset.id}/deactivate`)
        .set(authHeader(officerToken))
        .send({ documentNumber: 'RACE-B', reason: 'اختبار تصادم' }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([200, 400]);

    const pendingRequests = await prisma.assetWriteOffRequest.findMany({
      where: { assetId: asset.id, status: 'PENDING' },
    });
    expect(pendingRequests).toHaveLength(1);
  });
});
