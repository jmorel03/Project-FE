const multer = require('multer');

const storage = multer.memoryStorage();

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

// Verify actual file content via magic bytes — client-supplied MIME types are not trustworthy.
const MAGIC_SIGNATURES = [
  { mime: 'image/jpeg',       bytes: [0xFF, 0xD8, 0xFF],       offset: 0 },
  { mime: 'image/png',        bytes: [0x89, 0x50, 0x4E, 0x47], offset: 0 },
  { mime: 'application/pdf',  bytes: [0x25, 0x50, 0x44, 0x46], offset: 0 },
  // WebP: 'RIFF' at byte 0, 'WEBP' at byte 8
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0,
    extra: { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 } },
];

function detectMimeFromBuffer(buf) {
  for (const sig of MAGIC_SIGNATURES) {
    const slice = buf.slice(sig.offset, sig.offset + sig.bytes.length);
    if (!sig.bytes.every((b, i) => slice[i] === b)) continue;
    if (sig.extra) {
      const es = buf.slice(sig.extra.offset, sig.extra.offset + sig.extra.bytes.length);
      if (!sig.extra.bytes.every((b, i) => es[i] === b)) continue;
    }
    return sig.mime;
  }
  return null;
}

const uploadReceipt = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new Error('Invalid file type. Allowed types: JPG, PNG, WEBP, PDF'));
      return;
    }
    callback(null, true);
  },
});

// Runs AFTER multer has buffered the file — validates magic bytes against actual content.
function validateUploadedFile(req, res, next) {
  if (!req.file) return next();

  const detectedMime = detectMimeFromBuffer(req.file.buffer);
  if (!detectedMime || !allowedMimeTypes.has(detectedMime)) {
    return res.status(400).json({ error: 'File content does not match an allowed type.' });
  }

  // Override with the server-verified MIME type so downstream code can trust it.
  req.file.mimetype = detectedMime;
  return next();
}

module.exports = { uploadReceipt, validateUploadedFile };
