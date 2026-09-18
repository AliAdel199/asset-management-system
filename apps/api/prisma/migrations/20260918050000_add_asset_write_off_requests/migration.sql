CREATE TABLE IF NOT EXISTS "asset_write_off_requests" (
  "id" TEXT NOT NULL,
  "asset_id" TEXT NOT NULL,
  "organization_unit_id" TEXT NOT NULL,
  "document_number" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requested_by_user_id" TEXT,
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decided_by_user_id" TEXT,
  "decided_at" TIMESTAMP(3),
  "decision_notes" TEXT,

  CONSTRAINT "asset_write_off_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "asset_write_off_requests_asset_id_idx" ON "asset_write_off_requests"("asset_id");
CREATE INDEX IF NOT EXISTS "asset_write_off_requests_status_idx" ON "asset_write_off_requests"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'asset_write_off_requests_asset_id_fkey'
  ) THEN
    ALTER TABLE "asset_write_off_requests"
    ADD CONSTRAINT "asset_write_off_requests_asset_id_fkey"
    FOREIGN KEY ("asset_id") REFERENCES "assets"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'asset_write_off_requests_organization_unit_id_fkey'
  ) THEN
    ALTER TABLE "asset_write_off_requests"
    ADD CONSTRAINT "asset_write_off_requests_organization_unit_id_fkey"
    FOREIGN KEY ("organization_unit_id") REFERENCES "organization_units"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'asset_write_off_requests_requested_by_user_id_fkey'
  ) THEN
    ALTER TABLE "asset_write_off_requests"
    ADD CONSTRAINT "asset_write_off_requests_requested_by_user_id_fkey"
    FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'asset_write_off_requests_decided_by_user_id_fkey'
  ) THEN
    ALTER TABLE "asset_write_off_requests"
    ADD CONSTRAINT "asset_write_off_requests_decided_by_user_id_fkey"
    FOREIGN KEY ("decided_by_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
