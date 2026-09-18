// @nestjs/jwt يُنشر كحزمة ESM بحتة (package.json: "type": "module") بلا مدخل CommonJS،
// وبيئة Jest الحالية (ts-jest بدون تفعيل وضع ESM) لا تقدر تحمّلها فتفشل بخطأ
// "Cannot use import statement outside a module". هذا البديل يُستخدم فقط أثناء الاختبارات
// (عبر moduleNameMapper بكل من package.json وtest/jest-e2e.json) ولا يمس بناء أو تشغيل
// التطبيق الفعلي إطلاقاً.
//
// يستخدم توقيعاً حقيقياً عبر jsonwebtoken (حزمة CommonJS عادية بلا مشاكل) بنفس السر
// الذي يستخدمه JwtStrategy الحقيقي (عبر passport-jwt المستقل تماماً عن @nestjs/jwt) حتى
// تعمل اختبارات e2e بمصادقة حقيقية من طرف لطرف: توقيع عند تسجيل الدخول، وتحقق فعلي لاحقاً.
import { DynamicModule, Module } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

function resolveSecret(): string {
  return process.env.JWT_SECRET ?? 'dev-only-insecure-secret';
}

export class JwtService {
  signAsync(payload: object): Promise<string> {
    return Promise.resolve(
      jwt.sign(payload, resolveSecret(), { expiresIn: '12h' }),
    );
  }

  sign(payload: object): string {
    return jwt.sign(payload, resolveSecret(), { expiresIn: '12h' });
  }

  verifyAsync(token: string): Promise<unknown> {
    return Promise.resolve(jwt.verify(token, resolveSecret()));
  }
}

@Module({})
export class JwtModule {
  static register(): DynamicModule {
    return {
      module: JwtModule,
      providers: [JwtService],
      exports: [JwtService],
    };
  }
}
