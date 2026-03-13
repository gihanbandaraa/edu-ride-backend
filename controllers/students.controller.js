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
const sendRideStatusEmail = async (studentId, rideStatus, period) => {
    try {
        // Get parent and student details
        const query = `
            SELECT p.email, p.full_name AS parent_name, s.full_name AS student_name, s.school
            FROM students s
                     JOIN parents p ON s.parent_id = p.id
            WHERE s.id = ?
        `;
        const results = await executeQuery(query, [studentId]);

        if (results.length === 0) {
            console.error("Student or parent not found for ID:", studentId);
            return;
        }

        const {email, parent_name, student_name, school} = results[0];

        // Create email content based on ride status
        const timeOfDay = period === 'MORNING' ? 'morning' : 'afternoon';
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        let subject, heading, content, accentColor;

        if (rideStatus === 'PICKED_UP') {
            subject = `${student_name} has been picked up - ${timeString}`;
            heading = "School Pickup Notification";
            content = `Your child has been picked up and is on the way to school.`;
            accentColor = "#27ae60"; // green
        } else if (rideStatus === 'DROPPED') {
            subject = `${student_name} has been dropped off - ${timeString}`;
            heading = "School Drop-off Notification";
            content = period === 'MORNING'
                ? `Your child has been safely dropped off at school.`
                : `Your child has been safely dropped off at the designated location.`;
            accentColor = "#3498db"; // blue
        } else {
            console.log(`No email sent for status: ${rideStatus}`);
            return; // Don't send email for other statuses
        }

        // Use the existing transporter from the top-level scope
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: edu_ride_email,
                pass: edu_ride_password
            }
        });

        // Send email
        const mailOptions = {
            from: `"EduRide" <${edu_ride_email}>`,
            to: email,
            subject: subject,
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
          <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1a2340;">${heading}</p>
          <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Transportation Status Update</p>
          <p style="margin:0 0 20px;font-size:14px;color:#374151;">Dear <strong>${parent_name}</strong>,</p>
          <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">${content}</p>
          <!-- Details Table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:6px;overflow:hidden;margin-bottom:24px;">
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;width:40%;">Student</td><td style="padding:12px 16px;font-size:13px;color:#1a2340;font-weight:700;">${student_name}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;">School</td><td style="padding:12px 16px;font-size:13px;color:#1a2340;">${school}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;">Period</td><td style="padding:12px 16px;font-size:13px;color:#1a2340;">${timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)}</td></tr>
            <tr><td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;">Time</td><td style="padding:12px 16px;font-size:13px;color:#1a2340;">${timeString}</td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">This is an automated notification from EduRide. Please do not reply to this email.</p>
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
        // Use await to properly handle errors and ensure email is sent before function completes
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error("Error sending ride status email:", error);
        return false;
    }
};
const sendAbsenceNotificationEmail = async (studentId, period) => {
    try {
        // Get parent and student details
        const query = `
            SELECT p.email, p.full_name AS parent_name, s.full_name AS student_name, s.school
            FROM students s
                     JOIN parents p ON s.parent_id = p.id
            WHERE s.id = ?
        `;
        const results = await executeQuery(query, [studentId]);

        if (results.length === 0) {
            console.error("Student or parent not found for ID:", studentId);
            return false;
        }

        const {email, parent_name, student_name, school} = results[0];
        const timeOfDay = period === 'MORNING' ? 'morning' : 'afternoon';
        const now = new Date();
        const dateString = now.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Create transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: edu_ride_email,
                pass: edu_ride_password
            }
        });

        // Send email
        const mailOptions = {
            from: `"EduRide" <${edu_ride_email}>`,
            to: email,
            subject: `Absence Notification - ${student_name} (${dateString})`,
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
          <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1a2340;">Absence Notification</p>
          <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Transport Attendance Update</p>
          <p style="margin:0 0 20px;font-size:14px;color:#374151;">Dear <strong>${parent_name}</strong>,</p>
          <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">This is to inform you that <strong>${student_name}</strong> has been marked as absent for the ${timeOfDay} school transport on ${dateString}.</p>
          <!-- Details Table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:6px;overflow:hidden;margin-bottom:24px;">
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;width:40%;">Student</td><td style="padding:12px 16px;font-size:13px;color:#1a2340;font-weight:700;">${student_name}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;">School</td><td style="padding:12px 16px;font-size:13px;color:#1a2340;">${school}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;">Date</td><td style="padding:12px 16px;font-size:13px;color:#1a2340;">${dateString}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;">Period</td><td style="padding:12px 16px;font-size:13px;color:#1a2340;">${timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)}</td></tr>
            <tr><td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;">Status</td><td style="padding:12px 16px;font-size:13px;color:#c0392b;font-weight:700;">Absent</td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">If this absence was planned, no action is required. If you believe this is an error, please contact your driver directly.</p>
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

        await transporter.sendMail(mailOptions);
        console.log(`Absence notification email sent to ${email} for student ${student_name}`);
        return true;
    } catch (error) {
        console.error("Error sending absence notification email:", error);
        return false;
    }
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
                subject: 'Welcome to EduRide - Your Account Details',
                headers: {
                    'X-Priority': '1',
                    'X-MSMail-Priority': 'High',
                    'Importance': 'high'
                },
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
          <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1a2340;">Welcome to EduRide</p>
          <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Your account has been successfully created</p>
          <p style="margin:0 0 20px;font-size:14px;color:#374151;">Dear <strong>${full_name}</strong>,</p>
          <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">Your EduRide parent account has been created. Please find your login credentials below.</p>
          <!-- Credentials Table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:6px;overflow:hidden;margin-bottom:20px;">
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;width:40%;">Username</td><td style="padding:12px 16px;font-size:13px;color:#1a2340;font-weight:700;">${username}</td></tr>
            <tr><td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;">Password</td><td style="padding:12px 16px;font-size:13px;color:#1a2340;font-weight:700;">${password}</td></tr>
          </table>
          <!-- Security notice -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fefce8;border-left:3px solid #ca8a04;border-radius:0 4px 4px 0;margin-bottom:24px;">
            <tr><td style="padding:12px 16px;font-size:13px;color:#92400e;line-height:1.5;"><strong>Security Notice:</strong> Please change your password after your first login to keep your account secure.</td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">If you did not expect this email, please contact our support team immediately.</p>
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
            SELECT id,
                   morning_ride_status,
                   afternoon_ride_status
            FROM attendance
            WHERE driver_id = ?
              AND student_id = ?
              AND date = ?
        `;
        const checkParams = [driver_id, student_id, date];
        const existingRecord = await executeQuery(checkQuery, checkParams);

        // Store previous ride status if record exists
        let previousRideStatus = null;
        if (existingRecord.length > 0) {
            previousRideStatus = period === 'MORNING'
                ? existingRecord[0].morning_ride_status
                : existingRecord[0].afternoon_ride_status;
        }

        // Update or insert attendance record
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

        // Handle parent SMS notification
        const getParentQuery = `
            SELECT phone
            FROM parents p
                     JOIN students s ON s.parent_id = p.id
            WHERE s.id = ?
        `;
        const parentRes = await executeQuery(getParentQuery, [student_id]);
        if (parentRes.length > 0) {
            const parentPhone = parentRes[0].phone;
            const message = `Your child's attendance has been marked for ${period} on ${date}. Attendance status: ${attendance_status}. Ride status: ${ride_status}.`;
            //sendSMS(parentPhone, message);
        }

        if (attendance_status === 'PRESENT') {
            // Only send pickup/dropoff email if the student is present AND status has changed
            if ((ride_status === 'PICKED_UP' || ride_status === 'DROPPED') &&
                (previousRideStatus === null || previousRideStatus !== ride_status)) {
                try {
                    await sendRideStatusEmail(student_id, ride_status, period);
                } catch (emailError) {
                    console.error("Error when trying to send ride status email:", emailError);
                }
            } else {
                console.log(`No ride status email sent. Previous: ${previousRideStatus}, Current: ${ride_status}`);
            }
        } else if (attendance_status === 'ABSENT') {
            // Send absence notification for absent students
            try {
                await sendAbsenceNotificationEmail(student_id, period);
            } catch (emailError) {
                console.error("Error when trying to send absence notification email:", emailError);
            }
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

const deleteStudent = async (req, res) => {
    const { student_id } = req.params;

    if (!student_id) {
        return res.status(400).json({ error: "Student ID is required" });
    }

    try {
        // Start a transaction to ensure data consistency
        await executeQuery('START TRANSACTION');

        try {
            // Get student and parent info before deletion
            const getStudentQuery = `
                SELECT s.full_name AS student_name, s.school, s.parent_id,
                       p.email, p.full_name AS parent_name, p.user_id AS parent_user_id
                FROM students s
                JOIN parents p ON s.parent_id = p.id
                WHERE s.id = ?
            `;
            const studentInfo = await executeQuery(getStudentQuery, [student_id]);

            if (studentInfo.length === 0) {
                await executeQuery('ROLLBACK');
                return res.status(404).json({ error: "Student not found" });
            }

            // Delete related payment records
            const deletePaymentsQuery = 'DELETE FROM payments WHERE student_id = ?';
            await executeQuery(deletePaymentsQuery, [student_id]);

            // Delete related attendance records
            const deleteAttendanceQuery = 'DELETE FROM attendance WHERE student_id = ?';
            await executeQuery(deleteAttendanceQuery, [student_id]);

            // Delete the student record
            const deleteStudentQuery = 'DELETE FROM students WHERE id = ?';
            await executeQuery(deleteStudentQuery, [student_id]);

            // Check if parent has other children
            const parentId = studentInfo[0].parent_id;
            const checkOtherChildrenQuery = 'SELECT COUNT(*) as children_count FROM students WHERE parent_id = ?';
            const childrenResult = await executeQuery(checkOtherChildrenQuery, [parentId]);

            // If parent has no other children, delete parent and associated user account
            if (childrenResult[0].children_count === 0) {
                const deleteParentQuery = 'DELETE FROM parents WHERE id = ?';
                await executeQuery(deleteParentQuery, [parentId]);

                const deleteUserQuery = 'DELETE FROM users WHERE id = ?';
                await executeQuery(deleteUserQuery, [studentInfo[0].parent_user_id]);

                console.log(`Parent ${parentId} and user ${studentInfo[0].parent_user_id} deleted as they have no more children in the system`);
            }

            // Commit the transaction
            await executeQuery('COMMIT');

            // Send confirmation email to parent
            const { email, parent_name, student_name, school } = studentInfo[0];

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
                subject: 'Student Transportation Service Termination',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                        <div style="text-align: center; margin: 20px 0;">
                            <h1 style="color: #2c3e50; margin: 0;">Service Termination Notice</h1>
                            <p style="color: #7f8c8d;">EduRide - Your Trusted School Transportation Partner</p>
                        </div>
                        <p style="color: #34495e; font-size: 16px;">Dear ${parent_name},</p>
                        <p style="color: #34495e; font-size: 16px;">This is to confirm that transportation services for your child, ${student_name}, have been terminated.</p>
                        <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #95a5a6;">
                            <p style="margin: 5px 0; color: #2c3e50;"><strong>Student:</strong> ${student_name}</p>
                            <p style="margin: 5px 0; color: #2c3e50;"><strong>School:</strong> ${school}</p>
                            <p style="margin: 5px 0; color: #2c3e50;"><strong>Effective Date:</strong> ${new Date().toLocaleDateString()}</p>
                        </div>
                        <p style="color: #34495e; font-size: 16px;">If you have any questions or require further assistance, please contact our support team.</p>
                        <hr style="border: 1px solid #eee; margin: 20px 0;">
                        <div style="color: #7f8c8d; font-size: 12px; text-align: center;">
                            <p>This is an automated message from EduRide. Please do not reply to this email.</p>
                            <p style="margin-top: 15px;">
                                © ${new Date().getFullYear()} EduRide. All rights reserved.<br>
                                <a href="https://eduride.com/privacy" style="color: #7f8c8d;">Privacy Policy</a> |
                                <a href="https://eduride.com/terms" style="color: #7f8c8d;">Terms of Service</a>
                            </p>
                        </div>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);

            res.status(200).json({ message: "Student deleted successfully and parent notified" });

        } catch (error) {
            // Rollback in case of error
            await executeQuery('ROLLBACK');
            throw error;
        }
    } catch (err) {
        console.error("Error in deleteStudent:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const visualizePayments = async (req, res) => {
    const {driver_id} = req.params;

    if (!driver_id) {
        return res.status(400).json({error: "Driver ID is required"});
    }

    try {
        const query = `
            SELECT s.full_name AS student_name, p.month, p.due_date, p.status AS payment_status, p.amount, s.id
            FROM payments p
                     JOIN students s ON p.student_id = s.id
            WHERE s.driver_id = ?
        `;
        const params = [driver_id];
        const results = await executeQuery(query, params);
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
                subject: `Payment Due - ${payment.student_name}`,
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
          <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1a2340;">Payment Reminder</p>
          <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Action Required</p>
          <p style="margin:0 0 20px;font-size:14px;color:#374151;">Dear <strong>${payment.parent_name}</strong>,</p>
          <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">This is a reminder that a transport fee payment for <strong>${payment.student_name}</strong> is currently due.</p>
          <!-- Details Table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:6px;overflow:hidden;margin-bottom:24px;">
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;width:40%;">Student</td><td style="padding:12px 16px;font-size:13px;color:#1a2340;font-weight:700;">${payment.student_name}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;">Amount Due</td><td style="padding:12px 16px;font-size:13px;color:#c0392b;font-weight:700;">Rs. ${payment.amount}</td></tr>
            <tr><td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;">Due Date</td><td style="padding:12px 16px;font-size:13px;color:#1a2340;">${payment.due_date}</td></tr>
          </table>
          <p style="margin:0 0 24px;font-size:13px;color:#64748b;line-height:1.6;">Please make the payment at your earliest convenience to avoid any disruption in your child's transportation service.</p>
          <p style="margin:0;font-size:13px;color:#64748b;">If you have already made the payment, please disregard this message.</p>
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
            subject: `Payment Due - ${payment.student_name}`,
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
          <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1a2340;">Payment Reminder</p>
          <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Action Required</p>
          <p style="margin:0 0 20px;font-size:14px;color:#374151;">Dear <strong>${payment.parent_name}</strong>,</p>
          <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">This is a reminder that a transport fee payment for <strong>${payment.student_name}</strong> is currently due.</p>
          <!-- Details Table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:6px;overflow:hidden;margin-bottom:24px;">
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;width:40%;">Student</td><td style="padding:12px 16px;font-size:13px;color:#1a2340;font-weight:700;">${payment.student_name}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;">Amount Due</td><td style="padding:12px 16px;font-size:13px;color:#c0392b;font-weight:700;">Rs. ${payment.amount}</td></tr>
            <tr><td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;">Due Date</td><td style="padding:12px 16px;font-size:13px;color:#1a2340;">${payment.due_date}</td></tr>
          </table>
          <p style="margin:0 0 24px;font-size:13px;color:#64748b;line-height:1.6;">Please make the payment at your earliest convenience to avoid any disruption in your child's transportation service.</p>
          <p style="margin:0;font-size:13px;color:#64748b;">If you have already made the payment, please disregard this message.</p>
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

        await transporter.sendMail(mailOptions);

        res.status(200).json({message: "Due payment reminder email sent successfully"});
    } catch (err) {
        console.error("Error in notifySpecificPerson:", err);
        res.status(500).json({error: "Internal Server Error"});
    }
};
const updatePaymentStatus = async (req, res) => {
    const {student_id} = req.params;
    const {status} = req.body;

    if (!student_id || !status) {
        return res.status(400).json({error: "Student ID and status are required"});
    }

    try {
        const query = `
            UPDATE payments
            SET status = ?
            WHERE student_id = ?
        `;
        await executeQuery(query, [status, student_id]);

        res.status(200).json({message: "Payment status updated successfully"});
    } catch (err) {
        console.error("Error in updatePaymentStatus:", err);
        res.status(500).json({error: "Internal Server Error"});
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
    updatePaymentStatus,
    deleteStudent
};