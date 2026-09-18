import { AppShell } from "../../app-shell";
import { AssetsWorkspace } from "../../assets-workspace";

export default function ArchivedPropertiesPage() {
  return (
    <AppShell active="properties" subtitle="أرشيف العقار" title="العقارات والمباني المعطلة">
      <AssetsWorkspace
        allowedCategoryCodes={["BLD"]}
        dataEndpoint="/assets/archive"
        description="عرض العقارات المعطلة من قوائم العمل اليومية مع بقاء التفاصيل والحركات محفوظة."
        detailBasePath="/properties"
        editBasePath="/properties"
        eyebrow="واجهة قراءة فقط"
        mode="list"
        readOnlyList
        title="أرشيف العقار"
      />
    </AppShell>
  );
}
