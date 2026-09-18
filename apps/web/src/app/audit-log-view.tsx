"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "./api-client";
import styles from "./page.module.css";

type AuditLogEntry = {
  id: string;
  username: string | null;
  action: string;
  module: string;
  entityType: string | null;
  entityId: string | null;
  description: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; fullName: string; username: string } | null;
};

type AuditLogPage = {
  items: AuditLogEntry[];
  nextCursor: string | null;
};

const moduleLabels: Record<string, string> = {
  auth: "الدخول",
  assets: "الموجودات",
  maintenance: "الصيانة",
  admin: "الإدارة",
};

const actionLabels: Record<string, string> = {
  LOGIN_SUCCESS: "تسجيل دخول ناجح",
  LOGIN_FAILED: "محاولة دخول فاشلة",
  ASSET_CREATE: "إضافة موجود",
  ASSET_UPDATE: "تعديل موجود",
  ASSET_TRANSFER: "نقل موجود",
  ASSET_ASSIGN: "تسليم عهدة",
  ASSET_RETURN: "إرجاع عهدة",
  ASSET_STATUS_CHANGE: "تغيير حالة موجود",
  ASSET_DEACTIVATE: "تعطيل/شطب موجود",
  ASSET_ATTACHMENT_UPLOAD: "رفع مرفق",
  MAINTENANCE_CREATE: "فتح طلب صيانة",
  MAINTENANCE_COMPLETE: "إكمال طلب صيانة",
  MAINTENANCE_CANCEL: "إلغاء طلب صيانة",
  ORG_UNIT_CREATE: "إنشاء جهة",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ar-IQ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AuditLogView() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [moduleFilter, setModuleFilter] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [message, setMessage] = useState("جاري تحميل سجل التدقيق");
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  function loadPage(cursor?: string) {
    const params = new URLSearchParams();

    if (moduleFilter) {
      params.set("module", moduleFilter);
    }

    if (cursor) {
      params.set("cursor", cursor);
    }

    return apiFetch(`/audit-log?${params.toString()}`).then(
      async (response) => {
        if (!response.ok) {
          throw new Error("تعذر تحميل سجل التدقيق.");
        }

        return response.json() as Promise<AuditLogPage>;
      },
    );
  }

  useEffect(() => {
    let ignore = false;

    loadPage()
      .then((data) => {
        if (!ignore) {
          setEntries(data.items);
          setNextCursor(data.nextCursor);
          setMessage("");
        }
      })
      .catch(() => {
        if (!ignore) {
          setMessage("تعذر تحميل سجل التدقيق.");
        }
      });

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleFilter]);

  async function loadMore() {
    if (!nextCursor) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const data = await loadPage(nextCursor);
      setEntries((current) => [...current, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch {
      setMessage("تعذر تحميل المزيد من السجل.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <section className={styles.assetsWorkspace}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>تدقيق وتتبع</p>
          <h3>سجل العمليات المؤثرة بالنظام</h3>
        </div>
      </div>

      <div className={styles.reportControls} aria-label="فلاتر سجل التدقيق">
        <label>
          الوحدة
          <select
            onChange={(event) => setModuleFilter(event.target.value)}
            value={moduleFilter}
          >
            <option value="">كل الوحدات</option>
            {Object.entries(moduleLabels).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {message && <p className={styles.formHint}>{message}</p>}

      <div className={styles.reportTableWrap}>
        <table className={styles.assetsTable}>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>المستخدم</th>
              <th>العملية</th>
              <th>الوحدة</th>
              <th>الوصف</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{formatDateTime(entry.createdAt)}</td>
                <td>{entry.user?.fullName ?? entry.username ?? "غير معروف"}</td>
                <td>{actionLabels[entry.action] ?? entry.action}</td>
                <td>{moduleLabels[entry.module] ?? entry.module}</td>
                <td>{entry.description ?? "-"}</td>
                <td>{entry.ipAddress ?? "-"}</td>
              </tr>
            ))}
            {entries.length === 0 && !message && (
              <tr>
                <td colSpan={6}>لا توجد عمليات مسجلة ضمن هذا الفلتر.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {nextCursor && (
        <div className={styles.formActions}>
          <button disabled={isLoadingMore} onClick={loadMore} type="button">
            {isLoadingMore ? "جاري التحميل" : "تحميل المزيد"}
          </button>
        </div>
      )}
    </section>
  );
}
