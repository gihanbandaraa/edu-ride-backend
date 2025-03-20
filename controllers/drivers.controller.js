const executeQuery = require('../utils/executeQuery');
const Tesseract = require('tesseract.js');

const path = require('path');
const extractTextFromImage = async (imagePath) => {
    try {
        const { data: { text } } = await Tesseract.recognize(imagePath, 'eng');
        return text;
    } catch (error) {
        console.error('Error extracting text from image:', error);
        throw error;
    }
};
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

        // Extract text from NIC and license images
        const nicText = await extractTextFromImage(nic_image_url);
        const licenseText = await extractTextFromImage(license_image_url);

        // Validate NIC and License numbers
        if (!nicText.includes(nic_number) || !licenseText.includes(license_num)) {
            console.log("NIC Text:", nicText);
            console.log("License Text:", licenseText);
            return res.status(400).json({ error: "NIC or License number does not match the provided values" });
        } else {
            console.log("NIC and License numbers match the provided values");
        }


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



module.exports = { addDriver , getDriverDetails};
