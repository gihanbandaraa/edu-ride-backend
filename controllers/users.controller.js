const executeQuery = require('../utils/executeQuery');
const bcrypt = require('bcrypt');

const addUser = async (req, res) => {
    const {name, email, password, google_id, role} = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({error: "Name, email, password, and role are required"});
    }

    try {
        const password_hash = await bcrypt.hash(password, 10);

        // New: Set verification_status to "not_verified" initially
        const query = `
            INSERT INTO users (name, email, password_hash, google_id, role, verification_status)
            VALUES (?, ?, ?, ?, ?, ?)`;

        const params = [name, email, password_hash, google_id, role, "not_verified"];

        await executeQuery(query, params);
        res.status(201).json({message: "User added successfully"});
    } catch (error) {
        console.error("Error adding user:", error);
        res.status(500).json({error: "Error adding user"});
    }
};

const loginUser = async (req, res) => {
    const {email, password} = req.body;

    if (!email || !password) {
        return res.status(400).json({error: "Email and password are required"});
    }

    try {
        const query = "SELECT * FROM users WHERE email = ?";
        const params = [email];
        const results = await executeQuery(query, params);

        if (results.length === 0) {
            return res.status(401).json({error: "Invalid email or password"});
        }

        const user = results[0];
        if (!user.password_hash) {
            return res.status(401).json({error: "Invalid email or password"});
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({error: "Invalid email or password"});
        }

        res.status(200).json({
            message: "Login successful",
            verification_status: user.verification_status,
            userId: user.id
        });

    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).json({error: "Error logging in"});
    }
};

const getVerificationStatus = async (req, res) => {
    const userId = req.params.userId;

    if (!userId) {
        return res.status(400).json({error: "User ID is required"});
    }

    try {
        const query = "SELECT verification_status FROM users WHERE id = ?";
        const params = [userId];
        const results = await executeQuery(query, params);

        if (results.length === 0) {
            return res.status(404).json({error: "User not found"});
        }

        res.status(200).json({verification_status: results[0].verification_status});

    } catch (error) {
        console.error("Error getting verification status:", error);
        res.status(500).json({error: "Error getting verification status"});
    }
};

const test = async (req, res) => {
    res.status(200).json({message: 'Test successful'});
};

module.exports = {
    addUser,
    loginUser,
    getVerificationStatus,
    test
};