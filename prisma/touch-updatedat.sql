-- Auto-stamp "updatedAt" on EVERY row update — including raw SQL / DB-GUI
-- ("backdoor") edits, which Prisma's @updatedAt does NOT cover (it only stamps
-- the column on Prisma client writes).
--
-- Why this matters: the storefront syncs via a delta query
-- (GET /api/products?since=<lastSync>, filtered by `updatedAt > since`) and
-- busts image caches with `updatedAt`. A backdoor edit that leaves `updatedAt`
-- untouched is invisible to that sync, so the UI keeps showing the stale row.
-- This trigger guarantees any UPDATE bumps `updatedAt`, so edits made directly
-- in the database show up in the UI on the next sync.
--
-- Idempotent + additive. Safe to run repeatedly.
-- Apply:  psql "$DATABASE_URL" -f prisma/touch-updatedat.sql

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Product: the storefront/admin catalog that drives the delta sync.
DROP TRIGGER IF EXISTS product_set_updated_at ON "Product";
CREATE TRIGGER product_set_updated_at
  BEFORE UPDATE ON "Product"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
