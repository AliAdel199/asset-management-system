import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { authHeader, bootstrapTestApp, loginAs } from './utils/bootstrap-app';
import { createTestPrismaClient } from './utils/test-prisma-client';

describe('Asset catalog admin (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const createdCategoryIds: string[] = [];

  beforeAll(async () => {
    app = await bootstrapTestApp();
    prisma = createTestPrismaClient();
  });

  afterAll(async () => {
    await prisma.assetType.deleteMany({
      where: { assetCategoryId: { in: createdCategoryIds } },
    });
    await prisma.assetCategory.deleteMany({
      where: { id: { in: createdCategoryIds } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  it('creates a category without a code and auto-generates a unique one', async () => {
    const adminToken = await loginAs(app, 'admin');

    const response = await request(app.getHttpServer())
      .post('/api/asset-catalog/categories')
      .set(authHeader(adminToken))
      .send({ name: `E2E أجهزة طبية ${Date.now()}` })
      .expect(201);

    createdCategoryIds.push(response.body.id);
    expect(response.body.code).toMatch(/^[A-Z]{3,4}$/);
  });

  it('creates a category with an explicit code, uppercased, and rejects a duplicate', async () => {
    const adminToken = await loginAs(app, 'admin');
    const code = `E2${Date.now().toString().slice(-4)}`;

    const response = await request(app.getHttpServer())
      .post('/api/asset-catalog/categories')
      .set(authHeader(adminToken))
      .send({ name: 'E2E صنف بكود صريح', code: code.toLowerCase() })
      .expect(201);

    createdCategoryIds.push(response.body.id);
    expect(response.body.code).toBe(code.toUpperCase());

    await request(app.getHttpServer())
      .post('/api/asset-catalog/categories')
      .set(authHeader(adminToken))
      .send({ name: 'E2E صنف آخر بنفس الكود', code })
      .expect(400);
  });

  it('updates a category (name/description/isActive only) without sending a code', async () => {
    // هذا الاختبار بالذات يغطي خللاً حقيقياً وُجد سابقاً: نموذج تعديل الصنف بالواجهة كان
    // يرسل حقل code ضمن كل طلب PATCH رغم أن UpdateCategoryDto لا يعرّفه إطلاقاً، فكان يُرفض
    // بخطأ 400 "property code should not exist" بمجرد تفعيل whitelist/forbidNonWhitelisted.
    const adminToken = await loginAs(app, 'admin');

    const createResponse = await request(app.getHttpServer())
      .post('/api/asset-catalog/categories')
      .set(authHeader(adminToken))
      .send({ name: `E2E صنف للتعديل ${Date.now()}` })
      .expect(201);

    createdCategoryIds.push(createResponse.body.id);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/asset-catalog/categories/${createResponse.body.id}`)
      .set(authHeader(adminToken))
      .send({
        name: 'E2E اسم معدّل',
        description: 'وصف جديد',
        isActive: true,
      })
      .expect(200);

    expect(updateResponse.body.name).toBe('E2E اسم معدّل');
    expect(updateResponse.body.code).toBe(createResponse.body.code);
  });

  it('adds a type under a newly created category', async () => {
    const adminToken = await loginAs(app, 'admin');

    const categoryResponse = await request(app.getHttpServer())
      .post('/api/asset-catalog/categories')
      .set(authHeader(adminToken))
      .send({ name: `E2E صنف للأنواع ${Date.now()}` })
      .expect(201);

    createdCategoryIds.push(categoryResponse.body.id);

    const typeResponse = await request(app.getHttpServer())
      .post(`/api/asset-catalog/categories/${categoryResponse.body.id}/types`)
      .set(authHeader(adminToken))
      .send({ name: 'نوع تجريبي' })
      .expect(201);

    expect(typeResponse.body.name).toBe('نوع تجريبي');
    expect(typeResponse.body.assetCategoryId).toBe(categoryResponse.body.id);
  });
});
