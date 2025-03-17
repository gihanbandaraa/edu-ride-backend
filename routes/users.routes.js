const router = require('express').Router();

const {addUser, loginUser,getVerificationStatus,test} = require('../controllers/users.controller');

router.post('/register', addUser);
router.post('/sign-in', loginUser);
router.get('/verification-status/:userId', getVerificationStatus);
router.get('/test', test);


module.exports = router;