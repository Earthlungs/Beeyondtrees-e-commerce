-- Fungiculture rename — pure renames, zero data loss.
-- Renames the "Myco*" tables (shipped as "mycology") to "Fungi*" so they
-- match the new Prisma model names below. Run this BEFORE editing
-- schema.prisma + running `prisma db push`, so Prisma sees an exact match
-- and never attempts a destructive drop+recreate.
--
-- Apply once via: node scripts/apply-fungiculture-rename.mjs
-- (or paste into the Supabase SQL editor)

ALTER TABLE "MycoSpawn"       RENAME TO "FungiSpawn";
ALTER TABLE "MycoBatch"       RENAME TO "FungiBatch";
ALTER TABLE "MycoSubstrate"   RENAME TO "FungiSubstrate";
ALTER TABLE "MycoIncubation"  RENAME TO "FungiIncubation";
ALTER TABLE "MycoHarvest"     RENAME TO "FungiHarvest";
ALTER TABLE "MycoDehydration" RENAME TO "FungiDehydration";

ALTER TABLE "FungiSpawn"       RENAME CONSTRAINT "MycoSpawn_pkey" TO "FungiSpawn_pkey";
ALTER INDEX "MycoSpawn_code_key" RENAME TO "FungiSpawn_code_key";

ALTER TABLE "FungiBatch"       RENAME CONSTRAINT "MycoBatch_pkey" TO "FungiBatch_pkey";
ALTER INDEX "MycoBatch_code_key" RENAME TO "FungiBatch_code_key";

ALTER TABLE "FungiSubstrate"   RENAME CONSTRAINT "MycoSubstrate_pkey" TO "FungiSubstrate_pkey";
ALTER TABLE "FungiSubstrate"   RENAME CONSTRAINT "MycoSubstrate_batchId_fkey" TO "FungiSubstrate_batchId_fkey";
ALTER INDEX "MycoSubstrate_batchId_key" RENAME TO "FungiSubstrate_batchId_key";

ALTER TABLE "FungiIncubation"  RENAME CONSTRAINT "MycoIncubation_pkey" TO "FungiIncubation_pkey";
ALTER TABLE "FungiIncubation"  RENAME CONSTRAINT "MycoIncubation_batchId_fkey" TO "FungiIncubation_batchId_fkey";
ALTER INDEX "MycoIncubation_batchId_key" RENAME TO "FungiIncubation_batchId_key";

ALTER TABLE "FungiHarvest"     RENAME CONSTRAINT "MycoHarvest_pkey" TO "FungiHarvest_pkey";
ALTER TABLE "FungiHarvest"     RENAME CONSTRAINT "MycoHarvest_batchId_fkey" TO "FungiHarvest_batchId_fkey";
ALTER INDEX "MycoHarvest_batchId_key" RENAME TO "FungiHarvest_batchId_key";

ALTER TABLE "FungiDehydration" RENAME CONSTRAINT "MycoDehydration_pkey" TO "FungiDehydration_pkey";
ALTER TABLE "FungiDehydration" RENAME CONSTRAINT "MycoDehydration_batchId_fkey" TO "FungiDehydration_batchId_fkey";
ALTER INDEX "MycoDehydration_batchId_key" RENAME TO "FungiDehydration_batchId_key";
