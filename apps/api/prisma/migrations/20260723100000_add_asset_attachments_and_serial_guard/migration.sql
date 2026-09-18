CREATE TABLE IF NOT EXISTS "asset_attachments" (
  "id" TEXT NOT NULL,
  "asset_id" TEXT NOT NULL,
  "attachment_type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "file_url" TEXT NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "asset_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "asset_attachments_asset_id_idx" ON "asset_attachments"("asset_id");
CREATE INDEX IF NOT EXISTS "asset_attachments_attachment_type_idx" ON "asset_attachments"("attachment_type");

CREATE UNIQUE INDEX IF NOT EXISTS "assets_active_serial_number_unique"
ON "assets"("serial_number")
WHERE "serial_number" IS NOT NULL AND "is_deleted" = false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'asset_attachments_asset_id_fkey'
  ) THEN
    ALTER TABLE "asset_attachments"
    ADD CONSTRAINT "asset_attachments_asset_id_fkey"
    FOREIGN KEY ("asset_id") REFERENCES "assets"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
