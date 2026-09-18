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
  bookValue: number;
};

type CategorySummary = {
  id: string;
  code: string;
  name: string;
  count: number;
  bookValue: number;
  types: CountBucket[];
  statuses: CountBucket[];
};

type InventorySummary = {
  generatedAt: string;
  totalCount: number;
  totalBookValue: number;
  categories: CategorySummary[];
};

const emptySummary: InventorySummary = {
  generatedAt: "",
  totalCount: 0,
  totalBookValue: 0,
  categories: [],
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
  filters: { organizationUnitId: string; includeArchived: boolean },
  onError: (message: string) => void,
) {
  const params = new URLSearchParams();

  if (filters.organizationUnitId) {
    params.set("organizationUnitId", filters.organizationUnitId);
  }

  if (filters.includeArchived) {
    params.set("includeArchived", "true");
  }

  try {
    const response = await apiFetch(
      `/inventory/summary/export/${format}?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error("تعذر توليد الملف.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const extension = format === "excel" ? "xlsx" : "pdf";
    link.href = url;
    link.download = `inventory-report-${new Date().toISOString().slice(0, 10)}.${extension}`;
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

export function InventoryReport() {
  const [organizationUnits, setOrganizationUnits] = useState<
    OrganizationUnit[]
  >([]);
  const [organizationUnitId, setOrganizationUnitId] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [summary, setSummary] = useState<InventorySummary>(emptySummary);
  const [message, setMessage] = useState("جاري تحميل كشف الجرد");
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport(format: "excel" | "pdf") {
    setIsExporting(true);
    setMessage("");

    try {
      await downloadReportExport(
        format,
        { organizationUnitId, includeArchived },
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

    if (includeArchived) {
      params.set("includeArchived", "true");
    }

    apiFetch(`/inventory/summary?${params.toString()}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("تعذر تحميل كشف الجرد.");
        }

        return response.json() as Promise<InventorySummary>;
      })
      .then((data) => {
        if (!ignore) {
          setSummary(data);
          setMessage("");
        }
      })
      .catch(() => {
        if (!ignore) {
          setMessage("تعذر تحميل كشف الجرد.");
        }
      });

    return () => {
      ignore = true;
    };
  }, [includeArchived, organizationUnitId]);

  return (
    <section className={styles.assetsWorkspace} id="inventory-report">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>تقرير تشغيلي</p>
          <h3>كشف الجرد حسب التصنيف والنوع</h3>
          {summary.generatedAt && (
            <p>تاريخ إصدار الكشف: {formatDateTime(summary.generatedAt)}</p>
          )}
        </div>
      </div>

      <div className={styles.reportControls} aria-label="فلاتر كشف الجرد">
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
        <label className={styles.checkboxLabel}>
          <input
            checked={includeArchived}
            onChange={(event) => setIncludeArchived(event.target.checked)}
            type="checkbox"
          />
          إظهار الموجودات المعطلة
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

      <div className={styles.metrics} aria-label="إجماليات الجرد">
        <article>
          <span>إجمالي عدد الموجودات</span>
          <strong>{formatNumber(summary.totalCount)}</strong>
        </article>
        <article>
          <span>إجمالي القيمة الدفترية</span>
          <strong>{formatNumber(summary.totalBookValue)}</strong>
        </article>
        <article>
          <span>عدد الأقسام</span>
          <strong>{formatNumber(summary.categories.length)}</strong>
        </article>
      </div>

      {summary.categories.map((category) => (
        <section className={styles.assetsWorkspace} key={category.id}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>{category.code}</p>
              <h3>{category.name}</h3>
            </div>
            <span>
              {formatNumber(category.count)} موجود -{" "}
              {formatNumber(category.bookValue)} قيمة دفترية
            </span>
          </div>

          <div className={styles.detailGrid}>
            <article>
              <h3>حسب نوع المادة</h3>
              <div className={styles.reportTableWrap}>
                <table className={styles.assetsTable}>
                  <thead>
                    <tr>
                      <th>نوع المادة</th>
                      <th>العدد</th>
                      <th>القيمة الدفترية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {category.types.map((type) => (
                      <tr key={type.id}>
                        <td>{type.name}</td>
                        <td>{formatNumber(type.count)}</td>
                        <td>{formatNumber(type.bookValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article>
              <h3>حسب الحالة</h3>
              <div className={styles.reportTableWrap}>
                <table className={styles.assetsTable}>
                  <thead>
                    <tr>
                      <th>الحالة</th>
                      <th>العدد</th>
                      <th>القيمة الدفترية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {category.statuses.map((status) => (
                      <tr key={status.id}>
                        <td>{status.name}</td>
                        <td>{formatNumber(status.count)}</td>
                        <td>{formatNumber(status.bookValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        </section>
      ))}

      {!message && summary.categories.length === 0 && (
        <p>لا توجد موجودات مطابقة لفلاتر الجرد الحالية.</p>
      )}
    </section>
  );
}
