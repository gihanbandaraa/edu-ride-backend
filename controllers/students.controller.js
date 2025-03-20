const executeQuery = require('../utils/executeQuery');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const addStudent = async (req, res) => {
    const {
        driver_id,
        full_name,
        email,
        phone_num,
        address,
        monthly_fee,
        student_name,
        student_grade,
        student_school,
        student_pickup_location,
        student_drop_location
    } = req.body;
    // Validate required fields
    if (!driver_id || !full_name || !email || !phone_num || !address || !monthly_fee || !student_name || !student_grade || !student_school || !student_pickup_location || !student_drop_location) {
        return res.status(400).json({ error: "All fields are required" });
    }
    try {
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
            INSERT INTO parents (user_id, full_name, phone, address)
            VALUES (?, ?, ?, ?)
        `;
        const parentValues = [userId, full_name, phone_num, address];
        const parentResult = await executeQuery(insertParentQuery, parentValues);
        const parentId = parentResult.insertId;

        // Insert into students table
        const insertStudentQuery = `
            INSERT INTO students (parent_id, driver_id, full_name, grade, school, monthly_fee, pickup_location, dropoff_location)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const studentValues = [parentId, driver_id, student_name, student_grade, student_school, monthly_fee, student_pickup_location, student_drop_location];
        await executeQuery(insertStudentQuery, studentValues);

        // Send email with login credentials
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'eudridelk@gmail.com',
                pass: 'Eduride@LK1329'
            }
        });
        const mailOptions = {
            from: 'eudridelk@gmail.com',
            to: email,
            subject: 'Your Login Credentials',
            text: `Username: ${username}\nPassword: ${password}`
        };
        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: "Student registered successfully and login credentials sent to email" });
    } catch (err) {
        console.error("Error in addStudent:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = { addStudent };