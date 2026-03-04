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
            subject: 'Driver Verification Approved',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <div style="text-align: center; margin: 20px 0;">
                        <h1 style="color: #2c3e50; margin: 0;">Driver Verification Approved</h1>
                        <p style="color: #7f8c8d;">EduRide - Your Trusted School Transportation Partner</p>
                    </div>
                    <p style="color: #34495e; font-size: 16px;">Dear ${userName},</p>
                    <p style="color: #34495e; font-size: 16px;">Congratulations! Your driver verification has been approved.</p>
                    <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #27ae60;">
                        <p style="margin: 5px 0; color: #2c3e50;">You can now access all driver features of our application and start providing transportation services.</p>
                        <p style="margin: 5px 0; color: #2c3e50;">Log in to your account to manage your routes, students, and schedules.</p>
                    </div>
                    <p style="color: #34495e; font-size: 16px;">If you have any questions or need assistance, please contact our support team.</p>
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="https://eduride.com/login" style="background-color: #27ae60; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">Access Your Account</a>
                    </div>
                    <hr style="border: 1px solid #eee; margin: 20px 0;">
                    <div style="color: #7f8c8d; font-size: 12px; text-align: center;">
                        <p>Thank you for joining our platform. We look forward to a successful partnership.</p>
                        <p style="margin-top: 15px;">
                            © ${new Date().getFullYear()} EduRide. All rights reserved.<br>
                            <a href="https://eduride.com/privacy" style="color: #7f8c8d;">Privacy Policy</a> |
                            <a href="https://eduride.com/terms" style="color: #7f8c8d;">Terms of Service</a>
                        </p>
                    </div>
                </div>
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
            subject: 'Driver Verification Status',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <div style="text-align: center; margin: 20px 0;">
                        <h1 style="color: #2c3e50; margin: 0;">Driver Verification Status</h1>
                        <p style="color: #7f8c8d;">EduRide - Your Trusted School Transportation Partner</p>
                    </div>
                    <p style="color: #34495e; font-size: 16px;">Dear ${userName},</p>
                    <p style="color: #34495e; font-size: 16px;">Thank you for your interest in becoming a driver with EduRide.</p>
                    <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #e74c3c;">
                        <p style="margin: 5px 0; color: #2c3e50;">After reviewing your submission, we regret to inform you that your driver verification has not been approved at this time.</p>
                        <p style="margin: 5px 0; color: #2c3e50;">Please ensure that all submitted documents are:</p>
                        <ul style="color: #2c3e50;">
                            <li>Valid and not expired</li>
                            <li>Clearly visible and legible</li>
                            <li>Complete and showing all required information</li>
                        </ul>
                    </div>
                    <p style="color: #34495e; font-size: 16px;">You are welcome to resubmit your verification documents through the application after making the necessary corrections.</p>
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="https://eduride.com/resubmit" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">Resubmit Documents</a>
                    </div>
                    <p style="color: #34495e; font-size: 16px;">If you have any questions or need further clarification, please contact our support team at <a href="mailto:support@eduride.com" style="color: #3498db;">support@eduride.com</a>.</p>
                    <hr style="border: 1px solid #eee; margin: 20px 0;">
                    <div style="color: #7f8c8d; font-size: 12px; text-align: center;">
                        <p>We appreciate your understanding and look forward to your successful verification in the future.</p>
                        <p style="margin-top: 15px;">
                            © ${new Date().getFullYear()} EduRide. All rights reserved.<br>
                            <a href="https://eduride.com/privacy" style="color: #7f8c8d;">Privacy Policy</a> |
                            <a href="https://eduride.com/terms" style="color: #7f8c8d;">Terms of Service</a>
                        </p>
                    </div>
                </div>
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
            subject: 'Your EduRide Account Has Been Removed',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <h1 style="color: #2c3e50;">Account Removed</h1>
                    <p>Dear ${full_name},</p>
                    <p>Your EduRide driver account has been permanently removed by an administrator.</p>
                    <p>If you believe this was done in error, please contact our support team.</p>
                    <hr style="border: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #7f8c8d; font-size: 12px;">© ${new Date().getFullYear()} EduRide. All rights reserved.</p>
                </div>
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

module.exports = {
    adminLogin,
    getDriversDetails,
    verifyDriver,
    rejectDriver,
    deleteDriver
};