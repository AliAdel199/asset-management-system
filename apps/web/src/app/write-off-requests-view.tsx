"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "./api-client";
import styles from "./page.module.css";

type NamedReference = {
  id: string;
  name: string;
  code?: string;
};

type WriteOffRequest = {
  id: string;
  documentNumber: string;
  reason: string;
  status: string;
  requestedAt: string;
  decidedAt: string | null;
  decisionNotes: string | null;
  asset: {
    id: string;
    internalNumber: string;
    isDeleted: boolean;
    assetCategory: { name: string; code: string };
    assetType: { name: string };
  };
  organizationUnit: NamedReference;
  requestedByUser: { id: string; fullName: string } | null;
  decidedByUser: { id: string; fullName: string } | null;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ar-IQ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function WriteOffRequestsView() {
  const [requests, setRequests] = useState<WriteOffRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [message, setMessage] = useState("جاري تحميل طلبات الشطب");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function loadRequests() {
    return apiFetch(`/write-off-requests?status=${statusFilter}`).then(
      async (response) => {
        if (!response.ok) {
          throw new Error("تعذر تحميل طلبات الشطب.");
        }

        return response.json() as Promise<WriteOffRequest[]>;
      },
    );
  }

  useEffect(() => {
    let ignore = false;

    loadRequests()
      .then((data) => {
        if (!ignore) {
          setRequests(data);
          setMessage("");
        }
      })
      .catch(() => {
        if (!ignore) {
          setMessage("تعذر تحميل طلبات الشطب.");
        }
      });

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function refresh() {
    try {
      const data = await loadRequests();
      setRequests(data);
    } catch {
      setMessage("تعذر تحديث القائمة.");
    }
  }

  async function handleApprove(id: string) {
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await apiFetch(`/write-off-requests/${id}/approve`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message ?? "تعذر اعتماد طلب الشطب.");
      }

      await refresh();
      setMessage("تم اعتماد طلب الشطب وتنفيذه.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "تعذر اعتماد طلب الشطب.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReject(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await apiFetch(`/write-off-requests/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: formData.get("notes") }),
      });

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message ?? "تعذر رفض طلب الشطب.");
      }

      await refresh();
      setMessage("تم رفض طلب الشطب.");
      form.reset();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "تعذر رفض طلب الشطب.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className={styles.assetsWorkspace}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>اعتماد جهة مخولة</p>
          <h3>طلبات شطب الموجودات</h3>
        </div>
        {message && <span>{message}</span>}
      </div>

      <div className={styles.reportControls} aria-label="فلتر حالة الطلب">
        <label>
          الحالة
          <select
            onChange={(event) => setStatusFilter(event.target.value)}
            value={statusFilter}
          >
            <option value="PENDING">بانتظار الموافقة</option>
            <option value="APPROVED">معتمدة</option>
            <option value="REJECTED">مرفوضة</option>
          </select>
        </label>
      </div>

      <div className={styles.assetsTableWrap}>
        <table className={styles.assetsTable}>
          <thead>
            <tr>
              <th>الموجود</th>
              <th>الجهة</th>
              <th>طلبها</th>
              <th>التاريخ</th>
              <th>رقم المستند</th>
              <th>السبب</th>
              {statusFilter === "PENDING" && <th>الإجراء</th>}
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id}>
                <td>
                  {request.asset.internalNumber} ({request.asset.assetType.name})
                </td>
                <td>{request.organizationUnit.name}</td>
                <td>{request.requestedByUser?.fullName ?? "غير معروف"}</td>
                <td>{formatDateTime(request.requestedAt)}</td>
                <td>{request.documentNumber}</td>
                <td>{request.reason}</td>
                {statusFilter === "PENDING" && (
                  <td>
                    <form
                      onSubmit={(event) => handleReject(event, request.id)}
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                    >
                      <button
                        className={styles.tableActionButton}
                        disabled={isSubmitting}
                        onClick={() => handleApprove(request.id)}
                        type="button"
                      >
                        اعتماد
                      </button>
                      <input
                        name="notes"
                        placeholder="سبب الرفض (اختياري)"
                        style={{
                          minWidth: 140,
                          border: "1px solid var(--border-strong)",
                          borderRadius: "var(--radius-sm)",
                          padding: "8px 10px",
                          font: "inherit",
                        }}
                        type="text"
                      />
                      <button
                        className={styles.tableActionButton}
                        disabled={isSubmitting}
                        type="submit"
                      >
                        رفض
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={statusFilter === "PENDING" ? 7 : 6}>
                  لا توجد طلبات شطب ضمن هذا الفلتر.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
