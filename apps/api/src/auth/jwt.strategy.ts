import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { AuthenticatedUser } from './types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-only-insecure-secret',
    });
  }

  async validate(payload: { sub?: string }): Promise<AuthenticatedUser> {
    if (!payload.sub) {
      throw new UnauthorizedException('رمز الدخول غير صالح.');
    }

    const authenticatedUser = await this.authService.loadAuthenticatedUser(
      payload.sub,
    );

    if (!authenticatedUser) {
      throw new UnauthorizedException('المستخدم غير موجود أو معطل.');
    }

    return authenticatedUser;
  }
}
