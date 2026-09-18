import { Controller, Get, Header, Query, StreamableFile } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import type { AuthenticatedUser } from '../auth/types';
import {
  buildMovementExcelBuffer,
  buildMovementPdfBuffer,
} from './movement-report-export.util';
import { MovementReportService } from './movement-report.service';

@Controller('reports/movements')
export class MovementReportController {
  constructor(private readonly movementReportService: MovementReportService) {}

  @RequirePermissions('REPORTS_VIEW')
  @Get('summary')
  getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationUnitId') organizationUnitId?: string,
    @Query('movementType') movementType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.movementReportService.getSummary({
      organizationUnitId,
      movementType,
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
    @Query('movementType') movementType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<StreamableFile> {
    const report = await this.movementReportService.getSummary({
      organizationUnitId,
      movementType,
      from,
      to,
      allowedOrganizationUnitIds: user.allowedOrganizationUnitIds,
    });
    const buffer = await buildMovementExcelBuffer(report);

    return new StreamableFile(buffer, {
      disposition: `attachment; filename="movements-report-${Date.now()}.xlsx"`,
    });
  }

  @RequirePermissions('REPORTS_VIEW')
  @Header('Content-Type', 'application/pdf')
  @Get('summary/export/pdf')
  async exportPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationUnitId') organizationUnitId?: string,
    @Query('movementType') movementType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<StreamableFile> {
    const report = await this.movementReportService.getSummary({
      organizationUnitId,
      movementType,
      from,
      to,
      allowedOrganizationUnitIds: user.allowedOrganizationUnitIds,
    });
    const buffer = await buildMovementPdfBuffer(report);

    return new StreamableFile(buffer, {
      disposition: `attachment; filename="movements-report-${Date.now()}.pdf"`,
    });
  }
}
