"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { apiFetch, resolveApiFileUrl } from "./api-client";
import { useAuth } from "./auth-context";
import styles from "./page.module.css";

type NamedReference = {
  id: string;
  name: string;
  code?: string;
};

type Employee = {
  id: string;
  fullName: string;
  employeeNumber: string | null;
  organizationUnit: NamedReference;
};

type MaintenanceRequest = {
  id: string;
  requestNumber: string;
  description: string;
  status: string;
  cost: string | null;
  resultNotes: string | null;
  maintenanceType: { name: string };
};

type AssetMovement = {
  id: string;
  movementType: string;
  documentNumber: string | null;
  notes: string | null;
  createdAt: string;
  fromOrganizationUnit: NamedReference | null;
  toOrganizationUnit: NamedReference | null;
  fromEmployee: Employee | null;
  toEmployee: Employee | null;
  fromStatus: NamedReference | null;
  toStatus: NamedReference | null;
};

type AssetAttachment = {
  id: string;
  attachmentType: string;
  title: string;
  fileUrl: string;
  notes: string | null;
  createdAt: string;
};

type PendingTransferRequest = {
  id: string;
  documentNumber: string | null;
  notes: string | null;
  requestedAt: string;
  fromOrganizationUnit: NamedReference | null;
  toOrganizationUnit: NamedReference;
  requestedByUser: { id: string; fullName: string } | null;
};

type AssetDetails = {
  id: string;
  internalNumber: string;
  qrCodeValue: string | null;
  isDeleted: boolean;
  model: string | null;
  origin: string | null;
  manufactureYear: number | null;
  serialNumber: string | null;
  serialNumberMissing: boolean;
  bookValue: string | null;
  notes: string | null;
  createdAt: string;
  assetCategory: { name: string; code: string };
  assetType: { name: string };
  usageNature: { name: string } | null;
  maintenanceInterval: { name: string } | null;
  status: { id: string; name: string; code: string };
  owningOrganizationUnit: NamedReference;
  currentHolderOrganizationUnit: NamedReference | null;
  currentHolderEmployee: Employee | null;
  generalDetails: {
    assetName: string | null;
    brand: string | null;
    inventoryNumber: string | null;
    locationName: string | null;
    custodianName: string | null;
    conditionNotes: string | null;
  } | null;
  vehicleDetails: {
    plateNumber: string | null;
    chassisNumber: string | null;
    engineNumber: string | null;
    vehicleType: string | null;
    color: string | null;
  } | null;
  landDetails: {
    plotNumber: string | null;
    district: string | null;
    municipality: string | null;
    areaSquareMeters: string | null;
    landUse: string | null;
    titleDeedNumber: string | null;
    cadastralNumber: string | null;
    propertyGenre: string | null;
    ownershipType: string | null;
    occupancyStatus: string | null;
    boundaries: string | null;
    latitude: string | null;
    longitude: string | null;
  } | null;
  realEstateDetails: {
    propertyNumber: string | null;
    address: string | null;
    floorsCount: number | null;
    buildingAreaSquareMeters: string | null;
    constructionYear: number | null;
    titleDeedNumber: string | null;
    cadastralNumber: string | null;
    propertyGenre: string | null;
    ownershipType: string | null;
    occupancyStatus: string | null;
    boundaries: string | null;
    latitude: string | null;
    longitude: string | null;
  } | null;
  maintenanceRequests: MaintenanceRequest[];
  movements: AssetMovement[];
  attachments: AssetAttachment[];
  transferRequests: PendingTransferRequest[];
};

type ReferenceData = {
  assetStatuses: NamedReference[];
  maintenanceTypes: NamedReference[];
  employees: Employee[];
};

type OrganizationUnit = {
  id: string;
  name: string;
  code: string;
};

function displayValue(value: string | number | boolean | null | undefined) {
  if (value === true) {
    return "نعم";
  }

  if (value === false) {
    return "لا";
  }

  return value ?? "غير محدد";
}

