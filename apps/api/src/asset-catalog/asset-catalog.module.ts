import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AssetCatalogController } from './asset-catalog.controller';
import { AssetCatalogService } from './asset-catalog.service';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [AssetCatalogController],
  providers: [AssetCatalogService],
})
export class AssetCatalogModule {}
