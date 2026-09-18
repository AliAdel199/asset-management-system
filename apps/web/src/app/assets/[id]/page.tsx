import { AppShell } from "../../app-shell";
import { AssetDetailsView } from "../../asset-details";

export default async function AssetDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AppShell
      active="assets"
      subtitle="تفاصيل موجود"
      title="البيانات الكاملة للموجود"
    >
      <AssetDetailsView assetId={id} />
    </AppShell>
  );
}
