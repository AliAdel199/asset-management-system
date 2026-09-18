import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import type { AuthenticatedUser } from '../auth/types';
import type { AuditActor } from '../audit-log/types';
import { attachmentMulterOptions } from './attachment-storage';
import { AssetsService } from './assets.service';
import { AddAssetAttachmentDto } from './dto/add-asset-attachment.dto';
import { AssignAssetDto } from './dto/assign-asset.dto';
import { ChangeAssetStatusDto } from './dto/change-asset-status.dto';
import { CreateAssetDto } from './dto/create-asset.dto';
import { DeactivateAssetDto } from './dto/deactivate-asset.dto';
import { MoveAssetDto } from './dto/move-asset.dto';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  private toActor(user: AuthenticatedUser, request: Request): AuditActor {
    return { userId: user.id, username: user.username, ipAddress: request.ip };
  }

  @RequirePermissions('ASSETS_VIEW')
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.assetsService.findAll(user.allowedOrganizationUnitIds);
  }

  @RequirePermissions('ASSETS_VIEW')
  @Get('archive')
  findArchived(@CurrentUser() user: AuthenticatedUser) {
    return this.assetsService.findArchived(user.allowedOrganizationUnitIds);
  }

  @RequirePermissions('ASSETS_VIEW')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.assetsService.findOne(id, user.allowedOrganizationUnitIds);
  }

  @RequirePermissions('ASSETS_CREATE')
  @Post()
  create(
    @Body() body: CreateAssetDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.assetsService.create(body, this.toActor(user, request));
  }

  @RequirePermissions('ASSETS_DEACTIVATE')
  @Patch(':id/deactivate')
  requestWriteOff(
    @Param('id') id: string,
    @Body() body: DeactivateAssetDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.assetsService.requestWriteOff(
      id,
      body,
      this.toActor(user, request),
    );
  }

  @RequirePermissions('ASSETS_UPDATE')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: CreateAssetDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.assetsService.update(id, body, this.toActor(user, request));
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
    return this.assetsService.addAttachment(
      id,
      body,
      file,
      this.toActor(user, request),
    );
  }

  @RequirePermissions('ASSETS_TRANSFER')
  @Post(':id/movements/transfer')
  move(
    @Param('id') id: string,
    @Body() body: MoveAssetDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.assetsService.move(id, body, this.toActor(user, request));
  }

  @RequirePermissions('ASSETS_ASSIGN')
  @Post(':id/movements/assign')
  assign(
    @Param('id') id: string,
    @Body() body: AssignAssetDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.assetsService.assign(id, body, this.toActor(user, request));
  }

  @RequirePermissions('ASSETS_CHANGE_STATUS')
  @Post(':id/movements/status')
  changeStatus(
    @Param('id') id: string,
    @Body() body: ChangeAssetStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.assetsService.changeStatus(
      id,
      body,
      this.toActor(user, request),
    );
  }
}
