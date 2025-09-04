# Deploy no Railway

## Passos para Deploy

### 1. Preparar Repositório
1. Faça commit de todos os arquivos no GitHub
2. Conecte o repositório ao Railway

### 2. Configurar Banco MySQL
1. No Railway, adicione um serviço MySQL
2. Anote as credenciais fornecidas

### 3. Configurar Variáveis de Ambiente
No painel do Railway, configure:

```
NODE_ENV=production
MYSQLHOST=[host fornecido pelo Railway]
MYSQLPORT=3306
MYSQLUSER=[usuário fornecido pelo Railway]
MYSQLPASSWORD=[senha fornecida pelo Railway]
MYSQLDATABASE=[nome do banco fornecido pelo Railway]
ADMIN_PASSWORD=sua_senha_segura
```

### 4. Deploy
O Railway fará o deploy automaticamente após a configuração.

## URLs de Exemplo
- Aplicação: `https://seu-app.railway.app`
- API: `https://seu-app.railway.app/api/categorias`

## Comandos Úteis

### Desenvolvimento Local (SQLite)
```bash
npm run dev
```

### Produção (MySQL)
```bash
NODE_ENV=production npm start
```

## Estrutura de Pastas para Railway
```
projeto/
├── public/           # Arquivos estáticos
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   ├── manifest.json
│   ├── sw.js
│   ├── icons/
│   └── uploads/      # Imagens carregadas
├── server.js         # Servidor principal
├── package.json
├── .env             # Variáveis locais
└── README.md
```
