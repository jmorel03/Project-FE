-- Add per-account login lockout tracking fields
ALTER TABLE "User"
ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lockUntil" TIMESTAMP(3);