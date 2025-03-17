// routes/testUploadRoute.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');

// Basic single image upload (field name = "image")
router.post('/upload-test', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    return res.status(200).json({
        message: 'Image uploaded successfully!',
        url: imageUrl
    });
});

module.exports = router;
