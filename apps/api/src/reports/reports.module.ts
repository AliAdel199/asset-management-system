import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MaintenanceReportController } from './maintenance-report.controller';
import { MaintenanceReportService } from './maintenance-report.service';
import { MovementReportController } from './movement-report.controller';
import { MovementReportService } from './movement-report.service';
import { WriteOffReportController } from './write-off-report.controller';
import { WriteOffReportService } from './write-off-report.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    MaintenanceReportController,
    MovementReportController,
    WriteOffReportController,
  ],
  providers: [
    MaintenanceReportService,
    MovementReportService,
    WriteOffReportService,
  ],
})
export class ReportsModule {}
