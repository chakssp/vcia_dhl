/**
 * QuickAccessMenu.js - Menu lateral de acesso rápido
 * 
 * Fornece acesso direto às ferramentas avançadas do sistema,
 * incluindo o Qdrant Explorer e outras funcionalidades de backend.
 * 
 * @aidev-note quick-access-menu; porta dos fundos para ferramentas avançadas
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const { Logger, EventBus, Events } = KC;

    class QuickAccessMenu {
        constructor() {
            this.menuElement = null;
            this.isOpen = false;
            this.initialized = false;
        }

        /**
         * Inicializa o menu lateral
         */
        initialize() {
            if (this.initialized) return;

            Logger?.info('QuickAccessMenu', 'Inicializando menu de acesso rápido');
            
            this.createMenu();
            this.registerEvents();
            
            this.initialized = true;
        }

        /**
         * Cria o elemento do menu
         */
        createMenu() {
            // Criar container do menu
            this.menuElement = document.createElement('div');
            this.menuElement.id = 'kc-side-menu';
            this.menuElement.style.cssText = `
                position: fixed;
                right: -280px;
                top: 50%;
                transform: translateY(-50%);
                width: 280px;
                background: linear-gradient(135deg, #1a1a2e 0%, #0a0a1a 100%);
                border: 2px solid #0ff;
                border-radius: 16px 0 0 16px;
                padding: 20px;
                z-index: 9999;
                box-shadow: -10px 0 30px rgba(0,255,255,0.3);
                transition: right 0.3s ease;
            `;

            // Adicionar aba para mostrar/esconder
            const tab = document.createElement('div');
            tab.className = 'quick-access-tab';
            tab.style.cssText = `
                position: absolute;
                left: -40px;
                top: 50%;
                transform: translateY(-50%) rotate(-90deg);
                background: #0ff;
                color: #000;
                padding: 10px 20px;
                border-radius: 8px 8px 0 0;
                cursor: pointer;
                font-weight: bold;
                font-size: 14px;
                user-select: none;
            `;
            tab.textContent = '🚀 Menu';
            tab.onclick = () => this.toggle();

            // Criar conteúdo do menu primeiro
            const menuContent = document.createElement('div');
            menuContent.innerHTML = `
                <h3 style="color: #0ff; margin: 0 0 20px 0; font-family: Arial, sans-serif;">
                    🎯 Quick Access Menu
                </h3>
                
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${this.createMenuItems()}
                </div>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
                    <div style="color: #666; font-size: 12px; text-align: center;">
                        Knowledge Consolidator v1.0<br>
                        <span style="color: #0ff;">Qdrant Enhanced Edition</span>
                    </div>
                </div>
            `;

            // Adicionar conteúdo e aba ao menu
            this.menuElement.appendChild(menuContent);
            this.menuElement.appendChild(tab);

            document.body.appendChild(this.menuElement);
        }

        /**
         * Cria os itens do menu
         */
        createMenuItems() {
            const items = [
                {
                    icon: '🧭',
                    title: 'Convergence Navigator',
                    subtitle: 'Navegação multi-dimensional',
                    color: '#f0f',
                    background: 'linear-gradient(135deg, #550055 0%, #330033 100%)',
                    action: 'openConvergenceNavigator'
                },
                {
                    icon: '🔍',
                    title: 'Qdrant Explorer',
                    subtitle: 'Direct vector database access',
                    color: '#0ff',
                    background: 'linear-gradient(135deg, #004455 0%, #002233 100%)',
                    action: 'openQdrantExplorer'
                },
                {
                    icon: '📚',
                    title: 'PrefixCache Manager',
                    subtitle: '163K pre-computed prefixes',
                    color: '#0f0',
                    background: 'linear-gradient(135deg, #445500 0%, #223300 100%)',
                    action: 'openPrefixManager'
                },
                {
                    icon: '🏥',
                    title: 'System Diagnostics',
                    subtitle: 'Run kcdiag() and health checks',
                    color: '#ff0',
                    background: 'linear-gradient(135deg, #554400 0%, #332200 100%)',
                    action: 'runDiagnostics'
                },
                {
                    icon: '⚠️',
                    title: 'Reset Database',
                    subtitle: 'Clean slate for testing',
                    color: '#f0f',
                    background: 'linear-gradient(135deg, #550044 0%, #330022 100%)',
                    action: 'openResetManager'
                },
                {
                    icon: '🔧',
                    title: 'API Configuration',
                    subtitle: 'Configure Ollama & providers',
                    color: '#0ff',
                    background: 'linear-gradient(135deg, #005544 0%, #003322 100%)',
                    action: 'openAPIConfig'
                }
            ];

            return items.map(item => `
                <button onclick="${item.action}()" style="
                    background: ${item.background};
                    color: ${item.color};
                    border: 1px solid ${item.color};
                    padding: 12px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    text-align: left;
                    transition: all 0.3s;
                    width: 100%;
                " onmouseover="this.style.transform='translateX(-5px)'" onmouseout="this.style.transform='translateX(0)'">
                    ${item.icon} <strong>${item.title}</strong>
                    <div style="font-size: 12px; color: #aaa; margin-top: 4px;">${item.subtitle}</div>
                </button>
            `).join('');
        }

        /**
         * Registra eventos
         */
        registerEvents() {
            // Fechar menu ao clicar fora
            document.addEventListener('click', (e) => {
                if (this.isOpen && !this.menuElement.contains(e.target)) {
                    const rect = this.menuElement.getBoundingClientRect();
                    if (e.clientX < rect.left) {
                        this.close();
                    }
                }
            });

            // Atalho de teclado (Ctrl+Shift+M)
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.shiftKey && e.key === 'M') {
                    e.preventDefault();
                    this.toggle();
                }
            });
        }

        /**
         * Alterna visibilidade do menu
         */
        toggle() {
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
        }

        /**
         * Abre o menu
         */
        open() {
            this.menuElement.style.right = '0';
            this.isOpen = true;
            Logger?.debug('QuickAccessMenu', 'Menu aberto');
        }

        /**
         * Fecha o menu
         */
        close() {
            this.menuElement.style.right = '-280px';
            this.isOpen = false;
            Logger?.debug('QuickAccessMenu', 'Menu fechado');
        }

        // === Ações do Menu ===

        /**
         * Abre o Convergence Navigator
         */
        openConvergenceNavigator() {
            this.close();
            
            // Abrir em nova aba ou iframe
            const navigatorUrl = '/convergence-navigator/index.html';
            
            // Opção 1: Abrir em nova aba
            window.open(navigatorUrl, '_blank');
            
            // Opção 2 (futuro): Abrir em modal com iframe
            // KC.ConvergenceIntegrationService?.openNavigator();
            
            Logger?.info('QuickAccessMenu', 'Abrindo Convergence Navigator');
        }

        /**
         * Abre o Qdrant Explorer
         */
        openQdrantExplorer() {
            this.close();
            
            // Usar o método correto do QdrantExplorerFixed
            if (KC.QdrantExplorerFixed?.showModal) {
                KC.QdrantExplorerFixed.showModal();
            } else if (KC.QdrantExplorer?.showModal) {
                KC.QdrantExplorer.showModal();
            } else {
                Logger?.warn('QuickAccessMenu', 'QdrantExplorer não disponível');
                KC.ModalManager?.showError('QdrantExplorer não está carregado');
            }
        }

        /**
         * Abre o PrefixCache Manager
         */
        openPrefixManager() {
            this.close();
            
            // Criar modal simples para PrefixCache
            const modal = document.createElement('div');
            modal.className = 'quick-access-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;
            
            modal.innerHTML = `
                <div style="
                    background: #1a1a1a;
                    border: 2px solid #0f0;
                    border-radius: 12px;
                    padding: 30px;
                    width: 600px;
                    color: #fff;
                ">
                    <h2 style="color: #0f0; margin: 0 0 20px 0;">📚 PrefixCache Manager</h2>
                    <p>163,075 pre-computed prefixes disponíveis!</p>
                    <p style="color: #aaa;">Collection: PrefixCache</p>
                    <p style="color: #aaa;">Vector Size: 384 dimensions</p>
                    <br>
                    <button onclick="this.closest('.quick-access-modal').remove()" style="
                        background: #0f0;
                        color: #000;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: bold;
                    ">Fechar</button>
                </div>
            `;
            
            document.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
        }

        /**
         * Executa diagnósticos do sistema
         */
        async runDiagnostics() {
            this.close();
            
            // Criar modal de diagnóstico
            const modal = document.createElement('div');
            modal.className = 'quick-access-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;
            
            modal.innerHTML = `
                <div style="
                    background: #1a1a1a;
                    border: 2px solid #ff0;
                    border-radius: 12px;
                    padding: 30px;
                    width: 700px;
                    max-height: 80vh;
                    overflow-y: auto;
                    color: #fff;
                ">
                    <h2 style="color: #ff0; margin: 0 0 20px 0;">🏥 System Diagnostics</h2>
                    <div id="diagnostics-content">
                        <p style="color: #aaa;">Executando diagnóstico...</p>
                    </div>
                    <br>
                    <button onclick="this.closest('.quick-access-modal').remove()" style="
                        background: #ff0;
                        color: #000;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: bold;
                        margin-top: 20px;
                    ">Fechar</button>
                </div>
            `;
            
            document.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
            
            const content = document.getElementById('diagnostics-content');
            let results = '<div style="font-family: monospace;">';
            
            // Executar kcdiag
            if (window.kcdiag) {
                window.kcdiag();
                results += '<h3 style="color: #0ff;">📊 Componentes KC</h3>';
                results += '<p style="color: #0f0;">✅ Sistema KC carregado</p>';
            }
            
            // Verificar Qdrant
            results += '<h3 style="color: #0ff;">🔍 Qdrant Status</h3>';
            if (KC.QdrantService) {
                const connected = await KC.QdrantService.checkConnection();
                results += `<p style="color: ${connected ? '#0f0' : '#f00'};">${connected ? '✅' : '❌'} Conexão: ${connected ? 'Ativa' : 'Falhou'}</p>`;
                if (connected) {
                    const stats = await KC.QdrantService.getCollectionStats();
                    results += `<p>📊 Total de pontos: ${stats?.points_count || 0}</p>`;
                    results += `<p>📈 Status: ${stats?.status || 'unknown'}</p>`;
                }
            }
            
            // Verificar Ollama
            results += '<h3 style="color: #0ff;">🤖 Ollama Status</h3>';
            if (KC.EmbeddingService) {
                const available = await KC.EmbeddingService.checkOllamaAvailability();
                results += `<p style="color: ${available ? '#0f0' : '#f00'};">${available ? '✅' : '❌'} Ollama: ${available ? 'Disponível' : 'Não encontrado'}</p>`;
            }
            
            results += '</div>';
            content.innerHTML = results;
        }

        /**
         * Abre o Reset Manager
         */
        openResetManager() {
            this.close();
            
            // Criar modal de reset
            const modal = document.createElement('div');
            modal.className = 'quick-access-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;
            
            modal.innerHTML = `
                <div style="
                    background: #1a1a1a;
                    border: 2px solid #f0f;
                    border-radius: 12px;
                    padding: 30px;
                    width: 500px;
                    color: #fff;
                ">
                    <h2 style="color: #f0f; margin: 0 0 20px 0;">⚠️ Reset Database</h2>
                    <p style="color: #ff0;">ATENÇÃO: Esta ação irá limpar todos os dados!</p>
                    <p>Deseja realmente resetar o banco de dados?</p>
                    <br>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="
                            KC.QdrantService?.resetCollection().then(() => {
                                alert('Collection resetada com sucesso!');
                                this.closest('.quick-access-modal').remove();
                            });
                        " style="
                            background: #f00;
                            color: #fff;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 5px;
                            cursor: pointer;
                            font-weight: bold;
                        ">Confirmar Reset</button>
                        <button onclick="this.closest('.quick-access-modal').remove()" style="
                            background: #333;
                            color: #fff;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 5px;
                            cursor: pointer;
                        ">Cancelar</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
        }

        /**
         * Abre configuração de API
         */
        openAPIConfig() {
            this.close();
            
            EventBus?.emit(Events.OPEN_API_CONFIG);
            Logger?.info('QuickAccessMenu', 'Abrindo configuração de API');
        }
    }

    // Criar instância e registrar
    const quickAccessMenu = new QuickAccessMenu();
    
    // Registrar no KC
    KC.QuickAccessMenu = quickAccessMenu;

    // Auto-inicializar quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => quickAccessMenu.initialize());
    } else {
        quickAccessMenu.initialize();
    }

    // Expor métodos globalmente para os botões funcionarem
    window.openConvergenceNavigator = () => quickAccessMenu.openConvergenceNavigator();
    window.openQdrantExplorer = () => quickAccessMenu.openQdrantExplorer();
    window.openPrefixManager = () => quickAccessMenu.openPrefixManager();
    window.runDiagnostics = () => quickAccessMenu.runDiagnostics();
    window.openResetManager = () => quickAccessMenu.openResetManager();
    window.openAPIConfig = () => quickAccessMenu.openAPIConfig();

    Logger?.info('QuickAccessMenu', 'Componente carregado');

})(window);