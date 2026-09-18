import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
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

  private toActor(user: AuthenticatedUser, request: Request) {
    return { userId: user.id, username: user.username, ipAddress: request.ip };
  }

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
      this.toActor(user, request),
    );
  }

  @RequirePermissions('ORG_UNITS_MANAGE')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.organizationUnitsService.update(
      id,
      body as Record<string, unknown>,
      this.toActor(user, request),
    );
  }

  @RequirePermissions('ORG_UNITS_MANAGE')
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.organizationUnitsService.remove(
      id,
      this.toActor(user, request),
    );
  }
}
