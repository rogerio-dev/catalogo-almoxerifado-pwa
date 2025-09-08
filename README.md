# App Catálogo Dinâmico

Um aplicativo PWA para gerenciamento de catálogo hierárquico com categorias, subcategorias e itens.

## 🚀 Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/6HFUCD?referralCode=alphasec)

## 📱 Funcionalidades

- **Estrutura Hierárquica**: Categorias → Subcategorias → Itens
- **Upload de Imagens**: Integração com Cloudinary para armazenamento persistente
- **Interface Responsiva**: Funciona em desktop e mobile
- **PWA**: Pode ser instalado como aplicativo
- **Timer Automático**: Timer de 1 minuto na visualização de imagens
- **Autenticação**: Sistema de senha para operações administrativas

## 🛠️ Tecnologias

- **Backend**: Node.js + Express
- **Database**: MySQL
- **Frontend**: Vanilla JavaScript (SPA)
- **Storage**: Cloudinary para imagens
- **Deploy**: Railway

## 📋 Pré-requisitos

1. Node.js (versão 16 ou superior)
2. MySQL
3. Conta no Cloudinary (gratuita)

## ⚙️ Configuração

### 1. Clone e instale dependências

```bash
npm install
```

### 2. Configure o banco de dados MySQL

Crie um banco de dados chamado `almoxerifado`:

```sql
CREATE DATABASE almoxerifado;
```

### 3. Configure o Cloudinary

1. Acesse [https://cloudinary.com](https://cloudinary.com)
2. Crie uma conta gratuita
3. No dashboard, copie suas credenciais:
   - Cloud Name
   - API Key
   - API Secret

### 4. Configure as variáveis de ambiente

Copie o arquivo de exemplo:

```bash
cp env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 🏃‍♂️ Executando

### Desenvolvimento Local

```bash
npm start
```

O aplicativo estará disponível em: `http://localhost:3000`

### Deploy no Railway

Configure as variáveis de ambiente no Railway dashboard:
- `MYSQL_URL` (URL do banco MySQL do Railway)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `ADMIN_PASSWORD`

## 🎯 Como usar

### Navegação
- **Categorias**: Tela inicial com todas as categorias
- **Subcategorias**: Clique em uma categoria para ver suas subcategorias
- **Itens**: Clique em uma subcategoria para ver seus itens

### Administração
1. Clique no botão "+" para adicionar novos itens
2. Digite a senha administrativa
3. Preencha o formulário e selecione uma imagem

### Timer de Visualização
- Ao visualizar uma imagem, um timer de 1 minuto é iniciado
- O app retorna automaticamente à tela inicial quando expira

- **PWA**: Funciona offline e pode ser instalado como app
- **Hierarquia**: Categorias → Subcategorias → Itens
- **Upload de Imagens**: Suporte a imagens para itens
- **Responsivo**: Interface adaptada para mobile e desktop
- **Autenticação**: Sistema de senha para operações administrativas

## 🛠️ Tecnologias

- **Backend**: Node.js + Express
- **Banco**: MySQL (Railway)
- **Frontend**: HTML5 + CSS3 + JavaScript (Vanilla)
- **Upload**: Multer
- **PWA**: Service Worker + Web App Manifest

## 🔧 Configuração Local

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env

# Executar localmente
npm run dev
```

## 🌐 Variáveis de Ambiente

```env
# Senha administrativa
ADMIN_PASSWORD=sua_senha_aqui

# MySQL Railway (configurado automaticamente)
MYSQL_URL=mysql://...
```

## 📋 Uso

1. Acesse a aplicação
2. Digite a senha administrativa 
3. Gerencie categorias, subcategorias e itens
4. Faça upload de imagens para os itens
5. Use offline após a primeira visita

## 📄 Licença

ISC License
