"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch } from "./api-client";
import { useAuth } from "./auth-context";
import styles from "./page.module.css";

type OrganizationUnit = {
  id: string;
  name: string;
  code: string;
};

type AssetType = {
  id: string;
  name: string;
  assetCategoryId: string;
};

type AssetCategory = {
  id: string;
  name: string;
  code: string;
  assetTypes: AssetType[];
};

type AssetStatus = {
  id: string;
  name: string;
  code: string;
};

type UsageNature = {
  id: string;
  name: string;
};

type MaintenanceInterval = {
  id: string;
  name: string;
  monthsCount: number;
};

type ReferenceData = {
  assetCategories: AssetCategory[];
  usageNatures: UsageNature[];
  assetStatuses: AssetStatus[];
  maintenanceIntervals: MaintenanceInterval[];
};

type Asset = {
  id: string;
  internalNumber: string;
  isDeleted: boolean;
  bookValue: string | null;
  origin: string | null;
  manufactureYear: number | null;
  model: string | null;
  notes: string | null;
  serialNumber: string | null;
  serialNumberMissing: boolean;
  usageNature: { id: string; name: string } | null;
  maintenanceInterval: { id: string; name: string } | null;
  assetCategory: { id: string; name: string; code: string };
  assetType: { id: string; name: string };
  status: { id: string; name: string; code: string };
  owningOrganizationUnit: { id: string; name: string; code: string };
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
};

type AssetsWorkspaceProps = {
  allowedCategoryCodes?: string[];
  assetId?: string;
  createHref?: string;
  createLabel?: string;
  dataEndpoint?: string;
  description?: string;
  detailBasePath?: string;
  editBasePath?: string;
  eyebrow?: string;
  mode?: "list" | "create" | "edit";
  readOnlyList?: boolean;
  redirectAfterCreate?: string;
  title?: string;
};

const sectionNames: Record<string, string> = {
  DEV: "قسم الأجهزة",
  FUR: "قسم الأثاث",
  VEH: "قسم السيارات",
  LND: "قسم الأراضي",
  BLD: "قسم العقار",
  MED: "قسم الأجهزة الطبية",
  ELEC: "قسم الأجهزة الكهربائية",
};

function getAssetSectionDetails(asset: Asset) {
  // عرض مختصر حسب قسم الموجود، والتفاصيل الكاملة تبقى محفوظة بجداولها الخاصة.
  if (asset.generalDetails) {
    return [
      asset.generalDetails.inventoryNumber &&
        `عهدة ${asset.generalDetails.inventoryNumber}`,
      asset.generalDetails.locationName,
      asset.generalDetails.custodianName,
    ]
      .filter(Boolean)
      .join(" - ");
  }

  if (asset.vehicleDetails) {
    return [
      asset.vehicleDetails.plateNumber &&
        `لوحة ${asset.vehicleDetails.plateNumber}`,
      asset.vehicleDetails.vehicleType,
      asset.vehicleDetails.color,
    ]
      .filter(Boolean)
      .join(" - ");
  }

  if (asset.landDetails) {
    return [
      asset.landDetails.plotNumber && `قطعة ${asset.landDetails.plotNumber}`,
      asset.landDetails.district,
      asset.landDetails.areaSquareMeters &&
        `${asset.landDetails.areaSquareMeters} م2`,
    ]
      .filter(Boolean)
      .join(" - ");
  }

  if (asset.realEstateDetails) {
    return [
      asset.realEstateDetails.propertyNumber &&
        `عقار ${asset.realEstateDetails.propertyNumber}`,
      asset.realEstateDetails.address,
      asset.realEstateDetails.floorsCount &&
        `${asset.realEstateDetails.floorsCount} طابق`,
    ]
      .filter(Boolean)
      .join(" - ");
  }

  return "عام";
}

