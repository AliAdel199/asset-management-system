import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { MaintenanceService } from './maintenance.service';

@Controller('maintenance-requests')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @RequirePermissions('MAINTENANCE_VIEW')
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    // يعرض كل طلبات الصيانة مع بيانات الموجود ونوع الصيانة.
    return this.maintenanceService.findAll(user.allowedOrganizationUnitIds);
  }

  @RequirePermissions('MAINTENANCE_VIEW')
  @Get('alerts')
  getAlerts(@CurrentUser() user: AuthenticatedUser) {
    // يجب أن يسبق هذا المسار @Get(':id') وإلا التقط ':id' كلمة "alerts" كمعرف.
    return this.maintenanceService.getAlerts(user.allowedOrganizationUnitIds);
  }

  @RequirePermissions('MAINTENANCE_VIEW')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.maintenanceService.findOne(id, user.allowedOrganizationUnitIds);
  }

  @RequirePermissions('MAINTENANCE_CREATE')
  @Post()
  create(
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    // يستقبل طلب الصيانة من الواجهة ويترك التحقق والحفظ للخدمة.
    return this.maintenanceService.create(body as Record<string, unknown>, {
      userId: user.id,
      username: user.username,
      ipAddress: request.ip,
    });
  }

  @RequirePermissions('MAINTENANCE_UPDATE_STATUS')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    // يحدث حالة الطلب مع نتيجة الصيانة وتاريخ التنفيذ عند الإكمال.
    return this.maintenanceService.updateStatus(
      id,
      body as Record<string, unknown>,
      { userId: user.id, username: user.username, ipAddress: request.ip },
    );
  }
}
