import { Injectable } from '@nestjs/common';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { TransferRequestsService } from '../transfer-requests/transfer-requests.service';
import { WriteOffRequestsService } from '../write-off-requests/write-off-requests.service';

export type PendingApprovalsCount = {
  transferRequests: number;
  writeOffRequests: number;
  maintenanceRequests: number;
  total: number;
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly transferRequestsService: TransferRequestsService,
    private readonly writeOffRequestsService: WriteOffRequestsService,
    private readonly maintenanceService: MaintenanceService,
  ) {}

  async getPendingApprovalsCount(
    permissions: Set<string>,
    allowedOrganizationUnitIds: string[] | null,
  ): Promise<PendingApprovalsCount> {
    // كل عدّاد يُحسب فقط إذا كان المستخدم يملك صلاحية الاعتماد المرتبطة به، حتى لا يُظهر
    // للمستخدم عدد طلبات لا يملك أصلاً صلاحية رؤيتها أو البت بها.
    const [transferRequests, writeOffRequests, maintenanceRequests] =
      await Promise.all([
        permissions.has('ASSETS_TRANSFER_APPROVE')
          ? this.transferRequestsService.countPending(
              allowedOrganizationUnitIds,
            )
          : 0,
        permissions.has('ASSETS_WRITEOFF_APPROVE')
          ? this.writeOffRequestsService.countPending(
              allowedOrganizationUnitIds,
            )
          : 0,
        permissions.has('MAINTENANCE_APPROVE')
          ? this.maintenanceService.countPending(allowedOrganizationUnitIds)
          : 0,
      ]);

    return {
      transferRequests,
      writeOffRequests,
      maintenanceRequests,
      total: transferRequests + writeOffRequests + maintenanceRequests,
    };
  }
}
