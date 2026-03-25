const PDFDocument = require('pdfkit');
const { format } = require('date-fns');

function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

exports.generateInvoicePdf = (invoice, user) => {
  return new Promise((resolve, reject) => {
    const buffers = [];
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const primary = '#4f46e5';
    const grey = '#6b7280';
    const light = '#f3f4f6';
    const pageWidth = doc.page.width - 100;

    // ─── Header ─────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 120).fill(primary);

    doc.fontSize(24).fillColor('#ffffff').font('Helvetica-Bold')
       .text(user.companyName || `${user.firstName} ${user.lastName}`, 50, 35);
    doc.fontSize(10).font('Helvetica').fillColor('#c7d2fe')
       .text('INVOICE', 50, 65)
       .text(`#${invoice.invoiceNumber}`, 50, 80);

    // Status badge
    const statusColors = {
      PAID: '#10b981', SENT: '#3b82f6', OVERDUE: '#ef4444',
      DRAFT: '#6b7280', PARTIAL: '#f59e0b', CANCELLED: '#6b7280',
    };
    const statusColor = statusColors[invoice.status] || '#6b7280';
    doc.rect(doc.page.width - 130, 40, 80, 22).fill(statusColor);
    doc.fontSize(9).fillColor('#ffffff').font('Helvetica-Bold')
       .text(invoice.status, doc.page.width - 125, 47);

    // ─── Bill To / Dates ──────────────────────────────────────────────────
    doc.y = 145;

    // Bill From
    doc.fontSize(8).fillColor(grey).font('Helvetica-Bold').text('FROM', 50, 145);
    doc.fontSize(10).fillColor('#111827').font('Helvetica')
       .text(user.companyName || `${user.firstName} ${user.lastName}`, 50, 158);
    if (user.address) doc.text(user.address, 50);
    if (user.city || user.state) doc.text(`${user.city || ''}${user.city && user.state ? ', ' : ''}${user.state || ''}`, 50);
    if (user.email) doc.text(user.email, 50);

    // Bill To
    doc.fontSize(8).fillColor(grey).font('Helvetica-Bold').text('BILL TO', 260, 145);
    doc.fontSize(10).fillColor('#111827').font('Helvetica')
       .text(invoice.client.name, 260, 158);
    if (invoice.client.company) doc.text(invoice.client.company, 260);
    if (invoice.client.address) doc.text(invoice.client.address, 260);
    if (invoice.client.email) doc.text(invoice.client.email, 260);

    // Dates
    doc.fontSize(8).fillColor(grey).font('Helvetica-Bold').text('ISSUE DATE', 420, 145);
    doc.fontSize(10).fillColor('#111827').font('Helvetica')
       .text(format(new Date(invoice.issueDate), 'MMM dd, yyyy'), 420, 158);
    doc.fontSize(8).fillColor(grey).font('Helvetica-Bold').text('DUE DATE', 420, 185);
    doc.fontSize(10).fillColor('#111827').font('Helvetica')
       .text(format(new Date(invoice.dueDate), 'MMM dd, yyyy'), 420, 198);

    // ─── Line Items Table ────────────────────────────────────────────────
    const tableTop = 280;
    doc.rect(50, tableTop, pageWidth, 24).fill(primary);
    doc.fontSize(9).fillColor('#ffffff').font('Helvetica-Bold')
       .text('DESCRIPTION', 60, tableTop + 8)
       .text('QTY', 330, tableTop + 8)
       .text('UNIT PRICE', 380, tableTop + 8)
       .text('TOTAL', 470, tableTop + 8);

    let y = tableTop + 24;
    invoice.items.forEach((item, idx) => {
      if (idx % 2 === 0) doc.rect(50, y, pageWidth, 22).fill(light);
      doc.fontSize(9).fillColor('#111827').font('Helvetica')
         .text(item.description, 60, y + 7, { width: 260 })
         .text(String(item.quantity), 330, y + 7)
         .text(formatCurrency(item.unitPrice, invoice.currency), 380, y + 7)
         .text(formatCurrency(item.total, invoice.currency), 470, y + 7);
      y += 22;
    });

    // ─── Totals ──────────────────────────────────────────────────────────
    y += 10;
    doc.moveTo(350, y).lineTo(50 + pageWidth, y).lineWidth(1).strokeColor('#e5e7eb').stroke();
    y += 10;

    const totalsX = 380;
    const valX = 470;

    const addTotalRow = (label, value, bold = false) => {
      doc.fontSize(9)
         .font(bold ? 'Helvetica-Bold' : 'Helvetica')
         .fillColor(bold ? '#111827' : grey)
         .text(label, totalsX, y)
         .text(value, valX, y);
      y += 18;
    };

    addTotalRow('Subtotal', formatCurrency(invoice.subtotal, invoice.currency));
    if (Number(invoice.discountAmount) > 0) {
      addTotalRow(`Discount (${invoice.discountRate}%)`, `-${formatCurrency(invoice.discountAmount, invoice.currency)}`);
    }
    if (Number(invoice.taxAmount) > 0) {
      addTotalRow(`Tax (${invoice.taxRate}%)`, formatCurrency(invoice.taxAmount, invoice.currency));
    }
    y += 4;
    doc.rect(350, y, 50 + pageWidth - 350, 28).fill(primary);
    doc.fontSize(11).fillColor('#ffffff').font('Helvetica-Bold')
       .text('TOTAL', totalsX, y + 8)
       .text(formatCurrency(invoice.total, invoice.currency), valX, y + 8);
    y += 36;

    if (Number(invoice.amountPaid) > 0) {
      doc.fontSize(9).fillColor(grey).font('Helvetica')
         .text(`Amount Paid: ${formatCurrency(invoice.amountPaid, invoice.currency)}`, totalsX, y)
         .text(`Balance Due: ${formatCurrency(Number(invoice.total) - Number(invoice.amountPaid), invoice.currency)}`, totalsX, y + 14);
    }

    // ─── Notes / Terms ───────────────────────────────────────────────────
    const notesY = doc.page.height - 180;
    if (invoice.notes) {
      doc.fontSize(8).fillColor(grey).font('Helvetica-Bold').text('NOTES', 50, notesY);
      doc.fontSize(9).fillColor('#111827').font('Helvetica').text(invoice.notes, 50, notesY + 12, { width: 250 });
    }
    if (invoice.terms) {
      doc.fontSize(8).fillColor(grey).font('Helvetica-Bold').text('TERMS', 310, notesY);
      doc.fontSize(9).fillColor('#111827').font('Helvetica').text(invoice.terms, 310, notesY + 12, { width: 250 });
    }

    // ─── Footer ──────────────────────────────────────────────────────────
    doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill(primary);
    doc.fontSize(9).fillColor('#c7d2fe').font('Helvetica')
       .text('Thank you for your business!', 0, doc.page.height - 28, { align: 'center', width: doc.page.width });

    doc.end();
  });
};
