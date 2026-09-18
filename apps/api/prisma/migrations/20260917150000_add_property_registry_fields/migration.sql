ALTER TABLE "land_asset_details"
  ADD COLUMN IF NOT EXISTS "title_deed_number" TEXT,
  ADD COLUMN IF NOT EXISTS "cadastral_number" TEXT,
  ADD COLUMN IF NOT EXISTS "property_genre" TEXT,
  ADD COLUMN IF NOT EXISTS "ownership_type" TEXT,
  ADD COLUMN IF NOT EXISTS "occupancy_status" TEXT,
  ADD COLUMN IF NOT EXISTS "boundaries" TEXT,
  ADD COLUMN IF NOT EXISTS "latitude" DECIMAL(65,30),
  ADD COLUMN IF NOT EXISTS "longitude" DECIMAL(65,30);

ALTER TABLE "real_estate_asset_details"
  ADD COLUMN IF NOT EXISTS "title_deed_number" TEXT,
  ADD COLUMN IF NOT EXISTS "cadastral_number" TEXT,
  ADD COLUMN IF NOT EXISTS "property_genre" TEXT,
  ADD COLUMN IF NOT EXISTS "ownership_type" TEXT,
  ADD COLUMN IF NOT EXISTS "occupancy_status" TEXT,
  ADD COLUMN IF NOT EXISTS "boundaries" TEXT,
  ADD COLUMN IF NOT EXISTS "latitude" DECIMAL(65,30),
  ADD COLUMN IF NOT EXISTS "longitude" DECIMAL(65,30);
