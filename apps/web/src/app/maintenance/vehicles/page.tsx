import Link from "next/link";
import { AppShell } from "../../app-shell";
import { MaintenanceWorkspace } from "../../maintenance-workspace";
import styles from "../../page.module.css";

export default function VehicleMaintenancePage() {
  return (
    <AppShell
      active="maintenance"
      subtitle="صيانة السيارات"
      title="طلبات صيانة السيارات والعجلات"
    >
      <section className={styles.quickActions} aria-label="إجراءات الصيانة">
        <Link href="/maintenance/vehicles/new">إضافة طلب صيانة سيارة</Link>
        <span>هذه الواجهة تعرض طلبات صيانة السيارات فقط</span>
      </section>

      <MaintenanceWorkspace
        allowedCategoryCodes={["VEH"]}
        description="طلبات الصيانة المرتبطة بالسيارات والعجلات الحكومية."
        eyebrow="واجهة العرض"
        mode="list"
        title="سجل صيانة السيارات"
      />
    </AppShell>
  );
}
