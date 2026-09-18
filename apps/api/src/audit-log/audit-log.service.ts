import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogEntry } from './types';

type AuditLogFilters = {
  module?: string;
  action?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
};

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditLogEntry) {
    // فشل تسجيل التدقيق لا يجوز أن يوقف العملية الأساسية (نقل، تعديل...).
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId ?? null,
          username: entry.username ?? null,
          action: entry.action,
          module: entry.module,
          entityType: entry.entityType ?? null,
          entityId: entry.entityId ?? null,
          description: entry.description ?? null,
          ipAddress: entry.ipAddress ?? null,
        },
      });
    } catch (error) {
      this.logger.error('Failed to write audit log entry', error as Error);
    }
  }

  async findMany(filters: AuditLogFilters) {
    const take = Math.min(Math.max(filters.limit ?? 50, 1), 200);
    const hasDateRange = Boolean(filters.from || filters.to);

    const entries = await this.prisma.auditLog.findMany({
      where: {
        module: filters.module || undefined,
        action: filters.action || undefined,
        userId: filters.userId || undefined,
        entityType: filters.entityType || undefined,
        entityId: filters.entityId || undefined,
        createdAt: hasDateRange
          ? {
              gte: filters.from ? new Date(filters.from) : undefined,
              lte: filters.to ? new Date(filters.to) : undefined,
            }
          : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      skip: filters.cursor ? 1 : 0,
      cursor: filters.cursor ? { id: filters.cursor } : undefined,
      include: {
        user: {
          select: { id: true, fullName: true, username: true },
        },
      },
    });

    const hasMore = entries.length > take;
    const page = hasMore ? entries.slice(0, take) : entries;

    return {
      items: page,
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }
}
