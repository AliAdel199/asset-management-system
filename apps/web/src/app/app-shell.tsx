"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./auth-context";
import { navIcons } from "./nav-icons";
import styles from "./page.module.css";

type AppShellProps = {
  active:
    | "dashboard"
    | "assets"
    | "vehicles"
    | "lands"
    | "properties"
    | "maintenance"
    | "reports"
    | "audit-log"
    | "transfer-requests"
    | "admin";
  badge?: string;
  children: React.ReactNode;
  subtitle: string;
  title: string;
};

const navItems = [
  { key: "dashboard", href: "/dashboard", label: "لوحة التحكم" },
  { key: "assets", href: "/assets", label: "الموجودات" },
  { key: "vehicles", href: "/vehicles", label: "السيارات" },
  { key: "lands", href: "/lands", label: "الأراضي" },
  { key: "properties", href: "/properties", label: "العقار" },
  { key: "maintenance", href: "/maintenance", label: "الصيانة" },
  {
    key: "transfer-requests",
    href: "/transfer-requests",
    label: "اعتماد النقل",
    permission: "ASSETS_TRANSFER_APPROVE",
  },
  { key: "reports", href: "/reports", label: "التقارير" },
  {
    key: "audit-log",
    href: "/audit-log",
    label: "سجل التدقيق",
    permission: "AUDIT_LOG_VIEW",
  },
  {
    key: "admin",
    href: "/admin",
    label: "الإدارة",
    permissions: [
      "USERS_MANAGE",
      "ROLES_MANAGE",
      "ORG_UNITS_MANAGE",
      "ASSET_CATALOG_MANAGE",
    ],
  },
] as const;

export function AppShell({
  active,
  badge = "MVP",
  children,
  subtitle,
  title,
}: AppShellProps) {
  const router = useRouter();
  const { hasPermission, logout, status, user } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  if (status !== "authenticated") {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p>جاري التحقق من تسجيل الدخول...</p>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <p className={styles.eyebrow}>نظام حكومي</p>
          <h1>إدارة الموجودات</h1>
        </div>
        <nav className={styles.nav} aria-label="القائمة الرئيسية">
          {navItems
            .filter((item) => {
              if ("permissions" in item) {
                return item.permissions.some((code) => hasPermission(code));
              }

              return !("permission" in item) || hasPermission(item.permission);
            })
            .map((item) => (
              <Link
                className={item.key === active ? styles.activeNav : ""}
                href={item.href}
                key={item.key}
              >
                <span className={styles.navIcon} aria-hidden="true">
                  {navIcons[item.key]}
                </span>
                {item.label}
              </Link>
            ))}
        </nav>
        {user && (
          <div className={styles.sidebarUser}>
            <strong>{user.fullName}</strong>
            <span>{user.username}</span>
            <button onClick={logout} type="button">
              تسجيل الخروج
            </button>
          </div>
        )}
      </aside>

      <main className={styles.main}>
        <section className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{subtitle}</p>
            <h2>{title}</h2>
          </div>
          <span className={styles.status}>{badge}</span>
        </section>

        {children}
      </main>
    </div>
  );
}
