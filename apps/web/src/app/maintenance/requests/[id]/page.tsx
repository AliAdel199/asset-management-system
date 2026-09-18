import { AppShell } from "../../../app-shell";
import { MaintenanceRequestDetailsView } from "../../../maintenance-request-details";

type MaintenanceRequestPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MaintenanceRequestPage({
  params,
}: MaintenanceRequestPageProps) {
  const { id } = await params;

  return (
    <AppShell
      active="maintenance"
      subtitle="تفاصيل طلب صيانة"
      title="إكمال ومتابعة طلب الصيانة"
    >
      <MaintenanceRequestDetailsView requestId={id} />
    </AppShell>
  );
}
