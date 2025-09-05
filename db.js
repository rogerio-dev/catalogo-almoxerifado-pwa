const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

// Verificar se estamos em produção
const isProduction = process.env.NODE_ENV === 'production' || process.env.MYSQLHOST || process.env.MYSQL_HOST;

let pool;
let db; // SQLite database

async function connect() {
    try {
        if (isProduction) {
            if (!pool) {
                console.log('=== CONFIGURAÇÃO MYSQL - MÚLTIPLAS ESTRATÉGIAS ===');
                
                // Debug das variáveis disponíveis
                console.log('🔍 VARIÁVEIS DISPONÍVEIS:');
                console.log('MYSQL_URL:', process.env.MYSQL_URL ? `[${process.env.MYSQL_URL.length} chars]` : '[NÃO DEFINIDA]');
                console.log('MYSQL_PUBLIC_URL:', process.env.MYSQL_PUBLIC_URL ? `[${process.env.MYSQL_PUBLIC_URL.length} chars]` : '[NÃO DEFINIDA]');
                console.log('MYSQLHOST:', process.env.MYSQLHOST);
                console.log('MYSQL_HOST:', process.env.MYSQL_HOST);
                console.log('MYSQLPORT:', process.env.MYSQLPORT);
                console.log('MYSQL_PORT:', process.env.MYSQL_PORT);
                console.log('MYSQLUSER:', process.env.MYSQLUSER);
                console.log('MYSQL_USER:', process.env.MYSQL_USER);
                console.log('MYSQLDATABASE:', process.env.MYSQLDATABASE);
                console.log('MYSQL_DATABASE:', process.env.MYSQL_DATABASE);
                
                // Função para validar URL
                const isValidUrl = (url) => {
                    if (!url || url.includes('${{{') || url.includes('}}}')) return false;
                    try {
                        new URL(url);
                        return true;
                    } catch {
                        return false;
                    }
                };
                
                // Estratégia 1: Tentar com MYSQL_URL
                if (process.env.MYSQL_URL && isValidUrl(process.env.MYSQL_URL)) {
                    console.log('\n🧪 ESTRATÉGIA 1: Usando MYSQL_URL');
                    try {
                        console.log('URL completa:', process.env.MYSQL_URL.replace(/:[^:@]+@/, ':***@'));
                        pool = mysql.createPool(process.env.MYSQL_URL);
                        
                        // Testar a conexão
                        const testConn = await pool.getConnection();
                        await testConn.execute('SELECT 1');
                        testConn.release();
                        
                        console.log('✅ SUCESSO com MYSQL_URL!');
                        return pool;
                    } catch (error) {
                        console.log('❌ MYSQL_URL falhou:', error.message);
                        if (pool) {
                            await pool.end().catch(() => {});
                            pool = null;
                        }
                    }
                }
                
                // Estratégia 2: Tentar com MYSQL_PUBLIC_URL
                if (process.env.MYSQL_PUBLIC_URL && isValidUrl(process.env.MYSQL_PUBLIC_URL)) {
                    console.log('\n🧪 ESTRATÉGIA 2: Usando MYSQL_PUBLIC_URL');
                    try {
                        console.log('URL TCP completa:', process.env.MYSQL_PUBLIC_URL.replace(/:[^:@]+@/, ':***@'));
                        pool = mysql.createPool(process.env.MYSQL_PUBLIC_URL);
                        
                        // Testar a conexão
                        const testConn = await pool.getConnection();
                        await testConn.execute('SELECT 1');
                        testConn.release();
                        
                        console.log('✅ SUCESSO com MYSQL_PUBLIC_URL!');
                        return pool;
                    } catch (error) {
                        console.log('❌ MYSQL_PUBLIC_URL falhou:', error.message);
                        if (pool) {
                            await pool.end().catch(() => {});
                            pool = null;
                        }
                    }
                }
                
                // Estratégia 3: Construir URL TCP manualmente
                const host = process.env.MYSQLHOST || process.env.MYSQL_HOST;
                const port = process.env.MYSQLPORT || process.env.MYSQL_PORT || '3306';
                const user = process.env.MYSQLUSER || process.env.MYSQL_USER;
                const password = process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD;
                const database = process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE;
                
                if (host && user && password && database) {
                    console.log('\n🧪 ESTRATÉGIA 3: Construindo URL TCP manualmente');
                    try {
                        // Verificar se é host interno e tentar convertê-lo para TCP Proxy
                        let tcpHost = host;
                        if (host.includes('.railway.internal')) {
                            // Converter para TCP Proxy
                            const serviceName = host.split('.')[0];
                            tcpHost = `${serviceName}-production.up.railway.app`;
                            console.log(`🔄 Convertendo host interno para TCP: ${host} -> ${tcpHost}`);
                        }
                        
                        const tcpUrl = `mysql://${user}:${password}@${tcpHost}:${port}/${database}`;
                        console.log('TCP URL construída:', tcpUrl.replace(password, '***'));
                        
                        pool = mysql.createPool(tcpUrl);
                        
                        // Testar a conexão
                        const testConn = await pool.getConnection();
                        await testConn.execute('SELECT 1');
                        testConn.release();
                        
                        console.log('✅ SUCESSO com TCP Proxy manual!');
                        return pool;
                    } catch (error) {
                        console.log('❌ TCP Proxy manual falhou:', error.message);
                        if (pool) {
                            await pool.end().catch(() => {});
                            pool = null;
                        }
                    }
                    
                    // Estratégia 4: Tentar com configuração tradicional
                    console.log('\n🧪 ESTRATÉGIA 4: Configuração tradicional');
                    try {
                        const config = {
                            host: host,
                            port: parseInt(port),
                            user: user,
                            password: password,
                            database: database,
                            connectionLimit: 10,
                            acquireTimeout: 15000,
                            timeout: 15000,
                            reconnect: true,
                            charset: 'utf8mb4'
                        };
                        
                        console.log('Config:', {
                            host: config.host,
                            port: config.port,
                            user: config.user,
                            database: config.database
                        });
                        
                        pool = mysql.createPool(config);
                        
                        // Testar a conexão
                        const testConn = await pool.getConnection();
                        await testConn.execute('SELECT 1');
                        testConn.release();
                        
                        console.log('✅ SUCESSO com configuração tradicional!');
                        return pool;
                    } catch (error) {
                        console.log('❌ Configuração tradicional falhou:', error.message);
                        if (pool) {
                            await pool.end().catch(() => {});
                            pool = null;
                        }
                    }
                }
                
                console.log('\n❌ TODAS AS ESTRATÉGIAS DE CONEXÃO MYSQL FALHARAM!');
                console.log('🔄 Caindo de volta para SQLite...');
                
                // Fallback para SQLite se MySQL falhar
                if (!db) {
                    console.log('🔄 Conectando ao SQLite como fallback...');
                    db = new sqlite3.Database('./database.sqlite', (err) => {
                        if (err) {
                            console.error('❌ Erro ao conectar com SQLite:', err);
                            throw err;
                        }
                        console.log('✅ Conectado ao SQLite como fallback');
                    });
                }
                return db;
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
