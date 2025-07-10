/**
 * app.js - Bootstrap da Aplicação
 * 
 * Ponto de entrada principal que inicializa o namespace global,
 * registra componentes e inicia a aplicação
 */

(function(window, document) {
    'use strict';

    // Garante que o namespace existe
    window.KnowledgeConsolidator = window.KnowledgeConsolidator || {};
    const KC = window.KnowledgeConsolidator;

    /**
     * Verifica compatibilidade do navegador
     */
    function checkBrowserCompatibility() {
        const required = {
            'localStorage': typeof(Storage) !== 'undefined',
            'Promise': typeof(Promise) !== 'undefined',
            'Map': typeof(Map) !== 'undefined',
            'Set': typeof(Set) !== 'undefined',
            'ES6': (function() {
                try {
                    new Function('(a = 0) => a');
                    return true;
                } catch (err) {
                    return false;
                }
            })()
        };

        const missing = [];
        for (const [feature, supported] of Object.entries(required)) {
            if (!supported) missing.push(feature);
        }

        if (missing.length > 0) {
            alert(`Seu navegador não suporta: ${missing.join(', ')}. Por favor, use um navegador moderno.`);
            return false;
        }

        return true;
    }

    /**
     * Registra todos os componentes no controlador
     */
    function registerComponents() {
        const { AppController } = KC;
        
        // Registra componentes disponíveis
        const components = [
            'WorkflowPanel',
            'ConfigManager',
            'DiscoveryManager',
            'AnalysisManager',
            'CategoryManager',
            'FilterManager',
            'ExportManager',
            'StatsManager',
            'FileRenderer',
            'ModalManager',
            'FilterBar',
            'StatsPanel'
        ];

        components.forEach(name => {
            if (KC[name]) {
                AppController.registerModule(name, KC[name]);
                console.log(`Componente registrado: ${name}`);
            } else {
                console.warn(`Componente não encontrado: ${name}`);
            }
        });
    }

    /**
     * Configura handlers globais de erro
     */
    function setupErrorHandlers() {
        const { EventBus, Events } = KC;

        // Handler para notificações
        EventBus.on(Events.NOTIFICATION_SHOW, (data) => {
            showNotification(data);
        });

        // Handler para erros
        EventBus.on(Events.ERROR_OCCURRED, (data) => {
            console.error('Erro no sistema:', data);
            showNotification({
                type: 'error',
                message: data.message || data.error || 'Erro desconhecido',
                duration: 5000
            });
        });

        // Handler para mudanças de estado (debug)
        if (window.location.hostname === 'localhost') {
            EventBus.on(Events.STATE_CHANGED, (data) => {
                console.log('Estado alterado:', data);
            });
        }
    }

    /**
     * Mostra notificação na UI
     */
    function showNotification({ type = 'info', message, duration = 3000 }) {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(notification);

        // Auto-remove após duração
        if (duration > 0) {
            setTimeout(() => {
                notification.classList.add('notification-fade-out');
                setTimeout(() => notification.remove(), 300);
            }, duration);
        }
    }

    /**
     * Adiciona estilos temporários para notificações
     */
    function addTemporaryStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: var(--z-notification, 1000);
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .notification {
                background: white;
                border-radius: 8px;
                padding: 16px 40px 16px 16px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                position: relative;
                min-width: 300px;
                animation: slideIn 0.3s ease-out;
            }
            
            .notification-error {
                border-left: 4px solid #ef4444;
            }
            
            .notification-success {
                border-left: 4px solid #10b981;
            }
            
            .notification-info {
                border-left: 4px solid #3b82f6;
            }
            
            .notification-close {
                position: absolute;
                top: 8px;
                right: 8px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #6b7280;
                padding: 4px;
            }
            
            .notification-fade-out {
                animation: slideOut 0.3s ease-in forwards;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            /* Loading overlay */
            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            }
            
            .loading-content {
                text-align: center;
            }
            
            .loading-spinner {
                width: 50px;
                height: 50px;
                border: 3px solid #e5e7eb;
                border-top: 3px solid #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Mostra/esconde loading
     */
    function setupLoadingHandler() {
        const { EventBus, Events, AppState } = KC;

        EventBus.on(Events.STATE_CHANGED, (data) => {
            if (data.path === 'ui.loading') {
                const loading = data.newValue;
                const message = AppState.get('ui.loadingMessage') || 'Carregando...';
                
                let overlay = document.querySelector('.loading-overlay');
                
                if (loading && !overlay) {
                    overlay = document.createElement('div');
                    overlay.className = 'loading-overlay';
                    overlay.innerHTML = `
                        <div class="loading-content">
                            <div class="loading-spinner"></div>
                            <div class="loading-message">${message}</div>
                        </div>
                    `;
                    document.body.appendChild(overlay);
                } else if (!loading && overlay) {
                    overlay.remove();
                }
            }
        });
    }

    /**
     * Inicializa a aplicação
     */
    async function initializeApp() {
        console.log('Iniciando Knowledge Consolidator...');

        // Verifica compatibilidade
        if (!checkBrowserCompatibility()) {
            return;
        }

        // Adiciona estilos temporários
        addTemporaryStyles();

        // Aguarda DOM carregar completamente
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }

        try {
            // Registra componentes
            registerComponents();

            // Configura handlers
            setupErrorHandlers();
            setupLoadingHandler();

            // Inicializa controlador principal
            const { AppController, EventBus } = KC;
            await AppController.initialize();

            // Ativa modo debug em desenvolvimento
            if (window.location.hostname === 'localhost') {
                EventBus.setDebugMode(true);
                console.log('Modo debug ativado');
            }

            console.log('Knowledge Consolidator pronto!');

            // Mostra notificação de boas-vindas
            showNotification({
                type: 'success',
                message: 'Sistema inicializado com sucesso!',
                duration: 2000
            });

        } catch (error) {
            console.error('Erro fatal na inicialização:', error);
            showNotification({
                type: 'error',
                message: 'Erro ao inicializar sistema. Verifique o console.',
                duration: 0
            });
        }
    }

    // Inicia quando o script carregar
    initializeApp();

    // Exporta função de inicialização para debug
    KC.initializeApp = initializeApp;
    KC.showNotification = showNotification;

})(window, document);