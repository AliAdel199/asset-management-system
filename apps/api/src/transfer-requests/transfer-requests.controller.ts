import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { TransferRequestsService } from './transfer-requests.service';

@Controller('transfer-requests')
export class TransferRequestsController {
  constructor(
    private readonly transferRequestsService: TransferRequestsService,
  ) {}

  @RequirePermissions('ASSETS_TRANSFER_APPROVE')
  @Get()
  findMany(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
  ) {
    return this.transferRequestsService.findMany(
      user.allowedOrganizationUnitIds,
      status,
    );
  }

  @RequirePermissions('ASSETS_TRANSFER_APPROVE')
  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.transferRequestsService.approve(id, {
      userId: user.id,
      username: user.username,
      ipAddress: request.ip,
    });
  }

  @RequirePermissions('ASSETS_TRANSFER_APPROVE')
  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.transferRequestsService.reject(id, body?.notes, {
      userId: user.id,
      username: user.username,
      ipAddress: request.ip,
    });
  }
}
