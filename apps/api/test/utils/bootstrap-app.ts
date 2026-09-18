import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

export async function bootstrapTestApp(): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  // يطابق app.setGlobalPrefix('api') وapp.useGlobalPipes(...) المستخدمين فعلياً بـ main.ts
  // حتى يبقى سلوك التحقق من المدخلات في اختبارات e2e مطابقاً للتطبيق الحقيقي.
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  return app;
}

export const SEED_PASSWORD = 'Passw0rd!2026';

export async function loginAs(
  app: INestApplication,
  username: string,
  password: string = SEED_PASSWORD,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ username, password })
    .expect(201);

  return response.body.accessToken as string;
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
