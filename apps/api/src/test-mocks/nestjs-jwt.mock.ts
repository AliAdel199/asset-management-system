// @nestjs/jwt يُنشر كحزمة ESM بحتة (package.json: "type": "module") بلا مدخل CommonJS،
// وبيئة Jest الحالية (ts-jest بدون تفعيل وضع ESM) لا تقدر تحمّلها فتفشل بخطأ
// "Cannot use import statement outside a module". هذا البديل يُستخدم فقط أثناء الاختبارات
// (عبر moduleNameMapper في package.json) ولا يمس بناء أو تشغيل التطبيق الفعلي إطلاقاً.
export class JwtService {
  signAsync(): Promise<string> {
    return Promise.resolve('mock-jwt-token');
  }

  sign(): string {
    return 'mock-jwt-token';
  }

  verifyAsync(): Promise<unknown> {
    return Promise.resolve({});
  }
}
