import { AppShell } from "../../app-shell";
import { AssetsWorkspace } from "../../assets-workspace";

export default function NewVehiclePage() {
  return (
    <AppShell
      active="vehicles"
      subtitle="إضافة سيارة"
      title="تسجيل سيارة أو عجلة جديدة"
    >
      <AssetsWorkspace
        allowedCategoryCodes={["VEH"]}
        description="هذه الواجهة مخصصة لإضافة السيارات فقط. بعد الحفظ يرجع النظام إلى سجل السيارات."
        eyebrow="واجهة الإضافة"
        mode="create"
        redirectAfterCreate="/vehicles"
        title="بيانات السيارة"
      />
    </AppShell>
  );
}
