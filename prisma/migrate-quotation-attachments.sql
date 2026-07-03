-- PDF attachments stored in Postgres (Cloudinary blocks PDF delivery on this
-- plan). Served by /api/attachments/[id]; images keep going to Cloudinary.
CREATE TABLE IF NOT EXISTS "DocAttachment" (
  "id"        TEXT PRIMARY KEY,
  "filename"  TEXT,
  "mime"      TEXT NOT NULL DEFAULT 'application/pdf',
  "data"      BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Quotation — LPO clone minus payment details (no notes, no paid tracking).
-- Unlike Lpo, ALL columns live in the Prisma model (new table, no migration
-- ordering concerns), so routes use the Prisma client directly.
CREATE TABLE IF NOT EXISTS "Quotation" (
  "id"                 TEXT PRIMARY KEY,
  "number"             TEXT NOT NULL UNIQUE,
  "orderDate"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expectedArrival"    TIMESTAMP(3),
  "supplierName"       TEXT NOT NULL,
  "shippingAddress"    TEXT,
  "purchaseRep"        TEXT,
  "items"              JSONB NOT NULL DEFAULT '[]',
  "subtotal"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "vat"                DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total"              DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status"             TEXT NOT NULL DEFAULT 'pending',
  "approvedBy"         TEXT,
  "approvedAt"         TIMESTAMP(3),
  "rejectionReason"    TEXT,
  "destinationOfGoods" TEXT,
  "amended"            BOOLEAN NOT NULL DEFAULT false,
  "onBehalf"           BOOLEAN NOT NULL DEFAULT false,
  "origin"             TEXT,
  "createdByUserId"    TEXT,
  "createdByName"      TEXT,
  "chiefApprovedBy"    TEXT,
  "chiefApprovedAt"    TIMESTAMP(3),
  "recipientEmail"     TEXT,
  "attachmentUrl"      TEXT,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
