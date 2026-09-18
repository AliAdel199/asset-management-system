import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { ReferenceDataService } from './reference-data.service';

@Controller('reference-data')
export class ReferenceDataController {
  constructor(private readonly referenceDataService: ReferenceDataService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.referenceDataService.findAll(user.allowedOrganizationUnitIds);
  }
}
