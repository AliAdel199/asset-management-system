import { AppShell } from "../../app-shell";
import { AssetsWorkspace } from "../../assets-workspace";

export default function NewPropertyPage() {
  return (
    <AppShell active="properties" subtitle="إضافة عقار" title="تسجيل عقار أو مبنى جديد">
      <AssetsWorkspace
        allowedCategoryCodes={["BLD"]}
        description="هذه الواجهة مخصصة لإضافة العقارات والمباني فقط. بعد الحفظ يفتح النظام تفاصيل العقار."
        detailBasePath="/properties"
        editBasePath="/properties"
        eyebrow="واجهة الإضافة"
        mode="create"
        redirectAfterCreate="/properties/:id"
        title="بيانات العقار"
      />
    </AppShell>
  );
}
