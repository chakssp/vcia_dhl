/**
 * SessionCache.js - Cache de Sessão para Dados Temporários
 * 
 * Mantém dados completos apenas durante a sessão atual,
 * aliviando a pressão sobre o localStorage
 * 
 * @module SessionCache
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class SessionCache {
        /**
         * Salva arquivos completos no sessionStorage
         * @param {Array} files - Array de arquivos com dados completos
         */
        static setFiles(files) {
            try {
                // AIDEV-NOTE: session-only-storage; full data available only during current session
                sessionStorage.setItem('kc_session_files', JSON.stringify(files));
                KC.Logger?.debug('SessionCache', `${files.length} arquivos salvos na sessão`);
            } catch (error) {
                KC.Logger?.warning('SessionCache - Erro ao salvar na sessão:', error);
                // Se falhar, não é crítico - dados mínimos estão no localStorage
            }
        }

        /**
         * Recupera arquivos completos do sessionStorage
         * @returns {Array|null} Array de arquivos ou null se não existir
         */
        static getFiles() {
            try {
                const cached = sessionStorage.getItem('kc_session_files');
                return cached ? JSON.parse(cached) : null;
            } catch (error) {
                KC.Logger?.warning('SessionCache - Erro ao recuperar da sessão:', error);
                return null;
            }
        }

        /**
         * Recupera arquivo específico por ID
         * @param {string} fileId - ID do arquivo
         * @returns {Object|null} Arquivo completo ou null
         */
        static getFile(fileId) {
            const files = this.getFiles();
            if (!files) return null;
            
            return files.find(f => f.id === fileId) || null;
        }

        /**
         * Atualiza arquivo específico na sessão
         * @param {string} fileId - ID do arquivo
         * @param {Object} updates - Atualizações a aplicar
         */
        static updateFile(fileId, updates) {
            const files = this.getFiles();
            if (!files) return;

            const index = files.findIndex(f => f.id === fileId);
            if (index !== -1) {
                files[index] = { ...files[index], ...updates };
                this.setFiles(files);
            }
        }

        /**
         * Salva dados de análise temporários
         * @param {string} key - Chave para os dados
         * @param {*} data - Dados a salvar
         */
        static setAnalysisData(key, data) {
            try {
                sessionStorage.setItem(`kc_analysis_${key}`, JSON.stringify(data));
            } catch (error) {
                KC.Logger?.warning('SessionCache - Erro ao salvar análise:', error);
            }
        }

        /**
         * Recupera dados de análise temporários
         * @param {string} key - Chave dos dados
         * @returns {*} Dados salvos ou null
         */
        static getAnalysisData(key) {
            try {
                const data = sessionStorage.getItem(`kc_analysis_${key}`);
                return data ? JSON.parse(data) : null;
            } catch (error) {
                KC.Logger?.warning('SessionCache - Erro ao recuperar análise:', error);
                return null;
            }
        }

        /**
         * Armazena fingerprints de arquivos processados
         * @param {Set|Array} fingerprints - Conjunto de fingerprints
         */
        static setProcessedFingerprints(fingerprints) {
            try {
                const array = fingerprints instanceof Set ? Array.from(fingerprints) : fingerprints;
                sessionStorage.setItem('kc_processed_fingerprints', JSON.stringify(array));
            } catch (error) {
                KC.Logger?.warning('SessionCache - Erro ao salvar fingerprints:', error);
            }
        }

        /**
         * Recupera fingerprints de arquivos processados
         * @returns {Set} Conjunto de fingerprints
         */
        static getProcessedFingerprints() {
            try {
                const data = sessionStorage.getItem('kc_processed_fingerprints');
                const array = data ? JSON.parse(data) : [];
                return new Set(array);
            } catch (error) {
                KC.Logger?.warning('SessionCache - Erro ao recuperar fingerprints:', error);
                return new Set();
            }
        }

        /**
         * Verifica se arquivo já foi processado
         * @param {string} fingerprint - Fingerprint do arquivo
         * @returns {boolean} True se já foi processado
         */
        static isProcessed(fingerprint) {
            const processed = this.getProcessedFingerprints();
            return processed.has(fingerprint);
        }

        /**
         * Marca arquivo como processado
         * @param {string} fingerprint - Fingerprint do arquivo
         */
        static markAsProcessed(fingerprint) {
            const processed = this.getProcessedFingerprints();
            processed.add(fingerprint);
            this.setProcessedFingerprints(processed);
        }

        /**
         * Limpa todos os dados da sessão
         */
        static clear() {
            const keys = [];
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key && key.startsWith('kc_')) {
                    keys.push(key);
                }
            }
            
            keys.forEach(key => sessionStorage.removeItem(key));
            KC.Logger?.info('SessionCache', 'Cache de sessão limpo');
        }

        /**
         * Obtém estatísticas de uso
         * @returns {Object} Estatísticas do cache
         */
        static getStats() {
            let totalSize = 0;
            let itemCount = 0;

            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key && key.startsWith('kc_')) {
                    itemCount++;
                    const value = sessionStorage.getItem(key);
                    totalSize += value ? value.length : 0;
                }
            }

            return {
                itemCount,
                totalSizeKB: Math.round(totalSize / 1024),
                files: this.getFiles()?.length || 0,
                processedFingerprints: this.getProcessedFingerprints().size
            };
        }
    }

    // Registra no namespace global
    KC.SessionCache = SessionCache;

    // AIDEV-TODO: integrate-with-discovery; hook into discovery process to cache full file data
    // AIDEV-TODO: integrate-with-export; use cached data for export operations

})(window);