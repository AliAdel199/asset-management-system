"use client";

import { useEffect, useState } from "react";
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

const fallbackSummary: DashboardSummary = {
  assetsCount: 0,
  maintenanceRequestsCount: 0,
  movementRequestsCount: 0,
  attachmentsCount: 0,
  organizationUnitsCount: 0,
  assetCategoriesCount: 0,
  assetStatusesCount: 0,
};

export function DashboardMetrics() {
  const [summary, setSummary] = useState<DashboardSummary>(fallbackSummary);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let ignore = false;

    async function loadSummary() {
      try {
        // لوحة التحكم تقرأ الملخص من الـ API حتى تعكس بيانات قاعدة PostgreSQL.
        const response = await fetch("http://localhost:3001/api/dashboard");

        if (!response.ok) {
          throw new Error("Failed to load dashboard summary.");
        }

        const data = (await response.json()) as DashboardSummary;

        if (!ignore) {
          setSummary(data);
          setStatus("ready");
        }
      } catch {
        if (!ignore) {
          setStatus("error");
        }
      }
    }

    void loadSummary();

    return () => {
      // يمنع تحديث الحالة إذا خرج المستخدم من الصفحة قبل اكتمال الطلب.
      ignore = true;
    };
  }, []);

  // نحول الملخص إلى قائمة حتى يكون عرض البطاقات موحداً وسهل التوسعة.
  const metrics = [
    { label: "إجمالي الموجودات", value: summary.assetsCount },
    { label: "طلبات الصيانة", value: summary.maintenanceRequestsCount },
    { label: "طلبات النقل", value: summary.movementRequestsCount },
    { label: "المرفقات", value: summary.attachmentsCount },
  ];

  return (
    <>
      <section className={styles.metrics} aria-label="مؤشرات أولية">
        {metrics.map((metric) => (
          <article key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </section>

      <section className={styles.referenceBar} aria-label="بيانات التأسيس">
        <span>
          الجهات: <strong>{summary.organizationUnitsCount}</strong>
        </span>
        <span>
          التصنيفات: <strong>{summary.assetCategoriesCount}</strong>
        </span>
        <span>
          حالات الموجود: <strong>{summary.assetStatusesCount}</strong>
        </span>
        <span className={styles.syncState}>
          {status === "loading" && "جاري الاتصال بالخلفية"}
          {status === "ready" && "متصل بالخلفية"}
          {status === "error" && "تعذر الاتصال بالخلفية"}
        </span>
      </section>
    </>
  );
}
