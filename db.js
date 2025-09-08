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
 * Initialize database tables with multi-tenant support
 */
async function initializeTables() {
    try {
        console.log('🔄 Initializing MySQL tables...');

        const tables = [
            // Empresas table
            `CREATE TABLE IF NOT EXISTS empresas (
              id INT AUTO_INCREMENT PRIMARY KEY,
              nome VARCHAR(255) NOT NULL,
              identificador VARCHAR(100) NOT NULL UNIQUE,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )`,

            // Usuarios table
            `CREATE TABLE IF NOT EXISTS usuarios (
              id INT AUTO_INCREMENT PRIMARY KEY,
              username VARCHAR(100) NOT NULL,
              password VARCHAR(255) NOT NULL,
              nome VARCHAR(255) NOT NULL,
              empresa_id INT NOT NULL,
              is_admin BOOLEAN DEFAULT FALSE,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
              UNIQUE KEY unique_user_empresa (username, empresa_id)
            )`,

            // Sessoes table  
            `CREATE TABLE IF NOT EXISTS sessoes (
              id VARCHAR(255) PRIMARY KEY,
              usuario_id INT NOT NULL,
              empresa_id INT NOT NULL,
              expires_at TIMESTAMP NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
              FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
            )`,

            // Categorias with empresa_id
            `CREATE TABLE IF NOT EXISTS categorias (
              id INT AUTO_INCREMENT PRIMARY KEY,
              nome VARCHAR(255) NOT NULL,
              empresa_id INT NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
              UNIQUE KEY unique_categoria_empresa (nome, empresa_id)
            )`,

            // Subcategorias with empresa_id reference
            `CREATE TABLE IF NOT EXISTS subcategorias (
              id INT AUTO_INCREMENT PRIMARY KEY,
              nome VARCHAR(255) NOT NULL,
              categoria_id INT,
              empresa_id INT NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE,
              FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
              UNIQUE KEY unique_subcategoria_empresa (nome, categoria_id, empresa_id)
            )`,

            // Itens with empresa_id reference
            `CREATE TABLE IF NOT EXISTS itens (
              id INT AUTO_INCREMENT PRIMARY KEY,
              nome VARCHAR(255) NOT NULL,
              imagem VARCHAR(500),
              subcategoria_id INT,
              empresa_id INT NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              FOREIGN KEY (subcategoria_id) REFERENCES subcategorias(id) ON DELETE CASCADE,
              FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
              UNIQUE KEY unique_item_empresa (nome, subcategoria_id, empresa_id)
            )`
        ];

        for (const table of tables) {
            await query(table);
        }
        
        // Add empresa_id columns to existing tables if they don't exist
        await updateExistingTables();
        
        console.log('✅ MySQL tables created/verified successfully');

        // Create default admin user if not exists
        await createDefaultAdmin();

    } catch (error) {
        console.error('❌ Error initializing MySQL tables:', error);
        throw error;
    }
}

/**
 * Update existing tables to add empresa_id columns if they don't exist
 */
async function updateExistingTables() {
    try {
        // Check and add empresa_id to categorias table
        try {
            await query('SELECT empresa_id FROM categorias LIMIT 1');
        } catch (error) {
            console.log('🔄 Adding empresa_id column to categorias table...');
            await query('ALTER TABLE categorias ADD COLUMN empresa_id INT NOT NULL DEFAULT 1');
            await query('ALTER TABLE categorias ADD FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE');
            await query('ALTER TABLE categorias ADD UNIQUE KEY unique_categoria_empresa (nome, empresa_id)');
        }

        // Check and add empresa_id to subcategorias table
        try {
            await query('SELECT empresa_id FROM subcategorias LIMIT 1');
        } catch (error) {
            console.log('🔄 Adding empresa_id column to subcategorias table...');
            await query('ALTER TABLE subcategorias ADD COLUMN empresa_id INT NOT NULL DEFAULT 1');
            await query('ALTER TABLE subcategorias ADD FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE');
            await query('ALTER TABLE subcategorias ADD UNIQUE KEY unique_subcategoria_empresa (nome, categoria_id, empresa_id)');
        }

        // Check and add empresa_id to itens table
        try {
            await query('SELECT empresa_id FROM itens LIMIT 1');
        } catch (error) {
            console.log('🔄 Adding empresa_id column to itens table...');
            await query('ALTER TABLE itens ADD COLUMN empresa_id INT NOT NULL DEFAULT 1');
            await query('ALTER TABLE itens ADD FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE');
            await query('ALTER TABLE itens ADD UNIQUE KEY unique_item_empresa (nome, subcategoria_id, empresa_id)');
        }

        console.log('✅ Existing tables updated successfully');
    } catch (error) {
        console.log('⚠️ Some table updates may have failed (this is normal if tables are already updated):', error.message);
    }
}

