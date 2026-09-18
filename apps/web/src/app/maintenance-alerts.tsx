"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "./api-client";
import styles from "./page.module.css";

type MaintenanceAlert = {
  assetId: string;
  internalNumber: string;
  model: string | null;
  assetCategory: { name: string; code: string };
  assetType: { name: string };
  owningOrganizationUnit: { name: string; code: string };
  maintenanceIntervalName: string;
  nextDueDate: string;
  daysUntilDue: number;
  status: "OVERDUE" | "DUE_SOON";
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

const detailBasePathByCategory: Record<string, string> = {
  VEH: "/vehicles",
  LND: "/lands",
  BLD: "/properties",
};

function resolveAssetDetailPath(categoryCode: string, assetId: string) {
  const basePath = detailBasePathByCategory[categoryCode] ?? "/assets";
  return `${basePath}/${assetId}`;
}

export function MaintenanceAlerts() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [message, setMessage] = useState("جاري تحميل تنبيهات الصيانة");

  useEffect(() => {
    let ignore = false;

    apiFetch("/maintenance-requests/alerts")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("تعذر تحميل تنبيهات الصيانة.");
        }

        return response.json() as Promise<MaintenanceAlert[]>;
      })
      .then((data) => {
        if (!ignore) {
          setAlerts(data);
          setMessage("");
        }
      })
      .catch(() => {
        if (!ignore) {
          setMessage("تعذر تحميل تنبيهات الصيانة.");
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  if (!message && alerts.length === 0) {
    return null;
  }

  return (
    <section className={styles.assetsWorkspace}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>تنبيهات دورية</p>
          <h3>موجودات بحاجة لصيانة قريباً أو متأخرة</h3>
        </div>
        <span>{alerts.length} تنبيه</span>
      </div>

      {message && <p className={styles.formHint}>{message}</p>}

      {alerts.length > 0 && (
        <div className={styles.assetsTableWrap}>
          <table className={styles.assetsTable}>
            <thead>
              <tr>
                <th>الموجود</th>
                <th>الجهة</th>
                <th>الدورية</th>
                <th>الاستحقاق</th>
                <th>الحالة</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.assetId}>
                  <td>
                    {alert.internalNumber} ({alert.assetType.name})
                  </td>
                  <td>{alert.owningOrganizationUnit.name}</td>
                  <td>{alert.maintenanceIntervalName}</td>
                  <td>{formatDate(alert.nextDueDate)}</td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        alert.status === "OVERDUE"
                          ? styles.statusCancelled
                          : styles.statusOpen
                      }`}
                    >
                      {alert.status === "OVERDUE"
                        ? `متأخرة ${Math.abs(alert.daysUntilDue)} يوم`
                        : `بعد ${alert.daysUntilDue} يوم`}
                    </span>
                  </td>
                  <td>
                    <button
                      className={styles.tableActionButton}
                      onClick={() =>
                        router.push(
                          resolveAssetDetailPath(
                            alert.assetCategory.code,
                            alert.assetId,
                          ),
                        )
                      }
                      type="button"
                    >
                      فتح الموجود
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
