const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { randomUUID } = require('crypto');

const requiredEnvVars = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];

function isR2Configured() {
  return requiredEnvVars.every((envVar) => Boolean(process.env[envVar]));
}

function getR2Client() {
  if (!isR2Configured()) {
    throw new Error('Cloudflare R2 is not configured. Missing required R2 environment variables.');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

function toPublicUrl(key) {
  if (process.env.R2_PUBLIC_URL) {
    return `${process.env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
  }

  return `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
}

function keyFromPublicUrl(url) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\//, '');
  } catch {
    return null;
  }
}

async function uploadExpenseReceiptToR2({ userId, expenseId, fileBuffer, contentType, originalName }) {
  const r2Client = getR2Client();

  const extension = (originalName && originalName.includes('.'))
    ? originalName.split('.').pop().toLowerCase()
    : 'bin';

  const key = `receipts/${userId}/${expenseId}/${Date.now()}-${randomUUID()}.${extension}`;

  await r2Client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType || 'application/octet-stream',
  }));

  return {
    key,
    url: toPublicUrl(key),
  };
}

async function deleteFromR2ByPublicUrl(url) {
  const key = keyFromPublicUrl(url);
  if (!key) return;

  const r2Client = getR2Client();
  await r2Client.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
  }));
}

module.exports = {
  isR2Configured,
  uploadExpenseReceiptToR2,
  deleteFromR2ByPublicUrl,
};
