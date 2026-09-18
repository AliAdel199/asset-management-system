import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [AssetsController],
  providers: [AssetsService],
})
export class AssetsModule {}
