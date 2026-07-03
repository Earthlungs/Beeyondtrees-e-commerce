-- LPO image attachment (quote / delivery note / photo of goods).
-- Raw column, NOT in the Prisma schema (same pattern as the other Lpo
-- approval columns). Additive + idempotent — safe to run repeatedly.
ALTER TABLE "Lpo" ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT;

-- Payment tracking — finance marks an approved LPO as paid; the raiser is
-- emailed and the LPO list shows Paid / Awaiting payment.
ALTER TABLE "Lpo" ADD COLUMN IF NOT EXISTS "paid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lpo" ADD COLUMN IF NOT EXISTS "paidBy" TEXT;
ALTER TABLE "Lpo" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
