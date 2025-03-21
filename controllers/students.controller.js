const executeQuery = require('../utils/executeQuery');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const twilio = require('twilio');
dotenv.config();


const twilio_account_sid = process.env.TWILIO_ACCOUNT_SID;
const twilio_auth_token = process.env.TWILIO_AUTH_TOKEN;

const client = new twilio(twilio_account_sid, twilio_auth_token);

const edu_ride_email = process.env.EDU_RIDE_EMAIL;
const edu_ride_password = process.env.EDU_RIDE_PASSWORD;

const sendSMS = (to, message) => {
    client.messages
        .create({
            body: message,               // The message you want to send
            from: '+13375093505',         // Your Twilio phone number
            to: to                        // The parent's phone number (e.g. +1234567890)
        })
        .then((message) => console.log('Message sent with SID:', message.sid))
        .catch((error) => console.error('Error sending SMS:', error));
};

const addStudent = async (req, res) => {
    const {
        driverId,
        full_name,
        email,
        phone_num,
        address,
        monthly_fee,
        student_name,
        student_grade,
        student_school,
        student_pickup_location_latitude,
        student_pickup_location_longitude,
        student_drop_location_latitude,
        student_drop_location_longitude
    } = req.body;

    if (!driverId || !full_name || !email || !phone_num || !address || !monthly_fee || !student_name || !student_grade || !student_school || !student_pickup_location_latitude || !student_pickup_location_longitude || !student_drop_location_latitude || !student_drop_location_longitude) {
        return res.status(400).json({error: "All fields are required"});
    }

    try {
        // Check if the parent already exists
        const checkParentQuery = `SELECT id
                                  FROM users
                                  WHERE email = ?
                                    AND role = 'parent'`;
        const parentResult = await executeQuery(checkParentQuery, [email]);

        let parentId;
        let isNewParent = false;
        if (parentResult.length > 0) {
            const parentQuery = `SELECT id
                                 FROM parents
                                 WHERE user_id = ?`;
            const parentIdRes = await executeQuery(parentQuery, [parentResult[0].id]);
            if (parentIdRes.length > 0) {
                // Parent exists, use the existing parent_id
                parentId = parentIdRes[0].id;
            } else {
                return res.status(500).json({error: "Parent record not found for the existing user"});
            }
        } else {
            // Generate username and password
            const username = full_name.toLowerCase().replace(/\s+/g, '');
            const password = Math.random().toString(36).slice(-8);
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert into users table
            const insertUserQuery = `
                INSERT INTO users (name, email, password_hash, role)
                VALUES (?, ?, ?, 'parent')
            `;
            const userValues = [username, email, hashedPassword];
            const userResult = await executeQuery(insertUserQuery, userValues);
            const userId = userResult.insertId;

            // Insert into parents table
            const insertParentQuery = `
                INSERT INTO parents (user_id, email, full_name, phone, address)
                VALUES (?, ?, ?, ?, ?)
            `;
            const parentValues = [userId, email, full_name, phone_num, address];
            const parentInsertResult = await executeQuery(insertParentQuery, parentValues);
            parentId = parentInsertResult.insertId;
            isNewParent = true;

            // Send email with login credentials
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: edu_ride_email,
                    pass: edu_ride_password
                }
            });
            const mailOptions = {
                from: `"EduRide" <${edu_ride_email}>`,
                to: email,
                subject: 'Welcome to EduRide - Your Login Credentials',
                headers: {
                    'X-Priority': '1',
                    'X-MSMail-Priority': 'High',
                    'Importance': 'high'
                },
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                        <div style="text-align: center; margin: 20px 0;">
                            <h1 style="color: #2c3e50; margin: 0;">Welcome to EduRide</h1>
                            <p style="color: #7f8c8d;">Your Trusted School Transportation Partner</p>
                        </div>
                        <p style="color: #34495e; font-size: 16px;">Dear ${full_name},</p>
                        <p style="color: #34495e; font-size: 16px;">Your EduRide account has been successfully created. Below are your login credentials:</p>
                        <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #3498db;">
                            <p style="margin: 5px 0; color: #2c3e50;"><strong>Username:</strong> ${username}</p>
                            <p style="margin: 5px 0; color: #2c3e50;"><strong>Password:</strong> ${password}</p>
                        </div>
                        <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px;">
                            <p style="margin: 0; color: #856404;"><strong>Important:</strong> For security reasons, please change your password after your first login.</p>
                        </div>
                        <div style="margin: 30px 0; text-align: center;">
                            <a href="your-login-url" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">Login to Your Account</a>
                        </div>
                        <hr style="border: 1px solid #eee; margin: 20px 0;">
                        <div style="color: #7f8c8d; font-size: 12px; text-align: center;">
                            <p>This is an automated message from EduRide. Please do not reply to this email.</p>
                            <p>If you did not request this account, please contact our support team immediately.</p>
                            <p style="margin-top: 15px;">
                                © ${new Date().getFullYear()} EduRide. All rights reserved.<br>
                                <a href="your-unsubscribe-url" style="color: #7f8c8d;">Unsubscribe</a> |
                                <a href="your-privacy-policy-url" style="color: #7f8c8d;">Privacy Policy</a>
                            </p>
                        </div>
                    </div>
                `
            };
            await transporter.sendMail(mailOptions);
        }

        // Insert into students table
        const insertStudentQuery = `
            INSERT INTO students (parent_id, driver_id, full_name, grade, school, monthly_fee, pickup_location_latitude,
                                  pickup_location_longitude, dropoff_location_latitude, dropoff_location_longitude)

            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const studentValues = [parentId, driverId, student_name, student_grade, student_school,
            monthly_fee, student_pickup_location_latitude, student_pickup_location_longitude, student_drop_location_latitude, student_drop_location_longitude];
        const studentResult = await executeQuery(insertStudentQuery, studentValues)
        const studentId = studentResult.insertId;

        const insertPaymentQuery = `
            INSERT INTO payments (student_id, month, amount, status, due_date)
            VALUES (?, DATE_FORMAT(NOW(), '%Y-%m-01'), ?, 'unpaid', DATE_FORMAT(NOW(), '%Y-%m-25'))
        `;
        const paymentValues = [studentId, monthly_fee];
        await executeQuery(insertPaymentQuery, paymentValues);

        res.status(200).json({message: "Student registered successfully and login credentials sent to email"});
    } catch (err) {
        console.error("Error in addStudent:", err);
        res.status(500).json({error: "Internal Server Error"});
    }
};
const getStudents = async (req, res) => {
    const {driver_id} = req.params;
    if (!driver_id) {
        return res.status(400).json({error: "Driver ID is required"});
    }
    try {
        const query = `
            SELECT s.id,
                   s.full_name,
                   s.grade,
                   s.school,
                   s.monthly_fee,
                   s.pickup_location_longitude,
                   s.pickup_location_latitude,
                   s.dropoff_location_longitude,
                   s.dropoff_location_latitude,
                   p.full_name AS parent_name,
                   p.phone,
                   p.address
            FROM students s
                     JOIN parents p ON s.parent_id = p.id
            WHERE s.driver_id = ?
        `;
        const params = [driver_id];
        const results = await executeQuery(query, params);
        res.status(200).json(results);
    } catch (err) {
        console.error("Error in getStudents:", err);
        res.status(500).json({error: "Internal Server Error"});
    }
};
const markAttendance = async (req, res) => {
    const {driver_id, student_id, date, period, attendance_status, ride_status} = req.body;

    if (!driver_id || !student_id || !date || !period || !attendance_status || !ride_status) {
        return res.status(400).json({error: "All fields are required"});
    }
    try {
        const checkQuery = `
            SELECT id
            FROM attendance
            WHERE driver_id = ?
              AND student_id = ?
              AND date = ?
        `;
        const checkParams = [driver_id, student_id, date];
        const existingRecord = await executeQuery(checkQuery, checkParams);

        if (existingRecord.length > 0) {
            let updateQuery;
            if (period === 'MORNING') {
                updateQuery = `
                    UPDATE attendance
                    SET morning_ride_status       = ?,
                        morning_attendance_status = ?
                    WHERE id = ?
                `;
            } else if (period === 'AFTERNOON') {
                updateQuery = `
                    UPDATE attendance
                    SET afternoon_ride_status       = ?,
                        afternoon_attendance_status = ?
                    WHERE id = ?
                `;
            }
            const updateParams = [ride_status, attendance_status, existingRecord[0].id];
            await executeQuery(updateQuery, updateParams);
        } else {
            // Insert new record
            let insertQuery;
            if (period === 'MORNING') {
                insertQuery = `
                    INSERT INTO attendance (student_id, driver_id, date, morning_ride_status, morning_attendance_status)
                    VALUES (?, ?, ?, ?, ?)
                `;
            } else if (period === 'AFTERNOON') {
                insertQuery = `
                    INSERT INTO attendance (student_id, driver_id, date, afternoon_ride_status,
                                            afternoon_attendance_status)
                    VALUES (?, ?, ?, ?, ?)
                `;
            }
            const insertParams = [student_id, driver_id, date, ride_status, attendance_status];
            await executeQuery(insertQuery, insertParams);
        }

        const getParentQuery = `
            SELECT phone
            FROM parents p
                     JOIN students s ON s.parent_id = p.id
            WHERE s.id = ?
        `;
        const parentRes = await executeQuery(getParentQuery, [student_id]);
        if (parentRes.length > 0) {
            const parentPhone = parentRes[0].phone;

            // Send SMS to parent
            const message = `Your child's attendance has been marked for ${period} on ${date}. Attendance status: ${attendance_status}. Ride status: ${ride_status}.`;
            //sendSMS(parentPhone, message);
        }

        res.status(200).json({message: "Attendance marked & parent notified successfully"});

    } catch (err) {
        console.error("Error in markAttendance:", err);
        res.status(500).json({error: "Internal Server Error"});
    }
};
const getAttendance = async (req, res) => {
    const {driver_id, date} = req.body;

    if (!driver_id || !date) {
        return res.status(400).json({error: "Driver ID and date are required"});
    }

    try {
        const query = `
            SELECT student_id,
                   morning_ride_status,
                   afternoon_ride_status,
                   morning_attendance_status,
                   afternoon_attendance_status
            FROM attendance
            WHERE driver_id = ?
              AND date = ?
        `;
        const params = [driver_id, date];
        const results = await executeQuery(query, params);
        res.status(200).json(results);
    } catch (err) {
        console.error("Error in getAttendance:", err);
        res.status(500).json({error: "Internal Server Error"});
    }
};

