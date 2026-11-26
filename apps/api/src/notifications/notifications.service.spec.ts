import { NotificationsService } from './notifications.service';

function createService() {
  const transferRequestsService = { countPending: jest.fn() };
  const writeOffRequestsService = { countPending: jest.fn() };
  const maintenanceService = { countPending: jest.fn() };

  const service = new NotificationsService(
    transferRequestsService as any,
    writeOffRequestsService as any,
    maintenanceService as any,
  );

  return {
    service,
    transferRequestsService,
    writeOffRequestsService,
    maintenanceService,
  };
}

describe('NotificationsService.getPendingApprovalsCount', () => {
  it('only counts request types the user actually has approval permission for', async () => {
    const {
      service,
      transferRequestsService,
      writeOffRequestsService,
      maintenanceService,
    } = createService();
    transferRequestsService.countPending.mockResolvedValue(5);
    writeOffRequestsService.countPending.mockResolvedValue(2);
    maintenanceService.countPending.mockResolvedValue(9);

    const result = await service.getPendingApprovalsCount(
      new Set(['ASSETS_TRANSFER_APPROVE']),
      ['unit-a'],
    );

    expect(result).toEqual({
      transferRequests: 5,
      writeOffRequests: 0,
      maintenanceRequests: 0,
      total: 5,
    });
    expect(transferRequestsService.countPending).toHaveBeenCalledWith([
      'unit-a',
    ]);
    expect(writeOffRequestsService.countPending).not.toHaveBeenCalled();
    expect(maintenanceService.countPending).not.toHaveBeenCalled();
  });

  it('sums all three counts when the user has every approval permission', async () => {
    const {
      service,
      transferRequestsService,
      writeOffRequestsService,
      maintenanceService,
    } = createService();
    transferRequestsService.countPending.mockResolvedValue(1);
    writeOffRequestsService.countPending.mockResolvedValue(2);
    maintenanceService.countPending.mockResolvedValue(3);

    const result = await service.getPendingApprovalsCount(
      new Set([
        'ASSETS_TRANSFER_APPROVE',
        'ASSETS_WRITEOFF_APPROVE',
        'MAINTENANCE_APPROVE',
      ]),
      null,
    );

    expect(result).toEqual({
      transferRequests: 1,
      writeOffRequests: 2,
      maintenanceRequests: 3,
      total: 6,
    });
  });

  it('returns all zeros when the user has none of the approval permissions', async () => {
    const {
      service,
      transferRequestsService,
      writeOffRequestsService,
      maintenanceService,
    } = createService();

    const result = await service.getPendingApprovalsCount(new Set(), null);

    expect(result).toEqual({
      transferRequests: 0,
      writeOffRequests: 0,
      maintenanceRequests: 0,
      total: 0,
    });
    expect(transferRequestsService.countPending).not.toHaveBeenCalled();
    expect(writeOffRequestsService.countPending).not.toHaveBeenCalled();
    expect(maintenanceService.countPending).not.toHaveBeenCalled();
  });
});
