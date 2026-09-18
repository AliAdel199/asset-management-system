import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TransferRequestsController } from './transfer-requests.controller';
import { TransferRequestsService } from './transfer-requests.service';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [TransferRequestsController],
  providers: [TransferRequestsService],
})
export class TransferRequestsModule {}
