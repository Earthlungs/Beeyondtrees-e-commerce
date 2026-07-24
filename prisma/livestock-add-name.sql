-- Add a friendly name/label to LivestockAnimal — purely additive (one
-- nullable column). Safe to run once; re-runs are also safe.
--
-- Apply:  psql "$DIRECT_URL" -f prisma/livestock-add-name.sql
--   (or paste into the Supabase SQL editor)

ALTER TABLE "LivestockAnimal" ADD COLUMN IF NOT EXISTS "name" TEXT;
