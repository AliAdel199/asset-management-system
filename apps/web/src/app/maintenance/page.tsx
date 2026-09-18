import { AppShell } from "../app-shell";
import Link from "next/link";
import { MaintenanceAlerts } from "../maintenance-alerts";
import styles from "../page.module.css";

export default function MaintenancePage() {
  return (
    <AppShell
      active="maintenance"
      subtitle="طلبات الصيانة"
      title="متابعة صيانة الموجودات وربطها بالسجل المركزي"
    >
      <MaintenanceAlerts />

      <section className={styles.moduleRoadmap} aria-label="أقسام الصيانة">
        <article>
          <strong>الأجهزة والأثاث</strong>
          <span>طلبات صيانة الموجودات العامة</span>
        </article>
        <article>
          <strong>السيارات</strong>
          <span>طلبات صيانة العجلات والسيارات</span>
        </article>
        <article>
          <strong>العقار والمباني</strong>
          <span>طلبات صيانة المباني والعقار</span>
        </article>
      </section>

      <section className={styles.quickActions} aria-label="مسارات الصيانة">
        <Link href="/maintenance/general">صيانة الأجهزة والأثاث</Link>
        <Link href="/maintenance/vehicles">صيانة السيارات</Link>
        <Link href="/maintenance/properties">صيانة العقار والمباني</Link>
      </section>
    </AppShell>
  );
}
