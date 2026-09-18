import { AppShell } from "../app-shell";
import { AuditLogView } from "../audit-log-view";

export default function AuditLogPage() {
  return (
    <AppShell
      active="audit-log"
      subtitle="سجل التدقيق"
      title="سجل العمليات المؤثرة على النظام"
    >
      <AuditLogView />
    </AppShell>
  );
}
