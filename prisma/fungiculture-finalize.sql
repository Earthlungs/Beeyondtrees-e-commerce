-- Fungiculture finalize — run ONLY after confirming
-- `SELECT count(*) FROM "FungiSpawn" WHERE "grainTypeId" IS NULL;` returns 0.
-- Makes grainTypeId required and drops the old free-text grainType column.

ALTER TABLE "FungiSpawn" ALTER COLUMN "grainTypeId" SET NOT NULL;
ALTER TABLE "FungiSpawn" DROP COLUMN "grainType";
