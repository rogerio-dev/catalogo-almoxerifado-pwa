class CatalogoApp {
    constructor() {
        this.currentLevel = 'categorias'; // 'categorias', 'subcategorias', 'itens'
        this.currentCategoriaId = null;
        this.currentSubcategoriaId = null;
        this.currentData = [];
        this.editingItem = null;
        
        this.initializeApp();
    }

    initializeApp() {
        this.bindEvents();
        this.loadCategorias();
    }

    bindEvents() {
        // Header buttons
        document.getElementById('backBtn').addEventListener('click', () => this.goBack());
        document.getElementById('addBtn').addEventListener('click', () => this.showPasswordModal());

        // Password modal
        document.getElementById('confirmPasswordBtn').addEventListener('click', () => this.verifyPassword());
        document.getElementById('cancelPasswordBtn').addEventListener('click', () => this.hidePasswordModal());
        document.getElementById('passwordInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.verifyPassword();
        });

        // Add/Edit modal
        document.getElementById('cancelFormBtn').addEventListener('click', () => this.hideAddEditModal());
        document.getElementById('addEditForm').addEventListener('submit', (e) => this.handleFormSubmit(e));
        document.getElementById('imageInput').addEventListener('change', (e) => this.handleImagePreview(e));

        // Context menu
        document.getElementById('editOption').addEventListener('click', () => this.editItem());
        document.getElementById('deleteOption').addEventListener('click', () => this.deleteItem());

        // Click outside modals
        document.getElementById('passwordModal').addEventListener('click', (e) => {
            if (e.target.id === 'passwordModal') this.hidePasswordModal();
        });
        document.getElementById('addEditModal').addEventListener('click', (e) => {
            if (e.target.id === 'addEditModal') this.hideAddEditModal();
        });

        // Click outside context menu
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu')) {
                this.hideContextMenu();
            }
        });
    }

    // Navigation
    goBack() {
        if (this.currentLevel === 'itens') {
            this.currentLevel = 'subcategorias';
            this.currentSubcategoriaId = null;
            this.loadSubcategorias(this.currentCategoriaId);
        } else if (this.currentLevel === 'subcategorias') {
            this.currentLevel = 'categorias';
            this.currentCategoriaId = null;
            this.loadCategorias();
        }
    }

    updateHeader() {
        const backBtn = document.getElementById('backBtn');
        const headerTitle = document.getElementById('headerTitle');

        if (this.currentLevel === 'categorias') {
            backBtn.style.display = 'none';
            headerTitle.textContent = 'Catálogo Almoxerifado';
        } else {
            backBtn.style.display = 'flex';
            if (this.currentLevel === 'subcategorias') {
                const categoria = this.currentData.find(item => item.id === this.currentCategoriaId);
                headerTitle.textContent = categoria ? categoria.nome : 'Subcategorias';
            } else if (this.currentLevel === 'itens') {
                const subcategoria = this.currentData.find(item => item.id === this.currentSubcategoriaId);
                headerTitle.textContent = subcategoria ? subcategoria.nome : 'Itens';
            }
        }
    }

    // Data Loading
    async loadCategorias() {
        this.showLoading();
        try {
            const response = await fetch('/api/categorias');
            const categorias = await response.json();
            this.currentData = categorias;
            this.currentLevel = 'categorias';
            this.renderCategorias(categorias);
            this.updateHeader();
        } catch (error) {
            this.showToast('Erro ao carregar categorias', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async loadSubcategorias(categoriaId) {
        this.showLoading();
        try {
            const response = await fetch(`/api/subcategorias/${categoriaId}`);
            const subcategorias = await response.json();
            this.currentData = subcategorias;
            this.currentCategoriaId = categoriaId;
            this.currentLevel = 'subcategorias';
            this.renderSubcategorias(subcategorias);
            this.updateHeader();
        } catch (error) {
            this.showToast('Erro ao carregar subcategorias', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async loadItens(subcategoriaId) {
        this.showLoading();
        try {
            const response = await fetch(`/api/itens/${subcategoriaId}`);
            const itens = await response.json();
            this.currentData = itens;
            this.currentSubcategoriaId = subcategoriaId;
            this.currentLevel = 'itens';
            this.renderItens(itens);
            this.updateHeader();
        } catch (error) {
            this.showToast('Erro ao carregar itens', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Rendering
    renderCategorias(categorias) {
        const content = document.getElementById('content');
        
        if (categorias.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <h3>Nenhuma categoria encontrada</h3>
                    <p>Clique no botão + para adicionar a primeira categoria</p>
                </div>
            `;
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'grid';

        categorias.forEach(categoria => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-title">
                    <i class="fas fa-folder card-icon"></i>
                    ${categoria.nome}
                </div>
            `;
            
            card.addEventListener('click', () => this.loadSubcategorias(categoria.id));
            card.addEventListener('contextmenu', (e) => this.showContextMenu(e, categoria));
            
            grid.appendChild(card);
        });

        content.innerHTML = '';
        content.appendChild(grid);
    }

    renderSubcategorias(subcategorias) {
        const content = document.getElementById('content');
        
        if (subcategorias.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <h3>Nenhuma subcategoria encontrada</h3>
                    <p>Clique no botão + para adicionar a primeira subcategoria</p>
                </div>
            `;
            return;
        }

        const breadcrumb = document.createElement('div');
        breadcrumb.className = 'breadcrumb';
        breadcrumb.innerHTML = `
            <div class="breadcrumb-item">
                <i class="fas fa-home"></i>
                <span>Categorias</span>
            </div>
            <span class="breadcrumb-separator">
                <i class="fas fa-chevron-right"></i>
            </span>
            <div class="breadcrumb-item">
                <span>${subcategorias[0]?.categoria_nome || 'Categoria'}</span>
            </div>
        `;

        const grid = document.createElement('div');
        grid.className = 'grid';

        subcategorias.forEach(subcategoria => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-title">
                    <i class="fas fa-folder-open card-icon"></i>
                    ${subcategoria.nome}
                </div>
            `;
            
            card.addEventListener('click', () => this.loadItens(subcategoria.id));
            card.addEventListener('contextmenu', (e) => this.showContextMenu(e, subcategoria));
            
            grid.appendChild(card);
        });

        content.innerHTML = '';
        content.appendChild(breadcrumb);
        content.appendChild(grid);
    }

    renderItens(itens) {
        const content = document.getElementById('content');
        
        if (itens.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <h3>Nenhum item encontrado</h3>
                    <p>Clique no botão + para adicionar o primeiro item</p>
                </div>
            `;
            return;
        }

        const breadcrumb = document.createElement('div');
        breadcrumb.className = 'breadcrumb';
        breadcrumb.innerHTML = `
            <div class="breadcrumb-item">
                <i class="fas fa-home"></i>
                <span>Categorias</span>
            </div>
            <span class="breadcrumb-separator">
                <i class="fas fa-chevron-right"></i>
            </span>
            <div class="breadcrumb-item">
                <span>${itens[0]?.categoria_nome || 'Categoria'}</span>
            </div>
            <span class="breadcrumb-separator">
                <i class="fas fa-chevron-right"></i>
            </span>
            <div class="breadcrumb-item">
                <span>${itens[0]?.subcategoria_nome || 'Subcategoria'}</span>
            </div>
        `;

        const grid = document.createElement('div');
        grid.className = 'grid';

        itens.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card item-card';
            
            const imageHtml = item.imagem 
                ? `<img src="${item.imagem}" alt="${item.nome}" class="item-image">`
                : `<div class="item-image no-image"><i class="fas fa-image"></i></div>`;
            
            card.innerHTML = `
                ${imageHtml}
                <div class="item-info">
                    <div class="card-title">${item.nome}</div>
                </div>
            `;
            
            card.addEventListener('contextmenu', (e) => this.showContextMenu(e, item));
            
            grid.appendChild(card);
        });

        content.innerHTML = '';
        content.appendChild(breadcrumb);
        content.appendChild(grid);
    }

    // Password Modal
    showPasswordModal() {
        document.getElementById('passwordModal').style.display = 'block';
        document.getElementById('passwordInput').focus();
        document.getElementById('passwordError').textContent = '';
    }

    hidePasswordModal() {
        document.getElementById('passwordModal').style.display = 'none';
        document.getElementById('passwordInput').value = '';
        document.getElementById('passwordError').textContent = '';
    }

    async verifyPassword() {
        const password = document.getElementById('passwordInput').value;
        
        try {
            const response = await fetch('/api/verify-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password })
            });

            if (response.ok) {
                this.hidePasswordModal();
                this.showAddEditModal();
            } else {
                document.getElementById('passwordError').textContent = 'Senha incorreta';
            }
        } catch (error) {
            document.getElementById('passwordError').textContent = 'Erro ao verificar senha';
        }
    }

    // Add/Edit Modal
    showAddEditModal(item = null) {
        this.editingItem = item;
        const modal = document.getElementById('addEditModal');
        const modalTitle = document.getElementById('modalTitle');
        const nameInput = document.getElementById('nameInput');
        const imageUploadSection = document.getElementById('imageUploadSection');
        const imagePreview = document.getElementById('imagePreview');
        
        if (item) {
            modalTitle.textContent = 'Editar';
            nameInput.value = item.nome;
        } else {
            modalTitle.textContent = 'Adicionar';
            nameInput.value = '';
        }

        // Show image upload only for items
        if (this.currentLevel === 'itens') {
            imageUploadSection.style.display = 'block';
            if (item && item.imagem) {
                imagePreview.innerHTML = `<img src="${item.imagem}" alt="Preview">`;
            } else {
                imagePreview.innerHTML = '';
            }
        } else {
            imageUploadSection.style.display = 'none';
            imagePreview.innerHTML = '';
        }

        modal.style.display = 'block';
        nameInput.focus();
        document.getElementById('formError').textContent = '';
    }

    hideAddEditModal() {
        document.getElementById('addEditModal').style.display = 'none';
        document.getElementById('addEditForm').reset();
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('formError').textContent = '';
        this.editingItem = null;
    }

    handleImagePreview(event) {
        const file = event.target.files[0];
        const preview = document.getElementById('imagePreview');
        
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        } else {
            preview.innerHTML = '';
        }
    }

    async handleFormSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData();
        const nome = document.getElementById('nameInput').value.trim();
        const imageFile = document.getElementById('imageInput').files[0];
        
        if (!nome) {
            document.getElementById('formError').textContent = 'Nome é obrigatório';
            return;
        }

        formData.append('nome', nome);
        formData.append('password', 'verified'); // Password already verified

        if (this.currentLevel === 'categorias') {
            await this.saveCategoria(formData);
        } else if (this.currentLevel === 'subcategorias') {
            formData.append('categoria_id', this.currentCategoriaId);
            await this.saveSubcategoria(formData);
        } else if (this.currentLevel === 'itens') {
            formData.append('subcategoria_id', this.currentSubcategoriaId);
            if (imageFile) {
                formData.append('imagem', imageFile);
            }
            await this.saveItem(formData);
        }
    }

    async saveCategoria(formData) {
        try {
            const url = this.editingItem ? `/api/categorias/${this.editingItem.id}` : '/api/categorias';
            const method = this.editingItem ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                body: formData
            });

            if (response.ok) {
                this.hideAddEditModal();
                this.showToast(this.editingItem ? 'Categoria atualizada!' : 'Categoria criada!', 'success');
                this.loadCategorias();
            } else {
                const error = await response.json();
                document.getElementById('formError').textContent = error.error || 'Erro ao salvar categoria';
            }
        } catch (error) {
            document.getElementById('formError').textContent = 'Erro ao salvar categoria';
        }
    }

    async saveSubcategoria(formData) {
        try {
            const url = this.editingItem ? `/api/subcategorias/${this.editingItem.id}` : '/api/subcategorias';
            const method = this.editingItem ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                body: formData
            });

            if (response.ok) {
                this.hideAddEditModal();
                this.showToast(this.editingItem ? 'Subcategoria atualizada!' : 'Subcategoria criada!', 'success');
                this.loadSubcategorias(this.currentCategoriaId);
            } else {
                const error = await response.json();
                document.getElementById('formError').textContent = error.error || 'Erro ao salvar subcategoria';
            }
        } catch (error) {
            document.getElementById('formError').textContent = 'Erro ao salvar subcategoria';
        }
    }

    async saveItem(formData) {
        try {
            const url = this.editingItem ? `/api/itens/${this.editingItem.id}` : '/api/itens';
            const method = this.editingItem ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                body: formData
            });

            if (response.ok) {
                this.hideAddEditModal();
                this.showToast(this.editingItem ? 'Item atualizado!' : 'Item criado!', 'success');
                this.loadItens(this.currentSubcategoriaId);
            } else {
                const error = await response.json();
                document.getElementById('formError').textContent = error.error || 'Erro ao salvar item';
            }
        } catch (error) {
            document.getElementById('formError').textContent = 'Erro ao salvar item';
        }
    }

    // Context Menu
    showContextMenu(event, item) {
        event.preventDefault();
        event.stopPropagation();
        
        const contextMenu = document.getElementById('contextMenu');
        this.contextMenuItem = item;
        
        contextMenu.style.display = 'block';
        contextMenu.style.left = `${event.pageX}px`;
        contextMenu.style.top = `${event.pageY}px`;
    }

    hideContextMenu() {
        document.getElementById('contextMenu').style.display = 'none';
        this.contextMenuItem = null;
    }

    editItem() {
        this.hideContextMenu();
        this.showPasswordModal();
        
        // Override the password verification to show edit modal
        const originalVerify = this.verifyPassword.bind(this);
        this.verifyPassword = async () => {
            const password = document.getElementById('passwordInput').value;
            
            try {
                const response = await fetch('/api/verify-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ password })
                });

                if (response.ok) {
                    this.hidePasswordModal();
                    this.showAddEditModal(this.contextMenuItem);
                } else {
                    document.getElementById('passwordError').textContent = 'Senha incorreta';
                }
            } catch (error) {
                document.getElementById('passwordError').textContent = 'Erro ao verificar senha';
            }
            
            // Restore original function
            this.verifyPassword = originalVerify;
        };
    }

    async deleteItem() {
        if (!confirm('Tem certeza que deseja excluir este item?')) {
            this.hideContextMenu();
            return;
        }

        const password = prompt('Digite a senha para confirmar:');
        if (!password) {
            this.hideContextMenu();
            return;
        }

        try {
            let url;
            if (this.currentLevel === 'categorias') {
                url = `/api/categorias/${this.contextMenuItem.id}`;
            } else if (this.currentLevel === 'subcategorias') {
                url = `/api/subcategorias/${this.contextMenuItem.id}`;
            } else if (this.currentLevel === 'itens') {
                url = `/api/itens/${this.contextMenuItem.id}`;
            }

            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password })
            });

            if (response.ok) {
                this.showToast('Item excluído com sucesso!', 'success');
                
                // Reload current view
                if (this.currentLevel === 'categorias') {
                    this.loadCategorias();
                } else if (this.currentLevel === 'subcategorias') {
                    this.loadSubcategorias(this.currentCategoriaId);
                } else if (this.currentLevel === 'itens') {
                    this.loadItens(this.currentSubcategoriaId);
                }
            } else {
                this.showToast('Senha incorreta', 'error');
            }
        } catch (error) {
            this.showToast('Erro ao excluir item', 'error');
        }

        this.hideContextMenu();
    }

    // UI Helper Methods
    showLoading() {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('content').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'block';
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CatalogoApp();
});
