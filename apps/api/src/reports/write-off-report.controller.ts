import { Controller, Get, Header, Query, StreamableFile } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { WriteOffReportService } from './write-off-report.service';
import {
  buildWriteOffExcelBuffer,
  buildWriteOffPdfBuffer,
} from './write-off-report-export.util';

@Controller('reports/write-offs')
export class WriteOffReportController {
  constructor(private readonly writeOffReportService: WriteOffReportService) {}

  @RequirePermissions('REPORTS_VIEW')
  @Get('summary')
  getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationUnitId') organizationUnitId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.writeOffReportService.getSummary({
      organizationUnitId,
      status,
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
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<StreamableFile> {
    const report = await this.writeOffReportService.getSummary({
      organizationUnitId,
      status,
      from,
      to,
      allowedOrganizationUnitIds: user.allowedOrganizationUnitIds,
    });
    const buffer = await buildWriteOffExcelBuffer(report);

    return new StreamableFile(buffer, {
      disposition: `attachment; filename="write-off-report-${Date.now()}.xlsx"`,
    });
  }

  @RequirePermissions('REPORTS_VIEW')
  @Header('Content-Type', 'application/pdf')
  @Get('summary/export/pdf')
  async exportPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationUnitId') organizationUnitId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<StreamableFile> {
    const report = await this.writeOffReportService.getSummary({
      organizationUnitId,
      status,
      from,
      to,
      allowedOrganizationUnitIds: user.allowedOrganizationUnitIds,
    });
    const buffer = await buildWriteOffPdfBuffer(report);

    return new StreamableFile(buffer, {
      disposition: `attachment; filename="write-off-report-${Date.now()}.pdf"`,
    });
  }
}
