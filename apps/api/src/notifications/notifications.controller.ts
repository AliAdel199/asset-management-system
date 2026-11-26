import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('pending-approvals')
  getPendingApprovals(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getPendingApprovalsCount(
      user.permissions,
      user.allowedOrganizationUnitIds,
    );
  }
}