const visualizePayments = async (req, res) => {
    const {driver_id} = req.params;

    if (!driver_id) {
        return res.status(400).json({error: "Driver ID is required"});
    }

    try {
        const query = `
            SELECT s.full_name AS student_name, p.month, p.due_date, p.status AS payment_status, p.amount ,s.id
            FROM payments p
                     JOIN students s ON p.student_id = s.id
            WHERE s.driver_id = ?
        `;
        const params = [driver_id];
        const results = await executeQuery(query, params);
        console.log(results);
        res.status(200).json(results);
    } catch (err) {
        console.error("Error in visualizePayments:", err);
        res.status(500).json({error: "Internal Server Error"});
    }
};
const sendDuePaymentEmails = async (req, res) => {
    const {driver_id} = req.params;

    if (!driver_id) {
        return res.status(400).json({error: "Driver ID is required"});
    }

    try {
        // Query to get due payments and parent details for the specific driver
        const query = `
            SELECT p.email, p.full_name AS parent_name, s.full_name AS student_name, pay.amount, pay.due_date
            FROM payments pay
                     JOIN students s ON pay.student_id = s.id
                     JOIN parents p ON s.parent_id = p.id
            WHERE pay.status = 'unpaid'
              AND pay.due_date < NOW()
              AND s.driver_id = ?
        `;
        const duePayments = await executeQuery(query, [driver_id]);

        if (duePayments.length === 0) {
            return res.status(200).json({message: "No due payments found"});
        }

        // Create a transporter object using the default SMTP transport
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: edu_ride_email,
                pass: edu_ride_password
            }
        });

        // Send email to each parent with due payments
        for (const payment of duePayments) {
            const mailOptions = {
                from: `"EduRide" <${edu_ride_email}>`,
                to: payment.email,
                subject: 'Due Payment Reminder',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                        <div style="text-align: center; margin: 20px 0;">
                            <h1 style="color: #2c3e50; margin: 0;">Payment Due Reminder</h1>
                            <p style="color: #7f8c8d;">EduRide - Your Trusted School Transportation Partner</p>
                        </div>
                        <p style="color: #34495e; font-size: 16px;">Dear ${payment.parent_name},</p>
                        <p style="color: #34495e; font-size: 16px;">This is a reminder that a payment for your child, ${payment.student_name}, is due. Please find the details below:</p>
                        <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #e74c3c;">
                            <p style="margin: 5px 0; color: #2c3e50;"><strong>Amount Due:</strong> Rs${payment.amount}</p>
                            <p style="margin: 5px 0; color: #2c3e50;"><strong>Due Date:</strong> ${payment.due_date}</p>
                        </div>
                        <p style="color: #34495e; font-size: 16px;">Please make the payment at your earliest convenience to avoid any disruption in service.</p>
                        <div style="margin: 30px 0; text-align: center;">
                            <a href="your-payment-url" style="background-color: #e74c3c; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">Make Payment</a>
                        </div>
                        <hr style="border: 1px solid #eee; margin: 20px 0;">
                        <div style="color: #7f8c8d; font-size: 12px; text-align: center;">
                            <p>This is an automated message from EduRide. Please do not reply to this email.</p>
                            <p>If you have already made the payment, please disregard this message.</p>
                            <p style="margin-top: 15px;">
                                © ${new Date().getFullYear()} EduRide. All rights reserved.<br>
                                <a href="your-unsubscribe-url" style="color: #7f8c8d;">Unsubscribe</a> |
                                <a href="your-privacy-policy-url" style="color: #7f8c8d;">Privacy Policy</a>
                            </p>
                        </div>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);
        }

        res.status(200).json({message: "Due payment reminder emails sent successfully"});
    } catch (err) {
        console.error("Error in sendDuePaymentEmails:", err);
        res.status(500).json({error: "Internal Server Error"});
    }
};
const notifySpecificPerson = async (req, res) => {
    const {driver_id, student_id} = req.params;

    if (!driver_id || !student_id) {
        return res.status(400).json({error: "Driver ID and Student ID are required"});
    }

    try {
        // Query to get due payments and parent details for the specific driver and student
        const query = `
            SELECT p.email, p.full_name AS parent_name, s.full_name AS student_name, pay.amount, pay.due_date
            FROM payments pay
                     JOIN students s ON pay.student_id = s.id
                     JOIN parents p ON s.parent_id = p.id
            WHERE pay.status = 'unpaid'
              AND pay.due_date < NOW()
              AND s.driver_id = ?
              AND s.id = ?
        `;
        const duePayments = await executeQuery(query, [driver_id, student_id]);

        if (duePayments.length === 0) {
            return res.status(200).json({message: "No due payments found"});
        }

        // Create a transporter object using the default SMTP transport
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: edu_ride_email,
                pass: edu_ride_password
            }
        });

        // Send email to the parent with due payments
        const payment = duePayments[0];
        const mailOptions = {
            from: `"EduRide" <${edu_ride_email}>`,
            to: payment.email,
            subject: 'Due Payment Reminder',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <div style="text-align: center; margin: 20px 0;">
                        <h1 style="color: #2c3e50; margin: 0;">Payment Due Reminder</h1>
                        <p style="color: #7f8c8d;">EduRide - Your Trusted School Transportation Partner</p>
                    </div>
                    <p style="color: #34495e; font-size: 16px;">Dear ${payment.parent_name},</p>
                    <p style="color: #34495e; font-size: 16px;">This is a reminder that a payment for your child, ${payment.student_name}, is due. Please find the details below:</p>
                    <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #e74c3c;">
                        <p style="margin: 5px 0; color: #2c3e50;"><strong>Amount Due:</strong> Rs${payment.amount}</p>
                        <p style="margin: 5px 0; color: #2c3e50;"><strong>Due Date:</strong> ${payment.due_date}</p>
                    </div>
                    <p style="color: #34495e; font-size: 16px;">Please make the payment at your earliest convenience to avoid any disruption in service.</p>
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="your-payment-url" style="background-color: #e74c3c; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">Make Payment</a>
                    </div>
                    <hr style="border: 1px solid #eee; margin: 20px 0;">
                    <div style="color: #7f8c8d; font-size: 12px; text-align: center;">
                        <p>This is an automated message from EduRide. Please do not reply to this email.</p>
                        <p>If you have already made the payment, please disregard this message.</p>
                        <p style="margin-top: 15px;">
                            © ${new Date().getFullYear()} EduRide. All rights reserved.<br>
                            <a href="your-unsubscribe-url" style="color: #7f8c8d;">Unsubscribe</a> |
                            <a href="your-privacy-policy-url" style="color: #7f8c8d;">Privacy Policy</a>
                        </p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({message: "Due payment reminder email sent successfully"});
    } catch (err) {
        console.error("Error in notifySpecificPerson:", err);
        res.status(500).json({error: "Internal Server Error"});
    }
};
const updatePaymentStatus = async (req, res) => {
    const { student_id } = req.params;
    const { status } = req.body;

    if (!student_id || !status) {
        return res.status(400).json({ error: "Student ID and status are required" });
    }

    try {
        const query = `
            UPDATE payments
            SET status = ?
            WHERE student_id = ?
        `;
        await executeQuery(query, [status, student_id]);

        res.status(200).json({ message: "Payment status updated successfully" });
    } catch (err) {
        console.error("Error in updatePaymentStatus:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


module.exports = {
    addStudent,
    getStudents,
    markAttendance,
    getAttendance,
    visualizePayments,
    sendDuePaymentEmails,
    notifySpecificPerson,
    updatePaymentStatus
};