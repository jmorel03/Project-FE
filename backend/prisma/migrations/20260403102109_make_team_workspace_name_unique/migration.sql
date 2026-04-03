-- Handle duplicate TeamWorkspace names by adding a counter suffix
WITH duplicates AS (
  SELECT
    id,
    name,
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY "createdAt" ASC) as rn
  FROM "TeamWorkspace"
)
UPDATE "TeamWorkspace" t
SET name = CASE
  WHEN d.rn = 1 THEN d.name
  ELSE d.name || ' (#' || d.rn || ')'
END
FROM duplicates d
WHERE t.id = d.id AND d.rn > 1;

-- Add unique constraint on name
CREATE UNIQUE INDEX "TeamWorkspace_name_key" ON "TeamWorkspace"("name");
