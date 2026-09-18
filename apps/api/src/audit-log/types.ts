export type AuditActor = {
  userId?: string | null;
  username?: string | null;
  ipAddress?: string | null;
};

export type AuditLogEntry = AuditActor & {
  action: string;
  module: string;
  entityType?: string | null;
  entityId?: string | null;
  description?: string | null;
};
