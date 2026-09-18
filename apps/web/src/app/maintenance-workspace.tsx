"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "./api-client";
import { useAuth } from "./auth-context";
import styles from "./page.module.css";

type AssetOption = {
  id: string;
  internalNumber: string;
  model: string | null;
  assetCategory: { name: string; code: string };
  owningOrganizationUnit: { name: string; code: string };
};

type MaintenanceType = {
  id: string;
  name: string;
};

type ReferenceData = {
  maintenanceTypes: MaintenanceType[];
};

type MaintenanceRequest = {
  id: string;
  requestNumber: string;
  description: string;
  status: string;
  cost: string | null;
  resultNotes: string | null;
  performedAt: string | null;
  asset: AssetOption;
  maintenanceType: MaintenanceType;
};

type MaintenanceWorkspaceProps = {
  allowedCategoryCodes?: string[];
  description?: string;
  eyebrow?: string;
  mode?: "list" | "create";
  redirectAfterCreate?: string;
  title?: string;
};

const statusOptions = [
  { code: "ALL", label: "كل الطلبات" },
  { code: "OPEN", label: "المفتوحة" },
  { code: "COMPLETED", label: "المكتملة" },
  { code: "CANCELLED", label: "الملغاة" },
];

function getMaintenanceStatusLabel(status: string) {
  if (status === "OPEN") {
    return "مفتوح";
  }

  if (status === "COMPLETED") {
    return "مكتمل";
  }

  if (status === "CANCELLED") {
    return "ملغى";
  }

  return status;
}

function getStatusClass(status: string) {
  if (status === "OPEN") {
    return styles.statusOpen;
  }

  if (status === "COMPLETED") {
    return styles.statusCompleted;
  }

  if (status === "CANCELLED") {
    return styles.statusCancelled;
  }

  return styles.statusNeutral;
}

function displayValue(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : "غير محدد";
}

