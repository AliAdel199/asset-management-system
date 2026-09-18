import { AppShell } from "../../app-shell";
import { AssetsWorkspace } from "../../assets-workspace";

export default function ArchivedLandsPage() {
  return (
    <AppShell active="lands" subtitle="أرشيف الأراضي" title="الأراضي المعطلة">
      <AssetsWorkspace
        allowedCategoryCodes={["LND"]}
        dataEndpoint="/assets/archive"
        description="عرض الأراضي المعطلة من قوائم العمل اليومية مع بقاء التفاصيل والحركات محفوظة."
        detailBasePath="/lands"
        editBasePath="/lands"
        eyebrow="واجهة قراءة فقط"
        mode="list"
        readOnlyList
        title="أرشيف الأراضي"
      />
    </AppShell>
  );
}
