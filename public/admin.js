console.log('📄 Admin.js loaded');

class AdminApp {
    constructor() {
        console.log('🚀 AdminApp constructor called');
        this.currentUser = null;
        this.initializeApp();
    }

    async initializeApp() {
        console.log('🔧 Initializing AdminApp...');
        await this.checkAuth();
        this.bindEvents();
        await this.loadData();
        console.log('✅ AdminApp initialized successfully');
    }

    async checkAuth() {
        try {
            const response = await fetch('/api/auth/check');
            if (!response.ok) {
                window.location.href = '/login.html';
                return;
            }
            const result = await response.json();
            if (!result.user.is_admin) {
                this.showToast('Acesso negado. Apenas administradores.', 'error');
                setTimeout(() => window.location.href = '/login.html', 2000);
                return;
            }
            this.currentUser = result.user;
        } catch (error) {
            window.location.href = '/login.html';
        }
    }

    bindEvents() {
        console.log('🔗 Binding events...');
        
        // Tab navigation
        const empresasTab = document.getElementById('empresasTab');
        const usuariosTab = document.getElementById('usuariosTab');
        
        if (empresasTab) {
            console.log('✅ empresasTab found');
            empresasTab.addEventListener('click', () => {
                console.log('📋 Empresas tab clicked');
                this.showTab('empresas');
            });
        } else {
            console.error('❌ empresasTab not found');
        }
        
        if (usuariosTab) {
            console.log('✅ usuariosTab found');
            usuariosTab.addEventListener('click', () => {
                console.log('👥 Usuarios tab clicked');
                this.showTab('usuarios');
            });
        } else {
            console.error('❌ usuariosTab not found');
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            console.log('✅ logoutBtn found');
            logoutBtn.addEventListener('click', () => this.logout());
        } else {
            console.error('❌ logoutBtn not found');
        }
        
        // Formulário de empresas
        document.getElementById('empresaForm').addEventListener('submit', (e) => this.handleEmpresaSubmit(e));
        
        // Formulário de usuários
        document.getElementById('usuarioForm').addEventListener('submit', (e) => this.handleUsuarioSubmit(e));
    }

    showTab(tabName) {
        console.log('🔄 Showing tab:', tabName);
        
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected tab
        const tabElement = document.getElementById(tabName);
        if (tabElement) {
            console.log('✅ Tab element found:', tabName);
            tabElement.classList.add('active');
        } else {
            console.error('❌ Tab element not found:', tabName);
        }
        
        // Mark the correct button as active
        const buttonId = tabName + 'Tab';
        const buttonElement = document.getElementById(buttonId);
        if (buttonElement) {
            console.log('✅ Button element found:', buttonId);
            buttonElement.classList.add('active');
        } else {
            console.error('❌ Button element not found:', buttonId);
        }

        // Load data for the selected tab
        if (tabName === 'usuarios') {
            console.log('📋 Loading empresas for usuarios dropdown');
            this.loadEmpresas(); // For the select dropdown
        }
    }

    async loadData() {
        await this.loadEmpresas();
        await this.loadUsuarios();
    }

    async loadEmpresas() {
        try {
            const response = await fetch('/api/admin/empresas');
            const empresas = await response.json();
            
            this.renderEmpresas(empresas);
            this.populateEmpresaSelect(empresas);
        } catch (error) {
            this.showToast('Erro ao carregar empresas', 'error');
        }
    }

    async loadUsuarios() {
        try {
            const response = await fetch('/api/admin/usuarios');
            const usuarios = await response.json();
            
            this.renderUsuarios(usuarios);
        } catch (error) {
            this.showToast('Erro ao carregar usuários', 'error');
        }
    }

