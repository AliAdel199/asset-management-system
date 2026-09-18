import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WriteOffRequestsController } from './write-off-requests.controller';
import { WriteOffRequestsService } from './write-off-requests.service';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [WriteOffRequestsController],
  providers: [WriteOffRequestsService],
})
export class WriteOffRequestsModule {}
