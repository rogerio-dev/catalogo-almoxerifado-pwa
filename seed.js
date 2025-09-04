// Script para inserir dados de exemplo
// Execute este arquivo com: node seed.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database('./database.sqlite');

const seedData = async () => {
  console.log('Inserindo dados de exemplo...');

  // Categorias
  const categorias = [
    'Ferramentas',
    'Material Elétrico',
    'Parafusos e Fixadores',
    'Tintas e Vernizes',
    'Equipamentos de Segurança'
  ];

  // Subcategorias por categoria
  const subcategorias = {
    'Ferramentas': ['Alicates', 'Chaves de Fenda', 'Martelos', 'Furadeiras'],
    'Material Elétrico': ['Fios e Cabos', 'Tomadas', 'Interruptores', 'Lâmpadas'],
    'Parafusos e Fixadores': ['Parafusos Phillips', 'Parafusos Fenda', 'Porcas', 'Arruelas'],
    'Tintas e Vernizes': ['Tinta Acrílica', 'Tinta Óleo', 'Verniz', 'Primer'],
    'Equipamentos de Segurança': ['Capacetes', 'Óculos', 'Luvas', 'Máscaras']
  };

  // Itens por subcategoria
  const itens = {
    'Alicates': ['Alicate Universal', 'Alicate de Bico', 'Alicate Descascador'],
    'Chaves de Fenda': ['Chave Fenda 3mm', 'Chave Fenda 5mm', 'Chave Fenda 8mm'],
    'Martelos': ['Martelo Unha 200g', 'Martelo Unha 500g', 'Martelo Borracha'],
    'Fios e Cabos': ['Cabo 2,5mm', 'Cabo 4mm', 'Cabo 6mm'],
    'Tomadas': ['Tomada 2P+T', 'Tomada USB', 'Tomada Externa'],
    'Parafusos Phillips': ['Phillips 3x15mm', 'Phillips 4x20mm', 'Phillips 5x25mm'],
    'Tinta Acrílica': ['Acrílica Branca', 'Acrílica Azul', 'Acrílica Vermelha'],
    'Capacetes': ['Capacete Branco', 'Capacete Amarelo', 'Capacete Azul']
  };

  try {
    // Inserir categorias
    for (const categoria of categorias) {
      await new Promise((resolve, reject) => {
        db.run('INSERT OR IGNORE INTO categorias (nome) VALUES (?)', [categoria], function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
      });
    }

    // Buscar IDs das categorias
    const categoriaRows = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM categorias', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Inserir subcategorias
    for (const categoriaRow of categoriaRows) {
      const subs = subcategorias[categoriaRow.nome] || [];
      for (const sub of subs) {
        await new Promise((resolve, reject) => {
          db.run('INSERT OR IGNORE INTO subcategorias (nome, categoria_id) VALUES (?, ?)', [sub, categoriaRow.id], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          });
        });
      }
    }

    // Buscar IDs das subcategorias
    const subcategoriaRows = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM subcategorias', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Inserir itens
    for (const subcategoriaRow of subcategoriaRows) {
      const items = itens[subcategoriaRow.nome] || [];
      for (const item of items) {
        await new Promise((resolve, reject) => {
          db.run('INSERT OR IGNORE INTO itens (nome, subcategoria_id) VALUES (?, ?)', [item, subcategoriaRow.id], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          });
        });
      }
    }

    console.log('Dados de exemplo inseridos com sucesso!');
    
    // Mostrar estatísticas
    const stats = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          (SELECT COUNT(*) FROM categorias) as categorias,
          (SELECT COUNT(*) FROM subcategorias) as subcategorias,
          (SELECT COUNT(*) FROM itens) as itens
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows[0]);
      });
    });

    console.log(`Estatísticas:
    - Categorias: ${stats.categorias}
    - Subcategorias: ${stats.subcategorias}  
    - Itens: ${stats.itens}`);

  } catch (error) {
    console.error('Erro ao inserir dados:', error);
  } finally {
    db.close();
  }
};

seedData();
