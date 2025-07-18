// Configuração da API
const API_BASE_URL = window.location.origin + '/api';

// Estado da aplicação
let currentSection = 'dashboard';
let bots = [];
let gateways = [];
let logs = [];
let stats = {};

// Elementos do DOM
const elements = {
    // Navegação
    sectionTitle: document.getElementById('section-title'),
    sections: document.querySelectorAll('main section'),
    navLinks: document.querySelectorAll('aside nav a'),
    
    // Dashboard
    totalRevenue: document.getElementById('total-revenue'),
    totalTransactions: document.getElementById('total-transactions'),
    activeBots: document.getElementById('active-bots'),
    connectedGateways: document.getElementById('connected-gateways'),
    recentLogs: document.getElementById('recent-logs'),
    
    // Bots
    botsContainer: document.getElementById('bots-container'),
    botsCapacity: document.getElementById('bots-capacity'),
    addBotBtn: document.getElementById('add-bot-btn'),
    
    // Gateways
    gatewaysContainer: document.getElementById('gateways-container'),
    addGatewayBtn: document.getElementById('add-gateway-btn'),
    
    // Logs
    logsContainer: document.getElementById('logs-container'),
    logsCount: document.getElementById('logs-count'),
    clearLogsBtn: document.getElementById('clear-logs-btn'),
    
    // Modais
    botModal: document.getElementById('bot-modal'),
    gatewayModal: document.getElementById('gateway-modal'),
    
    // Formulários
    botForm: document.getElementById('bot-form'),
    gatewayForm: document.getElementById('gateway-form'),
    
    // Status de conexão
    connectionStatus: document.getElementById('connection-status')
};

// Utilitários
const utils = {
    // Fazer requisições para a API
    async apiRequest(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erro na API:', error);
            this.showNotification('Erro de conexão com o servidor', 'error');
            this.updateConnectionStatus(false);
            throw error;
        }
    },
    
    // Mostrar notificações
    showNotification(message, type = 'info') {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full ${
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'warning' ? 'bg-yellow-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animar entrada
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // Remover após 3 segundos
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    },
    
    // Atualizar status de conexão
    updateConnectionStatus(connected) {
        const statusDot = elements.connectionStatus.querySelector('.w-2');
        const statusText = elements.connectionStatus.querySelector('span');
        
        if (connected) {
            statusDot.className = 'w-2 h-2 bg-green-500 rounded-full';
            statusText.textContent = 'Conectado';
        } else {
            statusDot.className = 'w-2 h-2 bg-red-500 rounded-full';
            statusText.textContent = 'Desconectado';
        }
    },
    
    // Formatar data
    formatDate(dateString) {
        return new Date(dateString).toLocaleString('pt-BR');
    },
    
    // Abrir modal
    openModal(modal) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('.modal-content').classList.remove('scale-95');
        }, 10);
    },
    
    // Fechar modal
    closeModal(modal) {
        modal.classList.add('opacity-0');
        modal.querySelector('.modal-content').classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
};

