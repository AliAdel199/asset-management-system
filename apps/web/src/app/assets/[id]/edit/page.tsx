import { AppShell } from "../../../app-shell";
import { AssetsWorkspace } from "../../../assets-workspace";

type EditAssetPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditAssetPage({ params }: EditAssetPageProps) {
  const { id } = await params;

  return (
    <AppShell
      active="assets"
      subtitle="تعديل موجود"
      title="تحديث بيانات الموجود"
    >
      <AssetsWorkspace
        assetId={id}
        description="هذه الواجهة مخصصة لتعديل بيانات الموجود مع الحفاظ على رقمه الداخلي."
        eyebrow="واجهة التعديل"
        mode="edit"
        redirectAfterCreate="/assets/:id"
        title="بيانات الموجود القابلة للتعديل"
      />
    </AppShell>
  );
}
