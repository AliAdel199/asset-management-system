import { Controller, Get, Header, Query, StreamableFile } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import type { AuthenticatedUser } from '../auth/types';
import {
  buildMaintenanceExcelBuffer,
  buildMaintenancePdfBuffer,
} from './maintenance-report-export.util';
import { MaintenanceReportService } from './maintenance-report.service';

@Controller('reports/maintenance')
export class MaintenanceReportController {
  constructor(
    private readonly maintenanceReportService: MaintenanceReportService,
  ) {}

  @RequirePermissions('REPORTS_VIEW')
  @Get('summary')
  getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationUnitId') organizationUnitId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.maintenanceReportService.getSummary({
      organizationUnitId,
      from,
      to,
      allowedOrganizationUnitIds: user.allowedOrganizationUnitIds,
    });
  }

  @RequirePermissions('REPORTS_VIEW')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Get('summary/export/excel')
  async exportExcel(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationUnitId') organizationUnitId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<StreamableFile> {
    const report = await this.maintenanceReportService.getSummary({
      organizationUnitId,
      from,
      to,
      allowedOrganizationUnitIds: user.allowedOrganizationUnitIds,
    });
    const buffer = await buildMaintenanceExcelBuffer(report);

    return new StreamableFile(buffer, {
      disposition: `attachment; filename="maintenance-report-${Date.now()}.xlsx"`,
    });
  }

  @RequirePermissions('REPORTS_VIEW')
  @Header('Content-Type', 'application/pdf')
  @Get('summary/export/pdf')
  async exportPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationUnitId') organizationUnitId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<StreamableFile> {
    const report = await this.maintenanceReportService.getSummary({
      organizationUnitId,
      from,
      to,
      allowedOrganizationUnitIds: user.allowedOrganizationUnitIds,
    });
    const buffer = await buildMaintenancePdfBuffer(report);

    return new StreamableFile(buffer, {
      disposition: `attachment; filename="maintenance-report-${Date.now()}.pdf"`,
    });
  }
}
