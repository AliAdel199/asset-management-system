import 'dotenv/config';
import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';

function resolveAllowedOrigins(): string[] {
  const configured = process.env.WEB_APP_ORIGINS;

  if (!configured) {
    // قيمة افتراضية للتطوير المحلي فقط؛ أي بيئة إنتاج فعلية يجب أن تحدد WEB_APP_ORIGINS صراحةً.
    return ['http://localhost:3000'];
  }

  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(
    helmet({
      // API بدون HTML؛ CSP الافتراضي مخصص لصفحات ويب وليس له فائدة هنا وقد يعطّل أدوات مثل Swagger لاحقًا.
      contentSecurityPolicy: false,
      // المرفقات تُخدم من أصل مختلف عن واجهة الويب (منفذ مختلف)، فيجب السماح بتحميلها من أصل آخر.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: resolveAllowedOrigins(),
  });
  // ملفات المرفقات المرفوعة تُخدم مباشرة كملفات ثابتة، خارج بادئة /api.
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
