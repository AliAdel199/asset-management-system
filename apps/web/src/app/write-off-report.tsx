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
};

type WriteOffRow = {
  id: string;
  assetInternalNumber: string;
  organizationUnitName: string;
  documentNumber: string;
  reason: string;
  status: string;
  requestedAt: string;
  decidedAt: string | null;
};

type WriteOffReportSummary = {
  generatedAt: string;
  totalCount: number;
  byStatus: CountBucket[];
  requests: WriteOffRow[];
};

const emptySummary: WriteOffReportSummary = {
  generatedAt: "",
  totalCount: 0,
  byStatus: [],
  requests: [],
};

const STATUS_OPTIONS = [
  { value: "", label: "كل الحالات" },
  { value: "PENDING", label: "بانتظار الموافقة" },
  { value: "APPROVED", label: "معتمد" },
  { value: "REJECTED", label: "مرفوض" },
];

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
  filters: {
    organizationUnitId: string;
    status: string;
    from: string;
    to: string;
  },
  onError: (message: string) => void,
) {
  const params = new URLSearchParams();

  if (filters.organizationUnitId) {
    params.set("organizationUnitId", filters.organizationUnitId);
  }
  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.from) {
    params.set("from", filters.from);
  }
  if (filters.to) {
    params.set("to", filters.to);
  }

  try {
    const response = await apiFetch(
      `/reports/write-offs/summary/export/${format}?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error("تعذر توليد الملف.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const extension = format === "excel" ? "xlsx" : "pdf";
    link.href = url;
    link.download = `write-off-report-${new Date().toISOString().slice(0, 10)}.${extension}`;
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

export function WriteOffReport() {
  const [organizationUnits, setOrganizationUnits] = useState<
    OrganizationUnit[]
  >([]);
  const [organizationUnitId, setOrganizationUnitId] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [summary, setSummary] = useState<WriteOffReportSummary>(emptySummary);
  const [message, setMessage] = useState("جاري تحميل تقرير الشطب");
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport(format: "excel" | "pdf") {
    setIsExporting(true);
    setMessage("");

    try {
      await downloadReportExport(
        format,
        { organizationUnitId, status, from, to },
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
    if (status) {
      params.set("status", status);
    }
    if (from) {
      params.set("from", from);
    }
    if (to) {
      params.set("to", to);
    }

    apiFetch(`/reports/write-offs/summary?${params.toString()}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("تعذر تحميل تقرير الشطب.");
        }

        return response.json() as Promise<WriteOffReportSummary>;
      })
      .then((data) => {
        if (!ignore) {
          setSummary(data);
          setMessage("");
        }
      })
      .catch(() => {
        if (!ignore) {
          setMessage("تعذر تحميل تقرير الشطب.");
        }
      });

    return () => {
      ignore = true;
    };
  }, [from, organizationUnitId, status, to]);

  return (
    <section className={styles.assetsWorkspace} id="write-off-report">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>تقرير تشغيلي</p>
          <h3>تقرير الشطب</h3>
          {summary.generatedAt && (
            <p>تاريخ إصدار التقرير: {formatDateTime(summary.generatedAt)}</p>
          )}
        </div>
      </div>

      <div className={styles.reportControls} aria-label="فلاتر تقرير الشطب">
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
          الحالة
          <select
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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

      <div className={styles.metrics} aria-label="إجماليات الشطب">
        <article>
          <span>إجمالي عدد طلبات الشطب</span>
          <strong>{formatNumber(summary.totalCount)}</strong>
        </article>
      </div>

      <article>
        <h3>حسب الحالة</h3>
        <div className={styles.reportTableWrap}>
          <table className={styles.assetsTable}>
            <thead>
              <tr>
                <th>الحالة</th>
                <th>العدد</th>
              </tr>
            </thead>
            <tbody>
              {summary.byStatus.map((bucket) => (
                <tr key={bucket.id}>
                  <td>{bucket.name}</td>
                  <td>{formatNumber(bucket.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article>
        <h3>تفاصيل الطلبات</h3>
        <div className={styles.reportTableWrap}>
          <table className={styles.assetsTable}>
            <thead>
              <tr>
                <th>الموجود</th>
                <th>الجهة</th>
                <th>رقم المستند</th>
                <th>السبب</th>
                <th>الحالة</th>
                <th>تاريخ الطلب</th>
                <th>تاريخ القرار</th>
              </tr>
            </thead>
            <tbody>
              {summary.requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.assetInternalNumber}</td>
                  <td>{request.organizationUnitName}</td>
                  <td>{request.documentNumber}</td>
                  <td>{request.reason}</td>
                  <td>{request.status}</td>
                  <td>{formatDateTime(request.requestedAt)}</td>
                  <td>
                    {request.decidedAt
                      ? formatDateTime(request.decidedAt)
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {!message && summary.requests.length === 0 && (
        <p>لا توجد طلبات شطب مطابقة لفلاتر التقرير الحالية.</p>
      )}
    </section>
  );
}
