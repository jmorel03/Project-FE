-- CreateEnum
CREATE TYPE "InvoiceReminderType" AS ENUM ('MANUAL', 'UPCOMING', 'DUE_TODAY', 'OVERDUE', 'FINAL_NOTICE');

-- CreateTable
CREATE TABLE "InvoiceReminder" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "InvoiceReminderType" NOT NULL DEFAULT 'MANUAL',
    "subject" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceReminder_invoiceId_sentAt_idx" ON "InvoiceReminder"("invoiceId", "sentAt");

-- CreateIndex
CREATE INDEX "InvoiceReminder_userId_sentAt_idx" ON "InvoiceReminder"("userId", "sentAt");

-- AddForeignKey
ALTER TABLE "InvoiceReminder" ADD CONSTRAINT "InvoiceReminder_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceReminder" ADD CONSTRAINT "InvoiceReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;