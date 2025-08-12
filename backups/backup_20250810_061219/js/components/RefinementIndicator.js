/**
 * RefinementIndicator.js - Indicador Visual de Refinamento
 * 
 * Componente UI que mostra o status do ciclo de refinamento.
 * Exibe progresso, confiança e convergência de forma visual.
 * 
 * AIDEV-NOTE: refinement-ui; indicador visual do processo
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const EventBus = KC.EventBus;
    const Events = KC.Events;
    const Logger = KC.Logger;

    class RefinementIndicator {
        constructor() {
            this.container = null;
            this.isInitialized = false;
            this.activeIndicators = new Map(); // fileId -> indicator element
            
            // Configurações visuais
            this.config = {
                position: 'bottom-right',
                maxVisible: 3,
                animationDuration: 300,
                autoHide: true,
                autoHideDelay: 5000,
                showDetails: true
            };

            // Templates
            this.templates = {
                container: 'refinement-indicator-container',
                indicator: 'refinement-indicator',
                progress: 'refinement-progress',
                details: 'refinement-details'
            };
        }

        /**
         * Inicializa o componente
         */
        async initialize() {
            if (this.isInitialized) return;

            try {
                // Cria container principal
                this.createContainer();
                
                // Adiciona estilos
                this.injectStyles();
                
                // Configura event listeners
                this.bindEvents();
                
                this.isInitialized = true;
                Logger?.success('RefinementIndicator', 'Componente inicializado');
                
            } catch (error) {
                Logger?.error('RefinementIndicator', 'Erro ao inicializar', error);
                throw error;
            }
        }

        /**
         * Cria container principal
         */
        createContainer() {
            // Remove container existente se houver
            const existing = document.getElementById(this.templates.container);
            if (existing) {
                existing.remove();
            }

            // Cria novo container
            this.container = document.createElement('div');
            this.container.id = this.templates.container;
            this.container.className = `refinement-indicators ${this.config.position}`;
            
            // Adiciona ao body
            document.body.appendChild(this.container);
        }

        /**
         * Injeta estilos CSS
         */
        injectStyles() {
            const styleId = 'refinement-indicator-styles';
            
            // Remove estilos existentes
            const existing = document.getElementById(styleId);
            if (existing) {
                existing.remove();
            }

            const styles = `
                /* Container principal */
                .refinement-indicators {
                    position: fixed;
                    z-index: 10000;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    max-width: 350px;
                    pointer-events: none;
                }
                
                .refinement-indicators.bottom-right {
                    bottom: 20px;
                    right: 20px;
                }
                
                .refinement-indicators.bottom-left {
                    bottom: 20px;
                    left: 20px;
                }
                
                .refinement-indicators.top-right {
                    top: 20px;
                    right: 20px;
                }
                
                .refinement-indicators.top-left {
                    top: 20px;
                    left: 20px;
                }
                
                /* Indicador individual */
                .refinement-indicator {
                    background: var(--bg-secondary, #fff);
                    border: 1px solid var(--border-color, #e0e0e0);
                    border-radius: 8px;
                    padding: 12px 16px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    pointer-events: auto;
                    transition: all 0.3s ease;
                    opacity: 0;
                    transform: translateX(20px);
                    animation: slideIn 0.3s forwards;
                }
                
                @keyframes slideIn {
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                .refinement-indicator.hiding {
                    animation: slideOut 0.3s forwards;
                }
                
                @keyframes slideOut {
                    to {
                        opacity: 0;
                        transform: translateX(20px);
                    }
                }
                
                /* Header do indicador */
                .refinement-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }
                
                .refinement-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-primary, #333);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .refinement-status {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--status-color, #ccc);
                    position: relative;
                }
                
                .refinement-status.active {
                    background: #4CAF50;
                    animation: pulse 1.5s infinite;
                }
                
                @keyframes pulse {
                    0% {
                        box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4);
                    }
                    70% {
                        box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
                    }
                    100% {
                        box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
                    }
                }
                
                .refinement-status.completed {
                    background: #2196F3;
                }
                
                .refinement-status.converged {
                    background: #9C27B0;
                }
                
                .refinement-status.error {
                    background: #F44336;
                }
                
                /* Ações */
                .refinement-actions {
                    display: flex;
                    gap: 8px;
                }
                
                .refinement-action {
                    background: none;
                    border: none;
                    padding: 4px;
                    cursor: pointer;
                    color: var(--text-secondary, #666);
                    font-size: 12px;
                    transition: color 0.2s;
                }
                
                .refinement-action:hover {
                    color: var(--text-primary, #333);
                }
                
                /* Barra de progresso */
                .refinement-progress {
                    height: 4px;
                    background: var(--bg-tertiary, #f5f5f5);
                    border-radius: 2px;
                    overflow: hidden;
                    margin: 8px 0;
                }
                
                .refinement-progress-bar {
                    height: 100%;
                    background: linear-gradient(90deg, #4CAF50, #2196F3);
                    border-radius: 2px;
                    transition: width 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }
                
                .refinement-progress-bar::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(
                        90deg,
                        transparent,
                        rgba(255, 255, 255, 0.3),
                        transparent
                    );
                    animation: shimmer 1.5s infinite;
                }
                
                @keyframes shimmer {
                    0% {
                        transform: translateX(-100%);
                    }
                    100% {
                        transform: translateX(100%);
                    }
                }
                
                /* Detalhes */
                .refinement-details {
                    font-size: 12px;
                    color: var(--text-secondary, #666);
                    margin-top: 8px;
                }
                
                .refinement-metric {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 2px 0;
                }
                
                .refinement-metric-label {
                    opacity: 0.8;
                }
                
                .refinement-metric-value {
                    font-weight: 500;
                    color: var(--text-primary, #333);
                }
                
                .refinement-metric-value.high {
                    color: #4CAF50;
                }
                
                .refinement-metric-value.medium {
                    color: #FF9800;
                }
                
                .refinement-metric-value.low {
                    color: #F44336;
                }
                
                /* Modo compacto */
                .refinement-indicator.compact .refinement-details {
                    display: none;
                }
                
                .refinement-indicator.compact {
                    padding: 8px 12px;
                }
                
                /* Hover effects */
                .refinement-indicator:hover {
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    transform: translateY(-2px);
                }
                
                /* Dark mode support */
                @media (prefers-color-scheme: dark) {
                    .refinement-indicator {
                        background: #2a2a2a;
                        border-color: #444;
                        color: #fff;
                    }
                    
                    .refinement-progress {
                        background: #333;
                    }
                }
            `;

            const styleElement = document.createElement('style');
            styleElement.id = styleId;
            styleElement.textContent = styles;
            document.head.appendChild(styleElement);
        }

        /**
         * Configura event listeners
         */
        bindEvents() {
            // Escuta eventos de refinamento
            EventBus.on('REFINEMENT_STARTED', (data) => {
                this.showIndicator(data.fileId, data.process);
            });

            EventBus.on('REFINEMENT_PROGRESS', (data) => {
                this.updateIndicator(data.fileId, data);
            });

            EventBus.on('REFINEMENT_COMPLETED', (data) => {
                this.completeIndicator(data.fileId, data.process);
            });

            EventBus.on('REFINEMENT_ERROR', (data) => {
                this.errorIndicator(data.fileId, data.error);
            });

            EventBus.on('REFINEMENT_STOPPED', (data) => {
                this.removeIndicator(data.fileId);
            });

            // Escuta atualizações de análise
            EventBus.on('ANALYSIS_HISTORY_UPDATED', (data) => {
                this.updateFromHistory(data.fileId, data);
            });
        }

        /**
         * Mostra indicador para um arquivo
         */
        showIndicator(fileId, process) {
            // Remove indicador existente se houver
            this.removeIndicator(fileId);

            // Cria novo indicador
            const indicator = this.createIndicatorElement(fileId, process);
            
            // Adiciona ao container
            this.container.appendChild(indicator);
            this.activeIndicators.set(fileId, indicator);

            // Limita quantidade visível
            this.enforceMaxVisible();

            // Auto-hide se configurado
            if (this.config.autoHide && process.status !== 'active') {
                this.scheduleAutoHide(fileId);
            }

            Logger?.debug('RefinementIndicator', 'Indicador mostrado', {
                fileId,
                fileName: process.fileName
            });
        }

        /**
         * Cria elemento do indicador
         */
        createIndicatorElement(fileId, process) {
            const indicator = document.createElement('div');
            indicator.className = 'refinement-indicator';
            indicator.dataset.fileId = fileId;
            
            // Header
            const header = document.createElement('div');
            header.className = 'refinement-header';
            
            const title = document.createElement('div');
            title.className = 'refinement-title';
            
            const status = document.createElement('span');
            status.className = `refinement-status ${process.status || 'active'}`;
            
            const fileName = document.createElement('span');
            fileName.textContent = this.truncateFileName(process.fileName || 'Arquivo');
            
            title.appendChild(status);
            title.appendChild(fileName);
            
            // Ações
            const actions = document.createElement('div');
            actions.className = 'refinement-actions';
            
            const toggleButton = document.createElement('button');
            toggleButton.className = 'refinement-action';
            toggleButton.innerHTML = '▼';
            toggleButton.title = 'Expandir/Recolher';
            toggleButton.onclick = () => this.toggleDetails(fileId);
            
            const closeButton = document.createElement('button');
            closeButton.className = 'refinement-action';
            closeButton.innerHTML = '✕';
            closeButton.title = 'Fechar';
            closeButton.onclick = () => this.removeIndicator(fileId);
            
            actions.appendChild(toggleButton);
            actions.appendChild(closeButton);
            
            header.appendChild(title);
            header.appendChild(actions);
            
            // Progress bar
            const progressContainer = document.createElement('div');
            progressContainer.className = 'refinement-progress';
            
            const progressBar = document.createElement('div');
            progressBar.className = 'refinement-progress-bar';
            progressBar.style.width = '0%';
            
            progressContainer.appendChild(progressBar);
            
            // Detalhes
            const details = this.createDetailsElement(process);
            
            // Monta indicador
            indicator.appendChild(header);
            indicator.appendChild(progressContainer);
            if (this.config.showDetails) {
                indicator.appendChild(details);
            }
            
            return indicator;
        }

        /**
         * Cria elemento de detalhes
         */
        createDetailsElement(process) {
            const details = document.createElement('div');
            details.className = 'refinement-details';
            
            // Iteração
            const iteration = this.createMetric(
                'Iteração',
                `${process.iteration || 0}/${process.maxIterations || 5}`,
                this.getIterationClass(process.iteration)
            );
            
            // Confiança
            const confidence = this.createMetric(
                'Confiança',
                `${Math.round((process.metrics?.currentConfidence || 0) * 100)}%`,
                this.getConfidenceClass(process.metrics?.currentConfidence)
            );
            
            // Ganho
            const gain = this.createMetric(
                'Ganho',
                `+${Math.round((process.metrics?.confidenceGain || 0) * 100)}%`,
                this.getGainClass(process.metrics?.confidenceGain)
            );
            
            details.appendChild(iteration);
            details.appendChild(confidence);
            details.appendChild(gain);
            
            return details;
        }

        /**
         * Cria métrica individual
         */
        createMetric(label, value, valueClass = '') {
            const metric = document.createElement('div');
            metric.className = 'refinement-metric';
            
            const labelEl = document.createElement('span');
            labelEl.className = 'refinement-metric-label';
            labelEl.textContent = label + ':';
            
            const valueEl = document.createElement('span');
            valueEl.className = `refinement-metric-value ${valueClass}`;
            valueEl.textContent = value;
            
            metric.appendChild(labelEl);
            metric.appendChild(valueEl);
            
            return metric;
        }

        /**
         * Atualiza indicador existente
         */
        updateIndicator(fileId, data) {
            const indicator = this.activeIndicators.get(fileId);
            if (!indicator) return;

            // Atualiza status
            const status = indicator.querySelector('.refinement-status');
            if (status && data.status) {
                status.className = `refinement-status ${data.status}`;
            }

            // Atualiza progresso
            const progressBar = indicator.querySelector('.refinement-progress-bar');
            if (progressBar && data.progress !== undefined) {
                progressBar.style.width = `${Math.round(data.progress * 100)}%`;
            }

            // Atualiza métricas
            if (data.process) {
                this.updateMetrics(indicator, data.process);
            }

            // AIDEV-NOTE: indicator-update; atualização visual do progresso
            Logger?.debug('RefinementIndicator', 'Indicador atualizado', {
                fileId,
                progress: data.progress
            });
        }

        /**
         * Atualiza métricas no indicador
         */
        updateMetrics(indicator, process) {
            const details = indicator.querySelector('.refinement-details');
            if (!details) return;

            // Limpa e recria métricas
            details.innerHTML = '';
            
            const newDetails = this.createDetailsElement(process);
            details.innerHTML = newDetails.innerHTML;
        }

        /**
         * Marca indicador como completo
         */
        completeIndicator(fileId, process) {
            const indicator = this.activeIndicators.get(fileId);
            if (!indicator) return;

            // Atualiza status
            const status = indicator.querySelector('.refinement-status');
            if (status) {
                const isConverged = process.convergence?.isConverged;
                status.className = `refinement-status ${isConverged ? 'converged' : 'completed'}`;
            }

            // Progresso 100%
            const progressBar = indicator.querySelector('.refinement-progress-bar');
            if (progressBar) {
                progressBar.style.width = '100%';
            }

            // Atualiza métricas finais
            this.updateMetrics(indicator, process);

            // Auto-hide após delay
            if (this.config.autoHide) {
                this.scheduleAutoHide(fileId, this.config.autoHideDelay * 2);
            }

            Logger?.info('RefinementIndicator', 'Refinamento completo', {
                fileId,
                converged: process.convergence?.isConverged
            });
        }

        /**
         * Marca indicador com erro
         */
        errorIndicator(fileId, error) {
            const indicator = this.activeIndicators.get(fileId);
            if (!indicator) return;

            // Atualiza status
            const status = indicator.querySelector('.refinement-status');
            if (status) {
                status.className = 'refinement-status error';
            }

            // Adiciona mensagem de erro
            const details = indicator.querySelector('.refinement-details');
            if (details) {
                const errorMsg = document.createElement('div');
                errorMsg.style.color = '#F44336';
                errorMsg.style.marginTop = '8px';
                errorMsg.textContent = `Erro: ${error.message || error}`;
                details.appendChild(errorMsg);
            }

            // Auto-hide após delay maior
            if (this.config.autoHide) {
                this.scheduleAutoHide(fileId, this.config.autoHideDelay * 3);
            }
        }

        /**
         * Remove indicador
         */
        removeIndicator(fileId) {
            const indicator = this.activeIndicators.get(fileId);
            if (!indicator) return;

            // Animação de saída
            indicator.classList.add('hiding');
            
            setTimeout(() => {
                indicator.remove();
                this.activeIndicators.delete(fileId);
            }, this.config.animationDuration);
        }

        /**
         * Atualiza a partir do histórico
         */
        updateFromHistory(fileId, data) {
            const indicator = this.activeIndicators.get(fileId);
            if (!indicator) return;

            // Calcula progresso baseado no histórico
            const totalForFile = data.totalForFile || 1;
            const progress = Math.min(totalForFile / 5, 1); // Assume 5 iterações max

            this.updateIndicator(fileId, {
                progress,
                totalAnalyses: totalForFile
            });
        }

        /**
         * Alterna detalhes
         */
        toggleDetails(fileId) {
            const indicator = this.activeIndicators.get(fileId);
            if (!indicator) return;

            indicator.classList.toggle('compact');
            
            const toggleButton = indicator.querySelector('.refinement-action');
            if (toggleButton) {
                toggleButton.innerHTML = indicator.classList.contains('compact') ? '▶' : '▼';
            }
        }

        /**
         * Agenda auto-hide
         */
        scheduleAutoHide(fileId, delay = null) {
            const indicator = this.activeIndicators.get(fileId);
            if (!indicator) return;

            // Cancela timer existente
            if (indicator.hideTimer) {
                clearTimeout(indicator.hideTimer);
            }

            // Agenda novo timer
            indicator.hideTimer = setTimeout(() => {
                this.removeIndicator(fileId);
            }, delay || this.config.autoHideDelay);
        }

        /**
         * Garante limite máximo de indicadores visíveis
         */
        enforceMaxVisible() {
            const indicators = Array.from(this.activeIndicators.entries());
            
            if (indicators.length > this.config.maxVisible) {
                // Remove os mais antigos
                const toRemove = indicators
                    .slice(0, indicators.length - this.config.maxVisible)
                    .map(([fileId]) => fileId);
                
                toRemove.forEach(fileId => this.removeIndicator(fileId));
            }
        }

        /**
         * Trunca nome do arquivo
         */
        truncateFileName(fileName, maxLength = 30) {
            if (fileName.length <= maxLength) return fileName;
            
            const extension = fileName.split('.').pop();
            const nameWithoutExt = fileName.slice(0, -(extension.length + 1));
            const truncatedName = nameWithoutExt.slice(0, maxLength - extension.length - 4);
            
            return `${truncatedName}...${extension}`;
        }

        /**
         * Classes CSS baseadas em valores
         */
        getIterationClass(iteration) {
            if (iteration >= 4) return 'high';
            if (iteration >= 2) return 'medium';
            return 'low';
        }

        getConfidenceClass(confidence) {
            if (confidence >= 0.8) return 'high';
            if (confidence >= 0.6) return 'medium';
            return 'low';
        }

        getGainClass(gain) {
            if (gain >= 0.15) return 'high';
            if (gain >= 0.05) return 'medium';
            return 'low';
        }

        /**
         * Atualiza posição do container
         */
        setPosition(position) {
            if (!this.container) return;
            
            // Remove classes de posição antigas
            ['bottom-right', 'bottom-left', 'top-right', 'top-left'].forEach(pos => {
                this.container.classList.remove(pos);
            });
            
            // Adiciona nova posição
            this.config.position = position;
            this.container.classList.add(position);
        }

        /**
         * Limpa todos os indicadores
         */
        clearAll() {
            this.activeIndicators.forEach((indicator, fileId) => {
                this.removeIndicator(fileId);
            });
        }

        /**
         * Destrói o componente
         */
        destroy() {
            this.clearAll();
            
            if (this.container) {
                this.container.remove();
                this.container = null;
            }
            
            // Remove estilos
            const styles = document.getElementById('refinement-indicator-styles');
            if (styles) {
                styles.remove();
            }
            
            this.isInitialized = false;
            
            Logger?.info('RefinementIndicator', 'Componente destruído');
        }

        /**
         * Obtém status do componente
         */
        getStatus() {
            return {
                isInitialized: this.isInitialized,
                activeIndicators: this.activeIndicators.size,
                config: { ...this.config }
            };
        }

        /**
         * Atualiza configuração
         */
        updateConfig(newConfig) {
            this.config = { ...this.config, ...newConfig };
            
            // Aplica mudanças imediatas
            if (newConfig.position) {
                this.setPosition(newConfig.position);
            }
            
            Logger?.info('RefinementIndicator', 'Configuração atualizada', this.config);
        }
    }

    // Registra no namespace
    KC.RefinementIndicator = new RefinementIndicator();

})(window);