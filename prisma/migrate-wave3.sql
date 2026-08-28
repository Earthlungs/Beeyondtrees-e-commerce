-- Wave 3 — HR: office attendance (sign in / sign out with a GPS fix) and leave
-- requests (staff apply, CEO approves).
--
-- Purely ADDITIVE: no drops, no changes to existing tables — safe to run once
-- against production, and safe to re-run (IF NOT EXISTS guards throughout).
-- Matches the Prisma models in schema.prisma exactly, so `prisma db push` /
-- `prisma generate` see no drift afterwards.
--
-- Apply EITHER by pasting this whole file into the Supabase SQL editor and
-- pressing Run, OR with:  node scripts/apply-wave3.mjs
--
-- NOTE: the farmer-contract thumbprint feature needs NO migration — signatures
-- are stored inside the existing farmers.contracts JSON column, and the
-- thumbprint images reuse the existing DocAttachment table.

CREATE TABLE IF NOT EXISTS "Attendance" (
  "id"         TEXT PRIMARY KEY,
  "userId"     TEXT NOT NULL,
  "userName"   TEXT NOT NULL,
  "role"       TEXT NOT NULL,
  "type"       TEXT NOT NULL,
  "at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "latitude"   DOUBLE PRECISION NOT NULL,
  "longitude"  DOUBLE PRECISION NOT NULL,
  "accuracy"   DOUBLE PRECISION,
  "address"    TEXT,
  "note"       TEXT,
  "device"     TEXT,
  "ip"         TEXT,
  "workedMins" INTEGER
);
CREATE INDEX IF NOT EXISTS "Attendance_userId_at_idx" ON "Attendance"("userId", "at");
CREATE INDEX IF NOT EXISTS "Attendance_at_idx" ON "Attendance"("at");

CREATE TABLE IF NOT EXISTS "LeaveRequest" (
  "id"           TEXT PRIMARY KEY,
  "reference"    TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "userName"     TEXT NOT NULL,
  "userEmail"    TEXT,
  "role"         TEXT NOT NULL,
  "type"         TEXT NOT NULL,
  "startDate"    TIMESTAMP(3) NOT NULL,
  "endDate"      TIMESTAMP(3) NOT NULL,
  "days"         INTEGER NOT NULL,
  "reason"       TEXT NOT NULL,
  "handoverTo"   TEXT,
  "contact"      TEXT,
  "status"       TEXT NOT NULL DEFAULT 'pending',
  "decidedBy"    TEXT,
  "decidedAt"    TIMESTAMP(3),
  "decisionNote" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "LeaveRequest_reference_key" ON "LeaveRequest"("reference");
CREATE INDEX IF NOT EXISTS "LeaveRequest_userId_createdAt_idx" ON "LeaveRequest"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "LeaveRequest_status_idx" ON "LeaveRequest"("status");

-- Row Level Security, matching every other table in this database (prisma/rls.sql).
-- The app connects as the table owner, which bypasses RLS, so this changes
-- nothing for Prisma — it closes the door on the Supabase anon/REST key.
ALTER TABLE IF EXISTS public."Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."LeaveRequest" ENABLE ROW LEVEL SECURITY;
