import { AppShell } from "../../app-shell";
import { AssetsWorkspace } from "../../assets-workspace";

export default function NewAssetPage() {
  return (
    <AppShell
      active="assets"
      subtitle="إضافة موجود"
      title="تسجيل جهاز أو أثاث جديد"
    >
      <AssetsWorkspace
        allowedCategoryCodes={["DEV", "FUR"]}
        description="هذه الواجهة مخصصة للإضافة فقط. بعد الحفظ يرجع النظام إلى سجل الموجودات."
        eyebrow="واجهة الإضافة"
        mode="create"
        redirectAfterCreate="/assets"
        title="بيانات الجهاز أو الأثاث"
      />
    </AppShell>
  );
}
