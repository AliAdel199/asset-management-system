import { AppShell } from "../app-shell";
import { WriteOffRequestsView } from "../write-off-requests-view";

export default function WriteOffRequestsPage() {
  return (
    <AppShell
      active="write-off-requests"
      subtitle="اعتماد الشطب"
      title="طلبات شطب الموجودات"
    >
      <WriteOffRequestsView />
    </AppShell>
  );
}
