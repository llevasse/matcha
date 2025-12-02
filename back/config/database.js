const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'matcha',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z'
};

const pool = mysql.createPool(dbConfig);

// Test de connexion
async function testConnection() {
  var connected = false;
  for (i = 0; i < 5 && connected === false; i++)
    try {
        const connection = await pool.getConnection();
        console.log('Database connected successfully');
        connected = true;
        connection.release();
    } catch (error) {
        console.error('Database connection failed:', error.message);
        await new Promise(r => setTimeout(r, 2000));
    }
    
}

testConnection();

module.exports = pool;