const router = require('express').Router();

const {addStudent,getStudents,markAttendance,getAttendance} = require('../controllers/students.controller');

router.post('/add-student', addStudent);
router.get('/get-students/:driver_id', getStudents);
router.post('/mark-attendance', markAttendance);
router.post('/get-attendance', getAttendance);

module.exports = router;