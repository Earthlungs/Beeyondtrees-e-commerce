-- Wave 2 schema changes — purely ADDITIVE (no drops, no data loss).
-- Safe to run repeatedly (IF NOT EXISTS guards).

-- User: provisioning + profile fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "image" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- Chat
CREATE TABLE IF NOT EXISTS "Message" (
  "id"         TEXT PRIMARY KEY,
  "fromUserId" TEXT NOT NULL,
  "toUserId"   TEXT NOT NULL,
  "body"       TEXT NOT NULL,
  "readAt"     TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Message_fromUserId_toUserId_createdAt_idx"
  ON "Message"("fromUserId", "toUserId", "createdAt");
