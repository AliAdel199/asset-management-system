import Link from "next/link";
import { AppShell } from "../../app-shell";
import { MaintenanceWorkspace } from "../../maintenance-workspace";
import styles from "../../page.module.css";

export default function PropertyMaintenancePage() {
  return (
    <AppShell
      active="maintenance"
      subtitle="صيانة العقار والمباني"
      title="طلبات صيانة العقارات والمباني"
    >
      <section className={styles.quickActions} aria-label="إجراءات الصيانة">
        <Link href="/maintenance/properties/new">إضافة طلب صيانة عقار</Link>
        <span>هذه الواجهة تعرض طلبات صيانة العقار والمباني فقط</span>
      </section>

      <MaintenanceWorkspace
        allowedCategoryCodes={["LND", "BLD"]}
        description="طلبات الصيانة المرتبطة بالأراضي والعقار والمباني."
        eyebrow="واجهة العرض"
        mode="list"
        title="سجل صيانة العقار والمباني"
      />
    </AppShell>
  );
}
