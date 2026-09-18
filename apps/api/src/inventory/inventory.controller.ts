import { Controller, Get, Header, Query, StreamableFile } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import type { AuthenticatedUser } from '../auth/types';
import {
  buildInventoryExcelBuffer,
  buildInventoryPdfBuffer,
} from './inventory-export.util';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @RequirePermissions('REPORTS_VIEW')
  @Get('summary')
  getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationUnitId') organizationUnitId?: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.inventoryService.getSummary({
      organizationUnitId,
      includeArchived: includeArchived === 'true',
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
    @Query('includeArchived') includeArchived?: string,
  ): Promise<StreamableFile> {
    const summary = await this.inventoryService.getSummary({
      organizationUnitId,
      includeArchived: includeArchived === 'true',
      allowedOrganizationUnitIds: user.allowedOrganizationUnitIds,
    });
    const buffer = await buildInventoryExcelBuffer(summary);

    return new StreamableFile(buffer, {
      disposition: `attachment; filename="inventory-report-${Date.now()}.xlsx"`,
    });
  }

  @RequirePermissions('REPORTS_VIEW')
  @Header('Content-Type', 'application/pdf')
  @Get('summary/export/pdf')
  async exportPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationUnitId') organizationUnitId?: string,
    @Query('includeArchived') includeArchived?: string,
  ): Promise<StreamableFile> {
    const summary = await this.inventoryService.getSummary({
      organizationUnitId,
      includeArchived: includeArchived === 'true',
      allowedOrganizationUnitIds: user.allowedOrganizationUnitIds,
    });
    const buffer = await buildInventoryPdfBuffer(summary);

    return new StreamableFile(buffer, {
      disposition: `attachment; filename="inventory-report-${Date.now()}.pdf"`,
    });
  }
}
