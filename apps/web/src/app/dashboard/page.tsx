import { AppShell } from "../app-shell";
import { DashboardOverview } from "../dashboard-overview";

export default function DashboardPage() {
  return (
    <AppShell
      active="dashboard"
      subtitle="لوحة تشغيل مركزية"
      title="مؤشرات الموجودات والصيانة حسب البيانات المسجلة فعلياً"
    >
      <DashboardOverview />
    </AppShell>
  );
}
