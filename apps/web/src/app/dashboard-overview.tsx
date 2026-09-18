"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "./api-client";
import styles from "./page.module.css";

type DashboardSummary = {
  assetsCount: number;
  maintenanceRequestsCount: number;
  movementRequestsCount: number;
  attachmentsCount: number;
  organizationUnitsCount: number;
  assetCategoriesCount: number;
  assetStatusesCount: number;
};

type Asset = {
  id: string;
  internalNumber: string;
  assetCategory: { name: string; code: string };
  status: { name: string };
  owningOrganizationUnit: { name: string };
};

type MaintenanceRequest = {
  id: string;
  requestNumber: string;
  description: string;
  status: string;
  asset: { internalNumber: string };
  maintenanceType: { name: string };
};

const fallbackSummary: DashboardSummary = {
  assetsCount: 0,
  maintenanceRequestsCount: 0,
  movementRequestsCount: 0,
  attachmentsCount: 0,
  organizationUnitsCount: 0,
  assetCategoriesCount: 0,
  assetStatusesCount: 0,
};

const sectionLabels: Record<string, string> = {
  VEH: "السيارات",
  LND: "الأراضي",
  BLD: "العقار",
  DEV: "الأجهزة",
  FUR: "الأثاث",
};

export function DashboardOverview() {
  const [summary, setSummary] = useState<DashboardSummary>(fallbackSummary);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<
    MaintenanceRequest[]
  >([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      try {
        // نقرأ أكثر من مصدر حتى تكون الداشبورد ملخصاً تشغيلياً لا مجرد عدادات.
        const [summaryResponse, assetsResponse, maintenanceResponse] =
          await Promise.all([
            apiFetch("/dashboard"),
            apiFetch("/assets"),
            apiFetch("/maintenance-requests"),
          ]);

        if (
          !summaryResponse.ok ||
          !assetsResponse.ok ||
          !maintenanceResponse.ok
        ) {
          throw new Error("Failed to load dashboard data.");
        }

        const [summaryData, assetsData, maintenanceData] = await Promise.all([
          summaryResponse.json() as Promise<DashboardSummary>,
          assetsResponse.json() as Promise<Asset[]>,
          maintenanceResponse.json() as Promise<MaintenanceRequest[]>,
        ]);

        if (!ignore) {
          setSummary(summaryData);
          setAssets(assetsData);
          setMaintenanceRequests(maintenanceData);
          setStatus("ready");
        }
      } catch {
        if (!ignore) {
          setStatus("error");
        }
      }
    }

    void loadDashboard();

    return () => {
      // يمنع تحديث الحالة إذا انتقل المستخدم إلى واجهة ثانية قبل اكتمال الطلبات.
      ignore = true;
    };
  }, []);

  const assetSections = useMemo(() => {
    return assets.reduce<Record<string, number>>((counts, asset) => {
      const code = asset.assetCategory.code;
      counts[code] = (counts[code] ?? 0) + 1;
      return counts;
    }, {});
  }, [assets]);

  const openMaintenanceCount = maintenanceRequests.filter(
    (request) => request.status === "OPEN",
  ).length;

  const metrics = [
    { label: "إجمالي الموجودات", value: summary.assetsCount, href: "/assets" },
    {
      label: "طلبات الصيانة",
      value: summary.maintenanceRequestsCount,
      href: "/maintenance",
    },
    { label: "الجهات", value: summary.organizationUnitsCount },
    { label: "تصنيفات فعالة", value: summary.assetCategoriesCount },
  ];

  return (
    <>
      <section className={styles.sectionShortcutBar} aria-label="أقسام النظام">
        <Link href="/assets">
          <strong>الأجهزة والأثاث</strong>
          <span>{(assetSections.DEV ?? 0) + (assetSections.FUR ?? 0)} سجل</span>
        </Link>
        <Link href="/vehicles">
          <strong>السيارات</strong>
          <span>{assetSections.VEH ?? 0} سجل</span>
        </Link>
        <Link href="/maintenance">
          <strong>الصيانة</strong>
          <span>{openMaintenanceCount} مفتوح</span>
        </Link>
        <Link href="/reports">
          <strong>التقارير</strong>
          <span>متابعة وتصدير</span>
        </Link>
      </section>

      <section className={styles.metrics} aria-label="مؤشرات لوحة التحكم">
        {metrics.map((metric) => {
          const content = (
            <>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </>
          );

          return metric.href ? (
            <Link className={styles.metricLink} href={metric.href} key={metric.label}>
              {content}
            </Link>
          ) : (
            <article key={metric.label}>{content}</article>
          );
        })}
      </section>

      <section className={styles.dashboardGrid}>
        <article className={styles.dashboardPanel}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>توزيع الموجودات</p>
              <h3>حسب الأقسام</h3>
            </div>
            <span>{assets.length} سجل</span>
          </div>

          <div className={styles.sectionBreakdown}>
            {Object.entries(sectionLabels).map(([code, label]) => (
              <div key={code}>
                <span>{label}</span>
                <strong>{assetSections[code] ?? 0}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.dashboardPanel}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>الصيانة</p>
              <h3>طلبات مفتوحة</h3>
            </div>
            <span>{openMaintenanceCount} مفتوح</span>
          </div>

          <div className={styles.recentList}>
            {maintenanceRequests.slice(0, 4).map((request) => (
              <Link href="/maintenance" key={request.id}>
                <strong>{request.requestNumber}</strong>
                <span>
                  {request.asset.internalNumber} - {request.maintenanceType.name}
                </span>
              </Link>
            ))}
            {maintenanceRequests.length === 0 && (
              <p>لا توجد طلبات صيانة مسجلة بعد.</p>
            )}
          </div>
        </article>
      </section>

      <section className={styles.quickActions} aria-label="إجراءات سريعة">
        <Link href="/assets/new">إضافة جهاز أو أثاث</Link>
        <Link href="/vehicles/new">إضافة سيارة</Link>
        <Link href="/maintenance">تسجيل طلب صيانة</Link>
        <Link href="/reports">فتح التقارير</Link>
        <span>
          {status === "loading" && "جاري الاتصال بالخلفية"}
          {status === "ready" && "متصل بالخلفية"}
          {status === "error" && "تعذر الاتصال بالخلفية"}
        </span>
      </section>
    </>
  );
}
