/**
 * ProcessingLogsPanel.js - Painel de Logs para Processamento RAG
 * 
 * Sistema de logging visual otimizado para alto volume de mensagens.
 * Usa buffer circular e atualização em batch para evitar impacto de performance.
 * 
 * @aidev-note Implementado sem EventBus para logs individuais para evitar overhead
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const { Logger, EventBus, Events } = KC;

    class ProcessingLogsPanel {
        constructor() {
            this.container = null;
            this.textArea = null;
            this.controlsContainer = null;
            
            // Buffer circular para logs
            this.buffer = [];
            this.maxLines = 1000;
            this.displayLines = 100; // Linhas mostradas na UI
            
            // Controle de estado
            this.isPaused = false;
            this.autoScroll = true;
            this.enableConsoleLog = false; // Flag para debug
            
            // Throttling
            this.updateTimer = null;
            this.updateInterval = 500; // ms entre atualizações
            this.pendingUpdate = false;
            
            // Estatísticas
            this.stats = {
                totalLogs: 0,
                droppedLogs: 0,
                lastUpdate: null
            };
            
            this.initialized = false;
        }

        /**
         * Inicializa o painel
         */
        initialize() {
            if (this.initialized) return;
            
            Logger?.info('ProcessingLogsPanel', 'Inicializando painel de logs');
            
            this.createUI();
            this.registerEvents();
            
            this.initialized = true;
        }

        /**
         * Cria a interface do painel
         */
        createUI() {
            // Container principal
            this.container = document.createElement('div');
            this.container.id = 'processing-logs-panel';
            this.container.className = 'processing-logs-panel';
            this.container.style.display = 'none';
            
            // Header com controles
            const header = document.createElement('div');
            header.className = 'logs-header';
            header.innerHTML = `
                <h4>📋 Logs de Processamento</h4>
                <div class="logs-controls">
                    <button id="logs-clear" class="btn-small" title="Limpar logs">
                        🗑️ Limpar
                    </button>
                    <button id="logs-pause" class="btn-small" title="Pausar/Retomar">
                        ⏸️ Pausar
                    </button>
                    <button id="logs-autoscroll" class="btn-small active" title="Auto-scroll">
                        📜 Auto-scroll
                    </button>
                    <button id="logs-download" class="btn-small" title="Baixar logs">
                        💾 Download
                    </button>
                    <span class="logs-stats">
                        <span id="logs-count">0</span> logs
                    </span>
                </div>
            `;
            
            // Área de texto
            this.textArea = document.createElement('textarea');
            this.textArea.className = 'logs-textarea';
            this.textArea.readOnly = true;
            this.textArea.placeholder = 'Logs de processamento aparecerão aqui...';
            
            // Monta a estrutura
            this.container.appendChild(header);
            this.container.appendChild(this.textArea);
            
            // Adiciona ao DOM (será posicionado pelo OrganizationPanel)
            this.controlsContainer = header.querySelector('.logs-controls');
            this.setupControlHandlers();
        }

        /**
         * Configura handlers dos controles
         */
        setupControlHandlers() {
            // Limpar
            document.getElementById('logs-clear')?.addEventListener('click', () => {
                this.clear();
            });
            
            // Pausar/Retomar
            const pauseBtn = document.getElementById('logs-pause');
            pauseBtn?.addEventListener('click', () => {
                this.isPaused = !this.isPaused;
                pauseBtn.textContent = this.isPaused ? '▶️ Retomar' : '⏸️ Pausar';
                pauseBtn.classList.toggle('paused', this.isPaused);
                
                if (!this.isPaused && this.pendingUpdate) {
                    this.updateDisplay();
                }
            });
            
            // Auto-scroll
            const scrollBtn = document.getElementById('logs-autoscroll');
            scrollBtn?.addEventListener('click', () => {
                this.autoScroll = !this.autoScroll;
                scrollBtn.classList.toggle('active', this.autoScroll);
                
                if (this.autoScroll) {
                    this.scrollToBottom();
                }
            });
            
            // Download
            document.getElementById('logs-download')?.addEventListener('click', () => {
                this.downloadLogs();
            });
            
            // Detectar scroll manual
            this.textArea?.addEventListener('scroll', () => {
                const isAtBottom = Math.abs(
                    this.textArea.scrollHeight - 
                    this.textArea.clientHeight - 
                    this.textArea.scrollTop
                ) < 10;
                
                if (!isAtBottom && this.autoScroll) {
                    this.autoScroll = false;
                    scrollBtn.classList.remove('active');
                }
            });
        }

        /**
         * Registra eventos do sistema
         */
        registerEvents() {
            // Eventos de controle via EventBus
            EventBus.on('PROCESSING_LOGS_SHOW', () => this.show());
            EventBus.on('PROCESSING_LOGS_HIDE', () => this.hide());
            EventBus.on('PROCESSING_LOGS_CLEAR', () => this.clear());
            
            // Pipeline events para auto show/hide
            EventBus.on(Events.PIPELINE_STARTED, () => {
                this.clear();
                this.show();
                this.log('🚀 Pipeline de processamento iniciado');
            });
            
            EventBus.on(Events.PIPELINE_COMPLETED, (data) => {
                this.log(`✅ Pipeline concluído: ${data.processed} arquivos, ${data.chunks} chunks`);
                // Não esconde automaticamente para permitir análise dos logs
            });
        }

        /**
         * Adiciona mensagem ao log
         * @param {string} message - Mensagem a ser logada
         */
        log(message) {
            // Adiciona timestamp se não tiver
            const timestamp = new Date().toLocaleTimeString('pt-BR');
            const fullMessage = message.includes('[') ? message : `[${timestamp}] ${message}`;
            
            // Adiciona ao buffer
            this.buffer.push(fullMessage);
            this.stats.totalLogs++;
            
            // Remove linhas antigas se exceder o limite
            if (this.buffer.length > this.maxLines) {
                const removed = this.buffer.shift();
                this.stats.droppedLogs++;
                
                if (this.enableConsoleLog) {
                    console.warn('ProcessingLogs: Buffer cheio, removendo linha antiga:', removed);
                }
            }
            
            // Console log opcional para debug
            if (this.enableConsoleLog) {
                console.log('[ProcessingLogs]', message);
            }
            
            // Agenda atualização da UI
            this.scheduleUpdate();
        }

        /**
         * Agenda atualização da interface (throttled)
         */
        scheduleUpdate() {
            if (this.isPaused) {
                this.pendingUpdate = true;
                return;
            }
            
            if (this.updateTimer) return;
            
            this.updateTimer = setTimeout(() => {
                this.updateDisplay();
                this.updateTimer = null;
            }, this.updateInterval);
        }

        /**
         * Atualiza o display com o conteúdo do buffer
         */
        updateDisplay() {
            if (!this.textArea) return;
            
            // Pega as últimas N linhas do buffer
            const startIdx = Math.max(0, this.buffer.length - this.displayLines);
            const displayContent = this.buffer.slice(startIdx).join('\n');
            
            // Atualiza textarea
            this.textArea.value = displayContent;
            
            // Atualiza contador
            const countElement = document.getElementById('logs-count');
            if (countElement) {
                countElement.textContent = this.stats.totalLogs.toLocaleString('pt-BR');
            }
            
            // Auto-scroll se habilitado
            if (this.autoScroll) {
                this.scrollToBottom();
            }
            
            this.stats.lastUpdate = new Date();
            this.pendingUpdate = false;
        }

        /**
         * Rola para o final do textarea
         */
        scrollToBottom() {
            if (this.textArea) {
                this.textArea.scrollTop = this.textArea.scrollHeight;
            }
        }

        /**
         * Limpa todos os logs
         */
        clear() {
            this.buffer = [];
            this.stats.totalLogs = 0;
            this.stats.droppedLogs = 0;
            
            if (this.textArea) {
                this.textArea.value = '';
            }
            
            const countElement = document.getElementById('logs-count');
            if (countElement) {
                countElement.textContent = '0';
            }
            
            this.log('🧹 Logs limpos');
        }

        /**
         * Baixa os logs como arquivo
         */
        downloadLogs() {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `processing-logs-${timestamp}.txt`;
            
            // Prepara conteúdo completo
            const header = `Processing Logs - Knowledge Consolidator
Gerado em: ${new Date().toLocaleString('pt-BR')}
Total de logs: ${this.stats.totalLogs}
Logs perdidos (buffer): ${this.stats.droppedLogs}
${'='.repeat(80)}\n\n`;
            
            const content = header + this.buffer.join('\n');
            
            // Cria e baixa o arquivo
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            
            this.log(`💾 Logs baixados: ${filename}`);
        }

        /**
         * Mostra o painel
         */
        show() {
            if (this.container) {
                this.container.style.display = 'block';
                this.updateDisplay();
            }
        }

        /**
         * Esconde o painel
         */
        hide() {
            if (this.container) {
                this.container.style.display = 'none';
            }
        }

        /**
         * Retorna o elemento container para ser adicionado ao DOM
         */
        getElement() {
            if (!this.initialized) {
                this.initialize();
            }
            return this.container;
        }

        /**
         * Define se deve logar também no console
         */
        setConsoleLogging(enabled) {
            this.enableConsoleLog = enabled;
            this.log(`Console logging ${enabled ? 'habilitado' : 'desabilitado'}`);
        }

        /**
         * Obtém estatísticas do sistema de logs
         */
        getStats() {
            return {
                ...this.stats,
                bufferSize: this.buffer.length,
                maxBufferSize: this.maxLines,
                isPaused: this.isPaused,
                autoScroll: this.autoScroll
            };
        }
    }

    // Registra no namespace global
    KC.ProcessingLogsPanel = new ProcessingLogsPanel();
    KC.ProcessingLogs = KC.ProcessingLogsPanel; // Alias mais curto
    
    // Expõe método log diretamente para facilitar uso
    KC.log = (message) => KC.ProcessingLogs.log(message);
    
    Logger?.info('ProcessingLogsPanel', 'Componente registrado com sucesso');

})(window);