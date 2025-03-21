const executeQuery = require('../utils/executeQuery');
const path = require('path');
const moment = require('moment-timezone');

class TripSummary {
    constructor(date, morningCount, afternoonCount) {
        this.date = date;
        this.morningCount = morningCount;
        this.afternoonCount = afternoonCount;
    }
}

const addDriver = async (req, res) => {
    try {
        const {
            userId,
            full_name,
            nic_number,
            license_num,
            phone_num,
            dob,
            address
        } = req.body;

        // Validate required fields
        if (!userId || !full_name || !nic_number || !license_num || !phone_num || !dob || !address) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Validate uploaded files
        const selfieFile = req.files['selfie'] ? req.files['selfie'][0] : null;
        const nicFile = req.files['nic'] ? req.files['nic'][0] : null;
        const licenseFile = req.files['license'] ? req.files['license'][0] : null;

        if (!selfieFile || !nicFile || !licenseFile) {
            return res.status(400).json({ error: "All images (selfie, NIC, license) are required" });
        }

        // Get file paths
        const selfie_url = selfieFile.path;
        const nic_image_url = nicFile.path;
        const license_image_url = licenseFile.path;

        // Default verification flags
        const is_verified = false;
        const is_pending = true;
        const verification_status = "pending";

        // Insert into driver_verification table
        const insertQuery = `
            INSERT INTO drivers
            (user_id, full_name, nic_number, license_number, phone_num, date_of_birth, address, selfie_url, nic_image_url, license_image_url, is_verified, is_pending)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        // Update the verification status in the users table
        const updateQuery = `
            UPDATE users
            SET verification_status = ?
            WHERE id = ?
        `;
        const updateValues = [verification_status, userId];
        const values = [userId, full_name, nic_number, license_num, phone_num, dob, address, selfie_url, nic_image_url, license_image_url, is_verified, is_pending];

        await executeQuery(insertQuery, values);
        await executeQuery(updateQuery, updateValues);

        res.status(200).json({ message: "Driver verification submitted successfully" });
    } catch (err) {
        console.error("Error in addDriver:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
const getDriverDetails = async (req, res) => {
    const userId = req.params.userId;

    if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
    }

    const query = `
        SELECT * FROM drivers
        WHERE user_id = ?
    `;

    const params = [userId];

    try {
        const results = await executeQuery(query, params);
        res.status(200).json(results[0]);
    } catch (error) {
        console.error("Error getting driver details:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const getTripSummaries = async (req, res) => {
    const driverId = req.params.driverId;
    if (!driverId) {
        return res.status(400).json({ error: "Driver ID is required" });
    }

    try {
        const query = `
            SELECT date,
                   SUM(CASE WHEN morning_attendance_status = 'present' THEN 1 ELSE 0 END) as morningCount,
                   SUM(CASE WHEN afternoon_attendance_status = 'present' THEN 1 ELSE 0 END) as afternoonCount
            FROM attendance
            WHERE student_id IN (
                SELECT s.id
                FROM students s
                WHERE s.driver_id = 1
            )
            GROUP BY date
            ORDER BY date DESC
        `;

        const results = await executeQuery(query, [driverId]);
        const tripSummaries = results.map(row => new TripSummary(row.date, row.morningCount, row.afternoonCount));

        res.status(200).json(tripSummaries);
    } catch (error) {
        console.error("Error retrieving trip summaries:", error);
        res.status(500).json({ error: "Error retrieving trip summaries" });
    }
};

const getTripDetails = async (req, res) => {
    const { driverId, date } = req.params;
    if (!driverId || !date) {
        return res.status(400).json({ error: "Driver ID and date are required" });
    }

    try {
        const query = `
            SELECT s.full_name as studentName, a.morning_attendance_status, a.afternoon_attendance_status
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            WHERE s.driver_id = ? AND DATE(a.date) = ?
        `;

        const localDate = moment(date).tz('Asia/Colombo').format('YYYY-MM-DD');

        const results = await executeQuery(query, [driverId, localDate]);
        if (results.length === 0) {
            return res.status(404).json({ error: "No trip details found" });
        }

        res.status(200).json(results);
    } catch (error) {
        console.error("Error retrieving trip details:", error);
        res.status(500).json({ error: "Error retrieving trip details" });
    }
};



module.exports = { addDriver , getDriverDetails , getTripSummaries , getTripDetails };
