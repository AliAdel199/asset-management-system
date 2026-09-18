import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { attachmentMulterOptions } from '../assets/attachment-storage';
import { AddAssetAttachmentDto } from '../assets/dto/add-asset-attachment.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { RejectWriteOffRequestDto } from './dto/reject-write-off-request.dto';
import { WriteOffRequestsService } from './write-off-requests.service';

@Controller('write-off-requests')
export class WriteOffRequestsController {
  constructor(
    private readonly writeOffRequestsService: WriteOffRequestsService,
  ) {}

  @RequirePermissions('ASSETS_WRITEOFF_APPROVE')
  @Get()
  findMany(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
  ) {
    return this.writeOffRequestsService.findMany(
      user.allowedOrganizationUnitIds,
      status,
    );
  }

  @RequirePermissions('ASSETS_WRITEOFF_APPROVE')
  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.writeOffRequestsService.approve(
      id,
      { userId: user.id, username: user.username, ipAddress: request.ip },
      user.allowedOrganizationUnitIds,
    );
  }

  @RequirePermissions('ASSETS_WRITEOFF_APPROVE')
  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() body: RejectWriteOffRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.writeOffRequestsService.reject(
      id,
      body?.notes,
      { userId: user.id, username: user.username, ipAddress: request.ip },
      user.allowedOrganizationUnitIds,
    );
  }

  @RequirePermissions('ASSETS_ATTACHMENTS_UPLOAD')
  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file', attachmentMulterOptions))
  addAttachment(
    @Param('id') id: string,
    @Body() body: AddAssetAttachmentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.writeOffRequestsService.addAttachment(id, body, file, {
      userId: user.id,
      username: user.username,
      ipAddress: request.ip,
    });
  }
}
