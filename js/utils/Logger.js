/**
 * Logger.js - Sistema de Logging Detalhado
 * 
 * Rastreia todo o fluxo de descoberta para debug
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class Logger {
        constructor() {
            this.logs = [];
            this.enabled = true;
            this.colors = {
                info: '#3b82f6',
                success: '#10b981',
                warning: '#f59e0b',
                error: '#ef4444',
                debug: '#8b5cf6',
                flow: '#06b6d4'
            };
        }

        /**
         * Log de fluxo - rastreia caminho de execução
         */
        flow(component, method, data = {}) {
            this._log('flow', `[FLOW] ${component}.${method}`, data);
        }

        /**
         * Log de informação
         */
        info(message, data = {}) {
            this._log('info', `[INFO] ${message}`, data);
        }

        /**
         * Log de sucesso
         */
        success(message, data = {}) {
            this._log('success', `[SUCCESS] ${message}`, data);
        }

        /**
         * Log de aviso
         */
        warning(message, data = {}) {
            this._log('warning', `[WARNING] ${message}`, data);
        }

        /**
         * Log de erro
         */
        error(message, data = {}) {
            this._log('error', `[ERROR] ${message}`, data);
        }

        /**
         * Log de debug
         */
        debug(message, data = {}) {
            this._log('debug', `[DEBUG] ${message}`, data);
        }

        /**
         * Log interno
         */
        _log(type, message, data) {
            if (!this.enabled) return;

            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                type,
                message,
                data
            };

            this.logs.push(logEntry);

            // Console colorido
            const color = this.colors[type] || '#666';
            console.log(
                `%c${message}`,
                `color: ${color}; font-weight: bold;`,
                data
            );

            // Emite evento para possível visualização na UI
            if (KC.EventBus) {
                KC.EventBus.emit('logger:entry', logEntry);
            }
        }

        /**
         * Limpa logs
         */
        clear() {
            this.logs = [];
            console.clear();
        }

        /**
         * Exporta logs
         */
        export() {
            return JSON.stringify(this.logs, null, 2);
        }

        /**
         * Filtra logs por tipo
         */
        filter(type) {
            return this.logs.filter(log => log.type === type);
        }

        /**
         * Mostra resumo do fluxo
         */
        showFlowSummary() {
            console.group('%c📊 FLOW SUMMARY', 'color: #06b6d4; font-size: 16px; font-weight: bold;');
            
            const flowLogs = this.filter('flow');
            flowLogs.forEach((log, index) => {
                const time = new Date(log.timestamp).toLocaleTimeString();
                console.log(`${index + 1}. [${time}] ${log.message}`, log.data);
            });
            
            console.groupEnd();
        }
    }

    // Cria instância singleton
    KC.Logger = new Logger();

    // Atalhos globais para debug
    window.kclog = KC.Logger;
    window.kcflow = () => KC.Logger.showFlowSummary();

})(window);