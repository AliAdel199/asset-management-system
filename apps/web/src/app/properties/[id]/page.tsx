import { AppShell } from "../../app-shell";
import { AssetDetailsView } from "../../asset-details";

type PropertyDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PropertyDetailsPage({
  params,
}: PropertyDetailsPageProps) {
  const { id } = await params;

  return (
    <AppShell active="properties" subtitle="تفاصيل عقار" title="البيانات الكاملة للعقار">
      <AssetDetailsView assetId={id} editBasePath="/properties" />
    </AppShell>
  );
}
