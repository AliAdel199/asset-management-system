-- DropIndex
DROP INDEX "assets_maintenance_interval_id_idx";

-- AlterTable
ALTER TABLE "asset_attachments" ADD COLUMN     "maintenance_request_id" TEXT,
ADD COLUMN     "transfer_request_id" TEXT,
ADD COLUMN     "write_off_request_id" TEXT,
ALTER COLUMN "asset_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "asset_attachments_maintenance_request_id_idx" ON "asset_attachments"("maintenance_request_id");

-- CreateIndex
CREATE INDEX "asset_attachments_transfer_request_id_idx" ON "asset_attachments"("transfer_request_id");

-- CreateIndex
CREATE INDEX "asset_attachments_write_off_request_id_idx" ON "asset_attachments"("write_off_request_id");

-- AddForeignKey
ALTER TABLE "asset_attachments" ADD CONSTRAINT "asset_attachments_maintenance_request_id_fkey" FOREIGN KEY ("maintenance_request_id") REFERENCES "maintenance_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_attachments" ADD CONSTRAINT "asset_attachments_transfer_request_id_fkey" FOREIGN KEY ("transfer_request_id") REFERENCES "asset_transfer_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_attachments" ADD CONSTRAINT "asset_attachments_write_off_request_id_fkey" FOREIGN KEY ("write_off_request_id") REFERENCES "asset_write_off_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
