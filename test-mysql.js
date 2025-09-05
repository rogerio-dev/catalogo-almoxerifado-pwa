const mysql = require('mysql2/promise');

console.log('🔍 TESTE DE CONEXÃO MYSQL NO RAILWAY');
console.log('=====================================');

// Mostrar todas as variáveis de ambiente relacionadas ao MySQL
console.log('\n📋 VARIÁVEIS DE AMBIENTE:');
console.log('MYSQL_HOST:', process.env.MYSQL_HOST);
console.log('MYSQL_PORT:', process.env.MYSQL_PORT);
console.log('MYSQL_USER:', process.env.MYSQL_USER);
console.log('MYSQL_PASSWORD:', process.env.MYSQL_PASSWORD ? '[DEFINIDA]' : '[NÃO DEFINIDA]');
console.log('MYSQL_DATABASE:', process.env.MYSQL_DATABASE);
console.log('MYSQL_URL:', process.env.MYSQL_URL);
console.log('MYSQLHOST:', process.env.MYSQLHOST);
console.log('MYSQLPORT:', process.env.MYSQLPORT);
console.log('MYSQLUSER:', process.env.MYSQLUSER);
console.log('MYSQLPASSWORD:', process.env.MYSQLPASSWORD ? '[DEFINIDA]' : '[NÃO DEFINIDA]');
console.log('MYSQLDATABASE:', process.env.MYSQLDATABASE);

// Método 1: Tentar com MYSQL_URL
async function testMethod1() {
  console.log('\n🧪 MÉTODO 1: Usando MYSQL_URL');
  try {
    if (!process.env.MYSQL_URL) {
      console.log('❌ MYSQL_URL não está definida');
      return false;
    }
    
    console.log('MYSQL_URL:', process.env.MYSQL_URL);
    const connection = await mysql.createConnection(process.env.MYSQL_URL);
    await connection.execute('SELECT 1 as test');
    await connection.end();
    console.log('✅ Conexão bem-sucedida com MYSQL_URL');
    return true;
  } catch (error) {
    console.log('❌ Erro com MYSQL_URL:', error.message);
    return false;
  }
}

// Método 2: Tentar com variáveis individuais
async function testMethod2() {
  console.log('\n🧪 MÉTODO 2: Usando variáveis individuais');
  try {
    const config = {
      host: process.env.MYSQL_HOST || process.env.MYSQLHOST,
      port: parseInt(process.env.MYSQL_PORT || process.env.MYSQLPORT || '3306'),
      user: process.env.MYSQL_USER || process.env.MYSQLUSER,
      password: process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD,
      database: process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE,
      connectTimeout: 10000,
      acquireTimeout: 10000
    };
    
    console.log('Config:', {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password ? '[DEFINIDA]' : '[NÃO DEFINIDA]',
      database: config.database
    });
    
    if (!config.host || !config.user || !config.password || !config.database) {
      console.log('❌ Configurações incompletas');
      return false;
    }
    
    const connection = await mysql.createConnection(config);
    await connection.execute('SELECT 1 as test');
    await connection.end();
    console.log('✅ Conexão bem-sucedida com variáveis individuais');
    return true;
  } catch (error) {
    console.log('❌ Erro com variáveis individuais:', error.message);
    return false;
  }
}

// Método 3: Tentar construir URL TCP manualmente
async function testMethod3() {
  console.log('\n🧪 MÉTODO 3: Construindo URL TCP manualmente');
  try {
    const host = process.env.MYSQL_HOST || process.env.MYSQLHOST;
    const port = process.env.MYSQL_PORT || process.env.MYSQLPORT;
    const user = process.env.MYSQL_USER || process.env.MYSQLUSER;
    const password = process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD;
    const database = process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE;
    
    if (!host || !port || !user || !password || !database) {
      console.log('❌ Variáveis necessárias não encontradas');
      return false;
    }
    
    // Construir URL manualmente para TCP Proxy
    const tcpUrl = `mysql://${user}:${password}@${host}:${port}/${database}`;
    console.log('URL TCP construída:', tcpUrl.replace(password, '[PASSWORD]'));
    
    const connection = await mysql.createConnection(tcpUrl);
    await connection.execute('SELECT 1 as test');
    await connection.end();
    console.log('✅ Conexão bem-sucedida com URL TCP manual');
    return true;
  } catch (error) {
    console.log('❌ Erro com URL TCP manual:', error.message);
    return false;
  }
}

// Executar todos os testes
async function runAllTests() {
  console.log('\n🚀 INICIANDO TESTES DE CONEXÃO...\n');
  
  const results = {
    method1: await testMethod1(),
    method2: await testMethod2(),
    method3: await testMethod3()
  };
  
  console.log('\n📊 RESUMO DOS RESULTADOS:');
  console.log('========================');
  console.log('Método 1 (MYSQL_URL):', results.method1 ? '✅ SUCESSO' : '❌ FALHOU');
  console.log('Método 2 (Variáveis):', results.method2 ? '✅ SUCESSO' : '❌ FALHOU');
  console.log('Método 3 (TCP Manual):', results.method3 ? '✅ SUCESSO' : '❌ FALHOU');
  
  const successCount = Object.values(results).filter(r => r).length;
  console.log(`\n🎯 ${successCount}/3 métodos funcionaram`);
  
  if (successCount === 0) {
    console.log('\n❌ NENHUM MÉTODO FUNCIONOU');
    process.exit(1);
  } else {
    console.log('\n✅ PELO MENOS UM MÉTODO FUNCIONOU');
    process.exit(0);
  }
}

runAllTests().catch(error => {
  console.error('\n💥 ERRO FATAL:', error);
  process.exit(1);
});
