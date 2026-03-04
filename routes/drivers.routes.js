// routes/driverRoutes.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const {addDriver, getDriverDetails, getTripDetails, getTripSummaries, updateDriverProfile, updateDriverSelfie} = require('../controllers/drivers.controller');

// Expecting 3 images
router.post('/add-driver',
    upload.fields([
        {name: 'selfie', maxCount: 1},
        {name: 'nic', maxCount: 1},
        {name: 'license', maxCount: 1}
    ]),
    addDriver
);

router.get('/get-driver-details/:userId', getDriverDetails);
router.put('/update-profile/:userId', updateDriverProfile);
router.put('/update-selfie/:userId', upload.single('selfie'), updateDriverSelfie);
router.get('/summaries/:driverId', getTripSummaries);
router.get('/details/:driverId/:date', getTripDetails);

module.exports = router;
