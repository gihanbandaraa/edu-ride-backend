const express = require('express')
const cors = require('cors')
const database = require('./utils/database')
const fs = require('fs');
const path = require('path');

const app = express()
const port = process.env.PORT || 3000

const testRoutes = require('./routes/test.routes')
const usersRoutes = require('./routes/users.routes')
const driversRoutes = require('./routes/drivers.routes')
const studentsRoutes = require('./routes/students.routes')
const parentsRoutes = require('./routes/parents.routes')


const dir = path.join(__dirname, 'uploads');
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static('uploads'))

app.use('/api/test', testRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/drivers', driversRoutes)
app.use('/api/students', studentsRoutes)
app.use('/api/parents', parentsRoutes)


app.get('/', (req, res) => {
    res.send('Hello World')
});

database.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to the database:', err)
    } else {
        console.log('Database connected successfully')
        connection.release()
    }
})

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});


