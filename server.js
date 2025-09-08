const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const fs = require('fs');
const { connect, testConnection, query, initializeTables, closeConnection } = require('./db');
const { uploadImage, deleteImage, getOptimizedImageUrl } = require('./cloudinary');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for app assets only
app.use(express.static('public', {
  maxAge: '1d' // Cache static files for 1 day
}));

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

const checkPasswordFormData = (req, res, next) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  next();
};

// API ROUTES

// Authentication
app.post('/api/verify-password', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Incorrect password' });
  }
});

// Categories
app.get('/api/categorias', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM categorias ORDER BY nome');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching categories' });
  }
});

app.post('/api/categorias', upload.none(), checkPasswordFormData, async (req, res) => {
  try {
    const { nome } = req.body;
    const result = await query('INSERT INTO categorias (nome) VALUES (?)', [nome]);
    res.json({ id: result.insertId, nome });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Category already exists' });
    } else {
      res.status(500).json({ error: 'Error creating category' });
    }
  }
});

app.put('/api/categorias/:id', upload.none(), checkPasswordFormData, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;
    await query('UPDATE categorias SET nome = ? WHERE id = ?', [nome, id]);
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Category already exists' });
    } else {
      res.status(500).json({ error: 'Error updating category' });
    }
  }
});

app.delete('/api/categorias/:id', checkPassword, async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM categorias WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting category' });
  }
});

// Subcategories
app.get('/api/subcategorias/:categoriaId', async (req, res) => {
  try {
    const { categoriaId } = req.params;
    const rows = await query(
      'SELECT s.*, c.nome as categoria_nome FROM subcategorias s JOIN categorias c ON s.categoria_id = c.id WHERE s.categoria_id = ? ORDER BY s.nome', 
      [categoriaId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching subcategories' });
  }
});

app.post('/api/subcategorias', upload.none(), checkPasswordFormData, async (req, res) => {
  try {
    const { nome, categoria_id } = req.body;
    const result = await query('INSERT INTO subcategorias (nome, categoria_id) VALUES (?, ?)', [nome, categoria_id]);
    res.json({ id: result.insertId, nome, categoria_id });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Subcategory already exists in this category' });
    } else {
      res.status(500).json({ error: 'Error creating subcategory' });
    }
  }
});

app.put('/api/subcategorias/:id', upload.none(), checkPasswordFormData, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;
    await query('UPDATE subcategorias SET nome = ? WHERE id = ?', [nome, id]);
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Subcategory already exists in this category' });
    } else {
      res.status(500).json({ error: 'Error updating subcategory' });
    }
  }
});

app.delete('/api/subcategorias/:id', checkPassword, async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM subcategorias WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting subcategory' });
  }
});

// Items
app.get('/api/itens/:subcategoriaId', async (req, res) => {
  try {
    const { subcategoriaId } = req.params;
    const rows = await query(
      `SELECT i.*, s.nome as subcategoria_nome, c.nome as categoria_nome 
       FROM itens i 
       JOIN subcategorias s ON i.subcategoria_id = s.id 
       JOIN categorias c ON s.categoria_id = c.id 
       WHERE i.subcategoria_id = ? ORDER BY i.nome`, 
      [subcategoriaId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching items' });
  }
});

app.post('/api/itens', upload.single('imagem'), handleMulterError, checkPasswordFormData, async (req, res) => {
  try {
    const { nome, subcategoria_id } = req.body;
    let imagemUrl = null;
    
    // Upload image to Cloudinary if provided
    if (req.file) {
      const uploadResult = await uploadImage(req.file.buffer, req.file.originalname);
      imagemUrl = uploadResult.secure_url;
    }
    
    const result = await query('INSERT INTO itens (nome, imagem, subcategoria_id) VALUES (?, ?, ?)', [nome, imagemUrl, subcategoria_id]);
    
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

app.put('/api/itens/:id', upload.single('imagem'), checkPasswordFormData, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;
    
    let queryStr = 'UPDATE itens SET nome = ?';
    let params = [nome];
    
    // Handle image update with Cloudinary
    if (req.file) {
      // Get current item to delete old image if exists
      const [currentItem] = await query('SELECT imagem FROM itens WHERE id = ?', [id]);
      
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
    
    queryStr += ' WHERE id = ?';
    params.push(id);
    
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

app.delete('/api/itens/:id', checkPassword, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get item info before deletion to remove image from Cloudinary
    const [item] = await query('SELECT imagem FROM itens WHERE id = ?', [id]);
    
    // Delete item from database
    await query('DELETE FROM itens WHERE id = ?', [id]);
    
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

// Main route
app.get('/', (req, res) => {
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
