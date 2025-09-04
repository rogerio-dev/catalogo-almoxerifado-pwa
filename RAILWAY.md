# Configuração do Railway

Este arquivo contém as configurações necessárias para deploy na Railway.

## Variáveis de Ambiente

Configure as seguintes variáveis no Railway:

### Banco de Dados MySQL
- `MYSQLHOST` - Host do banco MySQL
- `MYSQLPORT` - Porta do banco MySQL (padrão: 3306)
- `MYSQLUSER` - Usuário do banco MySQL
- `MYSQLPASSWORD` - Senha do banco MySQL
- `MYSQLDATABASE` - Nome do banco de dados

### Aplicação
- `ADMIN_PASSWORD` - Senha para operações administrativas (padrão: admin123)
- `PORT` - Porta da aplicação (Railway define automaticamente)

## Deploy

1. Conecte seu repositório ao Railway
2. Configure as variáveis de ambiente
3. O Railway detectará automaticamente o Node.js e fará o deploy

## Banco de Dados

As tabelas serão criadas automaticamente na primeira execução.
