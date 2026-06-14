const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = process.env.DATABASE_URL 
  ? mysql.createPool({
      uri: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: true },
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    })
  : mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'splitwise_clone',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

module.exports = {
  query: async (text, params) => {
    const [rows, fields] = await pool.execute(text, params);
    return { rows, fields }; // Shim to keep the same API structure as pg
  },
  pool,
};
