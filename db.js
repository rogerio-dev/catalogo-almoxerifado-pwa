const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

// Configuração do MySQL usando variáveis de ambiente do Railway
const mysqlConfig = {
    host: process.env.MYSQLHOST,
    port: parseInt(process.env.MYSQLPORT) || 3306,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    connectionLimit: 10,
    charset: 'utf8mb4'
};

// Verificar se estamos em produção
const isProduction = process.env.NODE_ENV === 'production' || process.env.MYSQLHOST;

let pool;
let db; // SQLite database

async function connect() {
    try {
        if (isProduction) {
            if (!pool) {
                console.log('=== CONFIGURAÇÃO MYSQL RAILWAY ===');
                console.log('🔄 Conectando ao MySQL...');
                
                // Priorizar MYSQL_PUBLIC_URL (TCP Proxy - mais confiável)
                if (process.env.MYSQL_PUBLIC_URL) {
                    console.log('🌐 Usando MYSQL_PUBLIC_URL (TCP Proxy)');
                    const publicUrl = process.env.MYSQL_PUBLIC_URL;
                    console.log('URL Proxy:', publicUrl.substring(0, 40) + '...');
                    
                    pool = mysql.createPool(publicUrl);
                    console.log('✅ Pool MySQL criado com URL Pública (TCP Proxy)');
                    
                } else if (process.env.MYSQL_URL) {
                    console.log('🔒 Usando MYSQL_URL (Private Network)');
                    const privateUrl = process.env.MYSQL_URL;
                    console.log('URL Privada:', privateUrl.substring(0, 40) + '...');
                    
                    pool = mysql.createPool(privateUrl);
                    console.log('✅ Pool MySQL criado com URL Privada');
                    
                } else if (mysqlConfig.host && mysqlConfig.user && mysqlConfig.password && mysqlConfig.database) {
                    console.log('🐬 Usando variáveis individuais');
                    console.log('Host:', mysqlConfig.host);
                    console.log('Database:', mysqlConfig.database);
                    console.log('User:', mysqlConfig.user);
                    console.log('Port:', mysqlConfig.port);
                    
                    pool = mysql.createPool(mysqlConfig);
                    console.log('✅ Pool MySQL criado com variáveis individuais');
                    
                } else {
                    throw new Error('Nenhuma configuração MySQL válida encontrada!');
                }
            }
            return pool;
        } else {
            // SQLite para desenvolvimento
            if (!db) {
                console.log('🔄 Conectando ao SQLite...');
                db = new sqlite3.Database('./database.sqlite', (err) => {
                    if (err) {
                        console.error('❌ Erro ao conectar com SQLite:', err);
                        throw err;
                    } else {
                        console.log('✅ Conectado ao SQLite com sucesso!');
                    }
                });
            }
            return db;
        }
    } catch (err) {
        console.error('❌ Erro na conexão com o banco:', err.message);
        throw err;
    }
}

// Função para testar a conexão
async function testConnection() {
    try {
        if (isProduction) {
            const connection = await connect();
            const [rows] = await connection.execute('SELECT NOW() as CurrentTime');
            console.log('🎉 Teste de conexão MySQL bem-sucedido:', rows[0]);
            return true;
        } else {
            // Teste para SQLite
            const connection = await connect();
            return new Promise((resolve, reject) => {
                connection.get('SELECT datetime("now") as CurrentTime', (err, row) => {
                    if (err) {
                        console.error('❌ Teste de conexão SQLite falhou:', err.message);
                        reject(err);
                        return false;
                    }
                    console.log('🎉 Teste de conexão SQLite bem-sucedido:', row);
                    resolve(true);
                });
            });
        }
    } catch (err) {
        console.error('❌ Teste de conexão falhou:', err.message);
        return false;
    }
}

// Função para executar queries (abstração para MySQL e SQLite)
async function query(sql, params = []) {
    try {
        if (isProduction) {
            // MySQL
            const connection = await connect();
            const [rows] = await connection.execute(sql, params);
            return rows;
        } else {
            // SQLite
            const connection = await connect();
            return new Promise((resolve, reject) => {
                if (sql.trim().toUpperCase().startsWith('SELECT')) {
                    connection.all(sql, params, (err, rows) => {
                        if (err) {
                            console.error('❌ Erro ao executar query SQLite:', err.message);
                            reject(err);
                        } else {
                            resolve(rows);
                        }
                    });
                } else {
                    connection.run(sql, params, function(err) {
                        if (err) {
                            console.error('❌ Erro ao executar query SQLite:', err.message);
                            reject(err);
                        } else {
                            resolve({ 
                                affectedRows: this.changes, 
                                insertId: this.lastID 
                            });
                        }
                    });
                }
            });
        }
    } catch (err) {
        console.error('❌ Erro ao executar query:', err.message);
        throw err;
    }
}

// Função para inicializar as tabelas
async function initializeTables() {
    try {
        console.log('🔄 Inicializando tabelas do banco...');
        
        if (isProduction) {
            // Tabelas MySQL
            const mysqlTables = [
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

            for (const table of mysqlTables) {
                await query(table);
            }
            console.log('✅ Tabelas MySQL criadas/verificadas com sucesso');
            
        } else {
            // Tabelas SQLite
            const sqliteTables = [
                `CREATE TABLE IF NOT EXISTS categorias (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  nome TEXT NOT NULL UNIQUE,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`,
                
                `CREATE TABLE IF NOT EXISTS subcategorias (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  nome TEXT NOT NULL,
                  categoria_id INTEGER,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE,
                  UNIQUE(nome, categoria_id)
                )`,
                
                `CREATE TABLE IF NOT EXISTS itens (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  nome TEXT NOT NULL,
                  imagem TEXT,
                  subcategoria_id INTEGER,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (subcategoria_id) REFERENCES subcategorias(id) ON DELETE CASCADE,
                  UNIQUE(nome, subcategoria_id)
                )`
            ];

            for (const table of sqliteTables) {
                await query(table);
            }
            console.log('✅ Tabelas SQLite criadas/verificadas com sucesso');
        }
        
    } catch (error) {
        console.error('❌ Erro ao inicializar tabelas:', error);
        throw error;
    }
}

// Função para fechar conexões
async function closeConnection() {
    try {
        if (isProduction && pool) {
            await pool.end();
            console.log('✅ Pool MySQL fechado');
        } else if (!isProduction && db) {
            db.close((err) => {
                if (err) {
                    console.error('❌ Erro ao fechar SQLite:', err);
                } else {
                    console.log('✅ Conexão SQLite fechada');
                }
            });
        }
    } catch (err) {
        console.error('❌ Erro ao fechar conexão:', err);
    }
}

module.exports = { 
    connect, 
    testConnection, 
    query, 
    initializeTables, 
    closeConnection,
    isProduction 
};
