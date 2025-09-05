const express = require('express');
const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configuração do banco de dados
const isProduction = process.env.NODE_ENV === 'production' || process.env.MYSQLHOST;

let pool;
let db; // SQLite database

if (isProduction) {
  // MySQL para produção
  const dbConfig = {
    host: process.env.MYSQLHOST || process.env.DB_HOST,
    port: process.env.MYSQLPORT || 3306,
    user: process.env.MYSQLUSER || process.env.DB_USER,
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
    database: process.env.MYSQLDATABASE || process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
  pool = mysql.createPool(dbConfig);
} else {
  // SQLite para desenvolvimento
  db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
      console.error('Erro ao conectar com SQLite:', err);
    } else {
      console.log('Conectado ao SQLite');
    }
  });
}

// Inicializar conexão com banco
async function initializeDatabase() {
  try {
    if (isProduction) {
      // MySQL
      const connection = await pool.getConnection();
      console.log('Conectado ao MySQL');
      await createMySQLTables(connection);
      connection.release();
    } else {
      // SQLite
      await createSQLiteTables();
    }
  } catch (error) {
    console.error('Erro ao conectar com o banco:', error);
    if (isProduction) {
      process.exit(1);
    }
  }
}

// Criar tabelas MySQL
async function createMySQLTables(connection) {
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
    await connection.execute(table);
  }
  console.log('Tabelas MySQL criadas/verificadas com sucesso');
}

// Criar tabelas SQLite
async function createSQLiteTables() {
  return new Promise((resolve, reject) => {
    const tables = [
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

    let completed = 0;
    tables.forEach(table => {
      db.run(table, (err) => {
        if (err) {
          console.error('Erro ao criar tabela SQLite:', err);
          reject(err);
        } else {
          completed++;
          if (completed === tables.length) {
            console.log('Tabelas SQLite criadas/verificadas com sucesso');
            resolve();
          }
        }
      });
    });
  });
}

// Funções de banco de dados
function executeQuery(query, params = []) {
  if (isProduction) {
    // MySQL
    return pool.execute(query, params);
  } else {
    // SQLite
    return new Promise((resolve, reject) => {
      if (query.toLowerCase().includes('select')) {
        db.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve([rows]);
        });
      } else {
        db.run(query, params, function(err) {
          if (err) reject(err);
          else resolve([{ insertId: this.lastID, affectedRows: this.changes }]);
        });
      }
    });
  }
}

// Configuração do multer para upload de imagens
const uploadDir = 'public/uploads/';

// Criar diretório de uploads se não existir
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📁 Diretório de uploads criado:', uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas!'));
    }
  }
});

// Middleware para tratar erros do multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.log('ERRO MULTER:', err.message);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Arquivo muito grande. Máximo 5MB.' });
    }
    return res.status(400).json({ error: 'Erro no upload: ' + err.message });
  }
  if (err.message === 'Apenas imagens são permitidas!') {
    console.log('ERRO TIPO ARQUIVO:', err.message);
    return res.status(400).json({ error: err.message });
  }
  next(err);
};

// Configuração da senha admin
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Middleware para verificar senha em FormData (após multer)
const checkPasswordFormData = (req, res, next) => {
  const { password } = req.body;
  console.log('=== MIDDLEWARE CHECKPASSWORD ===');
  console.log('Senha recebida:', password);
  console.log('Senha esperada:', ADMIN_PASSWORD);
  console.log('São iguais?', password === ADMIN_PASSWORD);
  console.log('Tipo senha recebida:', typeof password);
  console.log('Tipo senha esperada:', typeof ADMIN_PASSWORD);
  console.log('=== FIM DEBUG ===');
  
  if (password !== ADMIN_PASSWORD) {
    console.log('ERRO: Senha incorreta!');
    return res.status(401).json({ error: 'Senha incorreta' });
  }
  console.log('SUCESSO: Senha correta!');
  next();
};

// Middleware para verificar senha
const checkPassword = (req, res, next) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Senha incorreta' });
  }
  next();
};

// ROTAS DA API

// Verificar senha
app.post('/api/verify-password', (req, res) => {
  const { password } = req.body;
  console.log('Tentativa de login com senha:', password); // Debug
  console.log('Senha esperada:', ADMIN_PASSWORD); // Debug
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Senha incorreta' });
  }
});

// CATEGORIAS
app.get('/api/categorias', async (req, res) => {
  try {
    const [rows] = await executeQuery('SELECT * FROM categorias ORDER BY nome');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

app.post('/api/categorias', upload.none(), checkPasswordFormData, async (req, res) => {
  try {
    const { nome } = req.body;
    const [result] = await executeQuery('INSERT INTO categorias (nome) VALUES (?)', [nome]);
    res.json({ id: result.insertId, nome });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' || error.code === 'SQLITE_CONSTRAINT') {
      res.status(400).json({ error: 'Categoria já existe' });
    } else {
      res.status(500).json({ error: 'Erro ao criar categoria' });
    }
  }
});

app.put('/api/categorias/:id', upload.none(), checkPasswordFormData, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;
    await executeQuery('UPDATE categorias SET nome = ? WHERE id = ?', [nome, id]);
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' || error.code === 'SQLITE_CONSTRAINT') {
      res.status(400).json({ error: 'Categoria já existe' });
    } else {
      res.status(500).json({ error: 'Erro ao atualizar categoria' });
    }
  }
});