// Gerenciamento de dados
const dataManager = {
    // Carregar estatísticas
    async loadStats() {
        try {
            stats = await utils.apiRequest('/stats');
            this.updateDashboard();
            utils.updateConnectionStatus(true);
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    },
    
    // Carregar bots
    async loadBots() {
        try {
            bots = await utils.apiRequest('/bots');
            this.renderBots();
            utils.updateConnectionStatus(true);
        } catch (error) {
            console.error('Erro ao carregar bots:', error);
            elements.botsContainer.innerHTML = '<p class="text-red-500 col-span-full text-center py-8">Erro ao carregar bots</p>';
        }
    },
    
    // Carregar gateways
    async loadGateways() {
        try {
            gateways = await utils.apiRequest('/gateways');
            this.renderGateways();
            this.updateGatewaySelect();
            utils.updateConnectionStatus(true);
        } catch (error) {
            console.error('Erro ao carregar gateways:', error);
            elements.gatewaysContainer.innerHTML = '<p class="text-red-500 col-span-full text-center py-8">Erro ao carregar gateways</p>';
        }
    },
    
    // Carregar logs
    async loadLogs() {
        try {
            logs = await utils.apiRequest('/logs');
            this.renderLogs();
            utils.updateConnectionStatus(true);
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
            elements.logsContainer.innerHTML = '<p class="text-red-500 text-center py-8">Erro ao carregar logs</p>';
        }
    },
    
    // Atualizar dashboard
    updateDashboard() {
        if (elements.totalRevenue) elements.totalRevenue.textContent = `R$ ${stats.total_revenue?.toFixed(2) || '0,00'}`;
        if (elements.totalTransactions) elements.totalTransactions.textContent = stats.total_transactions || '0';
        if (elements.activeBots) elements.activeBots.textContent = `${stats.active_bots || 0} / ${stats.total_bots || 0}`;
        if (elements.connectedGateways) elements.connectedGateways.textContent = `${stats.connected_gateways || 0} / ${stats.total_gateways || 0}`;
        
        // Mostrar logs recentes no dashboard
        if (elements.recentLogs && logs.length > 0) {
            elements.recentLogs.innerHTML = logs.slice(0, 5).map(log => `
                <div class="p-3 rounded-lg ${this.getLogBgClass(log.level)}">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold px-2 py-1 rounded ${this.getLogBadgeClass(log.level)}">
                            ${log.level.toUpperCase()}
                        </span>
                        <span class="text-xs text-gray-500 dark:text-gray-400">
                            ${utils.formatDate(log.timestamp)}
                        </span>
                    </div>
                    <p class="text-sm mt-2">${log.message}</p>
                </div>
            `).join('');
        } else if (elements.recentLogs) {
            elements.recentLogs.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">Nenhum log disponível</p>';
        }
    },
    
    // Renderizar bots
    renderBots() {
        if (!elements.botsContainer) return;
        
        if (bots.length === 0) {
            elements.botsContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 col-span-full text-center py-8">Nenhum bot encontrado. Adicione um novo para começar.</p>';
        } else {
            elements.botsContainer.innerHTML = bots.map(bot => `
                <div class="bg-white dark:bg-gray-800 p-5 rounded-xl shadow flex flex-col bot-card" data-bot-id="${bot.id}">
                    <div class="flex-1">
                        <div class="flex items-start justify-between mb-4">
                            <h4 class="font-semibold text-lg mr-2">${bot.name}</h4>
                            <label class="switch">
                                <input type="checkbox" class="status-toggle" ${bot.is_active ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                            Token: <span class="font-mono">${bot.token}</span>
                        </p>
                        <div class="mt-2">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                bot.is_active 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }">
                                ${bot.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                        </div>
                    </div>
                    
                    <div class="mt-6 flex items-center justify-end space-x-2">
                        <button class="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 edit-btn">
                            <i data-lucide="edit-3" class="h-5 w-5"></i>
                        </button>
                        <button class="p-2 text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-gray-700 restart-btn">
                            <i data-lucide="refresh-cw" class="h-5 w-5"></i>
                        </button>
                        <button class="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-gray-700 delete-btn">
                            <i data-lucide="trash-2" class="h-5 w-5"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }
        
        if (elements.botsCapacity) {
            elements.botsCapacity.textContent = `Bots hospedados: ${bots.length} de 5`;
        }
        
        // Recriar ícones
        lucide.createIcons();
    },
    
    // Renderizar gateways
    renderGateways() {
        if (!elements.gatewaysContainer) return;
        
        if (gateways.length === 0) {
            elements.gatewaysContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 col-span-full text-center py-8">Nenhum gateway encontrado. Adicione um novo para começar.</p>';
        } else {
            elements.gatewaysContainer.innerHTML = gateways.map(gateway => `
                <div class="bg-white dark:bg-gray-800 p-5 rounded-xl shadow flex flex-col gateway-card" data-gateway-id="${gateway.id}">
                    <div class="flex-1">
                        <div class="flex items-start justify-between mb-2">
                            <h4 class="font-semibold text-lg mr-2">${gateway.name}</h4>
                            <span class="flex items-center text-sm px-2.5 py-0.5 rounded-full ${this.getGatewayStatusClass(gateway.status)}">
                                <span class="w-2 h-2 mr-2 rounded-full ${this.getGatewayIndicatorClass(gateway.status)}"></span>
                                ${gateway.status}
                            </span>
                        </div>
                        <p class="text-sm text-gray-500 dark:text-gray-400">${gateway.type}</p>
                        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">${gateway.api_url}</p>
                    </div>
                    
                    <div class="mt-6 flex items-center justify-end space-x-2">
                        <button class="p-2 text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-gray-700 test-connection-btn" ${gateway.status === 'Testando' ? 'disabled' : ''}>
                            ${gateway.status === 'Testando' ? '<div class="spinner"></div>' : '<i data-lucide="plug-zap" class="h-5 w-5"></i>'}
                        </button>
                        <button class="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 edit-btn">
                            <i data-lucide="edit-3" class="h-5 w-5"></i>
                        </button>
                        <button class="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-gray-700 delete-btn">
                            <i data-lucide="trash-2" class="h-5 w-5"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }
        
        // Recriar ícones
        lucide.createIcons();
    },
    
    // Renderizar logs
    renderLogs() {
        if (!elements.logsContainer) return;
        
        if (logs.length === 0) {
            elements.logsContainer.innerHTML = `
                <div class="text-center text-gray-500 dark:text-gray-400 py-8">
                    <i data-lucide="terminal" class="h-12 w-12 mx-auto mb-4 opacity-50"></i>
                    <p>Nenhum log disponível</p>
                    <p class="text-sm">Os logs aparecerão aqui conforme as ações forem executadas</p>
                </div>
            `;
        } else {
            elements.logsContainer.innerHTML = logs.map(log => `
                <div class="p-3 rounded-lg border-l-4 ${this.getLogBorderClass(log.level)} ${this.getLogBgClass(log.level)} mb-2">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-2">
                            <span class="text-xs font-bold px-2 py-1 rounded ${this.getLogBadgeClass(log.level)}">
                                ${log.level.toUpperCase()}
                            </span>
                            ${log.bot_id ? `<span class="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">Bot: ${this.getBotName(log.bot_id)}</span>` : ''}
                        </div>
                        <span class="text-xs text-gray-500 dark:text-gray-400">
                            ${utils.formatDate(log.timestamp)}
                        </span>
                    </div>
                    <p class="text-sm mt-2 font-mono">${log.message}</p>
                </div>
            `).join('');
        }
        
        if (elements.logsCount) {
            elements.logsCount.textContent = `(${logs.length} entradas)`;
        }
        
        // Recriar ícones
        lucide.createIcons();
    },
    
    // Atualizar select de gateways no modal de bot
    updateGatewaySelect() {
        const select = document.getElementById('bot-gateway');
        if (select) {
            select.innerHTML = '<option value="">Selecione um gateway</option>' +
                gateways.map(gateway => `<option value="${gateway.id}">${gateway.name}</option>`).join('');
        }
    },
    
    // Utilitários para classes CSS
    getGatewayStatusClass(status) {
        switch (status) {
            case 'Conectado': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
            case 'Testando': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
            default: return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
        }
    },
    
    getGatewayIndicatorClass(status) {
        switch (status) {
            case 'Conectado': return 'bg-green-500';
            case 'Testando': return 'bg-yellow-500';
            default: return 'bg-red-500';
        }
    },
    
    getLogBgClass(level) {
        switch (level) {
            case 'error': return 'bg-red-50 dark:bg-red-900/20';
            case 'warning': return 'bg-yellow-50 dark:bg-yellow-900/20';
            case 'success': return 'bg-green-50 dark:bg-green-900/20';
            default: return 'bg-blue-50 dark:bg-blue-900/20';
        }
    },
    
    getLogBorderClass(level) {
        switch (level) {
            case 'error': return 'border-red-500';
            case 'warning': return 'border-yellow-500';
            case 'success': return 'border-green-500';
            default: return 'border-blue-500';
        }
    },
    
    getLogBadgeClass(level) {
        switch (level) {
            case 'error': return 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200';
            case 'warning': return 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200';
            case 'success': return 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200';
            default: return 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200';
        }
    },
    
    getBotName(botId) {
        const bot = bots.find(b => b.id == botId);
        return bot ? bot.name : `Bot ${botId}`;
    }
};

// Gerenciamento de eventos
const eventManager = {
    init() {
        this.setupNavigation();
        this.setupThemeToggle();
        this.setupModals();
        this.setupForms();
        this.setupBotActions();
        this.setupGatewayActions();
        this.setupLogActions();
    },
    
    setupNavigation() {
        elements.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = link.dataset.section;
                this.switchSection(sectionId);
            });
        });
    },
    
    switchSection(sectionId) {
        // Atualizar navegação
        elements.navLinks.forEach(nav => {
            nav.classList.remove('bg-teal-50', 'dark:bg-gray-700', 'text-teal-600', 'dark:text-white');
            nav.classList.add('text-gray-600', 'dark:text-gray-300');
        });
        
        const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('bg-teal-50', 'dark:bg-gray-700', 'text-teal-600', 'dark:text-white');
            activeLink.classList.remove('text-gray-600', 'dark:text-gray-300');
        }
        
        // Atualizar seções
        elements.sections.forEach(section => section.classList.add('hidden'));
        const activeSection = document.getElementById(sectionId);
        if (activeSection) {
            activeSection.classList.remove('hidden');
        }
        
        // Atualizar título
        const titles = {
            dashboard: 'Dashboard',
            bots: 'Meus Bots',
            gateways: 'Gateways',
            logs: 'Logs do Sistema',
            users: 'Usuários'
        };
        elements.sectionTitle.textContent = titles[sectionId] || 'Dashboard';
        
        currentSection = sectionId;
        
        // Carregar dados da seção
        this.loadSectionData(sectionId);
    },
    
    async loadSectionData(sectionId) {
        switch (sectionId) {
            case 'dashboard':
                await dataManager.loadStats();
                await dataManager.loadLogs();
                dataManager.updateDashboard();
                break;
            case 'bots':
                await dataManager.loadBots();
                await dataManager.loadGateways();
                break;
            case 'gateways':
                await dataManager.loadGateways();
                break;
            case 'logs':
                await dataManager.loadLogs();
                break;
        }
    },
    
    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        const html = document.documentElement;
        
        themeToggle.addEventListener('click', () => {
            html.classList.toggle('dark');
            localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
        });
        
        // Aplicar tema salvo
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            html.classList.add('dark');
        }
    },
    
    setupModals() {
        // Bot modal
        const botModal = elements.botModal;
        const gatewayModal = elements.gatewayModal;
        
        // Abrir modais
        elements.addBotBtn?.addEventListener('click', () => {
            this.openBotModal();
        });
        
        elements.addGatewayBtn?.addEventListener('click', () => {
            this.openGatewayModal();
        });
        
        // Fechar modais
        document.getElementById('close-bot-modal-btn')?.addEventListener('click', () => {
            utils.closeModal(botModal);
        });
        
        document.getElementById('cancel-bot-btn')?.addEventListener('click', () => {
            utils.closeModal(botModal);
        });
        
        document.getElementById('close-gateway-modal-btn')?.addEventListener('click', () => {
            utils.closeModal(gatewayModal);
        });
        
        document.getElementById('cancel-gateway-btn')?.addEventListener('click', () => {
            utils.closeModal(gatewayModal);
        });
        
        // Fechar modal clicando fora
        [botModal, gatewayModal].forEach(modal => {
            modal?.addEventListener('click', (e) => {
                if (e.target === modal) {
                    utils.closeModal(modal);
                }
            });
        });
        
        // Tabs do modal de bot
        this.setupBotModalTabs();
    },
    
    setupBotModalTabs() {
        const configTab = document.getElementById('bot-tab-config');
        const codeTab = document.getElementById('bot-tab-code');
        const configContent = document.getElementById('bot-content-config');
        const codeContent = document.getElementById('bot-content-code');
        
        configTab?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchBotTab('config');
        });
        
        codeTab?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchBotTab('code');
        });
        
        // Upload de arquivo
        const fileInput = document.getElementById('bot-code-file');
        fileInput?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.name.endsWith('.py')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    document.getElementById('code-editor').value = event.target.result;
                    utils.showNotification(`Arquivo "${file.name}" carregado com sucesso`, 'success');
                };
                reader.readAsText(file);
            } else {
                utils.showNotification('Por favor, selecione um arquivo Python (.py)', 'error');
            }
        });
    },
    
    switchBotTab(tab) {
        const configTab = document.getElementById('bot-tab-config');
        const codeTab = document.getElementById('bot-tab-code');
        const configContent = document.getElementById('bot-content-config');
        const codeContent = document.getElementById('bot-content-code');
        
        // Reset classes
        [configTab, codeTab].forEach(t => {
            t.className = 'whitespace-nowrap py-3 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 font-medium text-sm';
        });
        
        if (tab === 'config') {
            configTab.className = 'whitespace-nowrap py-3 px-1 border-b-2 border-teal-500 text-teal-600 dark:text-teal-400 font-medium text-sm';
            configContent.classList.remove('hidden');
            codeContent.classList.add('hidden');
        } else {
            codeTab.className = 'whitespace-nowrap py-3 px-1 border-b-2 border-teal-500 text-teal-600 dark:text-teal-400 font-medium text-sm';
            codeContent.classList.remove('hidden');
            configContent.classList.add('hidden');
        }
    },
    
    setupForms() {
        // Formulário de bot
        elements.botForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleBotSubmit();
        });
        
        // Formulário de gateway
        elements.gatewayForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleGatewaySubmit();
        });
    },
    
    async handleBotSubmit() {
        const formData = new FormData(elements.botForm);
        const botId = document.getElementById('bot-id-input').value;
        const botData = {
            name: document.getElementById('bot-name').value,
            token: document.getElementById('bot-token').value,
            code: document.getElementById('code-editor').value,
            gateway_id: document.getElementById('bot-gateway').value || null
        };
        
        try {
            if (botId) {
                // Atualizar bot existente
                await utils.apiRequest(`/bots/${botId}`, {
                    method: 'PUT',
                    body: JSON.stringify(botData)
                });
                utils.showNotification('Bot atualizado com sucesso!', 'success');
            } else {
                // Criar novo bot
                await utils.apiRequest('/bots', {
                    method: 'POST',
                    body: JSON.stringify(botData)
                });
                utils.showNotification('Bot criado com sucesso!', 'success');
            }
            
            utils.closeModal(elements.botModal);
            await dataManager.loadBots();
            await dataManager.loadStats();
        } catch (error) {
            utils.showNotification('Erro ao salvar bot', 'error');
        }
    },
    
    async handleGatewaySubmit() {
        const gatewayId = document.getElementById('gateway-id-input').value;
        const gatewayData = {
            name: document.getElementById('gateway-name').value,
            type: document.getElementById('gateway-type-select').value,
            api_url: document.getElementById('gateway-url').value,
            api_key: document.getElementById('gateway-key').value
        };
        
        try {
            if (gatewayId) {
                // Atualizar gateway existente
                await utils.apiRequest(`/gateways/${gatewayId}`, {
                    method: 'PUT',
                    body: JSON.stringify(gatewayData)
                });
                utils.showNotification('Gateway atualizado com sucesso!', 'success');
            } else {
                // Criar novo gateway
                await utils.apiRequest('/gateways', {
                    method: 'POST',
                    body: JSON.stringify(gatewayData)
                });
                utils.showNotification('Gateway criado com sucesso!', 'success');
            }
            
            utils.closeModal(elements.gatewayModal);
            await dataManager.loadGateways();
            await dataManager.loadStats();
        } catch (error) {
            utils.showNotification('Erro ao salvar gateway', 'error');
        }
    },
    
    setupBotActions() {
        elements.botsContainer?.addEventListener('click', async (e) => {
            const botCard = e.target.closest('.bot-card');
            if (!botCard) return;
            
            const botId = botCard.dataset.botId;
            const bot = bots.find(b => b.id == botId);
            
            if (e.target.matches('.status-toggle')) {
                // Toggle status
                try {
                    await utils.apiRequest(`/bots/${botId}/toggle`, { method: 'POST' });
                    await dataManager.loadBots();
                    await dataManager.loadStats();
                } catch (error) {
                    utils.showNotification('Erro ao alterar status do bot', 'error');
                    e.target.checked = !e.target.checked; // Reverter toggle
                }
            } else if (e.target.closest('.edit-btn')) {
                // Editar bot
                this.openBotModal(bot);
            } else if (e.target.closest('.delete-btn')) {
                // Excluir bot
                if (confirm(`Excluir o bot "${bot.name}"?`)) {
                    try {
                        await utils.apiRequest(`/bots/${botId}`, { method: 'DELETE' });
                        utils.showNotification('Bot excluído com sucesso!', 'success');
                        await dataManager.loadBots();
                        await dataManager.loadStats();
                    } catch (error) {
                        utils.showNotification('Erro ao excluir bot', 'error');
                    }
                }
            } else if (e.target.closest('.restart-btn')) {
                // Reiniciar bot
                try {
                    await utils.apiRequest(`/bots/${botId}/restart`, { method: 'POST' });
                    utils.showNotification('Reinício do bot iniciado', 'info');
                } catch (error) {
                    utils.showNotification('Erro ao reiniciar bot', 'error');
                }
            }
        });
    },
    
    setupGatewayActions() {
        elements.gatewaysContainer?.addEventListener('click', async (e) => {
            const gatewayCard = e.target.closest('.gateway-card');
            if (!gatewayCard) return;
            
            const gatewayId = gatewayCard.dataset.gatewayId;
            const gateway = gateways.find(g => g.id == gatewayId);
            
            if (e.target.closest('.test-connection-btn')) {
                // Testar conexão
                try {
                    await utils.apiRequest(`/gateways/${gatewayId}/test`, { method: 'POST' });
                    utils.showNotification('Teste de conexão iniciado', 'info');
                    
                    // Atualizar status para "Testando"
                    gateway.status = 'Testando';
                    dataManager.renderGateways();
                    
                    // Recarregar gateways após alguns segundos
                    setTimeout(async () => {
                        await dataManager.loadGateways();
                        await dataManager.loadStats();
                    }, 3000);
                } catch (error) {
                    utils.showNotification('Erro ao testar conexão', 'error');
                }
            } else if (e.target.closest('.edit-btn')) {
                // Editar gateway
                this.openGatewayModal(gateway);
            } else if (e.target.closest('.delete-btn')) {
                // Excluir gateway
                if (confirm(`Excluir o gateway "${gateway.name}"?`)) {
                    try {
                        await utils.apiRequest(`/gateways/${gatewayId}`, { method: 'DELETE' });
                        utils.showNotification('Gateway excluído com sucesso!', 'success');
                        await dataManager.loadGateways();
                        await dataManager.loadStats();
                    } catch (error) {
                        utils.showNotification('Erro ao excluir gateway', 'error');
                    }
                }
            }
        });
    },
    
    setupLogActions() {
        elements.clearLogsBtn?.addEventListener('click', async () => {
            if (confirm('Limpar todos os logs?')) {
                try {
                    await utils.apiRequest('/logs', { method: 'DELETE' });
                    utils.showNotification('Logs limpos com sucesso!', 'success');
                    await dataManager.loadLogs();
                } catch (error) {
                    utils.showNotification('Erro ao limpar logs', 'error');
                }
            }
        });
    },
    
    openBotModal(bot = null) {
        const modal = elements.botModal;
        const title = document.getElementById('bot-modal-title');
        const form = elements.botForm;
        
        // Reset form
        form.reset();
        document.getElementById('code-editor').value = '';
        document.getElementById('bot-id-input').value = '';
        
        if (bot) {
            // Editar bot existente
            title.textContent = 'Editar Bot';
            document.getElementById('bot-name').value = bot.name;
            document.getElementById('bot-token').value = bot.token;
            document.getElementById('code-editor').value = bot.code || '';
            document.getElementById('bot-gateway').value = bot.gateway_id || '';
            document.getElementById('bot-id-input').value = bot.id;
        } else {
            // Novo bot
            title.textContent = 'Adicionar Novo Bot';
            // Código exemplo
            document.getElementById('code-editor').value = `# Exemplo de bot básico
import telebot
from telebot import types

# Substitua pelo seu token
bot = telebot.TeleBot('SEU_TOKEN_AQUI')

@bot.message_handler(commands=['start'])
def send_welcome(message):
    bot.reply_to(message, 'Olá! Eu sou seu bot!')

@bot.message_handler(func=lambda message: True)
def echo_all(message):
    bot.reply_to(message, message.text)

if __name__ == '__main__':
    bot.polling()`;
        }
        
        // Resetar para aba de configuração
        this.switchBotTab('config');
        
        utils.openModal(modal);
    },
    
    openGatewayModal(gateway = null) {
        const modal = elements.gatewayModal;
        const title = document.getElementById('gateway-modal-title');
        const form = elements.gatewayForm;
        
        // Reset form
        form.reset();
        document.getElementById('gateway-id-input').value = '';
        
        if (gateway) {
            // Editar gateway existente
            title.textContent = 'Editar Gateway';
            document.getElementById('gateway-name').value = gateway.name;
            document.getElementById('gateway-type-select').value = gateway.type;
            document.getElementById('gateway-url').value = gateway.api_url;
            document.getElementById('gateway-key').value = ''; // Não mostrar a chave por segurança
            document.getElementById('gateway-id-input').value = gateway.id;
        } else {
            // Novo gateway
            title.textContent = 'Adicionar Novo Gateway';
        }
        
        utils.openModal(modal);
    }
};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar ícones Lucide
    lucide.createIcons();
    
    // Inicializar gerenciadores
    eventManager.init();
    
    // Carregar dados iniciais
    await eventManager.loadSectionData('dashboard');
    
    // Configurar atualização automática
    setInterval(async () => {
        if (currentSection === 'dashboard') {
            await dataManager.loadStats();
            await dataManager.loadLogs();
            dataManager.updateDashboard();
        }
    }, 30000); // Atualizar a cada 30 segundos
    
    console.log('FarmMoneyRich Dashboard inicializado com sucesso!');
});