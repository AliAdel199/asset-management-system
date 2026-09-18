import { AppShell } from "../app-shell";
import { TransferRequestsView } from "../transfer-requests-view";

export default function TransferRequestsPage() {
  return (
    <AppShell
      active="transfer-requests"
      subtitle="اعتماد النقل"
      title="طلبات نقل الموجودات بين الجهات"
    >
      <TransferRequestsView />
    </AppShell>
  );
}
