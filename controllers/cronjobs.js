const executeQuery = require("../utils/executeQuery");
const cron = require("node-cron");


const updatePaymentsForNewMonth = async () => {
    try {
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

// Schedule the job to run at midnight on the first day of every month
cron.schedule('0 0 1 * *', updatePaymentsForNewMonth);

module.exports = { updatePaymentsForNewMonth };