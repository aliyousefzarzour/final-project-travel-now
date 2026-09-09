// =================== MULTER FILE UPLOAD MIDDLEWARE ===================
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname).toLowerCase());
    }
});

const fileFilter = (req, file, cb) => {
    const allowedExt = new Set(['.jpeg', '.jpg', '.png', '.gif', '.pdf', '.webp']);
    const allowedMime = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']);
    const extname = allowedExt.has(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMime.has(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    }
    cb(new Error('Only images and PDFs allowed'));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = upload;
