const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads/students';
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 3 * 1024 * 1024; // 3MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = crypto.randomBytes(12).toString('hex');
    cb(null, `${Date.now()}_${unique}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return cb(new Error('Only JPEG, PNG or WEBP images are allowed.'));
  }
  cb(null, true);
}

const uploadStudentPhoto = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_BYTES },
});

// Bulk student upload — small CSV kept in memory only, never written to
// disk (it's parsed once and discarded).
const uploadCsv = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const okExt = /\.csv$/i.test(file.originalname);
    const okMime = ['text/csv', 'application/vnd.ms-excel', 'text/plain', 'application/csv'].includes(file.mimetype);
    if (!okExt && !okMime) return cb(new Error('Please upload a .csv file.'));
    cb(null, true);
  },
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB is generous for a student list
});

module.exports = { uploadStudentPhoto, uploadCsv, UPLOAD_DIR };