    renderEmpresas(empresas) {
        const container = document.getElementById('empresasList');
        
        if (empresas.length === 0) {
            container.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: var(--text-secondary);">
                    <i class="fas fa-building"></i>
                    <p>Nenhuma empresa cadastrada</p>
                </div>
            `;
            return;
        }

        container.innerHTML = empresas.map(empresa => `
            <div class="table-row">
                <div>
                    <strong>${empresa.nome}</strong>
                    <br>
                    <small style="color: var(--text-secondary);">ID: ${empresa.identificador}</small>
                </div>
                <div style="color: var(--text-secondary); font-size: 0.9rem;">
                    Criada: ${new Date(empresa.created_at).toLocaleDateString('pt-BR')}
                </div>
                <div class="table-actions">
                    <button class="btn-small btn-delete" data-empresa-id="${empresa.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add event listeners for delete buttons
        container.querySelectorAll('.btn-delete[data-empresa-id]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const empresaId = e.currentTarget.getAttribute('data-empresa-id');
                this.deleteEmpresa(parseInt(empresaId));
            });
        });
    }

    renderUsuarios(usuarios) {
        const container = document.getElementById('usuariosList');
        
        if (usuarios.length === 0) {
            container.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: var(--text-secondary);">
                    <i class="fas fa-users"></i>
                    <p>Nenhum usuário cadastrado</p>
                </div>
            `;
            return;
        }

        container.innerHTML = usuarios.map(usuario => `
            <div class="table-row">
                <div>
                    <strong>${usuario.nome}</strong>
                    <br>
                    <small style="color: var(--text-secondary);">
                        @${usuario.username} • ${usuario.empresa_nome}
                        ${usuario.is_admin ? ' • <span style="color: var(--primary-color);">Admin</span>' : ''}
                    </small>
                </div>
                <div style="color: var(--text-secondary); font-size: 0.9rem;">
                    Criado: ${new Date(usuario.created_at).toLocaleDateString('pt-BR')}
                </div>
                <div class="table-actions">
                    <button class="btn-small btn-delete" data-usuario-id="${usuario.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add event listeners for delete buttons
        container.querySelectorAll('.btn-delete[data-usuario-id]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const usuarioId = e.currentTarget.getAttribute('data-usuario-id');
                this.deleteUsuario(parseInt(usuarioId));
            });
        });
    }

    populateEmpresaSelect(empresas) {
        const select = document.getElementById('empresaSelect');
        select.innerHTML = '<option value="">Selecione uma empresa</option>';
        
        empresas.forEach(empresa => {
            const option = document.createElement('option');
            option.value = empresa.id;
            option.textContent = `${empresa.nome} (${empresa.identificador})`;
            select.appendChild(option);
        });
    }

    async handleEmpresaSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            nome: formData.get('nome'),
            identificador: formData.get('identificador')
        };

        try {
            const response = await fetch('/api/admin/empresas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (response.ok) {
                this.showToast('Empresa criada com sucesso!', 'success');
                e.target.reset();
                await this.loadEmpresas();
            } else {
                this.showToast(result.error || 'Erro ao criar empresa', 'error');
            }
        } catch (error) {
            this.showToast('Erro de conexão', 'error');
        }
    }

    async handleUsuarioSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            nome: formData.get('nome'),
            username: formData.get('username'),
            password: formData.get('password'),
            empresa_id: formData.get('empresa_id')
        };

        try {
            const response = await fetch('/api/admin/usuarios', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (response.ok) {
                this.showToast('Usuário criado com sucesso!', 'success');
                e.target.reset();
                await this.loadUsuarios();
            } else {
                this.showToast(result.error || 'Erro ao criar usuário', 'error');
            }
        } catch (error) {
            this.showToast('Erro de conexão', 'error');
        }
    }

    async deleteEmpresa(id) {
        if (!confirm('Tem certeza que deseja excluir esta empresa? Todos os dados relacionados serão perdidos.')) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/empresas/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showToast('Empresa excluída com sucesso!', 'success');
                await this.loadEmpresas();
                await this.loadUsuarios();
            } else {
                const result = await response.json();
                this.showToast(result.error || 'Erro ao excluir empresa', 'error');
            }
        } catch (error) {
            this.showToast('Erro de conexão', 'error');
        }
    }

    async deleteUsuario(id) {
        if (!confirm('Tem certeza que deseja excluir este usuário?')) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/usuarios/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showToast('Usuário excluído com sucesso!', 'success');
                await this.loadUsuarios();
            } else {
                const result = await response.json();
                this.showToast(result.error || 'Erro ao excluir usuário', 'error');
            }
        } catch (error) {
            this.showToast('Erro de conexão', 'error');
        }
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    async logout() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login.html';
        } catch (error) {
            window.location.href = '/login.html';
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🌐 DOM Content Loaded, initializing AdminApp...');
    const adminApp = new AdminApp();
    
    // Make it global for debugging
    window.adminApp = adminApp;
});
