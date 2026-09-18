-- CreateTable
CREATE TABLE "vehicle_asset_details" (
    "asset_id" TEXT NOT NULL,
    "plate_number" TEXT,
    "chassis_number" TEXT,
    "engine_number" TEXT,
    "vehicle_type" TEXT,
    "color" TEXT,

    CONSTRAINT "vehicle_asset_details_pkey" PRIMARY KEY ("asset_id")
);

-- CreateTable
CREATE TABLE "land_asset_details" (
    "asset_id" TEXT NOT NULL,
    "plot_number" TEXT,
    "district" TEXT,
    "municipality" TEXT,
    "area_square_meters" DECIMAL(65,30),
    "land_use" TEXT,

    CONSTRAINT "land_asset_details_pkey" PRIMARY KEY ("asset_id")
);

-- CreateTable
CREATE TABLE "real_estate_asset_details" (
    "asset_id" TEXT NOT NULL,
    "property_number" TEXT,
    "address" TEXT,
    "floors_count" INTEGER,
    "building_area_square_meters" DECIMAL(65,30),
    "construction_year" INTEGER,

    CONSTRAINT "real_estate_asset_details_pkey" PRIMARY KEY ("asset_id")
);

-- AddForeignKey
ALTER TABLE "vehicle_asset_details" ADD CONSTRAINT "vehicle_asset_details_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_asset_details" ADD CONSTRAINT "land_asset_details_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "real_estate_asset_details" ADD CONSTRAINT "real_estate_asset_details_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
