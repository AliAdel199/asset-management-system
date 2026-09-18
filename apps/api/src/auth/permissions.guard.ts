import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { REQUIRED_PERMISSIONS_KEY } from './permissions.decorator';
import { AuthenticatedUser } from './types';

type RequestWithUser = Request & { user?: AuthenticatedUser };

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (
      !user ||
      !requiredPermissions.some((code) => user.permissions.has(code))
    ) {
      throw new ForbiddenException('لا تملك صلاحية تنفيذ هذا الإجراء.');
    }

    return true;
  }
}
