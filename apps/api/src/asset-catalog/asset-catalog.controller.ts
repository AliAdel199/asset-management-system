import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { AssetCatalogService } from './asset-catalog.service';

@Controller('asset-catalog')
@RequirePermissions('ASSET_CATALOG_MANAGE')
export class AssetCatalogController {
  constructor(private readonly assetCatalogService: AssetCatalogService) {}

  private toActor(user: AuthenticatedUser, request: Request) {
    return { userId: user.id, username: user.username, ipAddress: request.ip };
  }

  @Get()
  findAll() {
    return this.assetCatalogService.findAll();
  }

  @Post('categories')
  createCategory(
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.assetCatalogService.createCategory(
      body as Record<string, unknown>,
      this.toActor(user, request),
    );
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.assetCatalogService.updateCategory(
      id,
      body as Record<string, unknown>,
      this.toActor(user, request),
    );
  }

  @Delete('categories/:id')
  removeCategory(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.assetCatalogService.removeCategory(
      id,
      this.toActor(user, request),
    );
  }

  @Post('categories/:categoryId/types')
  createType(
    @Param('categoryId') categoryId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.assetCatalogService.createType(
      categoryId,
      body as Record<string, unknown>,
      this.toActor(user, request),
    );
  }

  @Patch('types/:id')
  updateType(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.assetCatalogService.updateType(
      id,
      body as Record<string, unknown>,
      this.toActor(user, request),
    );
  }

  @Delete('types/:id')
  removeType(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.assetCatalogService.removeType(id, this.toActor(user, request));
  }
}
