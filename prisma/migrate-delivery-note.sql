-- Delivery Note — the document that travels WITH the goods, raised against an
-- already-approved LPO. No approval chain and no money columns: the LPO carries
-- the pricing, this proves what physically arrived.
--
-- `items` is a JSONB array of { description, unit, qtyOrdered, qtyDelivered,
-- remarks }. `lpoId` is a soft reference (no FK), same convention as
-- "Batch"."lpoId"; `lpoNumber` is snapshotted so the printed note stands alone.
--
-- Additive + idempotent — safe to run repeatedly.
-- Apply: paste into the Supabase SQL editor (or psql "$DATABASE_URL" -f this file).

CREATE TABLE IF NOT EXISTS "DeliveryNote" (
  "id"              TEXT PRIMARY KEY,
  "number"          TEXT NOT NULL UNIQUE,
  "lpoId"           TEXT,
  "lpoNumber"       TEXT,
  "supplierName"    TEXT NOT NULL,
  "deliveredTo"     TEXT,
  "deliveryDate"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "vehicleReg"      TEXT,
  "driverName"      TEXT,
  "driverPhone"     TEXT,
  "receivedBy"      TEXT,
  "items"           JSONB NOT NULL DEFAULT '[]',
  "notes"           TEXT,
  "recipientEmail"  TEXT,
  "attachmentUrl"   TEXT,
  "createdByUserId" TEXT,
  "createdByName"   TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "DeliveryNote_lpoId_idx" ON "DeliveryNote" ("lpoId");

-- Match the rest of the schema: RLS enabled with no policies, so Prisma (the
-- BYPASSRLS `postgres` role) works unchanged while PostgREST is denied.
-- See prisma/rls.sql.
ALTER TABLE IF EXISTS public."DeliveryNote" ENABLE ROW LEVEL SECURITY;
