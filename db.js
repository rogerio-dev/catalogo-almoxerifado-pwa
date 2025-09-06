const mysql = require('mysql2/promise');
require('dotenv').config();

// Railway MySQL connection pool
let pool = null;

// Check if we're in production (Railway)
const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT === 'production';

/**
 * Create MySQL connection pool for Railway
 * Railway automatically provides these environment variables when MySQL service is added:
 * - MYSQL_URL: Complete connection string (preferred)
 * - MYSQLHOST, MYSQLPORT, MYSQLUSER, MYSQL_ROOT_PASSWORD, MYSQLDATABASE: Individual vars
 */
function createPool() {
    console.log('🔄 Creating MySQL connection pool for Railway...');
    
    // Method 1: Use MYSQL_URL if available (Railway's preferred method)
    if (process.env.MYSQL_URL) {
        console.log('✅ Using MYSQL_URL connection string');
        return mysql.createPool({
            uri: process.env.MYSQL_URL,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            acquireTimeout: 60000,
            timeout: 60000,
            reconnect: true
        });
    }
    
    // Method 2: Use individual environment variables
    if (process.env.MYSQLHOST && process.env.MYSQLUSER && process.env.MYSQL_ROOT_PASSWORD) {
        console.log('✅ Using individual MySQL environment variables');
        return mysql.createPool({
            host: process.env.MYSQLHOST,
            port: process.env.MYSQLPORT || 3306,
            user: process.env.MYSQLUSER,
            password: process.env.MYSQL_ROOT_PASSWORD,
            database: process.env.MYSQLDATABASE || 'railway',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            acquireTimeout: 60000,
            timeout: 60000,
            reconnect: true,
            charset: 'utf8mb4'
        });
    }
    
    throw new Error('❌ MySQL environment variables not found! Please ensure MySQL service is added to Railway project.');
}

/**
 * Get or create database connection pool
 */
async function connect() {
    if (!pool) {
        try {
            pool = createPool();
            console.log('✅ MySQL pool created successfully');
        } catch (error) {
            console.error('❌ Failed to create MySQL pool:', error.message);
            throw error;
        }
    }
    return pool;
}

/**
 * Test database connection
 */
async function testConnection() {
    try {
        console.log('🧪 Testing MySQL connection...');
        const connection = await connect();
        const [rows] = await connection.execute('SELECT NOW() as current_time, 1 as test');
        console.log('✅ MySQL connection test successful:', rows[0]);
        return true;
    } catch (err) {
        console.error('❌ Connection test failed:', err.message);
        return false;
    }
}

/**
 * Execute database queries
 */
async function query(sql, params = []) {
    try {
        const connection = await connect();
        const [rows] = await connection.execute(sql, params);

        // For INSERT operations - return insert ID and affected rows
        if (sql.trim().toUpperCase().startsWith('INSERT')) {
            return { insertId: rows.insertId, affectedRows: rows.affectedRows };
        } 
        
        // For UPDATE/DELETE operations - return affected rows
        if (sql.trim().toUpperCase().startsWith('UPDATE') || sql.trim().toUpperCase().startsWith('DELETE')) {
            return { affectedRows: rows.affectedRows };
        }

        // For SELECT operations - return the rows
        return rows;
    } catch (err) {
        console.error('❌ Database query error:', err.message);
        console.error('SQL:', sql);
        console.error('Params:', params);
        throw err;
    }
}

/**
 * Initialize database tables
 */
async function initializeTables() {
    try {
        console.log('🔄 Initializing MySQL tables...');

        // Create tables for Railway MySQL
        const tables = [
            `CREATE TABLE IF NOT EXISTS categorias (
              id INT AUTO_INCREMENT PRIMARY KEY,
              nome VARCHAR(255) NOT NULL UNIQUE,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )`,

            `CREATE TABLE IF NOT EXISTS subcategorias (
              id INT AUTO_INCREMENT PRIMARY KEY,
              nome VARCHAR(255) NOT NULL,
              categoria_id INT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE,
              UNIQUE KEY unique_subcategoria (nome, categoria_id)
            )`,

            `CREATE TABLE IF NOT EXISTS itens (
              id INT AUTO_INCREMENT PRIMARY KEY,
              nome VARCHAR(255) NOT NULL,
              imagem VARCHAR(500),
              subcategoria_id INT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              FOREIGN KEY (subcategoria_id) REFERENCES subcategorias(id) ON DELETE CASCADE,
              UNIQUE KEY unique_item (nome, subcategoria_id)
            )`
        ];

        for (const table of tables) {
            await query(table);
        }
        console.log('✅ MySQL tables created/verified successfully');

    } catch (error) {
        console.error('❌ Error initializing MySQL tables:', error);
        throw error;
    }
}

/**
 * Close database connection
 */
async function closeConnection() {
    try {
        if (pool) {
            await pool.end();
            console.log('✅ MySQL pool closed');
        }
    } catch (err) {
        console.error('❌ Error closing MySQL connection:', err);
    }
}

module.exports = {
    connect,
    testConnection,
    query,
    initializeTables,
    closeConnection
};
