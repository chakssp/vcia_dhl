/**
 * CacheManager.js - Gerenciador Unificado de Cache
 * 
 * Centraliza toda lógica de cache do sistema Knowledge Consolidator
 * Implementa múltiplas estratégias (LRU, LFU, TTL) com limites configuráveis
 * 
 * @pattern Singleton, Strategy
 * @author Refactoring Team
 * @date 10/08/2025
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const Logger = KC.Logger;

    /**
     * Estratégias de cache disponíveis
     */
    const CacheStrategies = {
        LRU: 'lru',    // Least Recently Used
        LFU: 'lfu',    // Least Frequently Used
        TTL: 'ttl',    // Time To Live
        FIFO: 'fifo'   // First In First Out
    };

    /**
     * Classe base para entradas de cache
     */
    class CacheEntry {
        constructor(key, value, ttl = null) {
            this.key = key;
            this.value = value;
            this.createdAt = Date.now();
            this.lastAccessedAt = Date.now();
            this.accessCount = 0;
            this.ttl = ttl;
            this.size = this.calculateSize(value);
        }

        /**
         * Calcula tamanho aproximado do valor
         */
        calculateSize(value) {
            try {
                return JSON.stringify(value).length;
            } catch {
                return 1000; // Tamanho padrão para objetos não serializáveis
            }
        }

        /**
         * Verifica se a entrada expirou
         */
        isExpired() {
            if (!this.ttl) return false;
            return Date.now() - this.createdAt > this.ttl;
        }

        /**
         * Atualiza estatísticas de acesso
         */
        touch() {
            this.lastAccessedAt = Date.now();
            this.accessCount++;
        }

        /**
         * Retorna idade da entrada em ms
         */
        getAge() {
            return Date.now() - this.createdAt;
        }
    }

    /**
     * Gerenciador unificado de cache
     */
    class CacheManager {
        constructor() {
            // Singleton pattern
            if (CacheManager.instance) {
                return CacheManager.instance;
            }

            // Configuração padrão
            this.config = {
                maxSize: 100 * 1024 * 1024,  // 100MB em bytes
                maxEntries: 10000,            // Máximo de entradas
                defaultTTL: 5 * 60 * 1000,    // 5 minutos
                cleanupInterval: 60 * 1000,   // Limpeza a cada minuto
                strategy: CacheStrategies.LRU, // Estratégia padrão
                enableStats: true,             // Habilitar estatísticas
                persistence: false,            // Persistir em localStorage
                namespace: 'KC_Cache_'         // Namespace para localStorage
            };

            // Stores de cache por namespace
            this.stores = new Map();

            // Estatísticas globais
            this.stats = {
                hits: 0,
                misses: 0,
                evictions: 0,
                expirations: 0,
                totalSize: 0,
                totalEntries: 0
            };

            // Inicializar
            this.initialize();

            CacheManager.instance = this;
        }

        /**
         * Inicializa o gerenciador
         */
        initialize() {
            // Criar store padrão
            this.createStore('default');

            // Iniciar limpeza automática
            this.startCleanup();

            // Carregar dados persistidos se habilitado
            if (this.config.persistence) {
                this.loadPersistedData();
            }

            Logger?.info('CacheManager', 'Inicializado', {
                strategy: this.config.strategy,
                maxSize: this.formatSize(this.config.maxSize),
                maxEntries: this.config.maxEntries
            });
        }

        /**
         * Cria um novo store de cache
         */
        createStore(name, config = {}) {
            if (this.stores.has(name)) {
                Logger?.warn('CacheManager', `Store ${name} já existe`);
                return this.stores.get(name);
            }

            const store = {
                name: name,
                entries: new Map(),
                config: { ...this.config, ...config },
                stats: {
                    hits: 0,
                    misses: 0,
                    evictions: 0,
                    size: 0
                }
            };

            this.stores.set(name, store);
            Logger?.info('CacheManager', `Store criado: ${name}`);
            return store;
        }

        /**
         * Obtém valor do cache
         */
        get(key, storeName = 'default') {
            const store = this.getStore(storeName);
            if (!store) return null;

            const entry = store.entries.get(key);
            
            if (!entry) {
                this.recordMiss(store);
                return null;
            }

            // Verificar expiração
            if (entry.isExpired()) {
                this.remove(key, storeName);
                this.stats.expirations++;
                this.recordMiss(store);
                return null;
            }

            // Atualizar acesso
            entry.touch();
            this.recordHit(store);

            return entry.value;
        }

        /**
         * Define valor no cache
         */
        set(key, value, options = {}) {
            const storeName = options.store || 'default';
            const store = this.getStore(storeName);
            if (!store) return false;

            const ttl = options.ttl || store.config.defaultTTL;
            const entry = new CacheEntry(key, value, ttl);

            // Verificar limites antes de adicionar
            if (this.shouldEvict(store, entry)) {
                this.evict(store, entry.size);
            }

            // Adicionar/atualizar entrada
            const oldEntry = store.entries.get(key);
            if (oldEntry) {
                store.stats.size -= oldEntry.size;
            }

            store.entries.set(key, entry);
            store.stats.size += entry.size;
            this.stats.totalSize += entry.size;
            this.stats.totalEntries++;

            // Persistir se habilitado
            if (store.config.persistence) {
                this.persistEntry(storeName, key, entry);
            }

            return true;
        }

        /**
         * Remove valor do cache
         */
        remove(key, storeName = 'default') {
            const store = this.getStore(storeName);
            if (!store) return false;

            const entry = store.entries.get(key);
            if (!entry) return false;

            store.entries.delete(key);
            store.stats.size -= entry.size;
            this.stats.totalSize -= entry.size;
            this.stats.totalEntries--;

            // Remover da persistência
            if (store.config.persistence) {
                this.removePersistedEntry(storeName, key);
            }

            return true;
        }

        /**
         * Limpa todo o cache ou store específico
         */
        clear(storeName = null) {
            if (storeName) {
                const store = this.getStore(storeName);
                if (store) {
                    this.stats.totalSize -= store.stats.size;
                    this.stats.totalEntries -= store.entries.size;
                    store.entries.clear();
                    store.stats.size = 0;
                    
                    if (store.config.persistence) {
                        this.clearPersistedStore(storeName);
                    }
                }
            } else {
                // Limpar todos os stores
                this.stores.forEach(store => {
                    store.entries.clear();
                    store.stats.size = 0;
                });
                this.stats.totalSize = 0;
                this.stats.totalEntries = 0;
                
                if (this.config.persistence) {
                    this.clearAllPersisted();
                }
            }

            Logger?.info('CacheManager', `Cache limpo: ${storeName || 'todos'}`);
        }

        /**
         * Verifica se deve fazer eviction
         */
        shouldEvict(store, newEntry) {
            const wouldExceedSize = store.stats.size + newEntry.size > store.config.maxSize;
            const wouldExceedEntries = store.entries.size >= store.config.maxEntries;
            return wouldExceedSize || wouldExceedEntries;
        }

        /**
         * Executa eviction baseado na estratégia
         */
        evict(store, requiredSize = 0) {
            const strategy = store.config.strategy;
            let freedSize = 0;
            const toRemove = [];

            switch (strategy) {
                case CacheStrategies.LRU:
                    // Remove menos recentemente usado
                    const lruSorted = Array.from(store.entries.values())
                        .sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);
                    
                    for (const entry of lruSorted) {
                        toRemove.push(entry.key);
                        freedSize += entry.size;
                        if (freedSize >= requiredSize) break;
                    }
                    break;

                case CacheStrategies.LFU:
                    // Remove menos frequentemente usado
                    const lfuSorted = Array.from(store.entries.values())
                        .sort((a, b) => a.accessCount - b.accessCount);
                    
                    for (const entry of lfuSorted) {
                        toRemove.push(entry.key);
                        freedSize += entry.size;
                        if (freedSize >= requiredSize) break;
                    }
                    break;

                case CacheStrategies.FIFO:
                    // Remove mais antigo
                    const fifoSorted = Array.from(store.entries.values())
                        .sort((a, b) => a.createdAt - b.createdAt);
                    
                    for (const entry of fifoSorted) {
                        toRemove.push(entry.key);
                        freedSize += entry.size;
                        if (freedSize >= requiredSize) break;
                    }
                    break;

                case CacheStrategies.TTL:
                default:
                    // Remove expirados primeiro, depois mais antigos
                    const expired = [];
                    const valid = [];
                    
                    store.entries.forEach(entry => {
                        if (entry.isExpired()) {
                            expired.push(entry);
                        } else {
                            valid.push(entry);
                        }
                    });
                    
                    // Remove expirados
                    for (const entry of expired) {
                        toRemove.push(entry.key);
                        freedSize += entry.size;
                    }
                    
                    // Se ainda precisa espaço, remove mais antigos
                    if (freedSize < requiredSize) {
                        valid.sort((a, b) => a.createdAt - b.createdAt);
                        for (const entry of valid) {
                            toRemove.push(entry.key);
                            freedSize += entry.size;
                            if (freedSize >= requiredSize) break;
                        }
                    }
                    break;
            }

            // Executar remoções
            toRemove.forEach(key => {
                this.remove(key, store.name);
                this.stats.evictions++;
                store.stats.evictions++;
            });

            Logger?.debug('CacheManager', `Eviction executado em ${store.name}`, {
                removed: toRemove.length,
                freedSize: this.formatSize(freedSize)
            });
        }

        /**
         * Limpeza automática de entradas expiradas
         */
        cleanup() {
            let totalCleaned = 0;

            this.stores.forEach(store => {
                const expired = [];
                
                store.entries.forEach((entry, key) => {
                    if (entry.isExpired()) {
                        expired.push(key);
                    }
                });

                expired.forEach(key => {
                    this.remove(key, store.name);
                    totalCleaned++;
                });
            });

            if (totalCleaned > 0) {
                Logger?.debug('CacheManager', `Limpeza executada: ${totalCleaned} entradas removidas`);
            }
        }

        /**
         * Inicia limpeza automática
         */
        startCleanup() {
            if (this.cleanupInterval) {
                clearInterval(this.cleanupInterval);
            }

            this.cleanupInterval = setInterval(() => {
                this.cleanup();
            }, this.config.cleanupInterval);
        }

        /**
         * Para limpeza automática
         */
        stopCleanup() {
            if (this.cleanupInterval) {
                clearInterval(this.cleanupInterval);
                this.cleanupInterval = null;
            }
        }

        /**
         * Obtém store por nome
         */
        getStore(name) {
            const store = this.stores.get(name);
            if (!store) {
                Logger?.warn('CacheManager', `Store ${name} não encontrado`);
            }
            return store;
        }

        /**
         * Registra hit
         */
        recordHit(store) {
            if (this.config.enableStats) {
                this.stats.hits++;
                store.stats.hits++;
            }
        }

        /**
         * Registra miss
         */
        recordMiss(store) {
            if (this.config.enableStats) {
                this.stats.misses++;
                store.stats.misses++;
            }
        }

        /**
         * Obtém estatísticas
         */
        getStats(storeName = null) {
            if (storeName) {
                const store = this.getStore(storeName);
                if (!store) return null;
                
                return {
                    ...store.stats,
                    entries: store.entries.size,
                    hitRate: store.stats.hits / (store.stats.hits + store.stats.misses) || 0
                };
            }

            // Estatísticas globais
            return {
                ...this.stats,
                stores: this.stores.size,
                hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
                sizeFormatted: this.formatSize(this.stats.totalSize),
                storeStats: Array.from(this.stores.entries()).map(([name, store]) => ({
                    name,
                    entries: store.entries.size,
                    size: this.formatSize(store.stats.size),
                    hits: store.stats.hits,
                    misses: store.stats.misses
                }))
            };
        }

        /**
         * Reseta estatísticas
         */
        resetStats() {
            this.stats = {
                hits: 0,
                misses: 0,
                evictions: 0,
                expirations: 0,
                totalSize: this.stats.totalSize,
                totalEntries: this.stats.totalEntries
            };

            this.stores.forEach(store => {
                store.stats.hits = 0;
                store.stats.misses = 0;
                store.stats.evictions = 0;
            });
        }

        /**
         * Formata tamanho em bytes para humano
         */
        formatSize(bytes) {
            if (bytes === 0) return '0 B';
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
        }

        /**
         * Atualiza configuração
         */
        updateConfig(newConfig) {
            Object.assign(this.config, newConfig);
            
            // Reiniciar limpeza se intervalo mudou
            if (newConfig.cleanupInterval) {
                this.startCleanup();
            }

            Logger?.info('CacheManager', 'Configuração atualizada', newConfig);
        }

        /**
         * Métodos de persistência (localStorage)
         */
        
        persistEntry(storeName, key, entry) {
            if (!this.config.persistence) return;
            
            try {
                const persistKey = `${this.config.namespace}${storeName}_${key}`;
                const data = {
                    value: entry.value,
                    createdAt: entry.createdAt,
                    ttl: entry.ttl,
                    accessCount: entry.accessCount
                };
                localStorage.setItem(persistKey, JSON.stringify(data));
            } catch (error) {
                Logger?.warn('CacheManager', 'Erro ao persistir entrada', error);
            }
        }

        removePersistedEntry(storeName, key) {
            if (!this.config.persistence) return;
            
            try {
                const persistKey = `${this.config.namespace}${storeName}_${key}`;
                localStorage.removeItem(persistKey);
            } catch (error) {
                Logger?.warn('CacheManager', 'Erro ao remover entrada persistida', error);
            }
        }

        clearPersistedStore(storeName) {
            if (!this.config.persistence) return;
            
            const prefix = `${this.config.namespace}${storeName}_`;
            const keysToRemove = [];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
        }

        clearAllPersisted() {
            if (!this.config.persistence) return;
            
            const prefix = this.config.namespace;
            const keysToRemove = [];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
        }

        loadPersistedData() {
            if (!this.config.persistence) return;
            
            const prefix = this.config.namespace;
            let loaded = 0;
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    try {
                        const parts = key.substring(prefix.length).split('_');
                        const storeName = parts[0];
                        const entryKey = parts.slice(1).join('_');
                        
                        const data = JSON.parse(localStorage.getItem(key));
                        
                        // Recriar entrada
                        const entry = new CacheEntry(entryKey, data.value, data.ttl);
                        entry.createdAt = data.createdAt;
                        entry.accessCount = data.accessCount || 0;
                        
                        // Adicionar ao store
                        let store = this.getStore(storeName);
                        if (!store) {
                            store = this.createStore(storeName);
                        }
                        
                        if (!entry.isExpired()) {
                            store.entries.set(entryKey, entry);
                            store.stats.size += entry.size;
                            loaded++;
                        }
                    } catch (error) {
                        Logger?.warn('CacheManager', 'Erro ao carregar entrada persistida', error);
                    }
                }
            }
            
            if (loaded > 0) {
                Logger?.info('CacheManager', `${loaded} entradas carregadas da persistência`);
            }
        }

        /**
         * Exporta estado do cache
         */
        exportState() {
            const state = {
                config: this.config,
                stats: this.stats,
                stores: {}
            };

            this.stores.forEach((store, name) => {
                state.stores[name] = {
                    config: store.config,
                    stats: store.stats,
                    entries: Array.from(store.entries.entries()).map(([key, entry]) => ({
                        key,
                        value: entry.value,
                        createdAt: entry.createdAt,
                        ttl: entry.ttl,
                        accessCount: entry.accessCount
                    }))
                };
            });

            return state;
        }

        /**
         * Importa estado do cache
         */
        importState(state) {
            if (state.config) {
                this.config = { ...this.config, ...state.config };
            }

            if (state.stores) {
                Object.entries(state.stores).forEach(([name, storeData]) => {
                    const store = this.createStore(name, storeData.config);
                    
                    storeData.entries.forEach(entryData => {
                        const entry = new CacheEntry(entryData.key, entryData.value, entryData.ttl);
                        entry.createdAt = entryData.createdAt;
                        entry.accessCount = entryData.accessCount;
                        store.entries.set(entryData.key, entry);
                    });
                    
                    if (storeData.stats) {
                        store.stats = { ...store.stats, ...storeData.stats };
                    }
                });
            }

            Logger?.info('CacheManager', 'Estado importado com sucesso');
        }
    }

    // Exportar para o namespace KC
    KC.CacheManager = new CacheManager();
    KC.CacheStrategies = CacheStrategies;

    // Criar atalhos convenientes
    KC.cache = {
        get: (key, store) => KC.CacheManager.get(key, store),
        set: (key, value, options) => KC.CacheManager.set(key, value, options),
        remove: (key, store) => KC.CacheManager.remove(key, store),
        clear: (store) => KC.CacheManager.clear(store),
        stats: () => KC.CacheManager.getStats()
    };

    console.log('✅ CacheManager unificado inicializado');

})(window);