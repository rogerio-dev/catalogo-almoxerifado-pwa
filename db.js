const mysql = require('mysql2/promise');
require('dotenv').config();

// Verificar se estamos em produção
const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT === 'production';

let pool;

// Configuração MySQL baseada nas variáveis do Railway
const getMySQLConfig = () => {
    const isFilled = (v) => v && !v.includes('${{');

    // Prefer the public TCP proxy URL (resolves from outside Railway)
    if (isFilled(process.env.MYSQL_PUBLIC_URL)) {
        console.log('🔒 Usando MYSQL_PUBLIC_URL (proxy público Railway)');
        return {
            type: 'public-url',
            value: process.env.MYSQL_PUBLIC_URL
        };
    }

    // Usar MYSQL_URL diretamente (rede privada Railway)
    if (isFilled(process.env.MYSQL_URL)) {
        console.log('🔒 Usando MYSQL_URL (rede privada Railway)');
        return {
            type: 'url',
            value: process.env.MYSQL_URL
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
                port: parseInt(port),
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

            const createPoolFromUrl = (url) => {
                try {
                    console.log('Criando pool a partir da URL (secure)');
                    return mysql.createPool(url);
                } catch (e) {
                    console.error('Erro ao criar pool a partir da URL:', e.message);
                    throw e;
                }
            };

            if (config.type === 'url' || config.type === 'public-url') {
                console.log(config.type === 'public-url' ? 'Usando PUBLIC URL' : 'Usando PRIVATE URL');
                pool = createPoolFromUrl(config.value);
            } else {
                // Forçar substituição de host com colchetes não confiáveis não ajuda quando DNS retorna IPv6.
                // Tentar conectar com a configuração 'config' e, em caso de ECONNREFUSED, tentar fallback para MYSQL_PUBLIC_URL.
                console.log('Config MySQL (manual):', {
                    host: config.value.host,
                    port: config.value.port,
                    user: config.value.user,
                    database: config.value.database
                });

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

                // Se tiver MYSQL_PUBLIC_URL disponível, tentar fallback para o proxy público (útil quando IPv6 privado recusa)
                if ((err.code === 'ECONNREFUSED' || err.message.includes('ECONNREFUSED')) && process.env.MYSQL_PUBLIC_URL && !process.env.MYSQL_PUBLIC_URL.includes('${{')) {
                    console.log('🔁 Tentando fallback para MYSQL_PUBLIC_URL devido a ECONNREFUSED...');
                    try {
                        pool = createPoolFromUrl(process.env.MYSQL_PUBLIC_URL);
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
