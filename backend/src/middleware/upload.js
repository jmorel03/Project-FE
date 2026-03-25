const multer = require('multer');

const storage = multer.memoryStorage();

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

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

module.exports = { uploadReceipt };
