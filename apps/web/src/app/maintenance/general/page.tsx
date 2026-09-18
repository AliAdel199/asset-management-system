import Link from "next/link";
import { AppShell } from "../../app-shell";
import { MaintenanceWorkspace } from "../../maintenance-workspace";
import styles from "../../page.module.css";

export default function GeneralMaintenancePage() {
  return (
    <AppShell
      active="maintenance"
      subtitle="صيانة الموجودات العامة"
      title="طلبات صيانة الأجهزة والأثاث"
    >
      <section className={styles.quickActions} aria-label="إجراءات الصيانة">
        <Link href="/maintenance/general/new">إضافة طلب صيانة</Link>
        <span>هذه الواجهة تعرض طلبات صيانة الأجهزة والأثاث فقط</span>
      </section>

      <MaintenanceWorkspace
        allowedCategoryCodes={["DEV", "FUR"]}
        description="طلبات الصيانة المرتبطة بالأجهزة والأثاث والموجودات العامة."
        eyebrow="واجهة العرض"
        mode="list"
        title="سجل صيانة الأجهزة والأثاث"
      />
    </AppShell>
  );
}
