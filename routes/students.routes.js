const router = require('express').Router();

const {
    addStudent,
    getStudents,
    markAttendance,
    getAttendance,
    visualizePayments,
    sendDuePaymentEmails,
    notifySpecificPerson,
    updatePaymentStatus
} = require('../controllers/students.controller');

router.post('/add-student', addStudent);
router.get('/get-students/:driver_id', getStudents);
router.post('/mark-attendance', markAttendance);
router.post('/get-attendance', getAttendance);
router.get('/visualize-payments/:driver_id', visualizePayments);
router.get('/send-due-payment-emails/:driver_id', sendDuePaymentEmails);
router.get('/notify-specific-person/:driver_id/:student_id', notifySpecificPerson);
router.put('/update-payment-status/:student_id', updatePaymentStatus);

module.exports = router;