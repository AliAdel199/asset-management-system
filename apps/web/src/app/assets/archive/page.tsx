import { AppShell } from "../../app-shell";
import { AssetsWorkspace } from "../../assets-workspace";

export default function ArchivedAssetsPage() {
  return (
    <AppShell
      active="assets"
      subtitle="أرشيف الموجودات"
      title="الموجودات المعطلة"
    >
      <AssetsWorkspace
        allowedCategoryCodes={["DEV", "FUR"]}
        dataEndpoint="/assets/archive"
        description="عرض الموجودات التي تم تعطيلها من سجل العمل اليومي، مع بقاء تفاصيلها وسجل حركتها محفوظاً."
        detailBasePath="/assets"
        eyebrow="واجهة قراءة فقط"
        mode="list"
        readOnlyList
        title="أرشيف الأجهزة والأثاث"
      />
    </AppShell>
  );
}
