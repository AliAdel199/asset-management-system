import { AppShell } from "../../app-shell";
import { AssetDetailsView } from "../../asset-details";

type VehicleDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function VehicleDetailsPage({
  params,
}: VehicleDetailsPageProps) {
  const { id } = await params;

  return (
    <AppShell
      active="vehicles"
      subtitle="تفاصيل سيارة"
      title="البيانات الكاملة للسيارة"
    >
      <AssetDetailsView assetId={id} editBasePath="/vehicles" />
    </AppShell>
  );
}
