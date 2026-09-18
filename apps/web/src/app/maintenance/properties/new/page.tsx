import { AppShell } from "../../../app-shell";
import { MaintenanceWorkspace } from "../../../maintenance-workspace";

export default function NewPropertyMaintenancePage() {
  return (
    <AppShell
      active="maintenance"
      subtitle="طلب صيانة عقار"
      title="تسجيل صيانة لعقار أو مبنى"
    >
      <MaintenanceWorkspace
        allowedCategoryCodes={["LND", "BLD"]}
        description="اختر العقار أو المبنى المسجل ثم أدخل وصف المشكلة والكلفة ونتيجة الصيانة."
        eyebrow="واجهة الإضافة"
        mode="create"
        redirectAfterCreate="/maintenance/properties"
        title="بيانات طلب صيانة العقار"
      />
    </AppShell>
  );
}
