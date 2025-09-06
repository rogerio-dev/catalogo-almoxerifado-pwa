# Catálogo de Almoxerifado PWA

Progressive Web App para gerenciamento de catálogo de almoxerifado com sistema hierárquico.

## 🚀 Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/6HFUCD?referralCode=alphasec)

## 📱 Funcionalidades

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
