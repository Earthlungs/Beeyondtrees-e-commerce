-- Separate "Payment Details" from "Notes" on the LPO. Previously both were
-- crammed into the single `notes` column and printed under the "Payment
-- Details" heading, so product-related notes wrongly showed up there.
-- Raw column, NOT in the Prisma schema (same pattern as the other Lpo
-- approval columns). Additive + idempotent — safe to run repeatedly.
ALTER TABLE "Lpo" ADD COLUMN IF NOT EXISTS "paymentDetails" TEXT;
