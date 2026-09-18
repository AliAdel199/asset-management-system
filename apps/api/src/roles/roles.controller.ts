import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  private toActor(user: AuthenticatedUser, request: Request) {
    return { userId: user.id, username: user.username, ipAddress: request.ip };
  }

  @RequirePermissions('USERS_MANAGE', 'ROLES_MANAGE')
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @RequirePermissions('ROLES_MANAGE')
  @Get('permissions')
  findAllPermissions() {
    return this.rolesService.findAllPermissions();
  }

  @RequirePermissions('ROLES_MANAGE')
  @Post()
  create(
    @Body() body: CreateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.rolesService.create(body, this.toActor(user, request));
  }

  @RequirePermissions('ROLES_MANAGE')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.rolesService.update(id, body, this.toActor(user, request));
  }
}
