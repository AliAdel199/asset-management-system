-- CreateTable
CREATE TABLE "general_asset_details" (
    "asset_id" TEXT NOT NULL,
    "asset_name" TEXT,
    "brand" TEXT,
    "inventory_number" TEXT,
    "location_name" TEXT,
    "custodian_name" TEXT,
    "condition_notes" TEXT,

    CONSTRAINT "general_asset_details_pkey" PRIMARY KEY ("asset_id")
);

-- AddForeignKey
ALTER TABLE "general_asset_details" ADD CONSTRAINT "general_asset_details_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
