# Catálogo Almoxerifado - PWA

Uma Progressive Web App (PWA) para gerenciamento de catálogo de almoxerifado com sistema hierárquico em três níveis: Categorias → Subcategorias → Itens.

## 🚀 Funcionalidades

### Navegação Hierárquica
- **Categorias**: Tela inicial com lista de todas as categorias
- **Subcategorias**: Lista de subcategorias dentro de uma categoria específica
- **Itens**: Lista de itens com nome e imagem dentro de uma subcategoria

### Sistema de Autenticação
- Visualização livre para todos os usuários
- Operações de criação, edição e exclusão protegidas por senha
- Modal de confirmação de senha antes de operações administrativas

### CRUD Completo
- **Create**: Adicionar novas categorias, subcategorias e itens
- **Read**: Visualizar e navegar pela hierarquia
- **Update**: Editar nomes e imagens existentes
- **Delete**: Remover itens com confirmação

### PWA Features
- Instalável no dispositivo
- Funciona offline (cache de recursos estáticos)
- Design responsivo para mobile e desktop
- Ícones e manifesto configurados

## 🛠️ Tecnologias

### Backend
- **Node.js** com Express
- **MySQL** para persistência de dados
- **Multer** para upload de imagens
- **Helmet** para segurança
- **CORS** para requisições cross-origin

### Frontend
- **HTML5**, **CSS3** e **JavaScript** vanilla
- **Font Awesome** para ícones
- **Service Worker** para funcionalidades PWA
- Design responsivo com CSS Grid/Flexbox

## 📦 Instalação e Execução

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo `.env` e configure:
```env
PORT=3000
# Para desenvolvimento local (SQLite)
ADMIN_PASSWORD=admin123

# Para produção (MySQL) - configurar no Railway
MYSQLHOST=seu_host
MYSQLUSER=seu_usuario  
MYSQLPASSWORD=sua_senha
MYSQLDATABASE=seu_banco
```

### 3. Inserir Dados de Exemplo (Opcional)
```bash
node seed.js
```

### 4. Executar em Desenvolvimento
```bash
npm run dev
# ou
npm start
```

### 5. Acessar a Aplicação
- URL: http://localhost:3000
- Senha administrativa: `admin123` (padrão)

## 🚂 Deploy na Railway

### 1. Preparação
- Conecte seu repositório GitHub ao Railway
- Configure um banco MySQL na Railway

### 2. Variáveis de Ambiente
Configure no painel da Railway:
```
MYSQLHOST=seu_host_mysql
MYSQLPORT=3306
MYSQLUSER=seu_usuario
MYSQLPASSWORD=sua_senha
MYSQLDATABASE=catalogo_almoxerifado
ADMIN_PASSWORD=sua_senha_admin
```

### 3. Deploy Automático
O Railway detectará automaticamente o projeto Node.js e fará o deploy.

## 📱 Uso da Aplicação

### Para Usuários (Visualização)
1. Abra a aplicação
2. Navegue pelas categorias clicando nas cartas
3. Acesse subcategorias e itens seguindo a hierarquia
4. Use o botão "voltar" para retornar aos níveis anteriores

### Para Administradores (Edição)
1. Clique no botão "+" em qualquer tela
2. Digite a senha administrativa
3. Preencha o formulário de adicionar/editar
4. Para itens, é possível fazer upload de imagem

### Operações Avançadas
- **Editar**: Clique com botão direito (ou toque longo) em um item
- **Excluir**: Use o menu de contexto e confirme com senha

## 🎨 Design

### Características Visuais
- Design Material Design inspirado
- Cores: Azul primário (#2196F3) com gradientes
- Tipografia: Segoe UI (sistema padrão)
- Cards com sombras e efeitos hover
- Animações suaves e transições

### Responsividade
- Grid adaptativo para diferentes tamanhos de tela
- Layout otimizado para mobile-first
- Suporte a toque e mouse
- Safe areas para dispositivos com notch

## 📊 Estrutura do Banco de Dados

### Tabela: categorias
```sql
- id (INT, AUTO_INCREMENT, PRIMARY KEY)
- nome (VARCHAR(255), UNIQUE, NOT NULL)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Tabela: subcategorias
```sql
- id (INT, AUTO_INCREMENT, PRIMARY KEY)
- nome (VARCHAR(255), NOT NULL)
- categoria_id (INT, FOREIGN KEY)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Tabela: itens
```sql
- id (INT, AUTO_INCREMENT, PRIMARY KEY)
- nome (VARCHAR(255), NOT NULL)
- imagem (VARCHAR(500))
- subcategoria_id (INT, FOREIGN KEY)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## 🔒 Segurança

- Operações administrativas protegidas por senha
- Headers de segurança configurados com Helmet
- Validação de tipos de arquivo para upload
- Sanitização de inputs
- CORS configurado adequadamente

## 🌐 API Endpoints

### Autenticação
- `POST /api/verify-password` - Verificar senha administrativa

### Categorias
- `GET /api/categorias` - Listar todas as categorias
- `POST /api/categorias` - Criar nova categoria
- `PUT /api/categorias/:id` - Atualizar categoria
- `DELETE /api/categorias/:id` - Deletar categoria

### Subcategorias
- `GET /api/subcategorias/:categoriaId` - Listar subcategorias
- `POST /api/subcategorias` - Criar nova subcategoria
- `PUT /api/subcategorias/:id` - Atualizar subcategoria
- `DELETE /api/subcategorias/:id` - Deletar subcategoria

### Itens
- `GET /api/itens/:subcategoriaId` - Listar itens
- `POST /api/itens` - Criar novo item (com upload)
- `PUT /api/itens/:id` - Atualizar item
- `DELETE /api/itens/:id` - Deletar item

## 📝 Licença

Este projeto está sob a licença ISC.

## 👨‍💻 Desenvolvedor

Desenvolvido por R. Cruz para gerenciamento eficiente de catálogo de almoxerifado.
