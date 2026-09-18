import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { OrganizationUnitsService } from './organization-units.service';

@Controller('organization-units')
export class OrganizationUnitsController {
  constructor(
    private readonly organizationUnitsService: OrganizationUnitsService,
  ) {}

  @Get()
  findAll() {
    // قائمة مرجعية عامة (لاختيار الجهات ضمن نماذج النقل والتسجيل)، متاحة لأي مستخدم مسجل دخوله.
    return this.organizationUnitsService.findAll();
  }

  @RequirePermissions('ORG_UNITS_MANAGE')
  @Post()
  create(
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.organizationUnitsService.create(
      body as Record<string, unknown>,
      { userId: user.id, username: user.username, ipAddress: request.ip },
    );
  }
}
