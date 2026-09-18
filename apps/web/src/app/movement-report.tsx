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

type MovementRow = {
  id: string;
  movementType: string;
  assetInternalNumber: string;
  fromOrganizationUnitName: string | null;
  toOrganizationUnitName: string | null;
  fromEmployeeName: string | null;
  toEmployeeName: string | null;
  documentNumber: string | null;
  createdAt: string;
};

type MovementReportSummary = {
  generatedAt: string;
  totalCount: number;
  byMovementType: CountBucket[];
  movements: MovementRow[];
};

const emptySummary: MovementReportSummary = {
  generatedAt: "",
  totalCount: 0,
  byMovementType: [],
  movements: [],
};

const MOVEMENT_TYPE_OPTIONS = [
  { value: "", label: "كل الحركات" },
  { value: "TRANSFER", label: "نقل بين جهات" },
  { value: "ASSIGN", label: "تسليم لموظف" },
  { value: "RETURN", label: "استرجاع" },
  { value: "STATUS_CHANGE", label: "تغيير حالة" },
  { value: "DEACTIVATE", label: "شطب" },
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
    movementType: string;
    from: string;
    to: string;
  },
  onError: (message: string) => void,
) {
  const params = new URLSearchParams();

  if (filters.organizationUnitId) {
    params.set("organizationUnitId", filters.organizationUnitId);
  }
  if (filters.movementType) {
    params.set("movementType", filters.movementType);
  }
  if (filters.from) {
    params.set("from", filters.from);
  }
  if (filters.to) {
    params.set("to", filters.to);
  }

  try {
    const response = await apiFetch(
      `/reports/movements/summary/export/${format}?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error("تعذر توليد الملف.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const extension = format === "excel" ? "xlsx" : "pdf";
    link.href = url;
    link.download = `movements-report-${new Date().toISOString().slice(0, 10)}.${extension}`;
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

export function MovementReport() {
  const [organizationUnits, setOrganizationUnits] = useState<
    OrganizationUnit[]
  >([]);
  const [organizationUnitId, setOrganizationUnitId] = useState("");
  const [movementType, setMovementType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [summary, setSummary] = useState<MovementReportSummary>(emptySummary);
  const [message, setMessage] = useState("جاري تحميل تقرير النقل والتسليم");
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport(format: "excel" | "pdf") {
    setIsExporting(true);
    setMessage("");

    try {
      await downloadReportExport(
        format,
        { organizationUnitId, movementType, from, to },
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
    if (movementType) {
      params.set("movementType", movementType);
    }
    if (from) {
      params.set("from", from);
    }
    if (to) {
      params.set("to", to);
    }

    apiFetch(`/reports/movements/summary?${params.toString()}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("تعذر تحميل تقرير النقل والتسليم.");
        }

        return response.json() as Promise<MovementReportSummary>;
      })
      .then((data) => {
        if (!ignore) {
          setSummary(data);
          setMessage("");
        }
      })
      .catch(() => {
        if (!ignore) {
          setMessage("تعذر تحميل تقرير النقل والتسليم.");
        }
      });

    return () => {
      ignore = true;
    };
  }, [from, movementType, organizationUnitId, to]);

  return (
    <section className={styles.assetsWorkspace} id="movement-report">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>تقرير تشغيلي</p>
          <h3>تقرير النقل والتسليم</h3>
          {summary.generatedAt && (
            <p>تاريخ إصدار التقرير: {formatDateTime(summary.generatedAt)}</p>
          )}
        </div>
      </div>

      <div
        className={styles.reportControls}
        aria-label="فلاتر تقرير النقل والتسليم"
      >
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
          نوع الحركة
          <select
            onChange={(event) => setMovementType(event.target.value)}
            value={movementType}
          >
            {MOVEMENT_TYPE_OPTIONS.map((option) => (
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

      <div className={styles.metrics} aria-label="إجماليات النقل والتسليم">
        <article>
          <span>إجمالي عدد الحركات</span>
          <strong>{formatNumber(summary.totalCount)}</strong>
        </article>
      </div>

      <article>
        <h3>حسب نوع الحركة</h3>
        <div className={styles.reportTableWrap}>
          <table className={styles.assetsTable}>
            <thead>
              <tr>
                <th>نوع الحركة</th>
                <th>العدد</th>
              </tr>
            </thead>
            <tbody>
              {summary.byMovementType.map((bucket) => (
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
        <h3>تفاصيل الحركات</h3>
        <div className={styles.reportTableWrap}>
          <table className={styles.assetsTable}>
            <thead>
              <tr>
                <th>الموجود</th>
                <th>نوع الحركة</th>
                <th>من</th>
                <th>إلى</th>
                <th>رقم المستند</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {summary.movements.map((movement) => (
                <tr key={movement.id}>
                  <td>{movement.assetInternalNumber}</td>
                  <td>{movement.movementType}</td>
                  <td>
                    {movement.fromOrganizationUnitName ??
                      movement.fromEmployeeName ??
                      "-"}
                  </td>
                  <td>
                    {movement.toOrganizationUnitName ??
                      movement.toEmployeeName ??
                      "-"}
                  </td>
                  <td>{movement.documentNumber ?? "-"}</td>
                  <td>{formatDateTime(movement.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {!message && summary.movements.length === 0 && (
        <p>لا توجد حركات مطابقة لفلاتر التقرير الحالية.</p>
      )}
    </section>
  );
}
