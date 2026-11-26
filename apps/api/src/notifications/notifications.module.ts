import { Module } from '@nestjs/common';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { TransferRequestsModule } from '../transfer-requests/transfer-requests.module';
import { WriteOffRequestsModule } from '../write-off-requests/write-off-requests.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [TransferRequestsModule, WriteOffRequestsModule, MaintenanceModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
