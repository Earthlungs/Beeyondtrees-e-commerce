-- Fungiculture expansion — purely ADDITIVE (new tables + nullable columns).
-- Safe to run once; INSERT/backfill lines are also safe to re-run.
-- Run in the Supabase SQL editor AFTER rename-fungiculture.sql.

CREATE TABLE IF NOT EXISTS "GrowingHouse" (
  "id"             TEXT PRIMARY KEY,
  "code"           TEXT NOT NULL UNIQUE,
  "name"           TEXT NOT NULL,
  "country"        TEXT NOT NULL DEFAULT 'Kenya',
  "region"         TEXT,
  "location"       TEXT,
  "lengthM"        DOUBLE PRECISION,
  "widthM"         DOUBLE PRECISION,
  "maxBagCapacity" INTEGER NOT NULL DEFAULT 0,
  "status"         TEXT NOT NULL DEFAULT 'active',
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "GrainType" (
  "id"        TEXT PRIMARY KEY,
  "name"      TEXT NOT NULL UNIQUE,
  "active"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "FungiIncubation" ADD COLUMN IF NOT EXISTS "growingHouseId" TEXT;
CREATE INDEX IF NOT EXISTS "FungiIncubation_growingHouseId_idx" ON "FungiIncubation"("growingHouseId");
DO $$ BEGIN
  ALTER TABLE "FungiIncubation" ADD CONSTRAINT "FungiIncubation_growingHouseId_fkey"
    FOREIGN KEY ("growingHouseId") REFERENCES "GrowingHouse"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "FungiSpawn" ADD COLUMN IF NOT EXISTS "grainTypeId" TEXT;
DO $$ BEGIN
  ALTER TABLE "FungiSpawn" ADD CONSTRAINT "FungiSpawn_grainTypeId_fkey"
    FOREIGN KEY ("grainTypeId") REFERENCES "GrainType"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed the 4 known grain types (id needs to be unique text — Prisma's cuid()
-- default only applies client-side, so raw SQL supplies its own id).
INSERT INTO "GrainType" ("id","name","active","createdAt","updatedAt")
VALUES
  (gen_random_uuid()::text, 'Wheat',  true, now(), now()),
  (gen_random_uuid()::text, 'Rye',    true, now(), now()),
  (gen_random_uuid()::text, 'Oats',   true, now(), now()),
  (gen_random_uuid()::text, 'Millet', true, now(), now())
ON CONFLICT ("name") DO NOTHING;

-- Backfill grainTypeId on existing FungiSpawn rows from the legacy free-text
-- "grainType" column (case-insensitive match).
UPDATE "FungiSpawn" fs
SET "grainTypeId" = gt.id
FROM "GrainType" gt
WHERE lower(gt.name) = lower(fs."grainType") AND fs."grainTypeId" IS NULL;

-- Close the RLS gap: Myco*/Fungi* tables were never added when mycology
-- shipped. Add the renamed + new tables now (ENABLE only, no policies — the
-- app connects as the postgres role, which has BYPASSRLS, so this only closes
-- direct anon/PostgREST access, matching prisma/rls.sql's existing approach).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'FungiSpawn','FungiBatch','FungiSubstrate','FungiIncubation','FungiHarvest','FungiDehydration',
    'GrowingHouse','GrainType'
  ]
  LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;

-- Verify before running fungiculture-finalize.sql:
--   SELECT count(*) FROM "FungiSpawn" WHERE "grainTypeId" IS NULL;   -- must be 0
