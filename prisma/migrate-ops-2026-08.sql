-- ===========================================================================
-- Beeyond Trees — operations update, 2026-08-20.  ONE script, paste-and-run.
--
--   Supabase dashboard -> SQL Editor -> New query -> paste ALL of this -> Run.
--   Safe to re-run: every step is guarded (IF NOT EXISTS / catalog checks).
--   Everything is ADDITIVE except one index swap on "FungiHarvest" (noted
--   below) — no data is deleted and no column is dropped.
--
-- What it does, and why:
--
--   1. "Invoice" gains payment tracking (paid / paidAt / paidBy /
--      paymentMethod / paymentRef) so whoever raises an invoice can mark it
--      paid when the money lands, plus stockDeducted (a once-only guard so the
--      stock deduction can never be applied twice) and createdByUserId /
--      createdByName (so the app knows who the "invoice raiser" is).
--
--   2. "FungiHarvest" becomes one-to-MANY per batch. Mushrooms fruit
--      repeatedly, so a batch yields several harvests ("flushes"). The old
--      UNIQUE(batchId) allowed exactly one; it is replaced by
--      UNIQUE(batchId, flushNumber). Existing harvest rows become flush 1.
--      "FungiBatch"."harvestClosedAt" records when the fungiculturist closes
--      the harvest window and moves the batch on to dehydration.
--
--   3. farmers gains a contracts jsonb column — the signed agreements uploaded
--      against each farmer: [{url, filename, uploadedAt, uploadedBy}].
--      (lowercase, unquoted: farmers is the one snake_case table here.)
--
-- Run this BEFORE deploying the matching code. Deploys do not migrate the
-- schema on this project.
-- ===========================================================================

BEGIN;

-- 1 ── Invoice: payment tracking + stock-deduction guard + raiser ------------
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paid"            BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paidAt"          TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paidBy"          TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paymentMethod"   TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paymentRef"      TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "stockDeducted"   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "createdByName"   TEXT;

-- Invoices raised before this change never touched stock, and marking one of
-- them paid must not retroactively deduct anything — so leave stockDeducted
-- false on them; the app only deducts at creation time, never afterwards.

-- 2 ── Fungiculture: repeat harvests (flushes) per batch ---------------------
ALTER TABLE "FungiBatch"   ADD COLUMN IF NOT EXISTS "harvestClosedAt" TIMESTAMP(3);
ALTER TABLE "FungiHarvest" ADD COLUMN IF NOT EXISTS "flushNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "FungiHarvest" ADD COLUMN IF NOT EXISTS "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- A batch already past the harvest stage had its harvest window closed by the
-- old (single-harvest) flow — record that, so those batches don't read as
-- "still collecting flushes" in the UI.
UPDATE "FungiBatch" b
   SET "harvestClosedAt" = COALESCE(b."harvestClosedAt", h."harvestedAt", b."updatedAt")
  FROM "FungiHarvest" h
 WHERE h."batchId" = b."id"
   AND b."harvestClosedAt" IS NULL
   AND (b."stage" <> 'harvest' OR b."status" = 'completed');

-- Swap UNIQUE(batchId) for UNIQUE(batchId, flushNumber). Prisma named the old
-- one "FungiHarvest_batchId_key"; the loop also catches any other single-column
-- unique constraint/index on batchId in case it was created by another name.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
     WHERE rel.relname = 'FungiHarvest'
       AND con.contype = 'u'
       AND con.conkey = ARRAY[(SELECT attnum FROM pg_attribute
                                WHERE attrelid = rel.oid AND attname = 'batchId')]::smallint[]
  LOOP
    EXECUTE format('ALTER TABLE "FungiHarvest" DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
DROP INDEX IF EXISTS "FungiHarvest_batchId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "FungiHarvest_batchId_flushNumber_key"
  ON "FungiHarvest"("batchId", "flushNumber");
CREATE INDEX IF NOT EXISTS "FungiHarvest_batchId_idx"
  ON "FungiHarvest"("batchId");

-- 3 ── Agro Forestry: contracts held against a farmer ------------------------
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS contracts JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMIT;

-- ── Verification (the editor shows only this last result set) ──────────────
-- Expect 11 rows: the 8 Invoice columns, FungiBatch.harvestClosedAt,
-- FungiHarvest.flushNumber and farmers.contracts. Then one row confirming the
-- old single-harvest UNIQUE is gone and the flush-numbered one is in place.
SELECT 'column' AS kind,
       table_name || '.' || column_name AS name,
       data_type AS detail
  FROM information_schema.columns
 WHERE (table_name = 'Invoice'
        AND column_name IN ('paid','paidAt','paidBy','paymentMethod','paymentRef',
                            'stockDeducted','createdByUserId','createdByName'))
    OR (table_name = 'FungiBatch'   AND column_name = 'harvestClosedAt')
    OR (table_name = 'FungiHarvest' AND column_name = 'flushNumber')
    OR (table_name = 'farmers'      AND column_name = 'contracts')
UNION ALL
SELECT 'index', indexname, indexdef
  FROM pg_indexes
 WHERE tablename = 'FungiHarvest'
   AND indexdef LIKE '%UNIQUE%'
 ORDER BY 1, 2;
