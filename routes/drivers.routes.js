// routes/driverRoutes.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { addDriver } = require('../controllers/drivers.controller');

// Expecting 3 images
router.post('/add-driver',
    upload.fields([
        { name: 'selfie', maxCount: 1 },
        { name: 'nic', maxCount: 1 },
        { name: 'license', maxCount: 1 }
    ]),
    addDriver
);

module.exports = router;
