//crimecard-backend\multerConfig.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Check file extension
  const filetypes = /txt|pdf|docx/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  
  // Check mimetype - correct mapping
  const validMimetypes = {
    'text/plain': true,
    'application/pdf': true,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true
  };
  
  const mimetype = validMimetypes[file.mimetype];

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    // For debugging
    console.log('File rejected:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      extname: path.extname(file.originalname).toLowerCase(),
      extnameValid: extname,
      mimetypeValid: mimetype
    });
    cb(new Error('Only .txt, .pdf, and .docx files are allowed!'));
  }
};

module.exports = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});