/**
 * HandleManager.js - Gerenciador de Handles do File System Access API
 * 
 * Centraliza o gerenciamento de handles de diretórios para descoberta real
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class HandleManager {
        constructor() {
            this.handles = new Map(); // id → {handle, metadata}
            this.pathIndex = new Map(); // path → id
            this.nextId = 1;
        }

        /**
         * Registra um novo handle de diretório
         * @param {FileSystemDirectoryHandle} handle 
         * @param {Object} metadata - {path, name, source}
         * @returns {string} id único do handle
         */
        register(handle, metadata) {
            const id = `handle_${this.nextId++}`;
            const fullMetadata = {
                ...metadata,
                registeredAt: new Date().toISOString(),
                id
            };

            // Salva handle e metadados
            this.handles.set(id, {
                handle,
                metadata: fullMetadata
            });

            // Indexa por path para busca rápida
            if (metadata.path) {
                this.pathIndex.set(metadata.path, id);
            }

            KC.Logger.success(`Handle registrado: ${id}`, { 
                path: metadata.path, 
                name: metadata.name,
                source: metadata.source
            });

            // Emite evento para atualização da UI
            if (KC.EventBus) {
                KC.EventBus.emit('handles:registered', {
                    id,
                    metadata: fullMetadata
                });
            }

            return id;
        }

        /**
         * Busca handle por path
         * @param {string} path 
         * @returns {Object|null} {handle, metadata}
         */
        getByPath(path) {
            const id = this.pathIndex.get(path);
            if (!id) {
                KC.Logger.warning(`Handle não encontrado para path: ${path}`);
                return null;
            }

            const result = this.handles.get(id);
            KC.Logger.debug(`Handle recuperado por path: ${path}`, { id, metadata: result?.metadata });
            return result;
        }

        /**
         * Busca handle por ID
         * @param {string} id 
         * @returns {Object|null} {handle, metadata}
         */
        getById(id) {
            const result = this.handles.get(id);
            if (!result) {
                KC.Logger.warning(`Handle não encontrado para ID: ${id}`);
            }
            return result;
        }

        /**
         * Lista todos os handles registrados
         * @returns {Array} Lista de metadados
         */
        list() {
            const list = Array.from(this.handles.values()).map(item => item.metadata);
            KC.Logger.debug(`${list.length} handles registrados`, list);
            return list;
        }

        /**
         * Remove handle por ID
         * @param {string} id 
         * @returns {boolean} true se removido
         */
        remove(id) {
            const item = this.handles.get(id);
            if (!item) return false;

            // Remove do índice de path
            if (item.metadata.path) {
                this.pathIndex.delete(item.metadata.path);
            }

            // Remove handle
            this.handles.delete(id);

            KC.Logger.info(`Handle removido: ${id}`, { path: item.metadata.path });

            // Emite evento
            if (KC.EventBus) {
                KC.EventBus.emit('handles:removed', { id, metadata: item.metadata });
            }

            return true;
        }

        /**
         * Verifica se um path tem handle associado
         * @param {string} path 
         * @returns {boolean}
         */
        hasPath(path) {
            return this.pathIndex.has(path);
        }

        /**
         * Obtém estatísticas dos handles
         * @returns {Object}
         */
        getStats() {
            const total = this.handles.size;
            const bySource = {};
            
            Array.from(this.handles.values()).forEach(item => {
                const source = item.metadata.source || 'unknown';
                bySource[source] = (bySource[source] || 0) + 1;
            });

            return { total, bySource };
        }

        /**
         * Limpa todos os handles
         */
        clear() {
            const count = this.handles.size;
            this.handles.clear();
            this.pathIndex.clear();
            this.nextId = 1;

            KC.Logger.info(`${count} handles removidos`);

            if (KC.EventBus) {
                KC.EventBus.emit('handles:cleared');
            }
        }

        /**
         * Exporta metadados para debug (sem handles - não serializáveis)
         * @returns {Object}
         */
        exportMetadata() {
            const metadata = {};
            this.handles.forEach((item, id) => {
                metadata[id] = item.metadata;
            });
            return metadata;
        }
    }

    // Registra no namespace e cria instância singleton
    KC.HandleManager = HandleManager;
    KC.handleManager = new HandleManager();

    // Atalho global para debug
    window.kchandles = KC.handleManager;

})(window);