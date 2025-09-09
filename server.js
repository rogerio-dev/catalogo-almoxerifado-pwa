const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const fs = require('fs');
const session = require('express-session');
const { connect, testConnection, query, initializeTables, closeConnection, authenticateUser, createSession, validateSession, deleteSession } = require('./db');
const { uploadImage, deleteImage, getOptimizedImageUrl } = require('./cloudinary');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Security and performance middleware - TEMPORARILY DISABLED FOR PWA TESTING
// app.use(helmet({
//   contentSecurityPolicy: {
//     directives: {
//       defaultSrc: ["'self'"],
//       styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://maxcdn.bootstrapcdn.com"],
//       scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
//       scriptSrcAttr: ["'unsafe-inline'"],
//       fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://maxcdn.bootstrapcdn.com"],
//       imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https:"],
//       connectSrc: ["'self'", "https://cdnjs.cloudflare.com"],
//       manifestSrc: ["'self'"],
//       workerSrc: ["'self'"]
//     }
//   }
// }));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'catalogo-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Static files for app assets only
app.use(express.static('public', {
  maxAge: '1d', // Cache static files for 1 day
  setHeaders: (res, path) => {
    if (path.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    }
  }
}));

// Manifest route with correct Content-Type
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// Database initialization
async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database system...');
    
    const connectionOk = await testConnection();
    if (!connectionOk) {
      throw new Error('Database connection test failed');
    }
    
    await initializeTables();
    
    console.log('✅ Database system initialized successfully!');
    console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️ Database: ${process.env.DB_NAME || 'almoxerifado'} on ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}`);
    
  } catch (error) {
    console.error('❌ DATABASE INITIALIZATION ERROR:', error.message);
    
    console.log('🔄 Retrying in 5 seconds...');
    setTimeout(() => {
      initializeDatabase();
    }, 5000);
  }
}

// File upload configuration for Cloudinary
function setupFileUpload() {
  // Using memory storage instead of disk storage for Cloudinary
  const storage = multer.memoryStorage();

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
      }
    }
  });
}

const upload = setupFileUpload();

// Error handling middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum 5MB.' });
    }
    return res.status(400).json({ error: 'Upload error: ' + err.message });
  }
  if (err.message === 'Only images are allowed!') {
    return res.status(400).json({ error: err.message });
  }
  next(err);
};

// Authentication middleware
const checkPassword = (req, res, next) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  next();
};

// Authentication Middlewares
async function requireAuth(req, res, next) {
    const sessionId = req.session.sessionId;
    
    if (!sessionId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    const session = await validateSession(sessionId);
    if (!session) {
        req.session.destroy();
        return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    req.user = session;
    next();
}

async function requireAdmin(req, res, next) {
    await requireAuth(req, res, () => {
        if (!req.user.is_admin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    });
}

// Helper function to get empresa_id from session
function getEmpresaId(req) {
    return req.user ? req.user.empresa_id : null;
}

// AUTH ROUTES

app.post('/api/auth/login', async (req, res) => {
    console.log('🔐 Login attempt:', { 
        username: req.body.username, 
        empresa: req.body.empresa 
    });
    
    try {
        const { username, password, empresa } = req.body;
        
        const user = await authenticateUser(username, password, empresa);
        if (!user) {
            console.log('❌ Authentication failed for:', username);
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        
        console.log('✅ User authenticated:', user.username, 'is_admin:', user.is_admin);
        
        const sessionId = await createSession(user.id, user.empresa_id);
        if (!sessionId) {
            console.log('❌ Failed to create session');
            return res.status(500).json({ error: 'Erro ao criar sessão' });
        }
        
        req.session.sessionId = sessionId;
        console.log('✅ Session created for user:', user.username);
        
        res.json({ 
            success: true, 
            user: {
                id: user.id,
                nome: user.nome,
                username: user.username,
                empresa_nome: user.empresa_nome,
                is_admin: user.is_admin
            }
        });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/auth/logout', async (req, res) => {
    try {
        if (req.session.sessionId) {
            await deleteSession(req.session.sessionId);
        }
        req.session.destroy();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao fazer logout' });
    }
});

app.get('/api/auth/check', requireAuth, (req, res) => {
    console.log('🔍 Auth check requested - User data:', {
        username: req.user.username,
        is_admin: req.user.is_admin,
        empresa: req.user.empresa_nome
    });
    
    const userData = {
        user: {
            id: req.user.usuario_id,
            nome: req.user.nome,
            username: req.user.username,
            empresa_nome: req.user.empresa_nome,
            is_admin: req.user.is_admin
        }
    };
    
    console.log('📤 Sending auth response:', userData);
    res.json(userData);
});

// ADMIN ROUTES

app.get('/api/admin/empresas', requireAdmin, async (req, res) => {
    try {
        const empresas = await query('SELECT * FROM empresas ORDER BY nome');
        res.json(empresas);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar empresas' });
    }
});

app.post('/api/admin/empresas', requireAdmin, async (req, res) => {
    try {
        const { nome, identificador } = req.body;
        const result = await query('INSERT INTO empresas (nome, identificador) VALUES (?, ?)', [nome, identificador]);
        res.json({ id: result.insertId, nome, identificador });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: 'Identificador já existe' });
        } else {
            res.status(500).json({ error: 'Erro ao criar empresa' });
        }
    }
});

app.delete('/api/admin/empresas/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await query('DELETE FROM empresas WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir empresa' });
    }
});

app.get('/api/admin/usuarios', requireAdmin, async (req, res) => {
    try {
        const usuarios = await query(`
            SELECT u.*, e.nome as empresa_nome 
            FROM usuarios u 
            JOIN empresas e ON u.empresa_id = e.id 
            ORDER BY u.nome
        `);
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

app.post('/api/admin/usuarios', requireAdmin, async (req, res) => {
    try {
        const { nome, username, password, empresa_id } = req.body;
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await query('INSERT INTO usuarios (nome, username, password, empresa_id) VALUES (?, ?, ?, ?)', 
            [nome, username, hashedPassword, empresa_id]);
        res.json({ id: result.insertId, nome, username, empresa_id });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: 'Usuário já existe nesta empresa' });
        } else {
            res.status(500).json({ error: 'Erro ao criar usuário' });
        }
    }
});

app.delete('/api/admin/usuarios/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await query('DELETE FROM usuarios WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir usuário' });
    }
});

// API ROUTES (Protected)

// Categories
app.get('/api/categorias', requireAuth, async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    const rows = await query('SELECT * FROM categorias WHERE empresa_id = ? ORDER BY nome', [empresaId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching categories' });
  }
});

app.post('/api/categorias', upload.none(), requireAuth, async (req, res) => {
  try {
    const { nome } = req.body;
    const empresaId = getEmpresaId(req);
    const result = await query('INSERT INTO categorias (nome, empresa_id) VALUES (?, ?)', [nome, empresaId]);
    res.json({ id: result.insertId, nome });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Category already exists' });
    } else {
      res.status(500).json({ error: 'Error creating category' });
    }
  }
});

app.put('/api/categorias/:id', upload.none(), requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;
    const empresaId = getEmpresaId(req);
    await query('UPDATE categorias SET nome = ? WHERE id = ? AND empresa_id = ?', [nome, id, empresaId]);
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Category already exists' });
    } else {
      res.status(500).json({ error: 'Error updating category' });
    }
  }
});

app.delete('/api/categorias/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = getEmpresaId(req);
    await query('DELETE FROM categorias WHERE id = ? AND empresa_id = ?', [id, empresaId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting category' });
  }
});

// Subcategories
app.get('/api/subcategorias/:categoriaId', requireAuth, async (req, res) => {
  try {
    const { categoriaId } = req.params;
    const empresaId = getEmpresaId(req);
    const rows = await query(
      'SELECT s.*, c.nome as categoria_nome FROM subcategorias s JOIN categorias c ON s.categoria_id = c.id WHERE s.categoria_id = ? AND s.empresa_id = ? ORDER BY s.nome', 
      [categoriaId, empresaId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching subcategories' });
  }
});

app.post('/api/subcategorias', upload.none(), requireAuth, async (req, res) => {
  try {
    const { nome, categoria_id } = req.body;
    const empresaId = getEmpresaId(req);
    const result = await query('INSERT INTO subcategorias (nome, categoria_id, empresa_id) VALUES (?, ?, ?)', [nome, categoria_id, empresaId]);
    res.json({ id: result.insertId, nome, categoria_id });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Subcategory already exists in this category' });
    } else {
      res.status(500).json({ error: 'Error creating subcategory' });
    }
  }
});

app.put('/api/subcategorias/:id', upload.none(), requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;
    const empresaId = getEmpresaId(req);
    await query('UPDATE subcategorias SET nome = ? WHERE id = ? AND empresa_id = ?', [nome, id, empresaId]);
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Subcategory already exists in this category' });
    } else {
      res.status(500).json({ error: 'Error updating subcategory' });
    }
  }
});

app.delete('/api/subcategorias/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = getEmpresaId(req);
    await query('DELETE FROM subcategorias WHERE id = ? AND empresa_id = ?', [id, empresaId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting subcategory' });
  }
});

// Items
app.get('/api/itens/:subcategoriaId', requireAuth, async (req, res) => {
  try {
    const { subcategoriaId } = req.params;
    const empresaId = getEmpresaId(req);
    const rows = await query(
      `SELECT i.*, s.nome as subcategoria_nome, c.nome as categoria_nome 
       FROM itens i 
       JOIN subcategorias s ON i.subcategoria_id = s.id 
       JOIN categorias c ON s.categoria_id = c.id 
       WHERE i.subcategoria_id = ? AND i.empresa_id = ? ORDER BY i.nome`, 
      [subcategoriaId, empresaId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching items' });
  }
});

app.post('/api/itens', upload.single('imagem'), handleMulterError, requireAuth, async (req, res) => {
  try {
    const { nome, subcategoria_id } = req.body;
    const empresaId = getEmpresaId(req);
    let imagemUrl = null;
    
    // Upload image to Cloudinary if provided
    if (req.file) {
      const uploadResult = await uploadImage(req.file.buffer, req.file.originalname);
      imagemUrl = uploadResult.secure_url;
    }
    
    const result = await query('INSERT INTO itens (nome, imagem, subcategoria_id, empresa_id) VALUES (?, ?, ?, ?)', [nome, imagemUrl, subcategoria_id, empresaId]);
    
    res.json({ id: result.insertId, nome, imagem: imagemUrl, subcategoria_id });
  } catch (error) {
    console.error('Error creating item:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Item already exists in this subcategory' });
    } else {
      res.status(500).json({ error: 'Error creating item' });
    }
  }
});

app.put('/api/itens/:id', upload.single('imagem'), requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;
    const empresaId = getEmpresaId(req);
    
    let queryStr = 'UPDATE itens SET nome = ?';
    let params = [nome];
    
    // Handle image update with Cloudinary
    if (req.file) {
      // Get current item to delete old image if exists
      const [currentItem] = await query('SELECT imagem FROM itens WHERE id = ? AND empresa_id = ?', [id, empresaId]);
      
      // Upload new image to Cloudinary
      const uploadResult = await uploadImage(req.file.buffer, req.file.originalname);
      
      queryStr += ', imagem = ?';
      params.push(uploadResult.secure_url);
      
      // Delete old image from Cloudinary if it exists
      if (currentItem && currentItem.imagem && currentItem.imagem.includes('cloudinary.com')) {
        const publicId = currentItem.imagem.split('/').pop().split('.')[0];
        try {
          await deleteImage(`catalog-app/${publicId}`);
        } catch (deleteError) {
          console.warn('Could not delete old image from Cloudinary:', deleteError.message);
        }
      }
    }
    
    queryStr += ' WHERE id = ? AND empresa_id = ?';
    params.push(id, empresaId);
    
    await query(queryStr, params);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating item:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Item already exists in this subcategory' });
    } else {
      res.status(500).json({ error: 'Error updating item' });
    }
  }
});

app.delete('/api/itens/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = getEmpresaId(req);
    
    // Get item info before deletion to remove image from Cloudinary
    const [item] = await query('SELECT imagem FROM itens WHERE id = ? AND empresa_id = ?', [id, empresaId]);
    
    // Delete item from database
    await query('DELETE FROM itens WHERE id = ? AND empresa_id = ?', [id, empresaId]);
    
    // Delete image from Cloudinary if it exists
    if (item && item.imagem && item.imagem.includes('cloudinary.com')) {
      const publicId = item.imagem.split('/').pop().split('.')[0];
      try {
        await deleteImage(`catalog-app/${publicId}`);
      } catch (deleteError) {
        console.warn('Could not delete image from Cloudinary:', deleteError.message);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Error deleting item' });
  }
});

// ROUTES

// Login page
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Admin page
app.get('/admin', async (req, res) => {
  // Check if user is authenticated and admin
  const sessionId = req.session.sessionId;
  if (!sessionId) {
    return res.redirect('/login.html');
  }
  
  const session = await validateSession(sessionId);
  if (!session || !session.is_admin) {
    return res.redirect('/login.html');
  }
  
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Main route - redirect to login if not authenticated
app.get('/', async (req, res) => {
  const sessionId = req.session.sessionId;
  
  if (!sessionId) {
    return res.redirect('/login.html');
  }
  
  const session = await validateSession(sessionId);
  if (!session) {
    req.session.destroy();
    return res.redirect('/login.html');
  }
  
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server initialization
async function startServer() {
  await initializeDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 Database: ${process.env.DB_NAME || 'almoxerifado'} on ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 Received SIGTERM, shutting down server...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 Received SIGINT, shutting down server...');
  await closeConnection();
  process.exit(0);
});

startServer().catch(console.error);
