const router = require('express').Router();

const {addUser, loginUser,getVerificationStatus,update_parent_push_token,test} = require('../controllers/users.controller');

router.post('/register', addUser);
router.post('/sign-in', loginUser);
router.get('/verification-status/:userId', getVerificationStatus);
router.put('/save-push-token', update_parent_push_token);
router.get('/test', test);


module.exports = router;