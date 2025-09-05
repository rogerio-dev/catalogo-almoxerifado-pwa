# 🚀 Passos para Criar Repositório no GitHub

## Opção 1: Via Interface Web do GitHub (Recomendado)

### 1. Acesse o GitHub
- Vá para https://github.com
- Faça login na sua conta

### 2. Criar Novo Repositório
- Clique no botão "+" no canto superior direito
- Selecione "New repository"

### 3. Configurar o Repositório
- **Repository name**: `catalogo-almoxerifado-pwa`
- **Description**: `PWA para Catálogo de Almoxerifado com sistema hierárquico (Categorias → Subcategorias → Itens)`
- **Visibility**: Public (ou Private se preferir)
- **❌ NÃO marque**: "Add a README file"
- **❌ NÃO marque**: "Add .gitignore"
- **❌ NÃO marque**: "Choose a license"

### 4. Criar o Repositório
- Clique em "Create repository"

### 5. Conectar o Repositório Local
O GitHub mostrará comandos similares a estes. Execute no terminal:

```bash
cd "c:\Users\r.cruz\Desktop\App Catalogo Dinamico"
git remote add origin https://github.com/rogerio-dev/catalogo-almoxerifado-pwa.git
git branch -M main
git push -u origin main
```

## Opção 2: Via GitHub CLI (Se instalado)

```bash
# Instalar GitHub CLI (se não tiver)
winget install GitHub.cli

# Autenticar
gh auth login

# Criar repositório
gh repo create catalogo-almoxerifado-pwa --public --description "PWA para Catálogo de Almoxerifado com sistema hierárquico"

# Conectar e fazer push
git remote add origin https://github.com/rogerio-dev/catalogo-almoxerifado-pwa.git
git branch -M main
git push -u origin main
```

## 📋 Informações do Repositório

### Sugestões de Nome:
- `catalogo-almoxerifado-pwa`
- `almoxerifado-catalog-app`
- `warehouse-catalog-pwa`

### Descrição Sugerida:
```
PWA para Catálogo de Almoxerifado com sistema hierárquico (Categorias → Subcategorias → Itens). 
Inclui upload de imagens, autenticação, design responsivo e deploy para Railway.
```

### Tags Sugeridas:
- `pwa`
- `javascript`
- `nodejs`
- `express`
- `sqlite`
- `mysql`
- `warehouse`
- `catalog`
- `railway`

## 🔗 Após Criar o Repositório

1. **Configurar Secrets para Railway** (se usando GitHub Actions):
   - `RAILWAY_TOKEN`
   - `ADMIN_PASSWORD`

2. **Adicionar README Badges**:
   ```markdown
   ![PWA](https://img.shields.io/badge/PWA-Ready-green)
   ![Node.js](https://img.shields.io/badge/Node.js-18+-green)
   ![Railway](https://img.shields.io/badge/Deploy-Railway-purple)
   ```

3. **Configurar Branch Protection** (opcional):
   - Settings → Branches → Add rule
   - Require pull request reviews

## 🚀 Comandos para Executar

Após criar o repositório no GitHub, execute:

```bash
cd "c:\Users\r.cruz\Desktop\App Catalogo Dinamico"
git remote add origin https://github.com/SEU_USUARIO/catalogo-almoxerifado-pwa.git
git branch -M main
git push -u origin main
```

Substitua `SEU_USUARIO` pelo seu nome de usuário do GitHub.
