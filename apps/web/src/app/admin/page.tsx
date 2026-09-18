import { AppShell } from "../app-shell";
import { AdminWorkspace } from "../admin-workspace";

export default function AdminPage() {
  return (
    <AppShell
      active="admin"
      subtitle="الإدارة"
      title="إدارة المستخدمين والصلاحيات والهيكل الإداري وأصناف الموجودات"
    >
      <AdminWorkspace />
    </AppShell>
  );
}
