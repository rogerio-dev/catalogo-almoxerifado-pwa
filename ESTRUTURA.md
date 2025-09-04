# Estrutura do Projeto

```
📁 App Catalogo Dinamico/
├── 📄 server.js                 # Servidor Express principal
├── 📄 package.json             # Dependências e scripts
├── 📄 .env                     # Variáveis de ambiente
├── 📄 .gitignore              # Arquivos ignorados pelo Git
├── 📄 README.md               # Documentação principal
├── 📄 DEPLOY.md               # Instruções de deploy
├── 📄 TESTE.md                # Guia de testes
├── 📄 railway.json            # Configuração Railway
├── 📄 seed.js                 # Script de dados exemplo
├── 📄 generate-icons.js       # Gerador de ícones
├── 📄 icon-generator.html     # Interface para gerar ícones
├── 📄 database.sqlite         # Banco SQLite (dev)
│
└── 📁 public/                 # Arquivos estáticos
    ├── 📄 index.html          # Página principal
    ├── 📄 app.js              # JavaScript da aplicação
    ├── 📄 styles.css          # Estilos CSS
    ├── 📄 manifest.json       # Manifesto PWA
    ├── 📄 sw.js               # Service Worker
    ├── 📁 icons/              # Ícones da PWA
    │   ├── 📄 icon-72x72.png
    │   ├── 📄 icon-96x96.png
    │   ├── 📄 icon-128x128.png
    │   ├── 📄 icon-144x144.png
    │   ├── 📄 icon-152x152.png
    │   ├── 📄 icon-192x192.png
    │   ├── 📄 icon-384x384.png
    │   ├── 📄 icon-512x512.png
    │   └── 📄 icon-192x192.svg
    └── 📁 uploads/            # Imagens carregadas
        └── (imagens dos itens)
```

## 🗄️ Banco de Dados

### Desenvolvimento (SQLite)
- Arquivo: `database.sqlite`
- Criado automaticamente na primeira execução

### Produção (MySQL)
- Configurado via variáveis de ambiente
- Tabelas criadas automaticamente

## 🚀 Comandos Principais

```bash
# Instalar dependências
npm install

# Inserir dados de exemplo
npm run seed

# Executar em desenvolvimento
npm run dev

# Executar em produção
npm start
```

## 🌐 URLs da Aplicação

### Desenvolvimento
- App: http://localhost:3000
- API: http://localhost:3000/api/categorias

### Produção (Railway)
- App: https://seu-app.railway.app
- API: https://seu-app.railway.app/api/categorias

## 📱 Funcionalidades Implementadas

✅ **PWA Completa**
- Manifesto configurado
- Service Worker funcional
- Instalável em dispositivos
- Funciona offline (cache)

✅ **Sistema Hierárquico**
- Categorias → Subcategorias → Itens
- Navegação intuitiva
- Breadcrumb navigation

✅ **CRUD Completo**
- Create: Adicionar novos itens
- Read: Visualizar hierarquia
- Update: Editar itens existentes
- Delete: Remover itens

✅ **Upload de Imagens**
- Suporte a múltiplos formatos
- Preview antes do upload
- Validação de tamanho e tipo

✅ **Sistema de Autenticação**
- Visualização livre
- Operações protegidas por senha
- Modal de confirmação

✅ **Design Responsivo**
- Mobile-first
- Adaptável a tablets e desktop
- Touch-friendly

✅ **Banco Dual**
- SQLite para desenvolvimento
- MySQL para produção
- Migração automática

## 🔒 Segurança

✅ **Headers de Segurança** (Helmet)
✅ **CORS Configurado**
✅ **Validação de Upload**
✅ **Sanitização de Inputs**
✅ **Autenticação por Senha**

## 📊 Performance

✅ **Compressão GZIP**
✅ **Cache de Recursos**
✅ **Otimização de Imagens**
✅ **Minificação CSS**
✅ **Service Worker**
