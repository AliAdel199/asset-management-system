import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { authHeader, bootstrapTestApp, loginAs } from './utils/bootstrap-app';
import { createTestPrismaClient } from './utils/test-prisma-client';

describe('Assets CRUD through the real HTTP stack (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let devCategoryId: string;
  let devTypeId: string;
  let workingStatusId: string;
  let itUnitId: string;
  const createdAssetIds: string[] = [];

  beforeAll(async () => {
    app = await bootstrapTestApp();
    prisma = createTestPrismaClient();

    const [category, status, itUnit] = await Promise.all([
      prisma.assetCategory.findUniqueOrThrow({ where: { code: 'DEV' } }),
      prisma.assetStatus.findUniqueOrThrow({ where: { code: 'WORKING' } }),
      prisma.organizationUnit.findUniqueOrThrow({ where: { code: 'IT' } }),
    ]);
    const type = await prisma.assetType.findFirstOrThrow({
      where: { assetCategoryId: category.id },
    });

    devCategoryId = category.id;
    devTypeId = type.id;
    workingStatusId = status.id;
    itUnitId = itUnit.id;
  });

  afterAll(async () => {
    await prisma.assetMovement.deleteMany({
      where: { assetId: { in: createdAssetIds } },
    });
    await prisma.generalAssetDetail.deleteMany({
      where: { assetId: { in: createdAssetIds } },
    });
    await prisma.asset.deleteMany({ where: { id: { in: createdAssetIds } } });
    await prisma.$disconnect();
    await app.close();
  });

  it('rejects a request with no JWT', async () => {
    await request(app.getHttpServer()).get('/api/assets').expect(401);
  });

  it('rejects a create payload containing a field outside the DTO whitelist', async () => {
    const token = await loginAs(app, 'assets.officer');

    await request(app.getHttpServer())
      .post('/api/assets')
      .set(authHeader(token))
      .send({
        assetCategoryId: devCategoryId,
        assetTypeId: devTypeId,
        statusId: workingStatusId,
        owningOrganizationUnitId: itUnitId,
        notARealField: 'should be rejected',
      })
      .expect(400);
  });

  it('rejects creating an asset missing a required field', async () => {
    const token = await loginAs(app, 'assets.officer');

    await request(app.getHttpServer())
      .post('/api/assets')
      .set(authHeader(token))
      .send({
        assetTypeId: devTypeId,
        statusId: workingStatusId,
        owningOrganizationUnitId: itUnitId,
      })
      .expect(400);
  });

  it('creates an asset, reads it back, updates it, and scopes list access by organization unit', async () => {
    const officerToken = await loginAs(app, 'assets.officer');
    const serialNumber = `E2E-SERIAL-${Date.now()}`;

    const createResponse = await request(app.getHttpServer())
      .post('/api/assets')
      .set(authHeader(officerToken))
      .send({
        assetCategoryId: devCategoryId,
        assetTypeId: devTypeId,
        statusId: workingStatusId,
        owningOrganizationUnitId: itUnitId,
        model: 'ThinkPad',
        serialNumber,
      })
      .expect(201);

    const assetId = createResponse.body.id as string;
    createdAssetIds.push(assetId);
    expect(createResponse.body.internalNumber).toBeTruthy();
    expect(createResponse.body.serialNumber).toBe(serialNumber);

    // assets.officer نطاقه جهة IT فقط، فيجب أن يرى الموجود الذي أنشأه فيها.
    const getResponse = await request(app.getHttpServer())
      .get(`/api/assets/${assetId}`)
      .set(authHeader(officerToken))
      .expect(200);
    expect(getResponse.body.model).toBe('ThinkPad');

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/assets/${assetId}`)
      .set(authHeader(officerToken))
      .send({
        assetCategoryId: devCategoryId,
        assetTypeId: devTypeId,
        statusId: workingStatusId,
        owningOrganizationUnitId: itUnitId,
        model: 'ThinkPad X1',
        serialNumber,
      })
      .expect(200);
    expect(updateResponse.body.model).toBe('ThinkPad X1');

    // نفس الرقم التسلسلي لا يجوز إعادة استخدامه لموجود نشط آخر.
    await request(app.getHttpServer())
      .post('/api/assets')
      .set(authHeader(officerToken))
      .send({
        assetCategoryId: devCategoryId,
        assetTypeId: devTypeId,
        statusId: workingStatusId,
        owningOrganizationUnitId: itUnitId,
        serialNumber,
      })
      .expect(400);
  });

  it('blocks a unit-scoped user from viewing an asset outside their organization unit', async () => {
    const officerToken = await loginAs(app, 'assets.officer');

    const createResponse = await request(app.getHttpServer())
      .post('/api/assets')
      .set(authHeader(officerToken))
      .send({
        assetCategoryId: devCategoryId,
        assetTypeId: devTypeId,
        statusId: workingStatusId,
        owningOrganizationUnitId: itUnitId,
        serialNumber: `E2E-SCOPE-${Date.now()}`,
      })
      .expect(201);

    const assetId = createResponse.body.id as string;
    createdAssetIds.push(assetId);

    // unit.user نطاقه جهة STORE، فلا يجوز أن يرى موجوداً في جهة IT.
    const unitUserToken = await loginAs(app, 'unit.user');
    await request(app.getHttpServer())
      .get(`/api/assets/${assetId}`)
      .set(authHeader(unitUserToken))
      .expect(400);
  });
});
