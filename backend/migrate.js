const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
  try {
    const connection = await mysql.createConnection({
      uri: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: true },
      multipleStatements: true
    });
    
    console.log('Connected to TiDB. Creating schema...');
    const schema = fs.readFileSync('schema.sql', 'utf8');
    await connection.query(schema);
    console.log('Schema created successfully!');
    
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  }
}
run();
