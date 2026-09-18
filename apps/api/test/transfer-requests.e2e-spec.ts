import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { authHeader, bootstrapTestApp, loginAs } from './utils/bootstrap-app';
import { createTestPrismaClient } from './utils/test-prisma-client';

describe('Transfer request workflow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let itUnitId: string;
  let br01UnitId: string;
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

    const [itUnit, br01Unit] = await Promise.all([
      prisma.organizationUnit.findUniqueOrThrow({ where: { code: 'IT' } }),
      prisma.organizationUnit.findUniqueOrThrow({ where: { code: 'BR01' } }),
    ]);
    itUnitId = itUnit.id;
    br01UnitId = br01Unit.id;
  });

  afterAll(async () => {
    await prisma.assetTransferRequest.deleteMany({
      where: { assetId: { in: createdAssetIds } },
    });
    await prisma.assetMovement.deleteMany({
      where: { assetId: { in: createdAssetIds } },
    });
    await prisma.asset.deleteMany({ where: { id: { in: createdAssetIds } } });
    await prisma.$disconnect();
    await app.close();
  });

  it('requests a transfer, blocks a second concurrent request, then an approver approves it and the asset holder unit changes', async () => {
    const asset = await createFixtureAsset(`E2E-TR-APPROVE-${Date.now()}`);

    // assets.officer (نطاق IT) يملك صلاحية طلب النقل فقط، لا الاعتماد.
    const officerToken = await loginAs(app, 'assets.officer');

    const submitResponse = await request(app.getHttpServer())
      .post(`/api/assets/${asset.id}/movements/transfer`)
      .set(authHeader(officerToken))
      .send({ toOrganizationUnitId: br01UnitId, documentNumber: 'E2E-TR-1' })
      .expect(201);

    expect(submitResponse.body.status).toBe('PENDING');

    // لا يجوز تقديم طلب نقل ثانٍ لنفس الموجود وهو بانتظار الموافقة.
    await request(app.getHttpServer())
      .post(`/api/assets/${asset.id}/movements/transfer`)
      .set(authHeader(officerToken))
      .send({ toOrganizationUnitId: br01UnitId, documentNumber: 'E2E-TR-2' })
      .expect(400);

    // مقدّم الطلب نفسه لا يملك صلاحية الاعتماد.
    await request(app.getHttpServer())
      .get('/api/transfer-requests')
      .set(authHeader(officerToken))
      .expect(403);

    // central.user (نطاق مركزي) يملك صلاحية الاعتماد.
    const approverToken = await loginAs(app, 'central.user');

    const pendingList = await request(app.getHttpServer())
      .get('/api/transfer-requests?status=PENDING')
      .set(authHeader(approverToken))
      .expect(200);

    const pendingRequest = pendingList.body.find(
      (item: { asset: { id: string } }) => item.asset.id === asset.id,
    );
    expect(pendingRequest).toBeDefined();

    await request(app.getHttpServer())
      .post(`/api/transfer-requests/${pendingRequest.id}/approve`)
      .set(authHeader(approverToken))
      .expect(201)
      .expect((res) => {
        expect(res.body.status).toBe('APPROVED');
      });

    const assetAfterApproval = await request(app.getHttpServer())
      .get(`/api/assets/${asset.id}`)
      .set(authHeader(approverToken))
      .expect(200);

    expect(assetAfterApproval.body.currentHolderOrganizationUnit.id).toBe(
      br01UnitId,
    );
  });

  it('requests a transfer and an approver can reject it, leaving the asset holder unchanged', async () => {
    const asset = await createFixtureAsset(`E2E-TR-REJECT-${Date.now()}`);
    const officerToken = await loginAs(app, 'assets.officer');

    await request(app.getHttpServer())
      .post(`/api/assets/${asset.id}/movements/transfer`)
      .set(authHeader(officerToken))
      .send({ toOrganizationUnitId: br01UnitId, documentNumber: 'E2E-TR-3' })
      .expect(201);

    const approverToken = await loginAs(app, 'central.user');
    const pendingList = await request(app.getHttpServer())
      .get('/api/transfer-requests?status=PENDING')
      .set(authHeader(approverToken))
      .expect(200);

    const pendingRequest = pendingList.body.find(
      (item: { asset: { id: string } }) => item.asset.id === asset.id,
    );
    expect(pendingRequest).toBeDefined();

    await request(app.getHttpServer())
      .post(`/api/transfer-requests/${pendingRequest.id}/reject`)
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

    expect(assetAfterRejection.body.currentHolderOrganizationUnit).toBeNull();
  });
});
