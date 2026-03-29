-- Switch invoice number uniqueness from global to per-user scope.
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_invoiceNumber_key";
DROP INDEX IF EXISTS "Invoice_invoiceNumber_key";

CREATE UNIQUE INDEX "Invoice_userId_invoiceNumber_key" ON "Invoice"("userId", "invoiceNumber");
