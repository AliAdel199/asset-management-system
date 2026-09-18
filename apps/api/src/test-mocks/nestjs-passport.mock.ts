// @nestjs/passport يُنشر كحزمة ESM بحتة (نفس مشكلة @nestjs/jwt أعلاه)، بينما `passport`
// و`passport-jwt` حزمتان CommonJS عاديتان بلا أي مشكلة. هذا البديل (مُستخدم فقط عبر
// moduleNameMapper بالاختبارات) يعيد تطبيق نفس السلوك الفعلي لـ @nestjs/passport بالاعتماد
// على حزمة passport الحقيقية مباشرة، بدل إعادة تنفيذ passport-jwt نفسها:
// - PassportStrategy: يربط نمط callback الخاص بـ passport-jwt (payload, done) بدالة
//   validate غير المتزامنة، ويسجّل الاستراتيجية باسمها الحقيقي (jwt) لدى passport.
// - AuthGuard: يستدعي passport.authenticate الحقيقي بنفس الاسم المستخدم فعلياً بالتطبيق.
import {
  ExecutionContext,
  Injectable,
  Module,
  UnauthorizedException,
} from '@nestjs/common';
import passport = require('passport');

@Module({})
export class PassportModule {}

type AnyConstructor = new (...args: any[]) => any;

export function PassportStrategy(
  Strategy: AnyConstructor,
  name?: string,
): AnyConstructor {
  class MixinStrategy extends Strategy {
    constructor(...args: any[]) {
      const verifyCallback = async (...callbackArgs: any[]) => {
        const done = callbackArgs[callbackArgs.length - 1];
        const validateArgs = callbackArgs.slice(0, -1);

        try {
          const result = await (this as any).validate(...validateArgs);
          done(null, result);
        } catch (error) {
          done(error, null);
        }
      };

      super(...args, verifyCallback);
      passport.use(name ?? (this as any).name ?? 'jwt', this as any);
    }
  }

  return MixinStrategy;
}

@Injectable()
class BaseAuthGuard {
  constructor(private readonly strategyName: string) {}

  canActivate(context: ExecutionContext): Promise<boolean> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();

    return new Promise((resolve, reject) => {
      passport.authenticate(
        this.strategyName,
        { session: false },
        (error: unknown, user: unknown) => {
          if (error || !user) {
            reject(
              error instanceof Error ? error : new UnauthorizedException(),
            );
            return;
          }

          request.user = user;
          resolve(true);
        },
      )(request, response, (error: unknown) => {
        if (error) {
          reject(error instanceof Error ? error : new UnauthorizedException());
        }
      });
    });
  }
}

export function AuthGuard(type: string): AnyConstructor {
  return class extends BaseAuthGuard {
    constructor() {
      super(type);
    }
  };
}
