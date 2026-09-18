import Link from "next/link";
import { AppShell } from "../app-shell";
import { AssetsWorkspace } from "../assets-workspace";
import styles from "../page.module.css";

export default function VehiclesPage() {
  return (
    <AppShell
      active="vehicles"
      subtitle="قسم السيارات"
      title="سجل السيارات والعجلات الحكومية"
    >
      <section className={styles.panel}>
        <div>
          <p className={styles.eyebrow}>الأرشيف</p>
          <h3>السيارات المعطلة</h3>
          <p>عرض السيارات التي تم تعطيلها من سجل العمل اليومي مع بقاء بياناتها وحركاتها محفوظة.</p>
        </div>
        <Link className={styles.tableActionButton} href="/vehicles/archive">
          فتح أرشيف السيارات
        </Link>
      </section>

      <AssetsWorkspace
        allowedCategoryCodes={["VEH"]}
        createHref="/vehicles/new"
        createLabel="إضافة سيارة جديدة"
        description="عرض السيارات المسجلة مع رقم اللوحة والشاصي ونوع السيارة واللون."
        detailBasePath="/vehicles"
        editBasePath="/vehicles"
        eyebrow="واجهة العرض"
        mode="list"
        title="سجل السيارات"
      />
    </AppShell>
  );
}
