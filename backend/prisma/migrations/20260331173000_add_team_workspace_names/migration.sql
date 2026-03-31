-- Add team workspace names
CREATE TABLE "TeamWorkspace" (
  "id" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TeamWorkspace_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeamWorkspace_ownerUserId_key" ON "TeamWorkspace"("ownerUserId");
CREATE INDEX "TeamWorkspace_name_idx" ON "TeamWorkspace"("name");

ALTER TABLE "TeamWorkspace" ADD CONSTRAINT "TeamWorkspace_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "TeamWorkspace" ("id", "ownerUserId", "name", "createdAt", "updatedAt")
SELECT
  u."id",
  u."id",
  COALESCE(NULLIF(TRIM(u."companyName"), ''), CONCAT(COALESCE(NULLIF(TRIM(u."firstName"), ''), 'Team'), ' Workspace')),
  NOW(),
  NOW()
FROM "User" u;
