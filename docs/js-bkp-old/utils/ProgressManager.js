/**
 * ProgressManager.js - Gerenciador de Progresso Global
 * 
 * Componente responsável por exibir uma barra de progresso global
 * para operações de longa duração como descoberta, filtros, análise, etc.
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const EventBus = KC.EventBus;
    const Events = KC.Events;

    class ProgressManager {
        constructor() {
            this.progressBar = null;
            this.overlay = null;
            this.currentOperation = null;
            this.isActive = false;
            
            // Configurações
            this.config = {
                showOverlay: true,
                autoHide: true,
                hideDelay: 500, // ms
                minDisplayTime: 1000 // ms mínimo de exibição
            };
            
            this.startTime = null;
        }

        /**
         * Inicializa o componente
         */
        initialize() {
            console.log('ProgressManager inicializado');
            this.createProgressElements();
            this.setupEventListeners();
        }

        /**
         * Cria elementos HTML da barra de progresso
         */
        createProgressElements() {
            // Cria barra de progresso global
            this.progressBar = document.createElement('div');
            this.progressBar.className = 'progress-global';
            this.progressBar.innerHTML = `
                <div class="progress-global-bar"></div>
            `;
            
            // Cria overlay de informações
            this.overlay = document.createElement('div');
            this.overlay.className = 'progress-global-overlay';
            this.overlay.innerHTML = `
                <div class="progress-global-title"></div>
                <div class="progress-global-details"></div>
            `;
            
            // Adiciona ao DOM
            document.body.appendChild(this.progressBar);
            document.body.appendChild(this.overlay);
        }

        /**
         * Configura event listeners
         */
        setupEventListeners() {
            // Escuta eventos de progresso
            EventBus.on(Events.PROGRESS_START, (data) => {
                this.start(data);
            });

            EventBus.on(Events.PROGRESS_UPDATE, (data) => {
                this.update(data);
            });

            EventBus.on(Events.PROGRESS_END, (data) => {
                this.end(data);
            });

            // Eventos específicos de descoberta
            if (Events.DISCOVERY_STARTED) {
                EventBus.on(Events.DISCOVERY_STARTED, (data) => {
                    this.start({
                        type: 'discovery',
                        title: 'Descobrindo arquivos...',
                        details: 'Iniciando varredura de diretórios'
                    });
                });
            }

            if (Events.DISCOVERY_PROGRESS) {
                EventBus.on(Events.DISCOVERY_PROGRESS, (data) => {
                    this.update({
                        type: 'discovery',
                        progress: data.progress,
                        title: 'Descobrindo arquivos...',
                        details: `${data.current}/${data.total} diretórios processados`
                    });
                });
            }

            if (Events.DISCOVERY_COMPLETED) {
                EventBus.on(Events.DISCOVERY_COMPLETED, (data) => {
                    this.end({
                        type: 'discovery',
                        title: 'Descoberta concluída!',
                        details: `${data.files?.length || 0} arquivos encontrados`
                    });
                });
            }

            // Eventos de filtros
            if (Events.FILES_FILTERED) {
                EventBus.on(Events.FILES_FILTERED, (data) => {
                    this.quickProgress({
                        type: 'filter',
                        title: 'Aplicando filtros...',
                        details: `${data.filteredFiles?.length || 0} arquivos filtrados`,
                        duration: 300
                    });
                });
            }
        }

        /**
         * Inicia operação de progresso
         */
        start(data = {}) {
            console.log('ProgressManager: Iniciando progresso', data);
            
            this.currentOperation = data;
            this.isActive = true;
            this.startTime = Date.now();
            
            // Aplica tipo de operação
            this.progressBar.className = `progress-global active ${data.type || ''}`;
            
            // Configura overlay
            if (this.config.showOverlay && data.title) {
                this.overlay.querySelector('.progress-global-title').textContent = data.title;
                this.overlay.querySelector('.progress-global-details').textContent = data.details || '';
                this.overlay.classList.add('active');
            }
            
            // Inicia com progresso 0 ou indeterminado
            if (data.indeterminate) {
                this.progressBar.classList.add('indeterminate');
            } else {
                this.setProgress(data.progress || 0);
            }
        }

        /**
         * Atualiza progresso
         */
        update(data = {}) {
            if (!this.isActive) return;
            
            console.log('ProgressManager: Atualizando progresso', data);
            
            // Atualiza progresso
            if (data.progress !== undefined) {
                this.setProgress(data.progress);
            }
            
            // Atualiza textos
            if (data.title && this.overlay.classList.contains('active')) {
                this.overlay.querySelector('.progress-global-title').textContent = data.title;
            }
            
            if (data.details && this.overlay.classList.contains('active')) {
                this.overlay.querySelector('.progress-global-details').textContent = data.details;
            }
        }

        /**
         * Finaliza operação de progresso
         */
        end(data = {}) {
            if (!this.isActive) return;
            
            console.log('ProgressManager: Finalizando progresso', data);
            
            // Calcula tempo mínimo de exibição
            const elapsed = Date.now() - this.startTime;
            const delay = Math.max(0, this.config.minDisplayTime - elapsed);
            
            // Mostra progresso completo
            this.setProgress(100);
            
            // Atualiza textos finais se fornecidos
            if (data.title && this.overlay.classList.contains('active')) {
                this.overlay.querySelector('.progress-global-title').textContent = data.title;
            }
            
            if (data.details && this.overlay.classList.contains('active')) {
                this.overlay.querySelector('.progress-global-details').textContent = data.details;
            }
            
            // Esconde após delay
            setTimeout(() => {
                this.hide();
            }, delay + this.config.hideDelay);
        }

        /**
         * Progresso rápido para operações instantâneas
         */
        quickProgress(data = {}) {
            const duration = data.duration || 500;
            
            this.start({
                ...data,
                indeterminate: true
            });
            
            setTimeout(() => {
                this.end({
                    title: data.title,
                    details: data.details
                });
            }, duration);
        }

        /**
         * Define progresso específico (0-100)
         */
        setProgress(progress) {
            if (!this.progressBar) return;
            
            const bar = this.progressBar.querySelector('.progress-global-bar');
            const clampedProgress = Math.max(0, Math.min(100, progress));
            
            // Remove modo indeterminado se ativo
            this.progressBar.classList.remove('indeterminate');
            
            // Atualiza largura da barra
            bar.style.width = `${clampedProgress}%`;
        }

        /**
         * Esconde barra de progresso
         */
        hide() {
            if (!this.isActive) return;
            
            console.log('ProgressManager: Escondendo progresso');
            
            this.isActive = false;
            this.currentOperation = null;
            
            // Esconde elementos
            this.progressBar.classList.remove('active', 'indeterminate');
            this.overlay.classList.remove('active');
            
            // Remove classes de tipo
            this.progressBar.className = 'progress-global';
            
            // Reset da barra
            setTimeout(() => {
                if (!this.isActive) {
                    this.setProgress(0);
                }
            }, 300);
        }

        /**
         * Força finalização de qualquer progresso ativo
         */
        forceEnd() {
            if (this.isActive) {
                this.end({
                    title: 'Operação concluída',
                    details: ''
                });
            }
        }

        /**
         * Obtém status atual
         */
        getStatus() {
            return {
                isActive: this.isActive,
                operation: this.currentOperation,
                elapsed: this.startTime ? Date.now() - this.startTime : 0
            };
        }

        /**
         * Configura opções
         */
        configure(options = {}) {
            this.config = { ...this.config, ...options };
        }
    }

    // Registra no namespace global
    KC.ProgressManager = new ProgressManager();

    // Auto-inicializa quando EventBus estiver disponível
    if (EventBus) {
        KC.ProgressManager.initialize();
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            KC.ProgressManager.initialize();
        });
    }

})(window);