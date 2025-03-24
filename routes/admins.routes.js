const express = require('express');
const router = express.Router();

const {adminLogin, getDriversDetails} = require('../controllers/admins.controller');
const authenticateToken = require('../middleware/auth');

router.post('/login', adminLogin);
router.get('/get-drivers', authenticateToken, getDriversDetails);
router.get('/protected', authenticateToken, (req, res) => {
    res.send('This is a protected admin route');
});

module.exports = router;