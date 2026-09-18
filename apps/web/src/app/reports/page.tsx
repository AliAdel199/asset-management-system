"use client";

import { useState } from "react";
import { AppShell } from "../app-shell";
import { InventoryReport } from "../inventory-report";
import { MaintenanceReport } from "../maintenance-report";
import { MovementReport } from "../movement-report";
import { WriteOffReport } from "../write-off-report";
import styles from "../page.module.css";

type ReportTab = "inventory" | "maintenance" | "movements" | "write-offs";

const TABS: { id: ReportTab; label: string }[] = [
  { id: "inventory", label: "كشف الجرد" },
  { id: "maintenance", label: "الصيانة" },
  { id: "movements", label: "النقل والتسليم" },
  { id: "write-offs", label: "الشطب" },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("inventory");

  return (
    <AppShell
      active="reports"
      subtitle="التقارير"
      title="مركز التقارير حسب الجهة والتصنيف والحالة والصيانة"
    >
      <div className={styles.reportControls} aria-label="أقسام التقارير">
        {TABS.map((tab) => (
          <button
            aria-pressed={activeTab === tab.id}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "inventory" && <InventoryReport />}
      {activeTab === "maintenance" && <MaintenanceReport />}
      {activeTab === "movements" && <MovementReport />}
      {activeTab === "write-offs" && <WriteOffReport />}
    </AppShell>
  );
}
