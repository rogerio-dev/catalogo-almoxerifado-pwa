const mysql = require('mysql2/promise');
const dns = require('dns').promises;
require('dotenv').config();

// Helper: check non-empty env value and avoid unresolved template values
const isFilled = (v) => typeof v === 'string' && v.trim() !== '' && !v.includes('${{');

// Helper: validate a URL string contains a usable hostname
const validateUrlHasHost = (raw) => {
    try {
        const parsed = new URL(raw);
        return typeof parsed.hostname === 'string' && parsed.hostname.trim().length > 0 && parsed.hostname !== ':';
    } catch (e) {
        return false;
    }
};

// Helper: parse a mysql:// URL into a mysql2 pool config object
const parseMysqlUrlToConfig = (rawUrl) => {
    const parsed = new URL(rawUrl);
    const user = parsed.username || process.env.MYSQLUSER;
    const password = parsed.password || process.env.MYSQLPASSWORD || process.env.MYSQL_ROOT_PASSWORD;
    const host = parsed.hostname;
    const port = parsed.port ? parseInt(parsed.port, 10) : 3306;
    const database = (parsed.pathname || '').replace(/^\//, '') || process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE;

    return {
        host,
        port,
        user,
        password,
        database,
        charset: 'utf8mb4',
        connectionLimit: 10,
        acquireTimeout: 60000,
        reconnect: true,
        ssl: false
    };
};

// Verificar se estamos em produção
const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT === 'production';

let pool;

// Configuração MySQL baseada nas variáveis do Railway
const getMySQLConfig = () => {
    // Prefer the private MYSQL_URL (works inside Railway) when valid
    if (isFilled(process.env.MYSQL_URL) && validateUrlHasHost(process.env.MYSQL_URL)) {
        console.log('🔒 Usando MYSQL_URL (rede privada Railway)');
        return {
            type: 'url',
            value: process.env.MYSQL_URL
        };
    }

    // Use public TCP proxy URL only if it contains a real host
    if (isFilled(process.env.MYSQL_PUBLIC_URL) && validateUrlHasHost(process.env.MYSQL_PUBLIC_URL)) {
        console.log('🔒 Usando MYSQL_PUBLIC_URL (proxy público Railway)');
        return {
            type: 'public-url',
            value: process.env.MYSQL_PUBLIC_URL
        };
    }

    // Construir manualmente com variáveis individuais
    const host = process.env.MYSQLHOST;
    const port = process.env.MYSQLPORT || '3306';
    const user = process.env.MYSQLUSER;
    const password = process.env.MYSQLPASSWORD || process.env.MYSQL_ROOT_PASSWORD;
    const database = process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE;

    if (host && user && password && database) {
        console.log('🔧 Construindo configuração MySQL manual');
        return {
            type: 'config',
            value: {
                host: host,
                port: parseInt(port, 10),
                user: user,
                password: password,
                database: database,
                charset: 'utf8mb4',
                connectionLimit: 10,
                acquireTimeout: 60000,
                reconnect: true,
                ssl: false
            }
        };
    }

    throw new Error('❌ Variáveis MySQL não encontradas ou incompletas!');
};

async function connect() {
    try {
        if (!pool) {
            console.log('=== CONFIGURAÇÃO MYSQL RAILWAY ===');
            console.log('🔄 Conectando ao MySQL...');

            // Debug das variáveis
            console.log('🔍 VARIÁVEIS DISPONÍVEIS:');
            console.log('MYSQL_PUBLIC_URL:', process.env.MYSQL_PUBLIC_URL);
            console.log('MYSQL_URL:', process.env.MYSQL_URL);
            console.log('MYSQLHOST:', process.env.MYSQLHOST);
            console.log('MYSQLPORT:', process.env.MYSQLPORT);
            console.log('MYSQLUSER:', process.env.MYSQLUSER);
            console.log('MYSQLDATABASE:', process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE);

            const config = getMySQLConfig();

            // Create pool from URL but prefer resolving host to IPv4 to avoid IPv6 ECONNREFUSED
            const createPoolFromUrl = async (url) => {
                try {
                    // Parse URL into config so we can resolve hostname
                    const parsedConfig = parseMysqlUrlToConfig(url);

                    // Try IPv4 resolution for the hostname
                    try {
                        const lookup = await dns.lookup(parsedConfig.host, { family: 4 });
                        parsedConfig.host = lookup.address;
                        console.log('Host resolvido para IPv4 (a partir da URL):', parsedConfig.host);
                    } catch (dnsErr) {
                        console.log('Não foi possível resolver IPv4 do host (a partir da URL), usando hostname original:', parsedConfig.host);
                    }

                    console.log('Pool config a partir da URL (antes de criar pool):', {
                        host: parsedConfig.host,
                        port: parsedConfig.port,
                        user: parsedConfig.user,
                        database: parsedConfig.database
                    });

                    return mysql.createPool(parsedConfig);
                } catch (e) {
                    // If anything fails parsing/resolving, try passing the raw URL to mysql2 as a last resort
                    try {
                        console.log('Tentando criar pool diretamente a partir da string de conexão (última tentativa)');
                        return mysql.createPool(url);
                    } catch (innerErr) {
                        console.error('Erro ao criar pool a partir da URL (direta):', innerErr.message);
                        throw innerErr;
                    }
                }
            };

            if (config.type === 'url' || config.type === 'public-url') {
                console.log(config.type === 'public-url' ? 'Usando PUBLIC URL' : 'Usando PRIVATE URL');
                try {
                    pool = await createPoolFromUrl(config.value);
                } catch (e) {
                    console.error('Falha ao criar pool a partir da URL:', e.message);
                    // fallthrough to try manual config if available
                    if (isFilled(process.env.MYSQLHOST)) {
                        console.log('Tentando usar configuração manual via MYSQLHOST como fallback');
                        // build manual config
                        const manual = {
                            host: process.env.MYSQLHOST,
                            port: parseInt(process.env.MYSQLPORT || '3306', 10),
                            user: process.env.MYSQLUSER,
                            password: process.env.MYSQLPASSWORD || process.env.MYSQL_ROOT_PASSWORD,
                            database: process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE,
                            charset: 'utf8mb4',
                            connectionLimit: 10,
                            acquireTimeout: 60000,
                            reconnect: true,
                            ssl: false
                        };
                        // try resolve IPv4
                        try {
                            const lookup = await dns.lookup(manual.host, { family: 4 });
                            manual.host = lookup.address;
                            console.log('Host resolvido para IPv4:', manual.host);
                        } catch (dnsErr) {
                            console.log('Não foi possível resolver IPv4 do host, usando valor original:', manual.host);
                        }
                        pool = mysql.createPool(manual);
                    } else {
                        throw e;
                    }
                }
            } else {
                // config.type === 'config'
                // Try to resolve hostname to IPv4 to avoid IPv6 ECONNREFUSED
                try {
                    const lookup = await dns.lookup(config.value.host, { family: 4 });
                    config.value.host = lookup.address;
                    console.log('Host resolvido para IPv4:', config.value.host);
                } catch (dnsErr) {
                    console.log('Não foi possível resolver IPv4 do host, usando valor original:', config.value.host);
                }

                pool = mysql.createPool(config.value);
            }

            // Testar a conexão
            console.log('🧪 Testando conexão MySQL...');
            try {
                const testConn = await pool.getConnection();
                await testConn.execute('SELECT 1 as test');
                testConn.release();
                console.log('✅ Conexão MySQL estabelecida com sucesso!');
            } catch (err) {
                console.error('❌ Falha ao testar pool inicial:', err.message);

                // Se tiver MYSQL_PUBLIC_URL disponível e ainda não tentamos como manual, tentar fallback
                if ((err.code === 'ECONNREFUSED' || err.message.includes('ECONNREFUSED')) && process.env.MYSQL_PUBLIC_URL && validateUrlHasHost(process.env.MYSQL_PUBLIC_URL)) {
                    console.log('🔁 Tentando fallback para MYSQL_PUBLIC_URL devido a ECONNREFUSED...');
                    try {
                        pool = await createPoolFromUrl(process.env.MYSQL_PUBLIC_URL);
                        const testConn2 = await pool.getConnection();
                        await testConn2.execute('SELECT 1 as test');
                        testConn2.release();
                        console.log('✅ Conexão via MYSQL_PUBLIC_URL estabelecida com sucesso!');
                    } catch (err2) {
                        console.error('❌ Fallback para MYSQL_PUBLIC_URL falhou:', err2.message);
                        throw err2;
                    }
                } else {
                    throw err;
                }
            }
        }

        return pool;
    } catch (err) {
        console.error('❌ Erro na conexão com o banco:', err.message);
        throw err;
    }
}

// Função para testar a conexão
async function testConnection() {
    try {
        console.log('🧪 Testando conexão com MySQL...');
        const connection = await connect();
        const [rows] = await connection.execute('SELECT NOW() as CurrentTime, 1 as test');
        console.log('🎉 Teste de conexão MySQL bem-sucedido:', rows[0]);
        return true;
    } catch (err) {
        console.error('❌ Teste de conexão falhou:', err.message);
        return false;
    }
}

// Função para executar queries (MySQL apenas)
async function query(sql, params = []) {
    try {
        const connection = await connect();
        const [rows] = await connection.execute(sql, params);

        // Para INSERT, UPDATE, DELETE - retornar informações de resultado
        if (sql.trim().toUpperCase().startsWith('INSERT')) {
            return { insertId: rows.insertId, affectedRows: rows.affectedRows };
        } else if (sql.trim().toUpperCase().startsWith('UPDATE') || sql.trim().toUpperCase().startsWith('DELETE')) {
            return { affectedRows: rows.affectedRows };
        }

        // Para SELECT - retornar as linhas
        return rows;
    } catch (err) {
        console.error('❌ Erro ao executar query MySQL:', err.message);
        throw err;
    }
}

// Função para inicializar as tabelas MySQL
async function initializeTables() {
    try {
        console.log('🔄 Inicializando tabelas MySQL...');

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

    } catch (error) {
        console.error('❌ Erro ao inicializar tabelas MySQL:', error);
        throw error;
    }
}

// Função para fechar conexão MySQL
async function closeConnection() {
    try {
        if (pool) {
            await pool.end();
            console.log('✅ Pool MySQL fechado');
        }
    } catch (err) {
        console.error('❌ Erro ao fechar conexão MySQL:', err);
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
