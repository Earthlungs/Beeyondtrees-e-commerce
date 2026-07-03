-- LPO image attachment (quote / delivery note / photo of goods).
-- Raw column, NOT in the Prisma schema (same pattern as the other Lpo
-- approval columns). Additive + idempotent — safe to run repeatedly.
ALTER TABLE "Lpo" ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT;
