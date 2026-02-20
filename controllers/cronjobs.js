const executeQuery = require("../utils/executeQuery");
const cron = require("node-cron");

const updatePaymentsForNewMonth = async () => {
    try {
        const today = new Date();
        if (today.getDate() !== 1) {
            console.log('Not the first day of the month, skipping payment update');
            return;
        }

        const updateQuery = `
            UPDATE payments
            SET status   = 'unpaid',
                due_date = DATE_FORMAT(NOW(), '%Y-%m-25')
            WHERE status = 'paid'
        `;
        await executeQuery(updateQuery);
        console.log('Payment statuses and due dates updated for the new month');
    } catch (err) {
        console.error('Error updating payments for the new month:', err);
    }
};
const job = cron.schedule('0 0 1 * *', updatePaymentsForNewMonth, {
    scheduled: true,
    timezone: "UTC"
});


module.exports = {
    updatePaymentsForNewMonth,
    paymentUpdateJob: job
};