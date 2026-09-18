import Link from "next/link";
import { AppShell } from "../app-shell";
import { AssetsWorkspace } from "../assets-workspace";
import styles from "../page.module.css";

export default function PropertiesPage() {
  return (
    <AppShell active="properties" subtitle="قسم العقار" title="سجل العقارات والمباني الحكومية">
      <section className={styles.panel}>
        <div>
          <p className={styles.eyebrow}>الأرشيف</p>
          <h3>العقارات المعطلة</h3>
          <p>عرض العقارات التي خرجت من قوائم العمل اليومية مع حفظ بياناتها وسجلها.</p>
        </div>
        <Link className={styles.tableActionButton} href="/properties/archive">
          فتح أرشيف العقار
        </Link>
      </section>

      <AssetsWorkspace
        allowedCategoryCodes={["BLD"]}
        createHref="/properties/new"
        createLabel="إضافة عقار جديد"
        description="عرض العقارات والمباني المسجلة مع رقم العقار والعنوان والطوابق والمساحات."
        detailBasePath="/properties"
        editBasePath="/properties"
        eyebrow="واجهة العرض"
        mode="list"
        title="سجل العقار"
      />
    </AppShell>
  );
}
