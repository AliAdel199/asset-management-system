ALTER TABLE "assets"
  ADD COLUMN IF NOT EXISTS "maintenance_interval_id" TEXT;

CREATE INDEX IF NOT EXISTS "assets_maintenance_interval_id_idx" ON "assets"("maintenance_interval_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assets_maintenance_interval_id_fkey'
  ) THEN
    ALTER TABLE "assets"
    ADD CONSTRAINT "assets_maintenance_interval_id_fkey"
    FOREIGN KEY ("maintenance_interval_id") REFERENCES "maintenance_intervals"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
