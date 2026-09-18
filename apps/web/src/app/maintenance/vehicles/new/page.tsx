import { AppShell } from "../../../app-shell";
import { MaintenanceWorkspace } from "../../../maintenance-workspace";

export default function NewVehicleMaintenancePage() {
  return (
    <AppShell
      active="maintenance"
      subtitle="طلب صيانة سيارة"
      title="تسجيل صيانة لسيارة أو عجلة"
    >
      <MaintenanceWorkspace
        allowedCategoryCodes={["VEH"]}
        description="اختر السيارة المسجلة ثم أدخل وصف العطل والكلفة ونتيجة الصيانة."
        eyebrow="واجهة الإضافة"
        mode="create"
        redirectAfterCreate="/maintenance/vehicles"
        title="بيانات طلب صيانة السيارة"
      />
    </AppShell>
  );
}
