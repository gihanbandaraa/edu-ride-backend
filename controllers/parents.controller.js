const executeQuery = require('../utils/executeQuery');
const bcrypt = require('bcrypt');

const parentLogin = async (req, res) => {
    const {email, name, password} = req.body;
    if (!email || !password || !name) {
        return res.status(400).json({error: "Email and password are required"});
    }
    //Check both name and password are matching use users table and role as parent
    try {
        const query = "SELECT * FROM users WHERE email = ? AND role = ? AND name = ?";
        const params = [email, "parent", name];
        const results = await executeQuery(query, params);
        if (results.length === 0) {
            return res.status(401).json({error: "Invalid email/username or password"});
        }
        const user = results[0];
        if (!user.password_hash) {
            return res.status(401).json({error: "Invalid password"});
        }
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({error: "Invalid password"});
        }
        res.status(200).json({
            message: "Login successful",
            userId: user.id
        });
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).json({error: "Error logging in"});
    }

}
const getStudentDetails = async (req, res) => {
    const userId = req.params.userId;
    if (!userId) {
        return res.status(400).json({error: "User ID is required"});
    }

    try {
        // Get parent and student details with driver info
        const detailsQuery = `
            SELECT p.id as parent_id, p.full_name as parent_name, p.phone,
                   s.id as student_id, s.full_name as student_name,
                   s.school, s.pickup_location_longitude, s.pickup_location_latitude,
                   s.dropoff_location_latitude, s.dropoff_location_longitude,
                   d.id as driver_id, d.full_name as driver_name, d.phone_num as driver_contact
            FROM users u
                     JOIN parents p ON u.id = p.user_id
                     JOIN students s ON p.id = s.parent_id
                     LEFT JOIN drivers d ON s.driver_id =  d.user_id
            WHERE u.id = ?`;

        const details = await executeQuery(detailsQuery, [userId]);

        if (details.length === 0) {
            return res.status(404).json({error: "No details found"});
        }

        // Get latest attendance for each student
        const studentIds = details.map(detail => detail.student_id);
        const attendanceQuery = `
            SELECT a.*
            FROM attendance a
                     INNER JOIN (
                SELECT student_id, MAX(date) as latest_date
                FROM attendance
                WHERE student_id IN (?)
                GROUP BY student_id
            ) latest ON a.student_id = latest.student_id AND a.date = latest.latest_date`;

        const attendance = await executeQuery(attendanceQuery, [studentIds]);

        // Structure the response
        const parentInfo = {
            id: details[0].parent_id,
            name: details[0].parent_name,
            phone: details[0].phone
        };

        const students = details.map(detail => {
            const studentAttendance = attendance.find(a => a.student_id === detail.student_id) || null;

            return {
                id: detail.student_id,
                name: detail.student_name,
                school: detail.school,
                pickup_location: {
                    longitude: detail.pickup_location_longitude,
                    latitude: detail.pickup_location_latitude
                },
                dropoff_location: {
                    longitude: detail.dropoff_location_longitude,
                    latitude: detail.dropoff_location_latitude
                },
                driver: detail.driver_id ? {
                    id: detail.driver_id,
                    name: detail.driver_name,
                    phone: detail.driver_contact
                } : null,
                latest_attendance: studentAttendance ? {
                    date: studentAttendance.date,
                    morning_ride_status: studentAttendance.morning_ride_status,
                    afternoon_ride_status: studentAttendance.afternoon_ride_status,
                    morning_attendance_status: studentAttendance.morning_attendance_status,
                    afternoon_attendance_status: studentAttendance.afternoon_attendance_status
                } : null
            };
        });

        res.status(200).json({
            parent: parentInfo,
            students: students
        });

    } catch (error) {
        console.error("Error retrieving details:", error);
        res.status(500).json({error: "Error retrieving details"});
    }
};
module.exports = {
    parentLogin,
    getStudentDetails
};