/**
 * Create default admin user and company if not exists
 */
async function createDefaultAdmin() {
    try {
        // Check if admin company exists
        const [adminCompany] = await query('SELECT id FROM empresas WHERE identificador = ?', ['admin']);
        
        let adminEmpresaId;
        if (!adminCompany) {
            const result = await query('INSERT INTO empresas (nome, identificador) VALUES (?, ?)', 
                ['Administração', 'admin']);
            adminEmpresaId = result.insertId;
            console.log('✅ Default admin company created');
        } else {
            adminEmpresaId = adminCompany.id;
        }

        // Check if admin user exists
        const [adminUser] = await query('SELECT id FROM usuarios WHERE username = ? AND empresa_id = ?', 
            ['admin', adminEmpresaId]);
        
        if (!adminUser) {
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            await query('INSERT INTO usuarios (username, password, nome, empresa_id, is_admin) VALUES (?, ?, ?, ?, ?)', 
                ['admin', hashedPassword, 'Administrador', adminEmpresaId, true]);
            console.log('✅ Default admin user created (admin/admin123)');
        }
    } catch (error) {
        console.error('❌ Error creating default admin:', error.message);
    }
}

/**
 * Authentication functions
 */
async function authenticateUser(username, password, empresaIdentificador) {
    try {
        const [user] = await query(`
            SELECT u.*, e.nome as empresa_nome, e.identificador as empresa_identificador 
            FROM usuarios u 
            JOIN empresas e ON u.empresa_id = e.id 
            WHERE u.username = ? AND e.identificador = ?
        `, [username, empresaIdentificador]);

        if (!user) {
            return null;
        }

        const bcrypt = require('bcrypt');
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return null;
        }

        // Remove password from response
        delete user.password;
        return user;
    } catch (error) {
        console.error('❌ Authentication error:', error.message);
        return null;
    }
}

async function createSession(userId, empresaId) {
    try {
        const sessionId = require('crypto').randomUUID();
        const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)); // 24 hours
        
        await query('INSERT INTO sessoes (id, usuario_id, empresa_id, expires_at) VALUES (?, ?, ?, ?)', 
            [sessionId, userId, empresaId, expiresAt]);
        
        return sessionId;
    } catch (error) {
        console.error('❌ Session creation error:', error.message);
        return null;
    }
}

async function validateSession(sessionId) {
    try {
        const [session] = await query(`
            SELECT s.*, u.username, u.nome, u.is_admin, e.nome as empresa_nome, e.identificador as empresa_identificador
            FROM sessoes s
            JOIN usuarios u ON s.usuario_id = u.id
            JOIN empresas e ON s.empresa_id = e.id
            WHERE s.id = ? AND s.expires_at > NOW()
        `, [sessionId]);

        return session || null;
    } catch (error) {
        console.error('❌ Session validation error:', error.message);
        return null;
    }
}

async function deleteSession(sessionId) {
    try {
        await query('DELETE FROM sessoes WHERE id = ?', [sessionId]);
        return true;
    } catch (error) {
        console.error('❌ Session deletion error:', error.message);
        return false;
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
    closeConnection,
    authenticateUser,
    createSession,
    validateSession,
    deleteSession
};
