import Link from "next/link";
import { AppShell } from "../app-shell";
import { AssetsWorkspace } from "../assets-workspace";
import styles from "../page.module.css";

export default function AssetsPage() {
  return (
    <AppShell
      active="assets"
      subtitle="قسم الأجهزة والأثاث"
      title="سجل الأجهزة والأثاث والموجودات العامة"
    >
      <section className={styles.panel}>
        <div>
          <p className={styles.eyebrow}>الأرشيف</p>
          <h3>الموجودات المعطلة</h3>
          <p>عرض الموجودات التي خرجت من قوائم العمل اليومية مع بقاء التفاصيل والحركات محفوظة.</p>
        </div>
        <Link className={styles.tableActionButton} href="/assets/archive">
          فتح الأرشيف
        </Link>
      </section>

      <AssetsWorkspace
        allowedCategoryCodes={["DEV", "FUR"]}
        description="عرض الموجودات العامة المسجلة مثل الأجهزة والأثاث، مع تفاصيل العهدة والموقع والمستلم."
        eyebrow="واجهة العرض"
        mode="list"
        title="سجل الأجهزة والأثاث"
      />
    </AppShell>
  );
}
