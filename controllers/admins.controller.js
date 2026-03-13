const jwt = require('jsonwebtoken');
const executeQuery = require("../utils/executeQuery");
const nodemailer = require('nodemailer');
const key = process.env.JWT_SECRET_KEY;

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EDU_RIDE_EMAIL,
        pass: process.env.EDU_RIDE_PASSWORD
    }
});

const adminLogin = async (req, res) => {
    const {username, password} = req.body;
    if (username === 'admin' && password === 'password123') {
        const user = {name: username};
        const accessToken = jwt.sign(user, key, {expiresIn: '1h'});
        res.json({accessToken});
    } else {
        res.sendStatus(403);
    }
}
const getDriversDetails = async (req, res) => {
    try {
        const query = `
            SELECT d.*, u.role, u.verification_status, u.email, u.name AS account_name, u.created_at AS registered_at
            FROM drivers d
                     JOIN users u ON d.user_id = u.id
            WHERE u.role = 'driver'
        `;
        const drivers = await executeQuery(query);

        res.status(200).json(drivers);
    } catch (error) {
        console.error("Error fetching drivers details:", error);
        res.status(500).json({error: "Internal Server Error"});
    }
};
const verifyDriver = async (req, res) => {
    const { driverId } = req.params;

    try {
        // First get the user's email
        const getUserQuery = `
            SELECT email, name as full_name FROM users WHERE id = ?
        `;
        const userResult = await executeQuery(getUserQuery, [driverId]);

        if (userResult.length === 0) {
            return res.status(404).json({ error: "Driver not found" });
        }

        const userEmail = userResult[0].email;
        const userName = userResult[0].full_name;

        // Update users table
        const updateUserQuery = `
            UPDATE users
            SET verification_status = 'verified'
            WHERE id = ?
        `;

        // Update drivers table
        const updateDriverQuery = `
            UPDATE drivers
            SET is_verified = true, is_pending = false
            WHERE user_id = ?
        `;

        // Execute both queries
        await executeQuery(updateUserQuery, [driverId]);
        await executeQuery(updateDriverQuery, [driverId]);

        // Send email notification
        const mailOptions = {
            from: `"EduRide" <${process.env.EDU_RIDE_EMAIL}>`,
            to: userEmail,
            subject: 'Your Driver Account Has Been Verified',
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr><td style="background-color:#1a2340;padding:28px 40px;border-radius:8px 8px 0 0;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">EduRide</p>
          <p style="margin:4px 0 0;font-size:12px;color:#8a9bb8;letter-spacing:0.3px;">School Transportation Management</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="background-color:#ffffff;padding:36px 40px;">
          <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1a2340;">Verification Approved</p>
          <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Your driver account is now active</p>
          <p style="margin:0 0 20px;font-size:14px;color:#374151;">Dear <strong>${userName}</strong>,</p>
          <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">Your driver verification has been reviewed and approved. You now have full access to all driver features on the EduRide platform.</p>
          <!-- Status Table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:6px;overflow:hidden;margin-bottom:24px;">
            <tr><td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;width:40%;">Account Status</td><td style="padding:12px 16px;font-size:13px;color:#16a34a;font-weight:700;">Verified</td></tr>
          </table>
          <p style="margin:0 0 24px;font-size:13px;color:#374151;line-height:1.6;">You can now log in to the EduRide driver application to manage your students, routes, and schedules.</p>
          <p style="margin:0;font-size:13px;color:#64748b;">If you have any questions, please contact our support team.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background-color:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;border-radius:0 0 8px 8px;">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">&copy; ${new Date().getFullYear()} EduRide. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending verification email:", error);
            } else {
                console.log('Verification email sent: ' + info.response);
            }
        });

        res.status(200).json({ message: "Driver verified successfully" });
    } catch (error) {
        console.error("Error verifying driver:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
const rejectDriver = async (req, res) => {
    const { driverId } = req.params;

    try {
        // First get the user's email
        const getUserQuery = `
            SELECT email, name as full_name FROM users WHERE id = ?
        `;
        const userResult = await executeQuery(getUserQuery, [driverId]);

        if (userResult.length === 0) {
            return res.status(404).json({ error: "Driver not found" });
        }

        const userEmail = userResult[0].email;
        const userName = userResult[0].full_name;

        // Update users table
        const updateUserQuery = `
            UPDATE users
            SET verification_status = 'not_verified'
            WHERE id = ?
        `;

        // Update drivers table
        const updateDriverQuery = `
            UPDATE drivers
            SET is_verified = false, is_pending = false
            WHERE user_id = ?
        `;

        // Execute both queries
        await executeQuery(updateUserQuery, [driverId]);
        await executeQuery(updateDriverQuery, [driverId]);

        // Send email notification
        const mailOptions = {
            from: `"EduRide" <${process.env.EDU_RIDE_EMAIL}>`,
            to: userEmail,
            subject: 'Update on Your Driver Verification',
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr><td style="background-color:#1a2340;padding:28px 40px;border-radius:8px 8px 0 0;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">EduRide</p>
          <p style="margin:4px 0 0;font-size:12px;color:#8a9bb8;letter-spacing:0.3px;">School Transportation Management</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="background-color:#ffffff;padding:36px 40px;">
          <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1a2340;">Verification Not Approved</p>
          <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Action required to proceed</p>
          <p style="margin:0 0 20px;font-size:14px;color:#374151;">Dear <strong>${userName}</strong>,</p>
          <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">Thank you for submitting your verification documents. After careful review, we are unable to approve your application at this time.</p>
          <!-- Status -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:6px;overflow:hidden;margin-bottom:20px;">
            <tr><td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;width:40%;">Account Status</td><td style="padding:12px 16px;font-size:13px;color:#c0392b;font-weight:700;">Not Verified</td></tr>
          </table>
          <!-- Requirements -->
          <p style="margin:0 0 12px;font-size:13px;color:#374151;font-weight:600;">Please ensure your documents meet the following requirements before resubmitting:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:6px;overflow:hidden;margin-bottom:24px;">
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 16px;font-size:13px;color:#374151;">Documents must be valid and not expired</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 16px;font-size:13px;color:#374151;">Images must be clearly visible and legible</td></tr>
            <tr><td style="padding:10px 16px;font-size:13px;color:#374151;">All required fields must be complete and accurate</td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">You may resubmit your documents through the EduRide application. For further assistance, contact us at <a href="mailto:support@eduride.com" style="color:#1a2340;">support@eduride.com</a>.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background-color:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;border-radius:0 0 8px 8px;">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">&copy; ${new Date().getFullYear()} EduRide. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending rejection email:", error);
            } else {
                console.log('Rejection email sent: ' + info.response);
            }
        });

        res.status(200).json({ message: "Driver rejected successfully" });
    } catch (error) {
        console.error("Error rejecting driver:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const deleteDriver = async (req, res) => {
    const { userId } = req.params;

    try {
        const getUserQuery = `SELECT email, name as full_name FROM users WHERE id = ?`;
        const userResult = await executeQuery(getUserQuery, [userId]);

        if (userResult.length === 0) {
            return res.status(404).json({ error: "Driver not found" });
        }

        const { email, full_name } = userResult[0];

        // Deleting from users cascades to drivers, students assigned to this driver
        // are handled by ON DELETE SET NULL on students.driver_id
        await executeQuery(`DELETE FROM users WHERE id = ?`, [userId]);

        const mailOptions = {
            from: `"EduRide" <${process.env.EDU_RIDE_EMAIL}>`,
            to: email,
            subject: 'Your EduRide Driver Account Has Been Removed',
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr><td style="background-color:#1a2340;padding:28px 40px;border-radius:8px 8px 0 0;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">EduRide</p>
          <p style="margin:4px 0 0;font-size:12px;color:#8a9bb8;letter-spacing:0.3px;">School Transportation Management</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="background-color:#ffffff;padding:36px 40px;">
          <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1a2340;">Account Removed</p>
          <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Notice of account termination</p>
          <p style="margin:0 0 20px;font-size:14px;color:#374151;">Dear <strong>${full_name}</strong>,</p>
          <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">Your EduRide driver account has been permanently removed by an administrator. Access to all platform features has been revoked.</p>
          <!-- Status -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:6px;overflow:hidden;margin-bottom:24px;">
            <tr><td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;width:40%;">Account Status</td><td style="padding:12px 16px;font-size:13px;color:#c0392b;font-weight:700;">Removed</td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">If you believe this action was taken in error, please contact our support team at <a href="mailto:support@eduride.com" style="color:#1a2340;">support@eduride.com</a>.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background-color:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;border-radius:0 0 8px 8px;">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">&copy; ${new Date().getFullYear()} EduRide. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
            `
        };

        transporter.sendMail(mailOptions, (error) => {
            if (error) console.error("Error sending account removal email:", error);
        });

        res.status(200).json({ message: "Driver deleted successfully" });
    } catch (error) {
        console.error("Error deleting driver:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const TEST_EMAIL_SUBJECTS = {
    welcome:          "Welcome to EduRide — Account Created",
    pickup:           "Your Child Has Been Picked Up",
    dropoff:          "Your Child Has Been Dropped Off",
    absence:          "Student Absence Notification",
    payment_reminder: "Payment Reminder — EduRide",
    driver_approved:  "Your Driver Account Has Been Verified",
    driver_rejected:  "Update on Your Driver Verification",
    account_removed:  "Your EduRide Account Has Been Removed",
};

const buildTestEmailHtml = (emailType) => {
    const year = new Date().getFullYear();
    const header = `
      <tr><td style="background-color:#1a2340;padding:28px 40px;border-radius:8px 8px 0 0;">
        <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">EduRide</p>
        <p style="margin:4px 0 0;font-size:12px;color:#8a9bb8;">School Transportation Management</p>
      </td></tr>`;
    const footer = `
      <tr><td style="background-color:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;border-radius:0 0 8px 8px;">
        <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">&copy; ${year} EduRide. All rights reserved. — TEST EMAIL</p>
      </td></tr>`;

    const infoRow = (label, value) =>
        `<tr><td style="padding:10px 16px;font-size:13px;color:#64748b;font-weight:600;width:40%;background-color:#f8fafc;">${label}</td><td style="padding:10px 16px;font-size:13px;color:#1a2340;font-weight:600;background-color:#f8fafc;">${value}</td></tr>`;

    const bodies = {
        welcome: `
          <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1a2340;">Welcome to EduRide</p>
          <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Your account has been created</p>
          <p style="margin:0 0 24px;font-size:14px;color:#374151;">Dear <strong>Sample Parent</strong>, your EduRide account is ready. Below are your login credentials.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:6px;overflow:hidden;margin-bottom:24px;">
            ${infoRow("Username", "parent_sample")}${infoRow("Temporary Password", "Temp@1234")}${infoRow("Account Type", "Parent")}
          </table>
          <p style="margin:0;font-size:13px;color:#64748b;">Please change your password after your first login.</p>`,
        pickup: `
          <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1a2340;">Student Picked Up</p>
          <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Ride update for your child</p>
          <p style="margin:0 0 24px;font-size:14px;color:#374151;">Dear <strong>Sample Parent</strong>, your child has been safely picked up by their driver.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:6px;overflow:hidden;margin-bottom:24px;">
            ${infoRow("Student", "Sample Student")}${infoRow("Driver", "Sample Driver")}${infoRow("Time", new Date().toLocaleTimeString())}${infoRow("Status", "On the way to school")}
          </table>`,
        dropoff: `
          <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1a2340;">Student Dropped Off</p>
          <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Ride completed</p>
          <p style="margin:0 0 24px;font-size:14px;color:#374151;">Dear <strong>Sample Parent</strong>, your child has been safely dropped off.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:6px;overflow:hidden;margin-bottom:24px;">
            ${infoRow("Student", "Sample Student")}${infoRow("Driver", "Sample Driver")}${infoRow("Time", new Date().toLocaleTimeString())}${infoRow("Status", "Arrived safely")}
          </table>`,
        absence: `
          <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1a2340;">Absence Notification</p>
          <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Your child was marked absent</p>
          <p style="margin:0 0 24px;font-size:14px;color:#374151;">Dear <strong>Sample Parent</strong>, this is to notify you that your child was absent today.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:6px;overflow:hidden;margin-bottom:24px;">
            ${infoRow("Student", "Sample Student")}${infoRow("Date", new Date().toLocaleDateString())}${infoRow("Marked by", "Sample Driver")}
          </table>`,
        payment_reminder: `
          <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1a2340;">Payment Reminder</p>
          <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Action required</p>
          <p style="margin:0 0 24px;font-size:14px;color:#374151;">Dear <strong>Sample Parent</strong>, this is a reminder that your transportation payment is due.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:6px;overflow:hidden;margin-bottom:24px;">
            ${infoRow("Amount Due", "PKR 2,500")}${infoRow("Due Date", new Date().toLocaleDateString())}${infoRow("Student", "Sample Student")}
          </table>`,
        driver_approved: `
          <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1a2340;">Verification Approved</p>
          <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Your driver account is now active</p>
          <p style="margin:0 0 24px;font-size:14px;color:#374151;">Dear <strong>Sample Driver</strong>, your verification has been approved. You now have full platform access.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:6px;overflow:hidden;margin-bottom:24px;">
            ${infoRow("Account Status", '<span style="color:#16a34a;font-weight:700;">Verified</span>')}
          </table>`,
        driver_rejected: `
          <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1a2340;">Verification Not Approved</p>
          <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Action required to proceed</p>
          <p style="margin:0 0 24px;font-size:14px;color:#374151;">Dear <strong>Sample Driver</strong>, we were unable to approve your application at this time. Please resubmit with valid, clear documents.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:6px;overflow:hidden;margin-bottom:24px;">
            ${infoRow("Account Status", '<span style="color:#c0392b;font-weight:700;">Not Verified</span>')}
          </table>`,
        account_removed: `
          <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1a2340;">Account Removed</p>
          <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Your EduRide account has been removed</p>
          <p style="margin:0 0 24px;font-size:14px;color:#374151;">Dear <strong>Sample Driver</strong>, your account has been removed from the EduRide platform.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:6px;overflow:hidden;margin-bottom:24px;">
            ${infoRow("Account Status", '<span style="color:#c0392b;font-weight:700;">Removed</span>')}${infoRow("Effective", new Date().toLocaleDateString())}
          </table>`,
    };

    const body = bodies[emailType] || bodies.welcome;
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        ${header}
        <tr><td style="background-color:#ffffff;padding:36px 40px;">${body}</td></tr>
        ${footer}
      </table>
    </td></tr>
  </table>
</body></html>`;
};

const sendTestEmail = async (req, res) => {
    const { recipientEmail, emailType } = req.body;
    if (!recipientEmail || !emailType) {
        return res.status(400).json({ error: "recipientEmail and emailType are required" });
    }
    if (!TEST_EMAIL_SUBJECTS[emailType]) {
        return res.status(400).json({ error: `Unknown emailType: ${emailType}` });
    }
    try {
        await transporter.sendMail({
            from: `"EduRide" <${process.env.EDU_RIDE_EMAIL}>`,
            to: recipientEmail,
            subject: `[TEST] ${TEST_EMAIL_SUBJECTS[emailType]}`,
            html: buildTestEmailHtml(emailType),
        });
        res.status(200).json({ message: `Test email sent to ${recipientEmail}` });
    } catch (error) {
        console.error("Error sending test email:", error);
        res.status(500).json({ error: "Failed to send test email" });
    }
};

module.exports = {
    adminLogin,
    getDriversDetails,
    verifyDriver,
    rejectDriver,
    deleteDriver,
    sendTestEmail,
};