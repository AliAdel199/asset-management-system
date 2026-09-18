import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermissions } from '../auth/permissions.decorator';
import { AuditLogService } from './audit-log.service';

@Controller('audit-log')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @RequirePermissions('AUDIT_LOG_VIEW')
  @Get()
  findMany(@Query() query: Record<string, string>) {
    return this.auditLogService.findMany({
      module: query.module,
      action: query.action,
      userId: query.userId,
      entityType: query.entityType,
      entityId: query.entityId,
      from: query.from,
      to: query.to,
      limit: query.limit ? Number(query.limit) : undefined,
      cursor: query.cursor,
    });
  }
}
