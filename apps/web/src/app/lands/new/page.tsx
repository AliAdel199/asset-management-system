import { AppShell } from "../../app-shell";
import { AssetsWorkspace } from "../../assets-workspace";

export default function NewLandPage() {
  return (
    <AppShell active="lands" subtitle="إضافة أرض" title="تسجيل أرض حكومية جديدة">
      <AssetsWorkspace
        allowedCategoryCodes={["LND"]}
        description="هذه الواجهة مخصصة لإضافة الأراضي فقط. بعد الحفظ يفتح النظام تفاصيل الأرض المسجلة."
        detailBasePath="/lands"
        editBasePath="/lands"
        eyebrow="واجهة الإضافة"
        mode="create"
        redirectAfterCreate="/lands/:id"
        title="بيانات الأرض"
      />
    </AppShell>
  );
}
