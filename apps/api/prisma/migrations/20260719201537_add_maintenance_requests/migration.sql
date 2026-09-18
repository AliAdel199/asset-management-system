-- CreateTable
CREATE TABLE "maintenance_requests" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "maintenance_type_id" TEXT NOT NULL,
    "request_number" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "cost" DECIMAL(65,30),
    "result_notes" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_requests_request_number_key" ON "maintenance_requests"("request_number");

-- CreateIndex
CREATE INDEX "maintenance_requests_asset_id_idx" ON "maintenance_requests"("asset_id");

-- CreateIndex
CREATE INDEX "maintenance_requests_maintenance_type_id_idx" ON "maintenance_requests"("maintenance_type_id");

-- CreateIndex
CREATE INDEX "maintenance_requests_status_idx" ON "maintenance_requests"("status");

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_maintenance_type_id_fkey" FOREIGN KEY ("maintenance_type_id") REFERENCES "maintenance_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
