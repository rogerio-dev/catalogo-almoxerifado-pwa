# Guia de Teste da Aplicação

## 🚀 Como Testar Localmente

### 1. Iniciar o Servidor
```bash
npm start
```

### 2. Acessar a Aplicação
- URL: http://localhost:3000
- Senha administrativa: `admin123`

## 📱 Funcionalidades para Testar

### Navegação (Sem Senha)
1. **Visualizar Categorias**: Tela inicial mostra todas as categorias
2. **Entrar em Categoria**: Clique em uma categoria para ver subcategorias
3. **Entrar em Subcategoria**: Clique em uma subcategoria para ver itens
4. **Voltar**: Use o botão "←" para voltar aos níveis anteriores
5. **Breadcrumb**: Observe a navegação hierárquica

### Operações Administrativas (Com Senha)
1. **Adicionar Categoria**:
   - Clique no botão "+" na tela de categorias
   - Digite a senha: `admin123`
   - Digite o nome da nova categoria
   - Clique em "Salvar"

2. **Adicionar Subcategoria**:
   - Entre em uma categoria
   - Clique no botão "+"
   - Digite a senha: `admin123`
   - Digite o nome da nova subcategoria
   - Clique em "Salvar"

3. **Adicionar Item com Imagem**:
   - Entre em uma subcategoria
   - Clique no botão "+"
   - Digite a senha: `admin123`
   - Digite o nome do item
   - Selecione uma imagem (opcional)
   - Clique em "Salvar"

4. **Editar Item**:
   - Clique com botão direito em qualquer item
   - Selecione "Editar"
   - Digite a senha: `admin123`
   - Modifique o nome ou imagem
   - Clique em "Salvar"

5. **Excluir Item**:
   - Clique com botão direito em qualquer item
   - Selecione "Excluir"
   - Confirme digitando a senha: `admin123`

## 🔧 Teste de PWA

### Instalar como App
1. No Chrome/Edge: Menu → "Instalar aplicativo"
2. No Firefox: Menu → "Instalar"
3. No Safari iOS: Compartilhar → "Adicionar à tela inicial"

### Teste Offline
1. Instale o app
2. Desconecte a internet
3. Abra o app instalado
4. Verifique se a interface carrega (cache funciona)

## 📊 Dados de Exemplo

Se executou `node seed.js`, você terá:

### Categorias
- Ferramentas
- Material Elétrico  
- Parafusos e Fixadores
- Tintas e Vernizes
- Equipamentos de Segurança

### Exemplo de Navegação
1. Ferramentas → Alicates → Alicate Universal
2. Material Elétrico → Fios e Cabos → Cabo 2,5mm
3. Equipamentos → Capacetes → Capacete Branco

## 🐛 Possíveis Problemas

### Erro de Banco
- **SQLite**: Certifique-se que o arquivo `database.sqlite` tem permissões
- **MySQL**: Verifique as credenciais no `.env`

### Upload de Imagem
- **Tamanho**: Máximo 5MB
- **Tipos**: JPG, PNG, GIF, WebP
- **Pasta**: Certifique-se que `public/uploads/` existe

### Senha Incorreta
- **Padrão**: `admin123`
- **Personalizar**: Altere `ADMIN_PASSWORD` no `.env`

## 📱 Teste Responsivo

### Desktop
- Teste com diferentes tamanhos de janela
- Verifique grid de categorias

### Mobile
- Teste em modo portrait/landscape
- Verifique navegação touch
- Teste menu de contexto (toque longo)

### Tablet
- Verifique layout intermediário
- Teste orientação

## ⚡ Performance

### Lighthouse
1. Abra DevTools (F12)
2. Aba "Lighthouse"
3. Execute audit para PWA
4. Verifique score > 90

### Network
1. DevTools → Network
2. Recarregue a página
3. Verifique carregamento dos recursos
4. Teste throttling 3G
