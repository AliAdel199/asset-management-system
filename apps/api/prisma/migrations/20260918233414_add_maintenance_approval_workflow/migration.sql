-- AlterTable
ALTER TABLE "maintenance_requests" ADD COLUMN     "decided_at" TIMESTAMP(3),
ADD COLUMN     "decided_by_user_id" TEXT,
ADD COLUMN     "decision_notes" TEXT,
ADD COLUMN     "requested_by_user_id" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_decided_by_user_id_fkey" FOREIGN KEY ("decided_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
