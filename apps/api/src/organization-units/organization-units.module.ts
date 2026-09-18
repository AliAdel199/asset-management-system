import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OrganizationUnitsController } from './organization-units.controller';
import { OrganizationUnitsService } from './organization-units.service';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [OrganizationUnitsController],
  providers: [OrganizationUnitsService],
})
export class OrganizationUnitsModule {}
