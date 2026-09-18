"use client";

import { useMemo, useState } from "react";
import { useAuth } from "./auth-context";
import { AdminAssetCatalogPanel } from "./admin-asset-catalog";
import { AdminOrganizationUnitsPanel } from "./admin-org-units";
import { AdminRolesPanel } from "./admin-roles";
import { AdminUsersPanel } from "./admin-users";
import styles from "./page.module.css";

type AdminTabKey = "users" | "roles" | "org-units" | "asset-catalog";

const adminTabs: {
  key: AdminTabKey;
  label: string;
  hint: string;
  permission: string;
}[] = [
  {
    key: "users",
    label: "المستخدمون",
    hint: "إضافة المستخدمين وتحديد أدوارهم",
    permission: "USERS_MANAGE",
  },
  {
    key: "roles",
    label: "الأدوار والصلاحيات",
    hint: "تحديد صلاحيات كل دور",
    permission: "ROLES_MANAGE",
  },
  {
    key: "org-units",
    label: "الهيكل الإداري",
    hint: "الأقسام والشعب والجهات التابعة",
    permission: "ORG_UNITS_MANAGE",
  },
  {
    key: "asset-catalog",
    label: "أصناف الموجودات",
    hint: "أصناف وأنواع المواد",
    permission: "ASSET_CATALOG_MANAGE",
  },
];

export function AdminWorkspace() {
  const { hasPermission } = useAuth();
  const visibleTabs = useMemo(
    () => adminTabs.filter((tab) => hasPermission(tab.permission)),
    [hasPermission],
  );
  const [activeTab, setActiveTab] = useState<AdminTabKey>(
    () => visibleTabs[0]?.key ?? "users",
  );

  if (visibleTabs.length === 0) {
    return (
      <section className={styles.assetsWorkspace}>
        <p className={`${styles.notice} ${styles.error}`}>
          لا تملك صلاحية الوصول إلى أي من أقسام الإدارة.
        </p>
      </section>
    );
  }

  const currentTab = visibleTabs.some((tab) => tab.key === activeTab)
    ? activeTab
    : visibleTabs[0].key;

  return (
    <>
      <div className={styles.actionTabs} aria-label="أقسام الإدارة">
        {visibleTabs.map((tab) => (
          <button
            className={currentTab === tab.key ? styles.activeActionTab : ""}
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            type="button"
          >
            <strong>{tab.label}</strong>
            <span>{tab.hint}</span>
          </button>
        ))}
      </div>

      {currentTab === "users" && <AdminUsersPanel />}
      {currentTab === "roles" && <AdminRolesPanel />}
      {currentTab === "org-units" && <AdminOrganizationUnitsPanel />}
      {currentTab === "asset-catalog" && <AdminAssetCatalogPanel />}
    </>
  );
}
