import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import type { AuthenticatedUser } from '../auth/types';
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
}