export function MaintenanceWorkspace({
  allowedCategoryCodes,
  description,
  eyebrow = "تشغيل عملي",
  mode = "list",
  redirectAfterCreate,
  title = "طلبات الصيانة",
}: MaintenanceWorkspaceProps) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [maintenanceTypes, setMaintenanceTypes] = useState<MaintenanceType[]>(
    [],
  );
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [message, setMessage] = useState(
    "جاري تحميل طلبات الصيانة والبيانات المرتبطة بها.",
  );
  const [messageTone, setMessageTone] = useState<"info" | "success" | "error">(
    "info",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const visibleAssets = useMemo(() => {
    return allowedCategoryCodes
      ? assets.filter((asset) =>
          allowedCategoryCodes.includes(asset.assetCategory.code),
        )
      : assets;
  }, [allowedCategoryCodes, assets]);

  const visibleRequests = useMemo(() => {
    return allowedCategoryCodes
      ? requests.filter((request) =>
          allowedCategoryCodes.includes(request.asset.assetCategory.code),
        )
      : requests;
  }, [allowedCategoryCodes, requests]);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return visibleRequests.filter((request) => {
      const matchesStatus =
        statusFilter === "ALL" || request.status === statusFilter;
      const searchableText = [
        request.requestNumber,
        request.description,
        request.asset.internalNumber,
        request.asset.model,
        request.asset.owningOrganizationUnit.name,
        request.maintenanceType.name,
        request.resultNotes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesStatus &&
        (normalizedSearch.length === 0 ||
          searchableText.includes(normalizedSearch))
      );
    });
  }, [searchTerm, statusFilter, visibleRequests]);

  const statusCounts = useMemo(() => {
    return visibleRequests.reduce(
      (counts, request) => {
        counts.total += 1;
        if (request.status === "OPEN") {
          counts.open += 1;
        }
        if (request.status === "COMPLETED") {
          counts.completed += 1;
        }
        if (request.status === "CANCELLED") {
          counts.cancelled += 1;
        }
        return counts;
      },
      { cancelled: 0, completed: 0, open: 0, total: 0 },
    );
  }, [visibleRequests]);

  useEffect(() => {
    let ignore = false;

    Promise.all([
      apiFetch("/assets"),
      apiFetch("/reference-data"),
      apiFetch("/maintenance-requests"),
    ])
      .then(async ([assetsResponse, referencesResponse, requestsResponse]) => {
        if (!assetsResponse.ok || !referencesResponse.ok || !requestsResponse.ok) {
          throw new Error("تعذر تحميل بيانات الصيانة.");
        }

        const [savedAssets, references, savedRequests] = await Promise.all([
          assetsResponse.json() as Promise<AssetOption[]>,
          referencesResponse.json() as Promise<ReferenceData>,
          requestsResponse.json() as Promise<MaintenanceRequest[]>,
        ]);

        return { savedAssets, references, savedRequests };
      })
      .then(({ savedAssets, references, savedRequests }) => {
        if (ignore) {
          return;
        }

        setAssets(savedAssets);
        setMaintenanceTypes(references.maintenanceTypes);
        setRequests(savedRequests);
        setMessage("");
      })
      .catch((error) => {
        if (!ignore) {
          setMessage(
            error instanceof Error
              ? error.message
              : "تعذر تحميل بيانات الصيانة.",
          );
          setMessageTone("error");
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await apiFetch("/maintenance-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message ?? "تعذر حفظ طلب الصيانة.");
      }

      const savedRequest = (await response.json()) as MaintenanceRequest;
      setRequests((currentRequests) => [savedRequest, ...currentRequests]);
      setMessage(
        `تم إنشاء طلب الصيانة ${savedRequest.requestNumber}. يبقى مفتوحاً إلى أن يتم تسجيل نتيجة الصيانة.`,
      );
      setMessageTone("success");
      event.currentTarget.reset();

      if (redirectAfterCreate) {
        router.push(redirectAfterCreate);
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "تعذر حفظ طلب الصيانة.",
      );
      setMessageTone("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className={styles.assetsWorkspace} id="maintenance">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        <span>{filteredRequests.length} من {visibleRequests.length} طلب</span>
      </div>

      {message && (
        <p className={`${styles.notice} ${styles[messageTone]}`}>{message}</p>
      )}

      {mode === "create" && !hasPermission("MAINTENANCE_CREATE") && (
        <p className={styles.formHint}>
          لا تملك صلاحية إنشاء طلبات صيانة. تواصل مع مسؤول النظام إذا كنت
          تحتاج هذه الصلاحية.
        </p>
      )}

      {mode === "create" && hasPermission("MAINTENANCE_CREATE") && (
        <>
          <div className={styles.helperPanel}>
            <strong>ملاحظة إدخال</strong>
            <span>
              عند إنشاء الطلب نسجل المشكلة والكلفة التقديرية فقط. نتيجة الصيانة
              تسجل لاحقاً عند إكمال الطلب.
            </span>
          </div>

          <form className={styles.assetForm} onSubmit={handleSubmit}>
            <label>
              الموجود
              <select name="assetId" required disabled={visibleAssets.length === 0}>
                <option value="">اختر الموجود المطلوب صيانته</option>
                {visibleAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.internalNumber} - {asset.model ?? asset.assetCategory.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              نوع الصيانة
              <select name="maintenanceTypeId" required>
                <option value="">اختر نوع الصيانة</option>
                {maintenanceTypes.map((maintenanceType) => (
                  <option key={maintenanceType.id} value={maintenanceType.id}>
                    {maintenanceType.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              الكلفة التقديرية
              <input
                name="cost"
                placeholder="اختياري"
                type="number"
                min="0"
                step="0.01"
              />
            </label>

            <label className={styles.fullWidth}>
              وصف المشكلة
              <textarea
                name="description"
                placeholder="اكتب المشكلة أو سبب طلب الصيانة بشكل مختصر وواضح"
                rows={3}
                required
              />
            </label>

            {visibleAssets.length === 0 && (
              <p className={styles.formHint}>
                لا توجد موجودات ضمن هذا القسم. أضف موجوداً أولاً حتى يمكن إنشاء
                طلب صيانة.
              </p>
            )}

            <div className={styles.formActions}>
              <button
                type="submit"
                disabled={isSubmitting || visibleAssets.length === 0}
              >
                {isSubmitting ? "جاري الحفظ" : "حفظ طلب الصيانة"}
              </button>
            </div>
          </form>
        </>
      )}

      {mode === "list" && (
        <>
          <div className={styles.maintenanceSummary}>
            <button type="button" onClick={() => setStatusFilter("ALL")}>
              <strong>{statusCounts.total}</strong>
              <span>كل الطلبات</span>
            </button>
            <button type="button" onClick={() => setStatusFilter("OPEN")}>
              <strong>{statusCounts.open}</strong>
              <span>مفتوحة وتحتاج متابعة</span>
            </button>
            <button type="button" onClick={() => setStatusFilter("COMPLETED")}>
              <strong>{statusCounts.completed}</strong>
              <span>مكتملة</span>
            </button>
            <button type="button" onClick={() => setStatusFilter("CANCELLED")}>
              <strong>{statusCounts.cancelled}</strong>
              <span>ملغاة</span>
            </button>
          </div>

          <div className={styles.assetFilters} aria-label="فلاتر الصيانة">
            <label>
              بحث
              <input
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="رقم طلب، رقم موجود، جهة، وصف المشكلة..."
                type="search"
                value={searchTerm}
              />
            </label>
            <label>
              الحالة
              <select
                onChange={(event) => setStatusFilter(event.target.value)}
                value={statusFilter}
              >
                {statusOptions.map((status) => (
                  <option key={status.code} value={status.code}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
              }}
              type="button"
            >
              تصفير الفلاتر
            </button>
          </div>

          <div className={styles.helperPanel}>
            <strong>توضيح الحالة</strong>
            <span>
              الطلب المفتوح ينتظر تنفيذ الصيانة. عند الإكمال يجب كتابة نتيجة
              الصيانة، أما الإلغاء فيستخدم للطلبات غير المنفذة أو المكررة.
            </span>
          </div>

          <div className={styles.assetsTableWrap}>
            <table className={styles.assetsTable}>
              <thead>
                <tr>
                  <th>رقم الطلب</th>
                  <th>الموجود</th>
                  <th>نوع الصيانة</th>
                  <th>الحالة</th>
                  <th>الكلفة</th>
                  <th>الوصف</th>
                  <th>التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => (
                  <tr key={request.id}>
                    <td>{request.requestNumber}</td>
                    <td>
                      <button
                        className={styles.linkButton}
                        onClick={() => router.push(`/assets/${request.asset.id}`)}
                        type="button"
                      >
                        {request.asset.internalNumber}
                      </button>
                    </td>
                    <td>{request.maintenanceType.name}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${getStatusClass(request.status)}`}>
                        {getMaintenanceStatusLabel(request.status)}
                      </span>
                    </td>
                    <td>{displayValue(request.cost)}</td>
                    <td>{request.description}</td>
                    <td>
                      <button
                        className={styles.tableActionButton}
                        onClick={() =>
                          router.push(`/maintenance/requests/${request.id}`)
                        }
                        type="button"
                      >
                        فتح الطلب
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      لا توجد طلبات مطابقة للفلاتر الحالية. جرّب تغيير الحالة أو
                      البحث.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
