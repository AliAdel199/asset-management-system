import { AppShell } from "../../../app-shell";
import { AssetsWorkspace } from "../../../assets-workspace";

type EditVehiclePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditVehiclePage({ params }: EditVehiclePageProps) {
  const { id } = await params;

  return (
    <AppShell
      active="vehicles"
      subtitle="تعديل سيارة"
      title="تحديث بيانات السيارة"
    >
      <AssetsWorkspace
        allowedCategoryCodes={["VEH"]}
        assetId={id}
        description="هذه الواجهة مخصصة لتعديل بيانات السيارة مع الحفاظ على رقمها الداخلي."
        detailBasePath="/vehicles"
        editBasePath="/vehicles"
        eyebrow="واجهة التعديل"
        mode="edit"
        redirectAfterCreate="/vehicles/:id"
        title="بيانات السيارة القابلة للتعديل"
      />
    </AppShell>
  );
}
