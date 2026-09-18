import { AppShell } from "../../../app-shell";
import { AssetsWorkspace } from "../../../assets-workspace";

type EditLandPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditLandPage({ params }: EditLandPageProps) {
  const { id } = await params;

  return (
    <AppShell active="lands" subtitle="تعديل أرض" title="تحديث بيانات الأرض">
      <AssetsWorkspace
        allowedCategoryCodes={["LND"]}
        assetId={id}
        description="هذه الواجهة مخصصة لتعديل بيانات الأرض مع الحفاظ على رقمها الداخلي."
        detailBasePath="/lands"
        editBasePath="/lands"
        eyebrow="واجهة التعديل"
        mode="edit"
        redirectAfterCreate="/lands/:id"
        title="بيانات الأرض القابلة للتعديل"
      />
    </AppShell>
  );
}
