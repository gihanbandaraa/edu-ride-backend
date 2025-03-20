const router = require('express').Router();

const {parentLogin, getStudentDetails} = require('../controllers/parents.controller');

router.post('/sign-in', parentLogin);
router.get('/get-details/:userId', getStudentDetails);

module.exports = router;