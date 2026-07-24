-- Livestock (animal husbandry) subsystem — purely ADDITIVE (5 new tables,
-- no changes to any existing table). Safe to run once; re-runs are also
-- safe (IF NOT EXISTS / duplicate_object guards throughout).
-- Mirrors prisma/fungiculture-additive.sql's pattern/conventions.
--
-- Apply:  psql "$DIRECT_URL" -f prisma/livestock-additive.sql
--   (or paste into the Supabase SQL editor)
--
-- Do NOT run `prisma db push` against production for this change — the
-- live DB has legacy columns/tables (Lpo approval/payment fields, Batch
-- LPO-origin fields, ProductionStep) that were deliberately left out of
-- schema.prisma and applied via raw SQL instead, so a full `db push`
-- would try to DROP them. This file only touches the 5 new tables below.

CREATE TABLE IF NOT EXISTS "LivestockHousing" (
  "id"        TEXT PRIMARY KEY,
  "code"      TEXT NOT NULL UNIQUE,
  "name"      TEXT NOT NULL,
  "type"      TEXT NOT NULL DEFAULT 'pen',
  "country"   TEXT NOT NULL DEFAULT 'Kenya',
  "region"    TEXT,
  "location"  TEXT,
  "capacity"  INTEGER NOT NULL DEFAULT 0,
  "status"    TEXT NOT NULL DEFAULT 'active',
  "notes"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "FeedType" (
  "id"        TEXT PRIMARY KEY,
  "name"      TEXT NOT NULL UNIQUE,
  "unit"      TEXT NOT NULL DEFAULT 'kg',
  "stockQty"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "active"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "LivestockAnimal" (
  "id"           TEXT PRIMARY KEY,
  "code"         TEXT NOT NULL UNIQUE,
  "tagId"        TEXT UNIQUE,
  "species"      TEXT NOT NULL,
  "breed"        TEXT,
  "sex"          TEXT NOT NULL DEFAULT 'mixed',
  "groupCount"   INTEGER NOT NULL DEFAULT 1,
  "dob"          TIMESTAMP(3),
  "acquiredAt"   TIMESTAMP(3),
  "source"       TEXT,
  "weightKg"     DOUBLE PRECISION,
  "healthStatus" TEXT NOT NULL DEFAULT 'healthy',
  "status"       TEXT NOT NULL DEFAULT 'active',
  "housingId"    TEXT,
  "notes"        TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "LivestockAnimal_housingId_idx" ON "LivestockAnimal"("housingId");
DO $$ BEGIN
  ALTER TABLE "LivestockAnimal" ADD CONSTRAINT "LivestockAnimal_housingId_fkey"
    FOREIGN KEY ("housingId") REFERENCES "LivestockHousing"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "FeedingLog" (
  "id"         TEXT PRIMARY KEY,
  "feedTypeId" TEXT NOT NULL,
  "housingId"  TEXT,
  "animalId"   TEXT,
  "quantity"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "fedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "loggedBy"   TEXT,
  "notes"      TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "FeedingLog_housingId_idx" ON "FeedingLog"("housingId");
CREATE INDEX IF NOT EXISTS "FeedingLog_animalId_idx" ON "FeedingLog"("animalId");
CREATE INDEX IF NOT EXISTS "FeedingLog_feedTypeId_idx" ON "FeedingLog"("feedTypeId");
DO $$ BEGIN
  ALTER TABLE "FeedingLog" ADD CONSTRAINT "FeedingLog_feedTypeId_fkey"
    FOREIGN KEY ("feedTypeId") REFERENCES "FeedType"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FeedingLog" ADD CONSTRAINT "FeedingLog_housingId_fkey"
    FOREIGN KEY ("housingId") REFERENCES "LivestockHousing"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FeedingLog" ADD CONSTRAINT "FeedingLog_animalId_fkey"
    FOREIGN KEY ("animalId") REFERENCES "LivestockAnimal"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "LivestockYield" (
  "id"         TEXT PRIMARY KEY,
  "animalId"   TEXT,
  "housingId"  TEXT,
  "type"       TEXT NOT NULL,
  "quantity"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "unit"       TEXT NOT NULL DEFAULT 'kg',
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recordedBy" TEXT,
  "notes"      TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "LivestockYield_animalId_idx" ON "LivestockYield"("animalId");
CREATE INDEX IF NOT EXISTS "LivestockYield_housingId_idx" ON "LivestockYield"("housingId");
DO $$ BEGIN
  ALTER TABLE "LivestockYield" ADD CONSTRAINT "LivestockYield_animalId_fkey"
    FOREIGN KEY ("animalId") REFERENCES "LivestockAnimal"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "LivestockYield" ADD CONSTRAINT "LivestockYield_housingId_fkey"
    FOREIGN KEY ("housingId") REFERENCES "LivestockHousing"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Close the RLS gap the same way fungiculture-additive.sql did for its
-- tables — app connects as the postgres role (BYPASSRLS), so this only
-- closes direct anon/PostgREST access.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'LivestockHousing','LivestockAnimal','FeedType','FeedingLog','LivestockYield'
  ]
  LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;

-- Verify after running:
--   SELECT tablename FROM pg_tables WHERE schemaname = 'public'
--     AND tablename IN ('LivestockHousing','LivestockAnimal','FeedType','FeedingLog','LivestockYield');
--   -- should return all 5
