-- CreateIndex
CREATE INDEX "asset_transfer_requests_to_organization_unit_id_idx" ON "asset_transfer_requests"("to_organization_unit_id");

-- CreateIndex
CREATE INDEX "asset_write_off_requests_organization_unit_id_idx" ON "asset_write_off_requests"("organization_unit_id");
