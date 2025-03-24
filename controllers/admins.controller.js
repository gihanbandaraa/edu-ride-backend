const jwt = require('jsonwebtoken');
const executeQuery = require("../utils/executeQuery");
const key = process.env.JWT_SECRET_KEY;

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
            SELECT d.*, u.role, u.verification_status
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
    const {driverId} = req.params;

    try {
        const query = `
            UPDATE users
            SET verification_status = 'verified'
            WHERE id = ${driverId}
        `;
        await executeQuery(query);
        res.status(200).json({message: "Driver verified successfully"});
    } catch (error) {
        console.error("Error verifying driver:", error);
        res.status(500).json({error: "Internal Server Error"});
    }
};


module.exports = {adminLogin, getDriversDetails};
