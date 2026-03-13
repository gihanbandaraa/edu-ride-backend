const express = require('express');
const router = express.Router();

const {adminLogin, getDriversDetails, verifyDriver, rejectDriver, deleteDriver, sendTestEmail} = require('../controllers/admins.controller');
const authenticateToken = require('../middleware/auth');

router.post('/login', adminLogin);
router.get('/get-drivers', authenticateToken, getDriversDetails);
router.get('/protected', authenticateToken, (req, res) => {
    res.send('This is a protected admin route');
});
router.put('/verify-driver/:driverId', verifyDriver);
router.put('/reject-driver/:driverId', rejectDriver);
router.delete('/delete-driver/:userId', authenticateToken, deleteDriver);
router.post('/test-email', authenticateToken, sendTestEmail);

module.exports = router;