const mysql = require('mysql2/promise');
require('dotenv').config();

let pool = null;

/**
 * Create MySQL connection pool using .env variables
 */
function createPool() {
    const config = {
        host: process.env.DB_HOST || 'mysql.railway.internal',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'TVHomrgsDyHvnhYLHshyfTvybLwGijnK',
        database: process.env.DB_NAME || 'railway',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        charset: 'utf8mb4'
    };

    console.log(`🔄 Creating MySQL connection pool...`);
    console.log(`📍 Host: ${config.host}:${config.port}`);
    console.log(`🗄️ Database: ${config.database}`);
    console.log(`👤 User: ${config.user}`);
    
    return mysql.createPool(config);
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
        const [rows] = await connection.execute('SELECT NOW() as test_time, 1 as test_value');
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
