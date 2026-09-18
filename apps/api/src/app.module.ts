import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssetCatalogModule } from './asset-catalog/asset-catalog.module';
import { AssetsModule } from './assets/assets.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PermissionsGuard } from './auth/permissions.guard';
import { DashboardModule } from './dashboard/dashboard.module';
import { InventoryModule } from './inventory/inventory.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { OrganizationUnitsModule } from './organization-units/organization-units.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReferenceDataModule } from './reference-data/reference-data.module';
import { RolesModule } from './roles/roles.module';
import { TransferRequestsModule } from './transfer-requests/transfer-requests.module';
import { UsersModule } from './users/users.module';
import { WriteOffRequestsModule } from './write-off-requests/write-off-requests.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AuditLogModule,
    AssetCatalogModule,
    AssetsModule,
    DashboardModule,
    InventoryModule,
    MaintenanceModule,
    OrganizationUnitsModule,
    ReferenceDataModule,
    RolesModule,
    TransferRequestsModule,
    UsersModule,
    WriteOffRequestsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
