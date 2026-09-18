import { AppShell } from "../../app-shell";
import { AssetsWorkspace } from "../../assets-workspace";

export default function ArchivedVehiclesPage() {
  return (
    <AppShell
      active="vehicles"
      subtitle="أرشيف السيارات"
      title="السيارات والعجلات المعطلة"
    >
      <AssetsWorkspace
        allowedCategoryCodes={["VEH"]}
        dataEndpoint="/assets/archive"
        description="عرض السيارات التي خرجت من قوائم العمل اليومية، مع بقاء تفاصيل اللوحة والشاصي وسجل الحركة محفوظة."
        detailBasePath="/vehicles"
        editBasePath="/vehicles"
        eyebrow="واجهة قراءة فقط"
        mode="list"
        readOnlyList
        title="أرشيف السيارات"
      />
    </AppShell>
  );
}
