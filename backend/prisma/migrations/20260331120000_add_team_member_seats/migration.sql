-- Add team seat roles for Business tier collaboration
CREATE TYPE "TeamRole" AS ENUM ('ADMIN', 'WORKER');

CREATE TABLE "TeamMember" (
  "id" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "memberUserId" TEXT NOT NULL,
  "role" "TeamRole" NOT NULL DEFAULT 'WORKER',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeamMember_memberUserId_key" ON "TeamMember"("memberUserId");
CREATE UNIQUE INDEX "TeamMember_ownerUserId_memberUserId_key" ON "TeamMember"("ownerUserId", "memberUserId");
CREATE INDEX "TeamMember_ownerUserId_isActive_idx" ON "TeamMember"("ownerUserId", "isActive");

ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_memberUserId_fkey"
FOREIGN KEY ("memberUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
