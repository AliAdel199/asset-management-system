"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "./api-client";
import styles from "./page.module.css";

type MaintenanceMaterial = {
  id: string;
  materialName: string;
  quantity: string | null;
  unitCost: string;
  notes: string | null;
};

type MaintenanceRequestDetails = {
  id: string;
  requestNumber: string;
  description: string;
  status: string;
  cost: string | null;
  resultNotes: string | null;
  performedAt: string | null;
  asset: {
    id: string;
    internalNumber: string;
    model: string | null;
    assetCategory: { name: string; code: string };
    owningOrganizationUnit: { name: string; code: string };
    status: { id: string; name: string; code: string };
  };
  maintenanceType: { name: string };
  materials: MaintenanceMaterial[];
};

type AssetStatus = {
  id: string;
  name: string;
  code: string;
};

type ReferenceData = {
  assetStatuses: AssetStatus[];
};

type MaterialRow = {
  materialName: string;
  quantity: string;
  unitCost: string;
  notes: string;
};

function statusLabel(status: string) {
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

function displayValue(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : "غير محدد";
}

function materialTotalCost(material: MaintenanceMaterial) {
  const quantity = Number(material.quantity);
  const unitCost = Number(material.unitCost);

  if (!material.quantity || Number.isNaN(quantity) || Number.isNaN(unitCost)) {
    return "غير محدد";
  }

  return (quantity * unitCost).toFixed(2);
}

function emptyMaterial(): MaterialRow {
  return { materialName: "", notes: "", quantity: "1", unitCost: "" };
}

export function MaintenanceRequestDetailsView({
  requestId,
}: {
  requestId: string;
}) {
  const router = useRouter();
  const [request, setRequest] = useState<MaintenanceRequestDetails | null>(null);
  const [message, setMessage] = useState("جاري تحميل تفاصيل طلب الصيانة.");
  const [tone, setTone] = useState<"info" | "success" | "error">("info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [materials, setMaterials] = useState<MaterialRow[]>([emptyMaterial()]);
  const [assetStatuses, setAssetStatuses] = useState<AssetStatus[]>([]);

  const loadRequest = useCallback(() => {
    return apiFetch(`/maintenance-requests/${requestId}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("تعذر تحميل تفاصيل طلب الصيانة.");
        }

        return response.json() as Promise<MaintenanceRequestDetails>;
      })
      .then((data) => {
        setRequest(data);
        setMaterials(
          data.materials.length > 0
            ? data.materials.map((material) => ({
                materialName: material.materialName,
                notes: material.notes ?? "",
                quantity: material.quantity ?? "1",
                unitCost: material.unitCost,
              }))
            : [emptyMaterial()],
        );
        setMessage("");
      });
  }, [requestId]);

  useEffect(() => {
    let ignore = false;

    apiFetch("/reference-data")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("تعذر تحميل حالات الموجود.");
        }

        return response.json() as Promise<ReferenceData>;
      })
      .then((data) => {
        if (!ignore) {
          setAssetStatuses(data.assetStatuses);
        }
      })
      .catch(() => {
        if (!ignore) {
          setAssetStatuses([]);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    loadRequest().catch((error) => {
      if (!ignore) {
        setMessage(
          error instanceof Error
            ? error.message
            : "تعذر تحميل تفاصيل طلب الصيانة.",
        );
        setTone("error");
      }
    });

    return () => {
      ignore = true;
    };
  }, [loadRequest, requestId]);

  function updateMaterial(index: number, key: keyof MaterialRow, value: string) {
    setMaterials((currentMaterials) =>
      currentMaterials.map((material, currentIndex) =>
        currentIndex === index ? { ...material, [key]: value } : material,
      ),
    );
  }

  async function updateStatus(
    status: "COMPLETED" | "CANCELLED",
    formData?: FormData,
  ) {
    const resultNotes = formData?.get("resultNotes")?.toString().trim() ?? "";

    if (status === "COMPLETED" && resultNotes.length === 0) {
      setMessage("الملاحظة النهائية / نتيجة الصيانة مطلوبة عند إكمال الطلب.");
      setTone("error");
      return;
    }

    if (
      status === "COMPLETED" &&
      !formData?.get("finalAssetStatusId")?.toString()
    ) {
      setMessage("اختر حالة الموجود بعد انتهاء الصيانة.");
      setTone("error");
      return;
    }

    const cleanedMaterials = materials
      .filter((material) => material.materialName.trim().length > 0)
      .map((material) => ({
        materialName: material.materialName,
        notes: material.notes,
        quantity: material.quantity,
        unitCost: material.unitCost,
      }));

    const missingCost = cleanedMaterials.some(
      (material) => material.unitCost.trim().length === 0,
    );

    if (status === "COMPLETED" && missingCost) {
      setMessage("كل مادة مستخدمة تحتاج كلفة مادة.");
      setTone("error");
      return;
    }

    const missingQuantity = cleanedMaterials.some(
      (material) =>
        material.quantity.trim().length === 0 ||
        Number(material.quantity) <= 0,
    );

    if (status === "COMPLETED" && missingQuantity) {
      setMessage("كل مادة مستخدمة تحتاج كمية أكبر من صفر.");
      setTone("error");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await apiFetch(
        `/maintenance-requests/${requestId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            cost: formData?.get("cost") ?? null,
            finalAssetStatusId: formData?.get("finalAssetStatusId") ?? null,
            materials: status === "COMPLETED" ? cleanedMaterials : [],
            resultNotes,
          }),
        },
      );

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message ?? "تعذر تحديث طلب الصيانة.");
      }

      await loadRequest();
      setMessage(
        status === "COMPLETED"
          ? "تم إكمال طلب الصيانة وتسجيل المواد والنتيجة النهائية."
          : "تم إلغاء طلب الصيانة.",
      );
      setTone("success");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "تعذر تحديث طلب الصيانة.",
      );
      setTone("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!request) {
    return (
      <section className={styles.assetsWorkspace}>
        <p className={`${styles.notice} ${styles[tone]}`}>{message}</p>
      </section>
    );
  }

  return (
    <>
      <section className={styles.detailHero}>
        <div>
          <p className={styles.eyebrow}>{request.maintenanceType.name}</p>
          <h3>{request.requestNumber}</h3>
          <span>{request.asset.internalNumber} - {request.asset.model ?? request.asset.assetCategory.name}</span>
        </div>
        <div className={styles.detailHeroActions}>
          <strong>{statusLabel(request.status)}</strong>
          <button
            onClick={() => router.push(`/assets/${request.asset.id}`)}
            type="button"
          >
            الموجود
          </button>
        </div>
      </section>

      {message && (
        <p className={`${styles.notice} ${styles[tone]}`}>{message}</p>
      )}

      <section className={styles.detailGrid}>
        <article>
          <h3>بيانات الطلب</h3>
          <dl>
            <dt>الموجود</dt>
            <dd>{request.asset.internalNumber}</dd>
            <dt>الجهة</dt>
            <dd>{request.asset.owningOrganizationUnit.name}</dd>
            <dt>نوع الصيانة</dt>
            <dd>{request.maintenanceType.name}</dd>
            <dt>الحالة</dt>
            <dd>{statusLabel(request.status)}</dd>
            <dt>حالة الموجود الحالية</dt>
            <dd>{request.asset.status.name}</dd>
            <dt>الكلفة النهائية</dt>
            <dd>{displayValue(request.cost)}</dd>
          </dl>
        </article>

        <article>
          <h3>المشكلة والنتيجة</h3>
          <dl>
            <dt>وصف المشكلة</dt>
            <dd>{request.description}</dd>
            <dt>نتيجة الصيانة</dt>
            <dd>{displayValue(request.resultNotes)}</dd>
          </dl>
        </article>
      </section>

      {request.status === "OPEN" && (
        <section className={styles.assetsWorkspace}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>إكمال الصيانة</p>
              <h3>المواد المستخدمة والنتيجة النهائية</h3>
            </div>
          </div>

          <form
            className={styles.assetForm}
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              updateStatus("COMPLETED", new FormData(event.currentTarget));
            }}
          >
            <label>
              الكلفة النهائية
              <input name="cost" min="0" step="0.01" type="number" />
            </label>

            <label>
              حالة الموجود بعد الصيانة
              <select
                name="finalAssetStatusId"
                required
                defaultValue={
                  assetStatuses.find((status) => status.code === "WORKING")
                    ?.id ?? ""
                }
              >
                <option value="">اختر الحالة النهائية</option>
                {assetStatuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.fullWidth}>
              الملاحظة النهائية / نتيجة الصيانة
              <textarea
                name="resultNotes"
                placeholder="مثال: تم تبديل القطعة وفحص الموجود ويعمل بصورة طبيعية"
                required
                rows={3}
              />
            </label>

            <div className={styles.formDivider}>
              <strong>مواد الصيانة</strong>
              <span>أدخل المواد المستخدمة وكلفة كل مادة. يمكن ترك الجدول فارغاً إذا لم تستخدم مواد.</span>
            </div>

            <div className={styles.materialRows}>
              {materials.map((material, index) => (
                <div className={styles.materialRow} key={index}>
                  <input
                    onChange={(event) =>
                      updateMaterial(index, "materialName", event.target.value)
                    }
                    placeholder="اسم المادة"
                    value={material.materialName}
                  />
                  <input
                    min="0.01"
                    onChange={(event) =>
                      updateMaterial(index, "quantity", event.target.value)
                    }
                    placeholder="الكمية"
                    required={material.materialName.trim().length > 0}
                    step="0.01"
                    type="number"
                    value={material.quantity}
                  />
                  <input
                    min="0"
                    onChange={(event) =>
                      updateMaterial(index, "unitCost", event.target.value)
                    }
                    placeholder="كلفة المادة"
                    step="0.01"
                    type="number"
                    value={material.unitCost}
                  />
                  <input
                    onChange={(event) =>
                      updateMaterial(index, "notes", event.target.value)
                    }
                    placeholder="ملاحظة"
                    value={material.notes}
                  />
                  <button
                    onClick={() =>
                      setMaterials((currentMaterials) =>
                        currentMaterials.filter((_, currentIndex) => currentIndex !== index),
                      )
                    }
                    type="button"
                  >
                    حذف
                  </button>
                </div>
              ))}
            </div>

            <div className={styles.formActions}>
              <button
                onClick={() => setMaterials((current) => [...current, emptyMaterial()])}
                type="button"
              >
                إضافة مادة
              </button>
              <button disabled={isSubmitting} type="submit">
                {isSubmitting ? "جاري الإكمال" : "إكمال الصيانة"}
              </button>
              <button
                disabled={isSubmitting}
                onClick={() => updateStatus("CANCELLED")}
                type="button"
              >
                إلغاء الطلب
              </button>
            </div>
          </form>
        </section>
      )}

      <section className={styles.assetsWorkspace}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>مواد الصيانة</p>
            <h3>المواد المسجلة على الطلب</h3>
          </div>
          <span>{request.materials.length} مادة</span>
        </div>
        <div className={styles.assetsTableWrap}>
          <table className={styles.assetsTable}>
            <thead>
              <tr>
                <th>المادة</th>
                <th>الكمية</th>
                <th>سعر الوحدة</th>
                <th>الإجمالي</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {request.materials.map((material) => (
                <tr key={material.id}>
                  <td>{material.materialName}</td>
                  <td>{displayValue(material.quantity)}</td>
                  <td>{material.unitCost}</td>
                  <td>{materialTotalCost(material)}</td>
                  <td>{displayValue(material.notes)}</td>
                </tr>
              ))}
              {request.materials.length === 0 && (
                <tr>
                  <td colSpan={5}>لا توجد مواد مسجلة لهذا الطلب.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