app.delete('/api/categorias/:id', checkPassword, async (req, res) => {
  try {
    const { id } = req.params;
    await executeQuery('DELETE FROM categorias WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar categoria' });
  }
});

// SUBCATEGORIAS
app.get('/api/subcategorias/:categoriaId', async (req, res) => {
  try {
    const { categoriaId } = req.params;
    const [rows] = await executeQuery(
      'SELECT s.*, c.nome as categoria_nome FROM subcategorias s JOIN categorias c ON s.categoria_id = c.id WHERE s.categoria_id = ? ORDER BY s.nome', 
      [categoriaId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar subcategorias' });
  }
});

app.post('/api/subcategorias', upload.none(), checkPasswordFormData, async (req, res) => {
  try {
    const { nome, categoria_id } = req.body;
    const [result] = await executeQuery('INSERT INTO subcategorias (nome, categoria_id) VALUES (?, ?)', [nome, categoria_id]);
    res.json({ id: result.insertId, nome, categoria_id });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' || error.code === 'SQLITE_CONSTRAINT') {
      res.status(400).json({ error: 'Subcategoria já existe nesta categoria' });
    } else {
      res.status(500).json({ error: 'Erro ao criar subcategoria' });
    }
  }
});

app.put('/api/subcategorias/:id', upload.none(), checkPasswordFormData, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;
    await executeQuery('UPDATE subcategorias SET nome = ? WHERE id = ?', [nome, id]);
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' || error.code === 'SQLITE_CONSTRAINT') {
      res.status(400).json({ error: 'Subcategoria já existe nesta categoria' });
    } else {
      res.status(500).json({ error: 'Erro ao atualizar subcategoria' });
    }
  }
});

app.delete('/api/subcategorias/:id', checkPassword, async (req, res) => {
  try {
    const { id } = req.params;
    await executeQuery('DELETE FROM subcategorias WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar subcategoria' });
  }
});

// ITENS
app.get('/api/itens/:subcategoriaId', async (req, res) => {
  try {
    const { subcategoriaId } = req.params;
    const [rows] = await executeQuery(
      `SELECT i.*, s.nome as subcategoria_nome, c.nome as categoria_nome 
       FROM itens i 
       JOIN subcategorias s ON i.subcategoria_id = s.id 
       JOIN categorias c ON s.categoria_id = c.id 
       WHERE i.subcategoria_id = ? ORDER BY i.nome`, 
      [subcategoriaId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar itens' });
  }
});

app.post('/api/itens', upload.single('imagem'), handleMulterError, checkPasswordFormData, async (req, res) => {
  try {
    console.log('=== CRIANDO ITEM ===');
    console.log('Body:', req.body);
    console.log('File:', req.file);
    console.log('Has file:', !!req.file);
    
    const { nome, subcategoria_id } = req.body;
    const imagem = req.file ? `/uploads/${req.file.filename}` : null;
    
    console.log('Nome:', nome);
    console.log('Subcategoria ID:', subcategoria_id);
    console.log('Imagem path:', imagem);
    
    const [result] = await executeQuery('INSERT INTO itens (nome, imagem, subcategoria_id) VALUES (?, ?, ?)', [nome, imagem, subcategoria_id]);
    
    console.log('Item criado com sucesso, ID:', result.insertId);
    res.json({ id: result.insertId, nome, imagem, subcategoria_id });
  } catch (error) {
    console.error('ERRO AO CRIAR ITEM:', error);
    if (error.code === 'ER_DUP_ENTRY' || error.code === 'SQLITE_CONSTRAINT') {
      res.status(400).json({ error: 'Item já existe nesta subcategoria' });
    } else {
      res.status(500).json({ error: 'Erro ao criar item' });
    }
  }
});

app.put('/api/itens/:id', upload.single('imagem'), checkPasswordFormData, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;
    
    let query = 'UPDATE itens SET nome = ?';
    let params = [nome];
    
    if (req.file) {
      query += ', imagem = ?';
      params.push(`/uploads/${req.file.filename}`);
    }
    
    query += ' WHERE id = ?';
    params.push(id);
    
    await executeQuery(query, params);
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' || error.code === 'SQLITE_CONSTRAINT') {
      res.status(400).json({ error: 'Item já existe nesta subcategoria' });
    } else {
      res.status(500).json({ error: 'Erro ao atualizar item' });
    }
  }
});

app.delete('/api/itens/:id', checkPassword, async (req, res) => {
  try {
    const { id } = req.params;
    await executeQuery('DELETE FROM itens WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar item' });
  }
});

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicializar servidor
async function startServer() {
  await initializeDatabase();
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

startServer().catch(console.error);
