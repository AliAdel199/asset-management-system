-- CreateTable
CREATE TABLE "maintenance_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "maintenance_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_intervals" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "months_count" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "maintenance_intervals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_types_code_key" ON "maintenance_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_intervals_code_key" ON "maintenance_intervals"("code");