function statusLabel(status: string) {
  if (status === "PENDING") {
    return "بانتظار الموافقة";
  }

  if (status === "OPEN") {
    return "مفتوح";
  }

  if (status === "COMPLETED") {
    return "مكتمل";
  }

  if (status === "CANCELLED") {
    return "ملغى";
  }

  if (status === "REJECTED") {
    return "مرفوض";
  }

  return status;
}

function movementTypeLabel(type: string) {
  if (type === "TRANSFER") {
    return "نقل جهة";
  }

  if (type === "ASSIGN") {
    return "تسليم لموظف";
  }

  if (type === "RETURN") {
    return "إرجاع للجهة";
  }

  if (type === "STATUS_CHANGE") {
    return "تغيير حالة";
  }

  if (type === "DEACTIVATE") {
    return "تعطيل الموجود";
  }

  return type;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-IQ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

type ActionTabKey =
  | "transfer"
  | "assign"
  | "status"
  | "maintenance"
  | "deactivate";

const actionTabs: {
  key: ActionTabKey;
  label: string;
  hint: string;
  permission: string;
}[] = [
  {
    key: "transfer",
    label: "نقل إلى جهة",
    hint: "تحويل الموجود بالكامل لجهة أخرى",
    permission: "ASSETS_TRANSFER",
  },
  {
    key: "assign",
    label: "تسليم / إرجاع عهدة",
    hint: "تسليم لموظف أو إرجاع للجهة",
    permission: "ASSETS_ASSIGN",
  },
  {
    key: "status",
    label: "تغيير الحالة",
    hint: "تحديث حالة الموجود الحالية",
    permission: "ASSETS_CHANGE_STATUS",
  },
  {
    key: "maintenance",
    label: "طلب صيانة",
    hint: "فتح طلب صيانة جديد لهذا الموجود",
    permission: "MAINTENANCE_CREATE",
  },
  {
    key: "deactivate",
    label: "طلب شطب",
    hint: "تقديم طلب شطب رسمي بانتظار اعتماد الجهة المخولة",
    permission: "ASSETS_DEACTIVATE",
  },
];

export function AssetDetailsView({
  assetId,
  editBasePath = "/assets",
}: {
  assetId: string;
  editBasePath?: string;
}) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const [asset, setAsset] = useState<AssetDetails | null>(null);
  const [organizationUnits, setOrganizationUnits] = useState<OrganizationUnit[]>([]);
  const [referenceData, setReferenceData] = useState<ReferenceData>({
    assetStatuses: [],
    employees: [],
    maintenanceTypes: [],
  });
  const [message, setMessage] = useState("جاري تحميل بيانات الموجود");
  const [actionMessage, setActionMessage] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const visibleActionTabs = actionTabs.filter((tab) =>
    hasPermission(tab.permission),
  );
  const [activeAction, setActiveAction] = useState<ActionTabKey>(
    () => visibleActionTabs[0]?.key ?? "transfer",
  );
  const [activeHistoryTab, setActiveHistoryTab] = useState<
    "attachments" | "maintenance" | "movements"
  >("attachments");

  const isPropertyAsset =
    asset?.assetCategory.code === "LND" || asset?.assetCategory.code === "BLD";

  const holderLabel = useMemo(() => {
    if (!asset) {
      return "غير محدد";
    }

    if (asset.currentHolderEmployee) {
      return `${asset.currentHolderEmployee.fullName} - ${asset.currentHolderEmployee.organizationUnit.name}`;
    }

    return (
      asset.currentHolderOrganizationUnit?.name ??
      asset.owningOrganizationUnit.name
    );
  }, [asset]);

  useEffect(() => {
    const qrValue = asset?.qrCodeValue ?? asset?.internalNumber;

    if (!qrValue) {
      return;
    }

    let ignore = false;

    QRCode.toDataURL(qrValue, { width: 240, margin: 1 })
      .then((dataUrl) => {
        if (!ignore) {
          setQrCodeDataUrl(dataUrl);
        }
      })
      .catch(() => {
        if (!ignore) {
          setQrCodeDataUrl("");
        }
      });

    return () => {
      ignore = true;
    };
  }, [asset?.internalNumber, asset?.qrCodeValue]);

  function refreshAsset() {
    return apiFetch(`/assets/${assetId}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("تعذر تحميل تفاصيل الموجود.");
        }

        return response.json() as Promise<AssetDetails>;
      })
      .then((data) => {
        setAsset(data);
        setMessage("");
        return data;
      });
  }

  useEffect(() => {
    let ignore = false;

    Promise.all([
      apiFetch("/organization-units"),
      apiFetch("/reference-data"),
      apiFetch(`/assets/${assetId}`),
    ])
      .then(async ([unitsResponse, referencesResponse, assetResponse]) => {
        if (!unitsResponse.ok || !referencesResponse.ok || !assetResponse.ok) {
          throw new Error("تعذر تحميل تفاصيل الموجود.");
        }

        const [units, references, assetDetails] = await Promise.all([
          unitsResponse.json() as Promise<OrganizationUnit[]>,
          referencesResponse.json() as Promise<ReferenceData>,
          assetResponse.json() as Promise<AssetDetails>,
        ]);

        return { assetDetails, references, units };
      })
      .then(({ assetDetails, references, units }) => {
        if (ignore) {
          return;
        }

        setAsset(assetDetails);
        setReferenceData(references);
        setOrganizationUnits(units);
        setMessage("");
      })
      .catch((error) => {
        if (!ignore) {
          setMessage(
            error instanceof Error
              ? error.message
              : "تعذر تحميل تفاصيل الموجود.",
          );
        }
      });

    return () => {
      ignore = true;
    };
  }, [assetId]);

  async function uploadAttachment(
    targetPath: string,
    file: File,
    attachmentType: string,
    title: string,
  ) {
    // نرفق المستند بنفس السجل الذي أنشأه الإجراء (طلب نقل، طلب صيانة، طلب شطب...)
    // وليس بالموجود دائماً، حتى يظهر المرفق مع الطلب نفسه لا في قائمة مرفقات عامة.
    const uploadData = new FormData();
    uploadData.set("attachmentType", attachmentType);
    uploadData.set("title", title);
    uploadData.set("file", file);

    const response = await apiFetch(`/${targetPath}/attachments`, {
      method: "POST",
      body: uploadData,
    });

    if (!response.ok) {
      throw new Error("تم تنفيذ الإجراء، لكن تعذر رفع المرفق المرفق به.");
    }
  }

  async function submitAssetAction(
    event: FormEvent<HTMLFormElement>,
    endpoint: string,
    successMessage: string,
    attachmentType: string,
    attachmentTitle: string,
    method: "POST" | "PATCH" = "POST",
    attachmentTarget: "assets" | "transfer-requests" | "write-off-requests" = "assets",
  ) {
    event.preventDefault();
    setIsSubmitting(true);
    setActionMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    formData.delete("file");
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await apiFetch(`/assets/${assetId}/${endpoint}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message ?? "تعذر تنفيذ الإجراء.");
      }

      if (file instanceof File && file.size > 0) {
        const targetId =
          attachmentTarget === "assets"
            ? assetId
            : ((await response.json()) as { id: string }).id;

        await uploadAttachment(
          `${attachmentTarget}/${targetId}`,
          file,
          attachmentType,
          attachmentTitle,
        );
      }

      await refreshAsset();
      setActionMessage(successMessage);
      form.reset();
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : "تعذر تنفيذ الإجراء.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitMaintenanceRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setActionMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    formData.delete("file");
    const payload = {
      ...Object.fromEntries(formData.entries()),
      assetId,
    };

    try {
      const response = await apiFetch("/maintenance-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message ?? "تعذر إنشاء طلب الصيانة.");
      }

      const savedRequest = (await response.json()) as { id: string };

      if (file instanceof File && file.size > 0) {
        await uploadAttachment(
          `maintenance-requests/${savedRequest.id}`,
          file,
          "OTHER",
          "مرفق طلب الصيانة",
        );
      }

      await refreshAsset();
      setActionMessage(
        "تم إنشاء طلب الصيانة وربطه بالموجود، وهو الآن بانتظار موافقة المسؤول.",
      );
      form.reset();
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : "تعذر إنشاء طلب الصيانة.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!asset) {
    return (
      <section className={styles.assetsWorkspace}>
        <p>{message}</p>
      </section>
    );
  }

  return (
    <>
      <section className={styles.detailHero}>
        <div>
          <p className={styles.eyebrow}>{asset.assetCategory.name}</p>
          <h3>{asset.internalNumber}</h3>
          <span>{asset.assetType.name}</span>
        </div>
        <div className={styles.detailHeroActions}>
          <strong>{asset.status.name}</strong>
          {asset.isDeleted && <span className={styles.statusCancelled}>معطل</span>}
          {!asset.isDeleted && hasPermission("ASSETS_UPDATE") && (
          <button onClick={() => router.push(`${editBasePath}/${asset.id}/edit`)} type="button">
            تعديل
          </button>
          )}
        </div>
      </section>

      <section className={styles.assetsWorkspace}>
        <div className={styles.qrPanel}>
          <div>
            <p className={styles.eyebrow}>QR Code</p>
            <h3>رمز الموجود للطباعة</h3>
            <span>{asset.qrCodeValue ?? asset.internalNumber}</span>
          </div>
          {qrCodeDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={`QR ${asset.internalNumber}`} className={styles.qrImage} src={qrCodeDataUrl} />
          ) : (
            <p>تعذر توليد رمز QR حالياً.</p>
          )}
          <button onClick={() => window.print()} type="button">
            طباعة الرمز
          </button>
        </div>
      </section>

      <section className={styles.detailGrid}>
        <article>
          <h3>البيانات الأساسية</h3>
          <dl>
            <dt>الجهة المالكة</dt>
            <dd>{asset.owningOrganizationUnit.name}</dd>
            <dt>الحائز الحالي</dt>
            <dd>{holderLabel}</dd>
            {!isPropertyAsset && (
              <>
                <dt>الموديل / الوصف</dt>
                <dd>{displayValue(asset.model)}</dd>
                <dt>المنشأ</dt>
                <dd>{displayValue(asset.origin)}</dd>
                <dt>سنة الصنع</dt>
                <dd>{displayValue(asset.manufactureYear)}</dd>
                <dt>الرقم التسلسلي</dt>
                <dd>{displayValue(asset.serialNumber)}</dd>
              </>
            )}
            <dt>القيمة الدفترية</dt>
            <dd>{displayValue(asset.bookValue)}</dd>
            <dt>طبيعة الاستخدام</dt>
            <dd>{displayValue(asset.usageNature?.name)}</dd>
            <dt>دورية الصيانة الوقائية</dt>
            <dd>{displayValue(asset.maintenanceInterval?.name)}</dd>
          </dl>
        </article>

        <article>
          <h3>
            {asset.assetCategory.code === "VEH"
              ? "تفاصيل قسم السيارات"
              : asset.assetCategory.code === "LND"
                ? "تفاصيل قسم الأراضي"
                : asset.assetCategory.code === "BLD"
                  ? "تفاصيل قسم العقار"
                  : "تفاصيل قسم الأجهزة والأثاث"}
          </h3>
          <dl>
            {asset.generalDetails ? (
              <>
                <dt>اسم الموجود</dt>
                <dd>{displayValue(asset.generalDetails.assetName)}</dd>
                <dt>الماركة</dt>
                <dd>{displayValue(asset.generalDetails.brand)}</dd>
                <dt>رقم العهدة</dt>
                <dd>{displayValue(asset.generalDetails.inventoryNumber)}</dd>
                <dt>موقع التواجد</dt>
                <dd>{displayValue(asset.generalDetails.locationName)}</dd>
                <dt>الموظف المستلم</dt>
                <dd>{displayValue(asset.generalDetails.custodianName)}</dd>
                <dt>ملاحظات الحالة</dt>
                <dd>{displayValue(asset.generalDetails.conditionNotes)}</dd>
              </>
            ) : asset.vehicleDetails ? (
              <>
                <dt>رقم اللوحة</dt>
                <dd>{displayValue(asset.vehicleDetails.plateNumber)}</dd>
                <dt>رقم الشاصي</dt>
                <dd>{displayValue(asset.vehicleDetails.chassisNumber)}</dd>
                <dt>رقم المحرك</dt>
                <dd>{displayValue(asset.vehicleDetails.engineNumber)}</dd>
                <dt>نوع السيارة</dt>
                <dd>{displayValue(asset.vehicleDetails.vehicleType)}</dd>
                <dt>اللون</dt>
                <dd>{displayValue(asset.vehicleDetails.color)}</dd>
              </>
            ) : asset.landDetails ? (
              <>
                <dt>رقم القطعة</dt>
                <dd>{displayValue(asset.landDetails.plotNumber)}</dd>
                <dt>المقاطعة</dt>
                <dd>{displayValue(asset.landDetails.district)}</dd>
                <dt>البلدية</dt>
                <dd>{displayValue(asset.landDetails.municipality)}</dd>
                <dt>المساحة م2</dt>
                <dd>{displayValue(asset.landDetails.areaSquareMeters)}</dd>
                <dt>نوع الاستخدام</dt>
                <dd>{displayValue(asset.landDetails.landUse)}</dd>
                <dt>سند الملكية</dt>
                <dd>{displayValue(asset.landDetails.titleDeedNumber)}</dd>
                <dt>رقم المقاطعة</dt>
                <dd>{displayValue(asset.landDetails.cadastralNumber)}</dd>
                <dt>جنس العقار</dt>
                <dd>{displayValue(asset.landDetails.propertyGenre)}</dd>
                <dt>نوع الملكية</dt>
                <dd>{displayValue(asset.landDetails.ownershipType)}</dd>
                <dt>حالة الإشغال</dt>
                <dd>{displayValue(asset.landDetails.occupancyStatus)}</dd>
                <dt>حدود العقار</dt>
                <dd>{displayValue(asset.landDetails.boundaries)}</dd>
                <dt>الإحداثيات</dt>
                <dd>
                  {asset.landDetails.latitude || asset.landDetails.longitude
                    ? `${displayValue(asset.landDetails.latitude)}, ${displayValue(asset.landDetails.longitude)}`
                    : "غير محدد"}
                </dd>
              </>
            ) : asset.realEstateDetails ? (
              <>
                <dt>رقم العقار</dt>
                <dd>{displayValue(asset.realEstateDetails.propertyNumber)}</dd>
                <dt>العنوان</dt>
                <dd>{displayValue(asset.realEstateDetails.address)}</dd>
                <dt>عدد الطوابق</dt>
                <dd>{displayValue(asset.realEstateDetails.floorsCount)}</dd>
                <dt>مساحة البناء م2</dt>
                <dd>{displayValue(asset.realEstateDetails.buildingAreaSquareMeters)}</dd>
                <dt>سنة الإنشاء</dt>
                <dd>{displayValue(asset.realEstateDetails.constructionYear)}</dd>
                <dt>سند الملكية</dt>
                <dd>{displayValue(asset.realEstateDetails.titleDeedNumber)}</dd>
                <dt>رقم المقاطعة</dt>
                <dd>{displayValue(asset.realEstateDetails.cadastralNumber)}</dd>
                <dt>جنس العقار</dt>
                <dd>{displayValue(asset.realEstateDetails.propertyGenre)}</dd>
                <dt>نوع الملكية</dt>
                <dd>{displayValue(asset.realEstateDetails.ownershipType)}</dd>
                <dt>حالة الإشغال</dt>
                <dd>{displayValue(asset.realEstateDetails.occupancyStatus)}</dd>
                <dt>حدود العقار</dt>
                <dd>{displayValue(asset.realEstateDetails.boundaries)}</dd>
                <dt>الإحداثيات</dt>
                <dd>
                  {asset.realEstateDetails.latitude ||
                  asset.realEstateDetails.longitude
                    ? `${displayValue(asset.realEstateDetails.latitude)}, ${displayValue(asset.realEstateDetails.longitude)}`
                    : "غير محدد"}
                </dd>
              </>
            ) : (
              <dd>هذه التفاصيل ستكتمل في واجهة القسم الخاص بهذا النوع.</dd>
            )}
          </dl>
        </article>
      </section>

      {!asset.isDeleted && visibleActionTabs.length > 0 && (
        <section className={styles.assetsWorkspace}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>إجراءات الموجود</p>
              <h3>اختر الإجراء المطلوب تنفيذه</h3>
            </div>
            {actionMessage && <span>{actionMessage}</span>}
          </div>

          <div className={styles.actionTabs} aria-label="اختيار إجراء">
            {visibleActionTabs.map((tab) => (
              <button
                className={
                  activeAction === tab.key ? styles.activeActionTab : ""
                }
                key={tab.key}
                onClick={() => setActiveAction(tab.key)}
                type="button"
              >
                <strong>{tab.label}</strong>
                <span>{tab.hint}</span>
              </button>
            ))}
          </div>

          {activeAction === "transfer" &&
            (asset.transferRequests.length > 0 ? (
              <div className={styles.helperPanel}>
                <div>
                  <strong>
                    يوجد طلب نقل بانتظار الموافقة إلى{" "}
                    {asset.transferRequests[0].toOrganizationUnit.name}
                  </strong>
                  <p>
                    قدّمه {asset.transferRequests[0].requestedByUser?.fullName ?? "غير معروف"}{" "}
                    بتاريخ {formatDate(asset.transferRequests[0].requestedAt)}. لا يمكن
                    إرسال طلب نقل جديد لحين البت بهذا الطلب.
                  </p>
                </div>
              </div>
            ) : (
              <form
                className={styles.compactActionForm}
                onSubmit={(event) =>
                  submitAssetAction(
                    event,
                    "movements/transfer",
                    "تم إرسال طلب النقل، بانتظار موافقة الجهة المخوّلة.",
                    "TRANSFER_BOOK",
                    "كتاب نقل الموجود",
                    "POST",
                    "transfer-requests",
                  )
                }
              >
                <select name="toOrganizationUnitId" required>
                  <option value="">اختر الجهة</option>
                  {organizationUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.code})
                    </option>
                  ))}
                </select>
                <input name="documentNumber" placeholder="رقم الكتاب" type="text" />
                <textarea name="notes" placeholder="ملاحظات النقل" rows={2} />
                <label className={styles.fileFieldLabel}>
                  إرفاق كتاب النقل (اختياري)
                  <input
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    name="file"
                    type="file"
                  />
                </label>
                <button disabled={isSubmitting} type="submit">
                  إرسال طلب النقل
                </button>
              </form>
            ))}

          {activeAction === "assign" && (
            <form
              className={styles.compactActionForm}
              onSubmit={(event) =>
                submitAssetAction(
                  event,
                  "movements/assign",
                  "تم تحديث عهدة الموجود.",
                  "RECEIVING_REPORT",
                  "محضر تسليم/استلام العهدة",
                )
              }
            >
              <select name="toEmployeeId">
                <option value="">إرجاع إلى الجهة بدون موظف</option>
                {referenceData.employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} - {employee.organizationUnit.name}
                  </option>
                ))}
              </select>
              <select name="toOrganizationUnitId">
                <option value="">جهة الإرجاع عند عدم اختيار موظف</option>
                {organizationUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} ({unit.code})
                  </option>
                ))}
              </select>
              <input name="documentNumber" placeholder="رقم محضر التسليم" type="text" />
              <textarea name="notes" placeholder="ملاحظات العهدة" rows={2} />
              <label className={styles.fileFieldLabel}>
                إرفاق محضر التسليم (اختياري)
                <input
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  name="file"
                  type="file"
                />
              </label>
              <button disabled={isSubmitting} type="submit">
                تحديث العهدة
              </button>
            </form>
          )}

          {activeAction === "status" && (
            <form
              className={styles.compactActionForm}
              onSubmit={(event) =>
                submitAssetAction(
                  event,
                  "movements/status",
                  "تم تغيير حالة الموجود.",
                  "OTHER",
                  "مستند تغيير الحالة",
                )
              }
            >
              <select name="statusId" required defaultValue={asset.status.id}>
                {referenceData.assetStatuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
              <input name="documentNumber" placeholder="رقم المستند" type="text" />
              <textarea name="notes" placeholder="سبب تغيير الحالة" rows={2} />
              <label className={styles.fileFieldLabel}>
                إرفاق مستند (اختياري)
                <input
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  name="file"
                  type="file"
                />
              </label>
              <button disabled={isSubmitting} type="submit">
                تحديث الحالة
              </button>
            </form>
          )}

          {activeAction === "maintenance" && (
            <form
              className={styles.compactActionForm}
              onSubmit={submitMaintenanceRequest}
            >
              <select name="maintenanceTypeId" required>
                <option value="">اختر نوع الصيانة</option>
                {referenceData.maintenanceTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              <input name="cost" min="0" placeholder="الكلفة التقديرية" type="number" />
              <textarea name="description" placeholder="وصف المشكلة" required rows={2} />
              <label className={styles.fileFieldLabel}>
                إرفاق مستند (اختياري)
                <input
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  name="file"
                  type="file"
                />
              </label>
              <button disabled={isSubmitting} type="submit">
                إنشاء طلب صيانة
              </button>
            </form>
          )}

          {activeAction === "deactivate" && (
            <form
              className={styles.compactActionForm}
              onSubmit={(event) => {
                if (
                  !window.confirm(
                    "سيتم إرسال طلب شطب هذا الموجود بانتظار اعتماد الجهة المخولة، ولن يتم تعطيله فوراً. هل تريد المتابعة؟",
                  )
                ) {
                  event.preventDefault();
                  return;
                }

                submitAssetAction(
                  event,
                  "deactivate",
                  "تم إرسال طلب الشطب وهو الآن بانتظار الموافقة.",
                  "OTHER",
                  "مستند الشطب",
                  "PATCH",
                  "write-off-requests",
                )
              }}
            >
              <input
                name="documentNumber"
                placeholder="رقم مستند الشطب"
                required
                type="text"
              />
              <textarea
                name="reason"
                placeholder="سبب الشطب وملاحظاته"
                required
                rows={2}
              />
              <label className={styles.fileFieldLabel}>
                إرفاق مستند الشطب (اختياري)
                <input
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  name="file"
                  type="file"
                />
              </label>
              <button disabled={isSubmitting} type="submit">
                إرسال طلب الشطب
              </button>
            </form>
          )}
        </section>
      )}

      <section className={styles.assetsWorkspace}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>سجل الموجود</p>
            <h3>المرفقات، الصيانة، وحركة النقل</h3>
          </div>
        </div>

        <div className={styles.actionTabs} aria-label="اختيار سجل">
          <button
            className={
              activeHistoryTab === "attachments" ? styles.activeActionTab : ""
            }
            onClick={() => setActiveHistoryTab("attachments")}
            type="button"
          >
            <strong>المرفقات</strong>
            <span>{asset.attachments.length} مرفق</span>
          </button>
          <button
            className={
              activeHistoryTab === "maintenance" ? styles.activeActionTab : ""
            }
            onClick={() => setActiveHistoryTab("maintenance")}
            type="button"
          >
            <strong>الصيانة</strong>
            <span>{asset.maintenanceRequests.length} طلب</span>
          </button>
          <button
            className={
              activeHistoryTab === "movements" ? styles.activeActionTab : ""
            }
            onClick={() => setActiveHistoryTab("movements")}
            type="button"
          >
            <strong>سجل الحركة</strong>
            <span>{asset.movements.length} حركة</span>
          </button>
        </div>

        {activeHistoryTab === "attachments" && (
          <div className={styles.assetsTableWrap}>
            <table className={styles.assetsTable}>
              <thead>
                <tr>
                  <th>نوع المرفق</th>
                  <th>العنوان</th>
                  <th>الملف</th>
                  <th>التاريخ</th>
                  <th>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {asset.attachments.map((attachment) => (
                  <tr key={attachment.id}>
                    <td>{attachment.attachmentType}</td>
                    <td>{attachment.title}</td>
                    <td>
                      <a
                        href={resolveApiFileUrl(attachment.fileUrl)}
                        rel="noreferrer"
                        target="_blank"
                      >
                        فتح
                      </a>
                    </td>
                    <td>{formatDate(attachment.createdAt)}</td>
                    <td>{displayValue(attachment.notes)}</td>
                  </tr>
                ))}
                {asset.attachments.length === 0 && (
                  <tr>
                    <td colSpan={5}>لا توجد مرفقات لهذا الموجود بعد.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeHistoryTab === "maintenance" && (
          <div className={styles.assetsTableWrap}>
            <table className={styles.assetsTable}>
              <thead>
                <tr>
                  <th>رقم الطلب</th>
                  <th>نوع الصيانة</th>
                  <th>الحالة</th>
                  <th>الكلفة</th>
                  <th>الوصف</th>
                </tr>
              </thead>
              <tbody>
                {asset.maintenanceRequests.map((request) => (
                  <tr key={request.id}>
                    <td>{request.requestNumber}</td>
                    <td>{request.maintenanceType.name}</td>
                    <td>{statusLabel(request.status)}</td>
                    <td>{displayValue(request.cost)}</td>
                    <td>{request.description}</td>
                  </tr>
                ))}
                {asset.maintenanceRequests.length === 0 && (
                  <tr>
                    <td colSpan={5}>لا توجد طلبات صيانة لهذا الموجود.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeHistoryTab === "movements" && (
          <div className={styles.assetsTableWrap}>
            <table className={styles.assetsTable}>
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>نوع الحركة</th>
                  <th>من</th>
                  <th>إلى</th>
                  <th>المستند</th>
                  <th>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {asset.movements.map((movement) => (
                  <tr key={movement.id}>
                    <td>{formatDate(movement.createdAt)}</td>
                    <td>{movementTypeLabel(movement.movementType)}</td>
                    <td>
                      {movement.fromEmployee?.fullName ??
                        movement.fromOrganizationUnit?.name ??
                        movement.fromStatus?.name ??
                        "غير محدد"}
                    </td>
                    <td>
                      {movement.toEmployee?.fullName ??
                        movement.toOrganizationUnit?.name ??
                        movement.toStatus?.name ??
                        "غير محدد"}
                    </td>
                    <td>{displayValue(movement.documentNumber)}</td>
                    <td>{displayValue(movement.notes)}</td>
                  </tr>
                ))}
                {asset.movements.length === 0 && (
                  <tr>
                    <td colSpan={6}>لا توجد حركات مسجلة لهذا الموجود بعد.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
