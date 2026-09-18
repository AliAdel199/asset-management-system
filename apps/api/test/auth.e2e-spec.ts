import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  authHeader,
  bootstrapTestApp,
  loginAs,
  SEED_PASSWORD,
} from './utils/bootstrap-app';

describe('Auth & permissions (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await bootstrapTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a login with a wrong password', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong-password' })
      .expect(401);
  });

  it('rejects a login for a nonexistent user', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'no-such-user', password: SEED_PASSWORD })
      .expect(401);
  });

  it('logs in a seed user and returns an access token with a full permission profile', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: SEED_PASSWORD })
      .expect(201);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.user.username).toBe('admin');
    expect(response.body.user.hasFullAccess).toBe(true);
    expect(response.body.user.permissions).toEqual(
      expect.arrayContaining(['ASSETS_VIEW', 'USERS_MANAGE']),
    );
  });

  it('rejects a request with no access token', async () => {
    await request(app.getHttpServer()).get('/api/assets').expect(401);
  });

  it('rejects a request from a user lacking the required permission', async () => {
    // "مستخدم جهة" (unit.user) يملك ASSETS_VIEW وREPORTS_VIEW فقط - لا يملك ASSETS_CREATE.
    const token = await loginAs(app, 'unit.user');

    await request(app.getHttpServer())
      .post('/api/assets')
      .set(authHeader(token))
      .send({})
      .expect(403);
  });

  it("scopes list results to the caller's organization unit for a unit-scoped role", async () => {
    // assets.officer بدور "مسؤول موجودات" (scopeLevel: unit) على جهة IT فقط.
    const officerToken = await loginAs(app, 'assets.officer');

    const scopedResponse = await request(app.getHttpServer())
      .get('/api/assets')
      .set(authHeader(officerToken))
      .expect(200);

    const ownerCodes = new Set(
      (
        scopedResponse.body as Array<{
          owningOrganizationUnit: { code: string };
        }>
      ).map((asset) => asset.owningOrganizationUnit.code),
    );

    expect([...ownerCodes].every((code) => code === 'IT')).toBe(true);

    // مسؤول النظام (نطاق مركزي) يجب أن يرى نفس الموجودات على الأقل بدون أي فلترة.
    const adminToken = await loginAs(app, 'admin');
    const fullResponse = await request(app.getHttpServer())
      .get('/api/assets')
      .set(authHeader(adminToken))
      .expect(200);

    expect(fullResponse.body.length).toBeGreaterThanOrEqual(
      scopedResponse.body.length,
    );
  });
});
