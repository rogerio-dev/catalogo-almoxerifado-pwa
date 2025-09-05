// Listar todas as variáveis que contêm MYSQL
Object.keys(process.env)
  .filter(key => key.includes('MYSQL'))
  .forEach(key => {
    const value = process.env[key];
    if (key.includes('PASSWORD')) {
      console.log(`${key}: [HIDDEN]`);
    } else {
      console.log(`${key}: ${value}`);
    }
  });

// Listar também outras possíveis variáveis relacionadas
console.log('\n--- Outras variáveis relacionadas ---');
['DATABASE_URL', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].forEach(key => {
  if (process.env[key]) {
    const value = process.env[key];
    if (key.includes('PASSWORD')) {
      console.log(`${key}: [HIDDEN]`);
    } else {
      console.log(`${key}: ${value}`);
    }
  }
});