export function AssetsWorkspace({
  allowedCategoryCodes,
  assetId,
  createHref = "/assets/new",
  createLabel = "إضافة موجود جديد",
  dataEndpoint = "/assets",
  description,
  detailBasePath = "/assets",
  editBasePath = detailBasePath,
  eyebrow = "تشغيل عملي",
  mode = "list",
  readOnlyList = false,
  redirectAfterCreate,
  title = "إضافة موجود جديد",
}: AssetsWorkspaceProps) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const [organizationUnits, setOrganizationUnits] = useState<OrganizationUnit[]>(
    [],
  );
  const [referenceData, setReferenceData] = useState<ReferenceData>({
    assetCategories: [],
    usageNatures: [],
    assetStatuses: [],
    maintenanceIntervals: [],
  });
  const [assets, setAssets] = useState<Asset[]>([]);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [activeCategoryCode, setActiveCategoryCode] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedAssetTypeId, setSelectedAssetTypeId] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = mode === "edit";
  const isFormMode = mode === "create" || isEditMode;
  const canSubmitForm = hasPermission(
    isEditMode ? "ASSETS_UPDATE" : "ASSETS_CREATE",
  );

  const allowedCategorySet = useMemo(
    () => new Set(allowedCategoryCodes),
    [allowedCategoryCodes],
  );

  const visibleCategories = useMemo(() => {
    if (!allowedCategoryCodes) {
      return referenceData.assetCategories;
    }

    return referenceData.assetCategories.filter((category) =>
      allowedCategorySet.has(category.code),
    );
  }, [allowedCategoryCodes, allowedCategorySet, referenceData.assetCategories]);

  const visibleAssets = useMemo(() => {
    if (!allowedCategoryCodes) {
      return assets;
    }

    return assets.filter((asset) =>
      allowedCategorySet.has(asset.assetCategory.code),
    );
  }, [allowedCategoryCodes, allowedCategorySet, assets]);

  const filteredAssets = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return visibleAssets.filter((asset) => {
      const matchesCategory =
        activeCategoryCode === "ALL" ||
        asset.assetCategory.code === activeCategoryCode;
      const matchesStatus =
        statusFilter === "ALL" || asset.status.code === statusFilter;
      const searchableText = [
        asset.internalNumber,
        asset.model,
        asset.serialNumber,
        asset.assetCategory.name,
        asset.assetType.name,
        asset.status.name,
        asset.owningOrganizationUnit.name,
        asset.generalDetails?.assetName,
        asset.generalDetails?.brand,
        asset.generalDetails?.inventoryNumber,
        asset.generalDetails?.locationName,
        asset.generalDetails?.custodianName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesCategory &&
        matchesStatus &&
        (normalizedSearch.length === 0 ||
          searchableText.includes(normalizedSearch))
      );
    });
  }, [activeCategoryCode, searchTerm, statusFilter, visibleAssets]);

  const selectedCategory = useMemo(
    // اختيار التصنيف يحدد أنواع المواد المتاحة في القائمة التالية.
    () =>
      visibleCategories.find((category) => category.id === selectedCategoryId),
    [selectedCategoryId, visibleCategories],
  );

  const selectedSectionName =
    sectionNames[selectedCategory?.code ?? ""] ?? "قسم الموجودات العام";
  const selectedCategoryIsProperty =
    selectedCategory?.code === "LND" || selectedCategory?.code === "BLD";
  const listIsPropertyOnly =
    allowedCategoryCodes?.length === 1 &&
    (allowedCategoryCodes[0] === "LND" || allowedCategoryCodes[0] === "BLD");

  const selectedAssetTypeBelongsToCategory = selectedCategory?.assetTypes.some(
    (assetType) => assetType.id === selectedAssetTypeId,
  );

  const effectiveAssetTypeId = selectedAssetTypeBelongsToCategory
    ? selectedAssetTypeId
    : (selectedCategory?.assetTypes[0]?.id ?? "");

  const assetsByCategoryCode = useMemo(() => {
    return visibleAssets.reduce<Record<string, number>>((counts, asset) => {
      counts[asset.assetCategory.code] =
        (counts[asset.assetCategory.code] ?? 0) + 1;
      return counts;
    }, {});
  }, [visibleAssets]);

  useEffect(() => {
    let ignore = false;
    const assetDetailsRequest =
      isEditMode && assetId
        ? apiFetch(`/assets/${assetId}`)
        : Promise.resolve(null);

    // عند فتح الصفحة نجلب الجهات، البيانات المرجعية، والموجودات المسجلة بالتوازي.
    Promise.all([
      apiFetch("/organization-units"),
      apiFetch("/reference-data"),
      apiFetch(dataEndpoint),
      assetDetailsRequest,
    ])
      .then(async ([
        unitsResponse,
        referenceResponse,
        assetsResponse,
        assetDetailsResponse,
      ]) => {
        if (
          !unitsResponse.ok ||
          !referenceResponse.ok ||
          !assetsResponse.ok ||
          (assetDetailsResponse && !assetDetailsResponse.ok)
        ) {
          throw new Error("تعذر تحميل بيانات الموجودات.");
        }

        const [units, references, savedAssets] = await Promise.all([
          unitsResponse.json() as Promise<OrganizationUnit[]>,
          referenceResponse.json() as Promise<ReferenceData>,
          assetsResponse.json() as Promise<Asset[]>,
        ]);
        const assetDetails = assetDetailsResponse
          ? ((await assetDetailsResponse.json()) as Asset)
          : null;

        return { units, references, savedAssets, assetDetails };
      })
      .then(({ units, references, savedAssets, assetDetails }) => {
        if (ignore) {
          return;
        }

        setOrganizationUnits(units);
        setReferenceData(references);
        setAssets(savedAssets);
        setEditingAsset(assetDetails);
        setActiveCategoryCode("ALL");
        // نختار أول تصنيف تلقائياً حتى يكون النموذج جاهزاً للإدخال مباشرة.
        const firstAllowedCategory = references.assetCategories.find(
          (category) =>
            allowedCategoryCodes
              ? allowedCategoryCodes.includes(category.code)
              : true,
        );
        const nextCategoryId =
          assetDetails?.assetCategory.id ?? firstAllowedCategory?.id ?? "";
        const nextCategory =
          references.assetCategories.find(
            (category) => category.id === nextCategoryId,
          ) ?? firstAllowedCategory;

        setSelectedCategoryId(nextCategoryId);
        setSelectedAssetTypeId(
          assetDetails?.assetType.id ?? nextCategory?.assetTypes[0]?.id ?? "",
        );
      })
      .catch(() => {
        if (!ignore) {
          setMessage("تعذر تحميل بيانات الموجودات.");
        }
      });

    return () => {
      // يمنع تحديث الحالة إذا تغيرت الصفحة قبل اكتمال تحميل البيانات.
      ignore = true;
    };
  }, [allowedCategoryCodes, assetId, dataEndpoint, isEditMode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setIsSubmitting(true);
    setMessage("");

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      // نرسل بيانات النموذج إلى NestJS، والخدمة الخلفية تتولى التحقق وتوليد الرقم.
      const response = await apiFetch(isEditMode && assetId ? `/assets/${assetId}` : "/assets", {
        method: isEditMode ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          serialNumberMissing: formData.get("serialNumberMissing") === "on",
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message ?? "تعذر حفظ الموجود.");
      }

      const savedAsset = (await response.json()) as Asset;
      // نضيف السجل الجديد أعلى الجدول مباشرة حتى يرى المستخدم نتيجة الحفظ فوراً.
      setAssets((currentAssets) =>
        isEditMode
          ? currentAssets.map((asset) =>
              asset.id === savedAsset.id ? savedAsset : asset,
            )
          : [savedAsset, ...currentAssets],
      );
      setEditingAsset(savedAsset);
      setMessage(
        isEditMode
          ? `تم تحديث الموجود رقم ${savedAsset.internalNumber}`
          : `تم حفظ الموجود برقم ${savedAsset.internalNumber}`,
      );

      if (!isEditMode && !redirectAfterCreate) {
        form.reset();
        setSelectedCategoryId(visibleCategories[0]?.id ?? "");
        setSelectedAssetTypeId(visibleCategories[0]?.assetTypes[0]?.id ?? "");
      }

      if (redirectAfterCreate) {
        router.push(redirectAfterCreate.replace(":id", savedAsset.id));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حفظ الموجود.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isEditMode && !editingAsset) {
    return (
      <section className={styles.assetsWorkspace} id="assets">
        <p>{message || "جاري تحميل بيانات الموجود للتعديل."}</p>
      </section>
    );
  }

  if (isEditMode && editingAsset?.isDeleted) {
    return (
      <section className={styles.assetsWorkspace} id="assets">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>موجود مؤرشف</p>
            <h3>{editingAsset.internalNumber}</h3>
            <p>هذا الموجود معطل ولا يمكن تعديل بياناته من واجهة العمل اليومية.</p>
          </div>
          <button
            onClick={() => router.push(`${detailBasePath}/${editingAsset.id}`)}
            type="button"
          >
            فتح التفاصيل
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.assetsWorkspace} id="assets">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        <div className={styles.headerActions}>
          <span>{filteredAssets.length} من {visibleAssets.length} موجود</span>
          {mode === "list" && !readOnlyList && hasPermission("ASSETS_CREATE") && (
            <button onClick={() => router.push(createHref)} type="button">
              {createLabel}
            </button>
          )}
        </div>
      </div>

      {mode === "list" && (
        <>
        <div className={styles.domainModules} aria-label="أقسام الموجودات">
          <button
            className={activeCategoryCode === "ALL" ? styles.activeDomain : ""}
            onClick={() => setActiveCategoryCode("ALL")}
            type="button"
          >
            <strong>كل الأقسام</strong>
            <span>{visibleAssets.length} مسجل</span>
          </button>
          {visibleCategories.map((category) => (
            <button
              className={
                category.code === activeCategoryCode ? styles.activeDomain : ""
              }
              key={category.id}
              onClick={() => setActiveCategoryCode(category.code)}
              type="button"
            >
              <strong>{sectionNames[category.code] ?? category.name}</strong>
              <span>{assetsByCategoryCode[category.code] ?? 0} مسجل</span>
            </button>
          ))}
        </div>

        <div className={styles.assetFilters} aria-label="فلاتر الموجودات">
          <label>
            بحث
            <input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="رقم داخلي، اسم، عهدة، موقع، مستلم..."
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
              <option value="ALL">كل الحالات</option>
              {referenceData.assetStatuses.map((status) => (
                <option key={status.id} value={status.code}>
                  {status.name}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => {
              setActiveCategoryCode("ALL");
              setSearchTerm("");
              setStatusFilter("ALL");
            }}
            type="button"
          >
            تصفير الفلاتر
          </button>
        </div>
        </>
      )}

      {isFormMode && !canSubmitForm && (
        <p className={styles.formHint}>
          لا تملك صلاحية {isEditMode ? "تعديل" : "إضافة"} موجودات. تواصل مع
          مسؤول النظام إذا كنت تحتاج هذه الصلاحية.
        </p>
      )}

      {isFormMode && canSubmitForm && (
        <div className={styles.domainModules} aria-label="أقسام التسجيل">
        {visibleCategories.map((category) => (
          <button
            className={
              category.id === selectedCategoryId ? styles.activeDomain : ""
            }
            key={category.id}
              onClick={() => {
                setSelectedCategoryId(category.id);
                setSelectedAssetTypeId(category.assetTypes[0]?.id ?? "");
              }}
            type="button"
          >
            <strong>{sectionNames[category.code] ?? category.name}</strong>
            <span>{assetsByCategoryCode[category.code] ?? 0} مسجل</span>
          </button>
        ))}
        </div>
      )}

      {isFormMode && canSubmitForm && (
        <form
          className={styles.assetForm}
          key={editingAsset?.id ?? "new-asset"}
          onSubmit={handleSubmit}
        >
        <p className={styles.formLegend}>
          الحقول المؤشر عليها بـ <span className={styles.requiredMark}>*</span>{" "}
          إلزامية، وباقي الحقول اختيارية.
        </p>

        <div className={styles.formDivider}>
          <strong>البيانات المرجعية</strong>
          <span>حقول ربط إدارية مطلوبة لتصنيف الموجود وتوليد رقمه.</span>
        </div>

        <label>
          الجهة<span className={styles.requiredMark}>*</span>
          <select
            defaultValue={editingAsset?.owningOrganizationUnit.id}
            name="owningOrganizationUnitId"
            required
          >
            {organizationUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.code})
              </option>
            ))}
          </select>
        </label>

        <label>
          التصنيف<span className={styles.requiredMark}>*</span>
          <select
            name="assetCategoryId"
            required
            value={selectedCategoryId}
            onChange={(event) => {
              const nextCategoryId = event.target.value;
              const nextCategory = visibleCategories.find(
                (category) => category.id === nextCategoryId,
              );

              setSelectedCategoryId(nextCategoryId);
              setSelectedAssetTypeId(nextCategory?.assetTypes[0]?.id ?? "");
            }}
          >
            {visibleCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          نوع المادة<span className={styles.requiredMark}>*</span>
          <select
            name="assetTypeId"
            onChange={(event) => setSelectedAssetTypeId(event.target.value)}
            required
            value={effectiveAssetTypeId}
          >
            {selectedCategory?.assetTypes.map((assetType) => (
              <option key={assetType.id} value={assetType.id}>
                {assetType.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          الحالة<span className={styles.requiredMark}>*</span>
          <select defaultValue={editingAsset?.status.id} name="statusId" required>
            {referenceData.assetStatuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          طبيعة الاستخدام
          <select defaultValue={editingAsset?.usageNature?.id ?? ""} name="usageNatureId">
            <option value="">غير محدد</option>
            {referenceData.usageNatures.map((usageNature) => (
              <option key={usageNature.id} value={usageNature.id}>
                {usageNature.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          دورية الصيانة الوقائية
          <select
            defaultValue={editingAsset?.maintenanceInterval?.id ?? ""}
            name="maintenanceIntervalId"
          >
            <option value="">بدون تنبيهات دورية</option>
            {referenceData.maintenanceIntervals.map((interval) => (
              <option key={interval.id} value={interval.id}>
                {interval.name}
              </option>
            ))}
          </select>
        </label>

        {!selectedCategoryIsProperty && (
          <details className={styles.collapsibleSection} open={isEditMode}>
            <summary>
              بيانات الموجود (اختياري): الموديل، المنشأ، سنة الصنع، الرقم
              التسلسلي
            </summary>
            <div className={styles.collapsibleContent}>
              <label>
                الموديل / الوصف المختصر
                <input
                  defaultValue={editingAsset?.model ?? ""}
                  name="model"
                  type="text"
                />
              </label>

              <label>
                الشركة المصنعة / المنشأ
                <input
                  defaultValue={editingAsset?.origin ?? ""}
                  name="origin"
                  type="text"
                />
              </label>

              <label>
                سنة الصنع
                <input
                  defaultValue={editingAsset?.manufactureYear ?? ""}
                  name="manufactureYear"
                  type="number"
                  min="1900"
                  max="2100"
                />
              </label>

              <label>
                الرقم التسلسلي
                <input
                  defaultValue={editingAsset?.serialNumber ?? ""}
                  name="serialNumber"
                  type="text"
                />
              </label>
            </div>
          </details>
        )}

        <label>
          القيمة الدفترية
          <input
            defaultValue={editingAsset?.bookValue ?? ""}
            name="bookValue"
            type="number"
            min="0"
            step="0.01"
          />
        </label>

        <div className={styles.formDivider}>
          <strong>{selectedSectionName}</strong>
          <span>هذه الحقول إدخال مباشر، وليست قوائم اختيار.</span>
        </div>

        {selectedCategory &&
          selectedCategory.code !== "VEH" &&
          selectedCategory.code !== "LND" &&
          selectedCategory.code !== "BLD" && (
          <>
            <label>
              اسم الموجود
              <input
                defaultValue={editingAsset?.generalDetails?.assetName ?? ""}
                name="generalAssetName"
                type="text"
              />
            </label>
            <label>
              الماركة
              <input
                defaultValue={editingAsset?.generalDetails?.brand ?? ""}
                name="generalBrand"
                type="text"
              />
            </label>
            <label>
              رقم العهدة
              <input
                defaultValue={
                  editingAsset?.generalDetails?.inventoryNumber ?? ""
                }
                name="generalInventoryNumber"
                type="text"
              />
            </label>
            <label>
              موقع التواجد
              <input
                defaultValue={editingAsset?.generalDetails?.locationName ?? ""}
                name="generalLocationName"
                type="text"
              />
            </label>
            <label>
              الموظف المستلم
              <input
                defaultValue={editingAsset?.generalDetails?.custodianName ?? ""}
                name="generalCustodianName"
                type="text"
              />
            </label>
            <label className={styles.fullWidth}>
              ملاحظات الحالة
              <textarea
                defaultValue={
                  editingAsset?.generalDetails?.conditionNotes ?? ""
                }
                name="generalConditionNotes"
                rows={2}
              />
            </label>
          </>
        )}

        {selectedCategory?.code === "VEH" && (
          <>
            <label>
              رقم اللوحة
              <input
                defaultValue={editingAsset?.vehicleDetails?.plateNumber ?? ""}
                name="vehiclePlateNumber"
                type="text"
              />
            </label>
            <label>
              رقم الشاصي
              <input
                defaultValue={editingAsset?.vehicleDetails?.chassisNumber ?? ""}
                name="vehicleChassisNumber"
                type="text"
              />
            </label>
            <label>
              رقم المحرك
              <input
                defaultValue={editingAsset?.vehicleDetails?.engineNumber ?? ""}
                name="vehicleEngineNumber"
                type="text"
              />
            </label>
            <label>
              نوع السيارة
              <input
                defaultValue={editingAsset?.vehicleDetails?.vehicleType ?? ""}
                name="vehicleType"
                type="text"
              />
            </label>
            <label>
              اللون
              <input
                defaultValue={editingAsset?.vehicleDetails?.color ?? ""}
                name="vehicleColor"
                type="text"
              />
            </label>
          </>
        )}

        {selectedCategory?.code === "LND" && (
          <>
            <label>
              رقم القطعة
              <input
                defaultValue={editingAsset?.landDetails?.plotNumber ?? ""}
                name="landPlotNumber"
                type="text"
              />
            </label>
            <label>
              المقاطعة
              <input
                defaultValue={editingAsset?.landDetails?.district ?? ""}
                name="landDistrict"
                type="text"
              />
            </label>
            <label>
              البلدية
              <input
                defaultValue={editingAsset?.landDetails?.municipality ?? ""}
                name="landMunicipality"
                type="text"
              />
            </label>
            <label>
              المساحة م2
              <input
                defaultValue={editingAsset?.landDetails?.areaSquareMeters ?? ""}
                name="landAreaSquareMeters"
                type="number"
                min="0"
              />
            </label>
            <label>
              نوع الاستخدام
              <input
                defaultValue={editingAsset?.landDetails?.landUse ?? ""}
                name="landUse"
                type="text"
              />
            </label>
            <details
              className={styles.collapsibleSection}
              open={isEditMode}
            >
              <summary>
                بيانات تسجيل إضافية (اختياري): سند الملكية، رقم المقاطعة،
                جنس العقار، نوع الملكية، حالة الإشغال، الحدود، الإحداثيات
              </summary>
              <div className={styles.collapsibleContent}>
                <label>
                  سند الملكية
                  <input
                    defaultValue={
                      editingAsset?.landDetails?.titleDeedNumber ?? ""
                    }
                    name="landTitleDeedNumber"
                    type="text"
                  />
                </label>
                <label>
                  رقم المقاطعة
                  <input
                    defaultValue={
                      editingAsset?.landDetails?.cadastralNumber ?? ""
                    }
                    name="landCadastralNumber"
                    type="text"
                  />
                </label>
                <label>
                  جنس العقار
                  <input
                    defaultValue={
                      editingAsset?.landDetails?.propertyGenre ?? ""
                    }
                    name="landPropertyGenre"
                    type="text"
                  />
                </label>
                <label>
                  نوع الملكية
                  <input
                    defaultValue={
                      editingAsset?.landDetails?.ownershipType ?? ""
                    }
                    name="landOwnershipType"
                    type="text"
                  />
                </label>
                <label>
                  حالة الإشغال
                  <input
                    defaultValue={
                      editingAsset?.landDetails?.occupancyStatus ?? ""
                    }
                    name="landOccupancyStatus"
                    type="text"
                  />
                </label>
                <label className={styles.fullWidth}>
                  حدود العقار
                  <textarea
                    defaultValue={editingAsset?.landDetails?.boundaries ?? ""}
                    name="landBoundaries"
                    rows={2}
                  />
                </label>
                <label>
                  خط العرض (Latitude)
                  <input
                    defaultValue={editingAsset?.landDetails?.latitude ?? ""}
                    name="landLatitude"
                    type="number"
                    min="-90"
                    max="90"
                    step="any"
                  />
                </label>
                <label>
                  خط الطول (Longitude)
                  <input
                    defaultValue={editingAsset?.landDetails?.longitude ?? ""}
                    name="landLongitude"
                    type="number"
                    min="-180"
                    max="180"
                    step="any"
                  />
                </label>
              </div>
            </details>
          </>
        )}

        {selectedCategory?.code === "BLD" && (
          <>
            <label>
              رقم العقار
              <input
                defaultValue={
                  editingAsset?.realEstateDetails?.propertyNumber ?? ""
                }
                name="realEstatePropertyNumber"
                type="text"
              />
            </label>
            <label>
              العنوان
              <input
                defaultValue={editingAsset?.realEstateDetails?.address ?? ""}
                name="realEstateAddress"
                type="text"
              />
            </label>
            <label>
              عدد الطوابق
              <input
                defaultValue={
                  editingAsset?.realEstateDetails?.floorsCount ?? ""
                }
                name="realEstateFloorsCount"
                type="number"
                min="0"
              />
            </label>
            <label>
              مساحة البناء م2
              <input
                name="realEstateBuildingAreaSquareMeters"
                defaultValue={
                  editingAsset?.realEstateDetails
                    ?.buildingAreaSquareMeters ?? ""
                }
                type="number"
                min="0"
              />
            </label>
            <label>
              سنة الإنشاء
              <input
                name="realEstateConstructionYear"
                defaultValue={
                  editingAsset?.realEstateDetails?.constructionYear ?? ""
                }
                type="number"
                min="1800"
                max="2100"
              />
            </label>
            <details
              className={styles.collapsibleSection}
              open={isEditMode}
            >
              <summary>
                بيانات تسجيل إضافية (اختياري): سند الملكية، رقم المقاطعة،
                جنس العقار، نوع الملكية، حالة الإشغال، الحدود، الإحداثيات
              </summary>
              <div className={styles.collapsibleContent}>
                <label>
                  سند الملكية
                  <input
                    defaultValue={
                      editingAsset?.realEstateDetails?.titleDeedNumber ?? ""
                    }
                    name="realEstateTitleDeedNumber"
                    type="text"
                  />
                </label>
                <label>
                  رقم المقاطعة
                  <input
                    defaultValue={
                      editingAsset?.realEstateDetails?.cadastralNumber ?? ""
                    }
                    name="realEstateCadastralNumber"
                    type="text"
                  />
                </label>
                <label>
                  جنس العقار
                  <input
                    defaultValue={
                      editingAsset?.realEstateDetails?.propertyGenre ?? ""
                    }
                    name="realEstatePropertyGenre"
                    type="text"
                  />
                </label>
                <label>
                  نوع الملكية
                  <input
                    defaultValue={
                      editingAsset?.realEstateDetails?.ownershipType ?? ""
                    }
                    name="realEstateOwnershipType"
                    type="text"
                  />
                </label>
                <label>
                  حالة الإشغال
                  <input
                    defaultValue={
                      editingAsset?.realEstateDetails?.occupancyStatus ?? ""
                    }
                    name="realEstateOccupancyStatus"
                    type="text"
                  />
                </label>
                <label className={styles.fullWidth}>
                  حدود العقار
                  <textarea
                    defaultValue={
                      editingAsset?.realEstateDetails?.boundaries ?? ""
                    }
                    name="realEstateBoundaries"
                    rows={2}
                  />
                </label>
                <label>
                  خط العرض (Latitude)
                  <input
                    defaultValue={
                      editingAsset?.realEstateDetails?.latitude ?? ""
                    }
                    name="realEstateLatitude"
                    type="number"
                    min="-90"
                    max="90"
                    step="any"
                  />
                </label>
                <label>
                  خط الطول (Longitude)
                  <input
                    defaultValue={
                      editingAsset?.realEstateDetails?.longitude ?? ""
                    }
                    name="realEstateLongitude"
                    type="number"
                    min="-180"
                    max="180"
                    step="any"
                  />
                </label>
              </div>
            </details>
          </>
        )}

        {!selectedCategoryIsProperty && (
        <label className={styles.checkboxLabel}>
          <input
            defaultChecked={editingAsset?.serialNumberMissing ?? false}
            name="serialNumberMissing"
            type="checkbox"
          />
          الرقم التسلسلي غير متوفر
        </label>
        )}

        <label className={styles.fullWidth}>
          ملاحظات
          <textarea defaultValue={editingAsset?.notes ?? ""} name="notes" rows={3} />
        </label>

        <div className={styles.formActions}>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isEditMode
                ? "جاري التحديث"
                : "جاري الحفظ"
              : isEditMode
                ? "تحديث الموجود"
                : "حفظ الموجود"}
          </button>
          {message && <p>{message}</p>}
        </div>
        </form>
      )}

      {mode === "list" && (
        <div className={styles.assetsTableWrap}>
        <table className={styles.assetsTable}>
          <thead>
            <tr>
              <th>الرقم الداخلي</th>
              <th>التصنيف</th>
              <th>نوع المادة</th>
              <th>الجهة</th>
              <th>الحالة</th>
              <th>تفاصيل القسم</th>
              {!listIsPropertyOnly && <th>الرقم التسلسلي</th>}
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssets.map((asset) => (
              <tr
                className={styles.clickableRow}
                key={asset.id}
                onClick={() => router.push(`${detailBasePath}/${asset.id}`)}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    router.push(`${detailBasePath}/${asset.id}`);
                  }
                }}
              >
                <td>{asset.internalNumber}</td>
                <td>{asset.assetCategory.name}</td>
                <td>{asset.assetType.name}</td>
                <td>{asset.owningOrganizationUnit.name}</td>
                <td>{asset.status.name}</td>
                <td>{getAssetSectionDetails(asset)}</td>
                {!listIsPropertyOnly && (
                  <td>{asset.serialNumber || "غير متوفر"}</td>
                )}
                <td>
                  {!asset.isDeleted &&
                    !readOnlyList &&
                    hasPermission("ASSETS_UPDATE") && (
                  <button
                    className={styles.tableActionButton}
                    onClick={(event) => {
                      event.stopPropagation();
                      router.push(`${editBasePath}/${asset.id}/edit`);
                    }}
                    onKeyDown={(event) => event.stopPropagation()}
                    type="button"
                  >
                    تعديل
                  </button>
                  )}
                </td>
              </tr>
            ))}
            {filteredAssets.length === 0 && (
              <tr>
                <td colSpan={listIsPropertyOnly ? 7 : 8}>لا توجد موجودات مسجلة بعد.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      )}
    </section>
  );
}
