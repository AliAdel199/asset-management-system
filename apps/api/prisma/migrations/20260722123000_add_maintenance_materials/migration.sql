CREATE TABLE "maintenance_materials" (
  "id" TEXT NOT NULL,
  "maintenance_request_id" TEXT NOT NULL,
  "material_name" TEXT NOT NULL,
  "quantity" DECIMAL(65,30),
  "unit_cost" DECIMAL(65,30) NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "maintenance_materials_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "maintenance_materials_maintenance_request_id_idx" ON "maintenance_materials"("maintenance_request_id");

ALTER TABLE "maintenance_materials" ADD CONSTRAINT "maintenance_materials_maintenance_request_id_fkey" FOREIGN KEY ("maintenance_request_id") REFERENCES "maintenance_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
