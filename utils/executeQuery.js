const pool = require('../utils/database');

const executeQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    pool.query(query, params, (error, results) => {
      if (error) {
        console.error('Database query error:', error);

        return reject({ status: 500, message: 'Database query failed', error }); // Send error object with status
      }
      resolve(results);
    });
  });
};

module.exports = executeQuery;
