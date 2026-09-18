import { AppShell } from "../../../app-shell";
import { AssetsWorkspace } from "../../../assets-workspace";

type EditPropertyPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPropertyPage({
  params,
}: EditPropertyPageProps) {
  const { id } = await params;

  return (
    <AppShell active="properties" subtitle="تعديل عقار" title="تحديث بيانات العقار">
      <AssetsWorkspace
        allowedCategoryCodes={["BLD"]}
        assetId={id}
        description="هذه الواجهة مخصصة لتعديل بيانات العقار مع الحفاظ على رقمه الداخلي."
        detailBasePath="/properties"
        editBasePath="/properties"
        eyebrow="واجهة التعديل"
        mode="edit"
        redirectAfterCreate="/properties/:id"
        title="بيانات العقار القابلة للتعديل"
      />
    </AppShell>
  );
}
