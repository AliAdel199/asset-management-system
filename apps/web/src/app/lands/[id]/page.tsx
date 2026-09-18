import { AppShell } from "../../app-shell";
import { AssetDetailsView } from "../../asset-details";

type LandDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function LandDetailsPage({ params }: LandDetailsPageProps) {
  const { id } = await params;

  return (
    <AppShell active="lands" subtitle="تفاصيل أرض" title="البيانات الكاملة للأرض">
      <AssetDetailsView assetId={id} editBasePath="/lands" />
    </AppShell>
  );
}
