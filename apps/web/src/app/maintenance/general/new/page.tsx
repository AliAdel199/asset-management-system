import { AppShell } from "../../../app-shell";
import { MaintenanceWorkspace } from "../../../maintenance-workspace";

export default function NewGeneralMaintenancePage() {
  return (
    <AppShell
      active="maintenance"
      subtitle="طلب صيانة"
      title="تسجيل صيانة لجهاز أو أثاث"
    >
      <MaintenanceWorkspace
        allowedCategoryCodes={["DEV", "FUR"]}
        description="اختر جهازاً أو أثاثاً مسجلاً ثم أدخل وصف المشكلة والكلفة إن وجدت."
        eyebrow="واجهة الإضافة"
        mode="create"
        redirectAfterCreate="/maintenance/general"
        title="بيانات طلب الصيانة"
      />
    </AppShell>
  );
}
