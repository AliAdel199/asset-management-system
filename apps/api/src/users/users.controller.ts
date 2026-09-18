import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private toActor(user: AuthenticatedUser, request: Request) {
    return { userId: user.id, username: user.username, ipAddress: request.ip };
  }

  @RequirePermissions('USERS_MANAGE')
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @RequirePermissions('USERS_MANAGE')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @RequirePermissions('USERS_MANAGE')
  @Post()
  create(
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.usersService.create(
      body as Record<string, unknown>,
      this.toActor(user, request),
    );
  }

  @RequirePermissions('USERS_MANAGE')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.usersService.update(
      id,
      body as Record<string, unknown>,
      this.toActor(user, request),
    );
  }
}
