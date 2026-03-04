const express = require('express');
const router = express.Router();

const {adminLogin, getDriversDetails, verifyDriver, rejectDriver, deleteDriver} = require('../controllers/admins.controller');
const authenticateToken = require('../middleware/auth');

router.post('/login', adminLogin);
router.get('/get-drivers', authenticateToken, getDriversDetails);
router.get('/protected', authenticateToken, (req, res) => {
    res.send('This is a protected admin route');
});
router.put('/verify-driver/:driverId', verifyDriver);
router.put('/reject-driver/:driverId', rejectDriver);
router.delete('/delete-driver/:userId', authenticateToken, deleteDriver);

module.exports = router;