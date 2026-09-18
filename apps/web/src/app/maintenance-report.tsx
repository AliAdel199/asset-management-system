"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "./api-client";
import styles from "./page.module.css";

type OrganizationUnit = {
  id: string;
  name: string;
  code: string;
};

type CountBucket = {
  id: string;
  name: string;
  count: number;
  cost: number;
};

type MaintenanceRequestRow = {
  id: string;
  requestNumber: string;
  status: string;
  cost: number;
  requestedAt: string;
  performedAt: string | null;
  assetInternalNumber: string;
  maintenanceTypeName: string;
  organizationUnitName: string;
};

type MaintenanceReportSummary = {
  generatedAt: string;
  totalCount: number;
  totalCost: number;
  byStatus: CountBucket[];
  byMaintenanceType: CountBucket[];
  requests: MaintenanceRequestRow[];
};

const emptySummary: MaintenanceReportSummary = {
  generatedAt: "",
  totalCount: 0,
  totalCost: 0,
  byStatus: [],
  byMaintenanceType: [],
  requests: [],
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("ar-IQ").format(value);
}

function formatDateTime(value: string) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("ar-IQ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function downloadReportExport(
  format: "excel" | "pdf",
  filters: { organizationUnitId: string; from: string; to: string },
  onError: (message: string) => void,
) {
  const params = new URLSearchParams();

  if (filters.organizationUnitId) {
    params.set("organizationUnitId", filters.organizationUnitId);
  }
  if (filters.from) {
    params.set("from", filters.from);
  }
  if (filters.to) {
    params.set("to", filters.to);
  }

  try {
    const response = await apiFetch(
      `/reports/maintenance/summary/export/${format}?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error("تعذر توليد الملف.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const extension = format === "excel" ? "xlsx" : "pdf";
    link.href = url;
    link.download = `maintenance-report-${new Date().toISOString().slice(0, 10)}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch {
    onError(
      format === "excel" ? "تعذر تصدير ملف Excel." : "تعذر تصدير ملف PDF.",
    );
  }
}

export function MaintenanceReport() {
  const [organizationUnits, setOrganizationUnits] = useState<
    OrganizationUnit[]
  >([]);
  const [organizationUnitId, setOrganizationUnitId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [summary, setSummary] =
    useState<MaintenanceReportSummary>(emptySummary);
  const [message, setMessage] = useState("جاري تحميل تقرير الصيانة");
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport(format: "excel" | "pdf") {
    setIsExporting(true);
    setMessage("");

    try {
      await downloadReportExport(
        format,
        { organizationUnitId, from, to },
        setMessage,
      );
    } finally {
      setIsExporting(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    apiFetch("/organization-units")
      .then((response) => response.json() as Promise<OrganizationUnit[]>)
      .then((units) => {
        if (!ignore) {
          setOrganizationUnits(units);
        }
      })
      .catch(() => undefined);

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const params = new URLSearchParams();

    if (organizationUnitId) {
      params.set("organizationUnitId", organizationUnitId);
    }
    if (from) {
      params.set("from", from);
    }
    if (to) {
      params.set("to", to);
    }

    apiFetch(`/reports/maintenance/summary?${params.toString()}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("تعذر تحميل تقرير الصيانة.");
        }

        return response.json() as Promise<MaintenanceReportSummary>;
      })
      .then((data) => {
        if (!ignore) {
          setSummary(data);
          setMessage("");
        }
      })
      .catch(() => {
        if (!ignore) {
          setMessage("تعذر تحميل تقرير الصيانة.");
        }
      });

    return () => {
      ignore = true;
    };
  }, [from, organizationUnitId, to]);

  return (
    <section className={styles.assetsWorkspace} id="maintenance-report">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>تقرير تشغيلي</p>
          <h3>تقرير الصيانة</h3>
          {summary.generatedAt && (
            <p>تاريخ إصدار التقرير: {formatDateTime(summary.generatedAt)}</p>
          )}
        </div>
      </div>

      <div className={styles.reportControls} aria-label="فلاتر تقرير الصيانة">
        <label>
          الجهة
          <select
            onChange={(event) => setOrganizationUnitId(event.target.value)}
            value={organizationUnitId}
          >
            <option value="">كل الجهات</option>
            {organizationUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.code})
              </option>
            ))}
          </select>
        </label>
        <label>
          من تاريخ
          <input
            onChange={(event) => setFrom(event.target.value)}
            type="date"
            value={from}
          />
        </label>
        <label>
          إلى تاريخ
          <input
            onChange={(event) => setTo(event.target.value)}
            type="date"
            value={to}
          />
        </label>
        <button
          disabled={isExporting}
          onClick={() => void handleExport("pdf")}
          type="button"
        >
          تصدير PDF
        </button>
        <button
          disabled={isExporting}
          onClick={() => void handleExport("excel")}
          type="button"
        >
          تصدير Excel
        </button>
      </div>

      {message && <p className={styles.formHint}>{message}</p>}

      <div className={styles.metrics} aria-label="إجماليات الصيانة">
        <article>
          <span>إجمالي عدد الطلبات</span>
          <strong>{formatNumber(summary.totalCount)}</strong>
        </article>
        <article>
          <span>إجمالي التكلفة</span>
          <strong>{formatNumber(summary.totalCost)}</strong>
        </article>
      </div>

      <div className={styles.detailGrid}>
        <article>
          <h3>حسب الحالة</h3>
          <div className={styles.reportTableWrap}>
            <table className={styles.assetsTable}>
              <thead>
                <tr>
                  <th>الحالة</th>
                  <th>العدد</th>
                  <th>التكلفة</th>
                </tr>
              </thead>
              <tbody>
                {summary.byStatus.map((bucket) => (
                  <tr key={bucket.id}>
                    <td>{bucket.name}</td>
                    <td>{formatNumber(bucket.count)}</td>
                    <td>{formatNumber(bucket.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article>
          <h3>حسب نوع الصيانة</h3>
          <div className={styles.reportTableWrap}>
            <table className={styles.assetsTable}>
              <thead>
                <tr>
                  <th>نوع الصيانة</th>
                  <th>العدد</th>
                  <th>التكلفة</th>
                </tr>
              </thead>
              <tbody>
                {summary.byMaintenanceType.map((bucket) => (
                  <tr key={bucket.id}>
                    <td>{bucket.name}</td>
                    <td>{formatNumber(bucket.count)}</td>
                    <td>{formatNumber(bucket.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <article>
        <h3>تفاصيل الطلبات</h3>
        <div className={styles.reportTableWrap}>
          <table className={styles.assetsTable}>
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>الموجود</th>
                <th>الجهة</th>
                <th>نوع الصيانة</th>
                <th>الحالة</th>
                <th>التكلفة</th>
                <th>تاريخ الطلب</th>
                <th>تاريخ الإكمال</th>
              </tr>
            </thead>
            <tbody>
              {summary.requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.requestNumber}</td>
                  <td>{request.assetInternalNumber}</td>
                  <td>{request.organizationUnitName}</td>
                  <td>{request.maintenanceTypeName}</td>
                  <td>{request.status}</td>
                  <td>{formatNumber(request.cost)}</td>
                  <td>{formatDateTime(request.requestedAt)}</td>
                  <td>
                    {request.performedAt
                      ? formatDateTime(request.performedAt)
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {!message && summary.requests.length === 0 && (
        <p>لا توجد طلبات صيانة مطابقة لفلاتر التقرير الحالية.</p>
      )}
    </section>
  );
}
