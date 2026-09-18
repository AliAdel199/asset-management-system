CREATE TABLE "asset_movements" (
  "id" TEXT NOT NULL,
  "asset_id" TEXT NOT NULL,
  "movement_type" TEXT NOT NULL,
  "from_organization_unit_id" TEXT,
  "to_organization_unit_id" TEXT,
  "from_employee_id" TEXT,
  "to_employee_id" TEXT,
  "from_status_id" TEXT,
  "to_status_id" TEXT,
  "document_number" TEXT,
  "notes" TEXT,
  "created_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "asset_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "asset_movements_asset_id_idx" ON "asset_movements"("asset_id");
CREATE INDEX "asset_movements_movement_type_idx" ON "asset_movements"("movement_type");
CREATE INDEX "asset_movements_created_at_idx" ON "asset_movements"("created_at");

ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_from_organization_unit_id_fkey" FOREIGN KEY ("from_organization_unit_id") REFERENCES "organization_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_to_organization_unit_id_fkey" FOREIGN KEY ("to_organization_unit_id") REFERENCES "organization_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_from_employee_id_fkey" FOREIGN KEY ("from_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_to_employee_id_fkey" FOREIGN KEY ("to_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_from_status_id_fkey" FOREIGN KEY ("from_status_id") REFERENCES "asset_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_to_status_id_fkey" FOREIGN KEY ("to_status_id") REFERENCES "asset_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
