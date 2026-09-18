import { AppShell } from "../app-shell";
import { InventoryReport } from "../inventory-report";

export default function ReportsPage() {
  return (
    <AppShell
      active="reports"
      subtitle="التقارير"
      title="مركز التقارير حسب الجهة والتصنيف والحالة والصيانة"
    >
      <InventoryReport />
    </AppShell>
  );
}
