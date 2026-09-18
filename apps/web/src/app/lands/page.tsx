import Link from "next/link";
import { AppShell } from "../app-shell";
import { AssetsWorkspace } from "../assets-workspace";
import styles from "../page.module.css";

export default function LandsPage() {
  return (
    <AppShell active="lands" subtitle="قسم الأراضي" title="سجل الأراضي الحكومية">
      <section className={styles.panel}>
        <div>
          <p className={styles.eyebrow}>الأرشيف</p>
          <h3>الأراضي المعطلة</h3>
          <p>عرض الأراضي التي خرجت من قوائم العمل اليومية مع حفظ بياناتها وسجلها.</p>
        </div>
        <Link className={styles.tableActionButton} href="/lands/archive">
          فتح أرشيف الأراضي
        </Link>
      </section>

      <AssetsWorkspace
        allowedCategoryCodes={["LND"]}
        createHref="/lands/new"
        createLabel="إضافة أرض جديدة"
        description="عرض الأراضي المسجلة مع رقم القطعة والمقاطعة والبلدية والمساحة ونوع الاستخدام."
        detailBasePath="/lands"
        editBasePath="/lands"
        eyebrow="واجهة العرض"
        mode="list"
        title="سجل الأراضي"
      />
    </AppShell>
  );
}
