const executeQuery = require('../utils/executeQuery');
const path = require('path');

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

      console.log(userId,full_name,nic_number,license_num,phone_num,dob,address);



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

        // Get file paths (you can store relative paths)
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
        //Update the verification status in the users table
        const updateQuery = `
            UPDATE users
            SET verification_status = ?
            WHERE id = ?
        `;
        const updateValues = [
            verification_status,
            userId
        ];

        const values = [
            userId,
            full_name,
            nic_number,
            license_num,
            phone_num,
            dob,
            address,
            selfie_url,
            nic_image_url,
            license_image_url,
            is_verified,
            is_pending
        ];

        await executeQuery(insertQuery, values);
        await executeQuery(updateQuery, updateValues);

        res.status(200).json({ message: "Driver verification submitted successfully" });


    } catch (err) {
        console.error("Error in addDriver:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = { addDriver };
