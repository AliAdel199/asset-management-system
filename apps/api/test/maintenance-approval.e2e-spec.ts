import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { authHeader, bootstrapTestApp, loginAs } from './utils/bootstrap-app';
import { createTestPrismaClient } from './utils/test-prisma-client';

describe('Maintenance request approval workflow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let itUnitId: string;
  let maintenanceTypeId: string;
  let workingStatusId: string;
  const createdAssetIds: string[] = [];

  async function createFixtureAsset(internalNumber: string) {
    const category = await prisma.assetCategory.findFirstOrThrow();
    const assetType = await prisma.assetType.findFirstOrThrow({
      where: { assetCategoryId: category.id },
    });

    const asset = await prisma.asset.create({
      data: {
        internalNumber,
        assetCategoryId: category.id,
        assetTypeId: assetType.id,
        statusId: workingStatusId,
        owningOrganizationUnitId: itUnitId,
      },
    });

    createdAssetIds.push(asset.id);
    return asset;
  }

  beforeAll(async () => {
    app = await bootstrapTestApp();
    prisma = createTestPrismaClient();

    const [itUnit, maintenanceType, workingStatus] = await Promise.all([
      prisma.organizationUnit.findUniqueOrThrow({ where: { code: 'IT' } }),
      prisma.maintenanceType.findFirstOrThrow(),
      prisma.assetStatus.findUniqueOrThrow({ where: { code: 'WORKING' } }),
    ]);
    itUnitId = itUnit.id;
    maintenanceTypeId = maintenanceType.id;
    workingStatusId = workingStatus.id;
  });

  afterAll(async () => {
    await prisma.maintenanceRequest.deleteMany({
      where: { assetId: { in: createdAssetIds } },
    });
    await prisma.assetMovement.deleteMany({
      where: { assetId: { in: createdAssetIds } },
    });
    await prisma.asset.deleteMany({ where: { id: { in: createdAssetIds } } });
    await prisma.$disconnect();
    await app.close();
  });

  it('submits a request as PENDING without moving the asset, then an approver approves it and the asset transitions to under-maintenance', async () => {
    const asset = await createFixtureAsset(`E2E-MTN-APPROVE-${Date.now()}`);
    const officerToken = await loginAs(app, 'assets.officer');

    const submitResponse = await request(app.getHttpServer())
      .post('/api/maintenance-requests')
      .set(authHeader(officerToken))
      .send({
        assetId: asset.id,
        maintenanceTypeId,
        description: 'عطل بالشاشة',
      })
      .expect(201);

    expect(submitResponse.body.status).toBe('PENDING');

    const assetAfterSubmit = await request(app.getHttpServer())
      .get(`/api/assets/${asset.id}`)
      .set(authHeader(officerToken))
      .expect(200);
    expect(assetAfterSubmit.body.status.id).toBe(workingStatusId);

    // مقدّم الطلب (مسؤول موجودات) لا يملك صلاحية الاعتماد.
    await request(app.getHttpServer())
      .post(`/api/maintenance-requests/${submitResponse.body.id}/approve`)
      .set(authHeader(officerToken))
      .expect(403);

    const approverToken = await loginAs(app, 'central.user');

    const pendingList = await request(app.getHttpServer())
      .get('/api/maintenance-requests?status=PENDING')
      .set(authHeader(approverToken))
      .expect(200);
    const pendingRequest = pendingList.body.find(
      (item: { id: string }) => item.id === submitResponse.body.id,
    );
    expect(pendingRequest).toBeDefined();

    await request(app.getHttpServer())
      .post(`/api/maintenance-requests/${submitResponse.body.id}/approve`)
      .set(authHeader(approverToken))
      .expect(201)
      .expect((res) => {
        expect(res.body.status).toBe('OPEN');
      });

    const assetAfterApproval = await request(app.getHttpServer())
      .get(`/api/assets/${asset.id}`)
      .set(authHeader(approverToken))
      .expect(200);
    expect(assetAfterApproval.body.status.code).toBe('IN_MAINTENANCE');
  });

  it('rejects a pending request, leaving the asset status untouched', async () => {
    const asset = await createFixtureAsset(`E2E-MTN-REJECT-${Date.now()}`);
    const officerToken = await loginAs(app, 'assets.officer');

    const submitResponse = await request(app.getHttpServer())
      .post('/api/maintenance-requests')
      .set(authHeader(officerToken))
      .send({
        assetId: asset.id,
        maintenanceTypeId,
        description: 'عطل بسيط',
      })
      .expect(201);

    const approverToken = await loginAs(app, 'central.user');

    await request(app.getHttpServer())
      .post(`/api/maintenance-requests/${submitResponse.body.id}/reject`)
      .set(authHeader(approverToken))
      .send({ notes: 'غير ضروري حالياً' })
      .expect(201)
      .expect((res) => {
        expect(res.body.status).toBe('REJECTED');
      });

    const assetAfterRejection = await request(app.getHttpServer())
      .get(`/api/assets/${asset.id}`)
      .set(authHeader(approverToken))
      .expect(200);
    expect(assetAfterRejection.body.status.id).toBe(workingStatusId);

    // لا يمكن إكمال طلب لم يُعتمد بعد.
    await request(app.getHttpServer())
      .patch(`/api/maintenance-requests/${submitResponse.body.id}/status`)
      .set(authHeader(approverToken))
      .send({ status: 'COMPLETED', resultNotes: 'تم' })
      .expect(400);
  });
});
