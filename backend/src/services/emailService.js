const nodemailer = require('nodemailer');
const { format } = require('date-fns');

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

exports.sendInvoiceEmail = async ({ invoice, client, user, pdfBuffer }) => {
  const transporter = createTransport();

  const fromName = user.companyName || `${user.firstName} ${user.lastName}`;
  const dueDate = format(new Date(invoice.dueDate), 'MMMM dd, yyyy');
  const total = new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency }).format(invoice.total);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; margin: 0; padding: 0; background: #f9fafb; }
        .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
        .header { background: #4f46e5; padding: 32px; color: #fff; }
        .header h1 { margin: 0 0 4px; font-size: 22px; }
        .header p { margin: 0; color: #c7d2fe; font-size: 14px; }
        .body { padding: 32px; }
        .amount-box { background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
        .amount-box .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
        .amount-box .amount { font-size: 36px; font-weight: 700; color: #4f46e5; }
        .details { border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
        .detail-row .label { color: #6b7280; }
        .btn { display: inline-block; background: #4f46e5; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 20px 0; }
        .footer { background: #f9fafb; padding: 20px 32px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${fromName}</h1>
          <p>Invoice ${invoice.invoiceNumber}</p>
        </div>
        <div class="body">
          <p>Hi ${client.name},</p>
          <p>Please find your invoice attached. Here's a summary:</p>

          <div class="amount-box">
            <div class="label">Amount Due</div>
            <div class="amount">${total}</div>
          </div>

          <div class="details">
            <div class="detail-row">
              <span class="label">Invoice No.</span>
              <span><strong>${invoice.invoiceNumber}</strong></span>
            </div>
            <div class="detail-row">
              <span class="label">Due Date</span>
              <span>${dueDate}</span>
            </div>
          </div>

          <p>The invoice PDF is attached to this email for your records.</p>

          ${invoice.notes ? `<p style="background:#f3f4f6;padding:12px;border-radius:6px;font-size:13px;">${invoice.notes}</p>` : ''}
        </div>
        <div class="footer">
          <p>This invoice was sent by ${fromName} via Xpensist.</p>
          <p>If you have any questions, please reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"${process.env.FROM_NAME || fromName}" <${process.env.FROM_EMAIL}>`,
    to: `"${client.name}" <${client.email}>`,
    subject: `Invoice ${invoice.invoiceNumber} from ${fromName} — Due ${dueDate}`,
    html,
    attachments: [
      {
        filename: `${invoice.invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
};

exports.sendSupportEmail = async ({ fromName, fromEmail, subject, message }) => {
  const transporter = createTransport();
  const supportEmail = process.env.SUPPORT_EMAIL || process.env.FROM_EMAIL;

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;background:#f9fafb;margin:0;padding:0;">
      <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
        <div style="background:#4f46e5;padding:24px 32px;color:#fff;">
          <h2 style="margin:0;font-size:18px;">Support Request — Xpensist</h2>
        </div>
        <div style="padding:32px;">
          <p><strong>From:</strong> ${fromName} &lt;${fromEmail}&gt;</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
          <div style="white-space:pre-wrap;font-size:14px;line-height:1.6;">${message}</div>
        </div>
        <div style="background:#f9fafb;padding:16px 32px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;">
          Reply directly to this email to respond to the user.
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Xpensist Support" <${process.env.FROM_EMAIL}>`,
    to: supportEmail,
    replyTo: `"${fromName}" <${fromEmail}>`,
    subject: `[Support] ${subject}`,
    html,
  });
};
