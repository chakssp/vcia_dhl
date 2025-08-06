/**
 * CacheService.js - Serviço de Cache Multicamada
 * 
 * Implementa cache em 3 níveis para otimização de performance:
 * - L1: Memória (Map) para resultados recentes
 * - L2: IndexedDB para persistência local
 * - L3: Integração com cache do EmbeddingService
 * 
 * Objetivo: Reduzir latência de 150ms para <15ms
 * 
 * AIDEV-NOTE: multilayer-cache; sistema de cache para performance Schema.org
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const Logger = KC.Logger;

    class CacheService {
        constructor() {
            this.version = '1.0.0';
            
            // L1: Cache em memória
            this.memoryCache = new Map();
            this.memoryCacheSize = 0;
            this.maxMemoryCacheSize = 50 * 1024 * 1024; // 50MB
            
            // L2: IndexedDB config
            this.dbName = 'KCCacheDB';
            this.dbVersion = 1;
            this.storeName = 'schemaOrgCache';
            this.db = null;
            
            // Configurações
            this.config = {
                memoryTTL: 5 * 60 * 1000,        // 5 minutos
                indexedDBTTL: 24 * 60 * 60 * 1000, // 24 horas
                maxMemoryItems: 1000,
                compressionThreshold: 1024,       // Comprimir se > 1KB
                hitRateTarget: 0.7               // Meta de 70% hit rate
            };
            
            // Métricas
            this.metrics = {
                hits: { L1: 0, L2: 0, L3: 0 },
                misses: 0,
                writes: { L1: 0, L2: 0 },
                evictions: { L1: 0, L2: 0 },
                avgLatency: { L1: 0, L2: 0, L3: 0 }
            };
            
            // Inicialização
            this.initPromise = this.initialize();
        }

        /**
         * Inicializa o serviço de cache
         */
        async initialize() {
            try {
                // Inicializa IndexedDB
                await this.initializeIndexedDB();
                
                // Inicia limpeza periódica
                this.startCleanupTimer();
                
                Logger?.info('CacheService', 'Inicializado', {
                    version: this.version,
                    maxMemorySize: this.maxMemoryCacheSize
                });
                
                return true;
            } catch (error) {
                Logger?.error('CacheService', 'Erro na inicialização', error);
                return false;
            }
        }

        /**
         * Inicializa IndexedDB
         */
        async initializeIndexedDB() {
            return new Promise((resolve, reject) => {
                if (!window.indexedDB) {
                    Logger?.warn('CacheService', 'IndexedDB não disponível');
                    resolve(false);
                    return;
                }

                const request = indexedDB.open(this.dbName, this.dbVersion);

                request.onerror = () => {
                    Logger?.error('CacheService', 'Erro ao abrir IndexedDB');
                    reject(request.error);
                };

                request.onsuccess = () => {
                    this.db = request.result;
                    Logger?.info('CacheService', 'IndexedDB conectado');
                    resolve(true);
                };

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    // Cria store se não existir
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        const store = db.createObjectStore(this.storeName, { 
                            keyPath: 'key' 
                        });
                        
                        // Índices para busca eficiente
                        store.createIndex('timestamp', 'timestamp');
                        store.createIndex('type', 'type');
                        store.createIndex('fileId', 'fileId');
                    }
                };
            });
        }

        /**
         * Busca valor no cache (verifica todos os níveis)
         */
        async get(key, options = {}) {
            await this.initPromise;
            const startTime = Date.now();
            
            try {
                // L1: Memória
                const memoryResult = this.getFromMemory(key);
                if (memoryResult !== null) {
                    this.updateMetrics('L1', 'hit', Date.now() - startTime);
                    return memoryResult;
                }

                // L2: IndexedDB
                const dbResult = await this.getFromIndexedDB(key);
                if (dbResult !== null) {
                    this.updateMetrics('L2', 'hit', Date.now() - startTime);
                    // Promove para L1
                    this.setInMemory(key, dbResult);
                    return dbResult;
                }

                // L3: EmbeddingService cache (se aplicável)
                if (options.checkEmbeddingCache && KC.EmbeddingService) {
                    const embeddingResult = await this.getFromEmbeddingService(key);
                    if (embeddingResult !== null) {
                        this.updateMetrics('L3', 'hit', Date.now() - startTime);
                        // Promove para L1 e L2
                        await this.set(key, embeddingResult);
                        return embeddingResult;
                    }
                }

                // Cache miss
                this.metrics.misses++;
                return null;

            } catch (error) {
                Logger?.error('CacheService', 'Erro ao buscar no cache', { key, error });
                return null;
            }
        }

        /**
         * Armazena valor no cache (propaga para níveis apropriados)
         */
        async set(key, value, options = {}) {
            await this.initPromise;
            
            try {
                // Adiciona metadados
                const cacheEntry = {
                    key,
                    value,
                    timestamp: Date.now(),
                    type: options.type || 'general',
                    fileId: options.fileId,
                    size: this.estimateSize(value)
                };

                // L1: Sempre armazena em memória
                this.setInMemory(key, cacheEntry);

                // L2: Armazena em IndexedDB se valor significativo
                if (cacheEntry.size > this.config.compressionThreshold) {
                    await this.setInIndexedDB(key, cacheEntry);
                }

                return true;

            } catch (error) {
                Logger?.error('CacheService', 'Erro ao armazenar no cache', { key, error });
                return false;
            }
        }

        /**
         * Busca em memória (L1)
         */
        getFromMemory(key) {
            const entry = this.memoryCache.get(key);
            if (!entry) return null;

            // Verifica TTL
            if (Date.now() - entry.timestamp > this.config.memoryTTL) {
                this.memoryCache.delete(key);
                this.memoryCacheSize -= entry.size;
                return null;
            }

            return entry.value;
        }

        /**
         * Armazena em memória (L1)
         */
        setInMemory(key, entry) {
            // Verifica limite de itens
            if (this.memoryCache.size >= this.config.maxMemoryItems) {
                this.evictOldestFromMemory();
            }

            // Verifica limite de tamanho
            while (this.memoryCacheSize + entry.size > this.maxMemoryCacheSize) {
                this.evictOldestFromMemory();
            }

            this.memoryCache.set(key, entry);
            this.memoryCacheSize += entry.size;
            this.metrics.writes.L1++;
        }

        /**
         * Busca em IndexedDB (L2)
         */
        async getFromIndexedDB(key) {
            if (!this.db) return null;

            return new Promise((resolve) => {
                try {
                    const transaction = this.db.transaction([this.storeName], 'readonly');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.get(key);

                    request.onsuccess = () => {
                        const entry = request.result;
                        if (!entry) {
                            resolve(null);
                            return;
                        }

                        // Verifica TTL
                        if (Date.now() - entry.timestamp > this.config.indexedDBTTL) {
                            this.deleteFromIndexedDB(key);
                            resolve(null);
                            return;
                        }

                        resolve(entry.value);
                    };

                    request.onerror = () => {
                        Logger?.error('CacheService', 'Erro ao buscar no IndexedDB', { key });
                        resolve(null);
                    };
                } catch (error) {
                    Logger?.error('CacheService', 'Erro na transação IndexedDB', error);
                    resolve(null);
                }
            });
        }

        /**
         * Armazena em IndexedDB (L2)
         */
        async setInIndexedDB(key, entry) {
            if (!this.db) return false;

            return new Promise((resolve) => {
                try {
                    const transaction = this.db.transaction([this.storeName], 'readwrite');
                    const store = transaction.objectStore(this.storeName);
                    
                    // Comprime valor se necessário
                    if (entry.size > this.config.compressionThreshold * 10) {
                        entry.value = this.compress(entry.value);
                        entry.compressed = true;
                    }

                    const request = store.put(entry);

                    request.onsuccess = () => {
                        this.metrics.writes.L2++;
                        resolve(true);
                    };

                    request.onerror = () => {
                        Logger?.error('CacheService', 'Erro ao armazenar no IndexedDB', { key });
                        resolve(false);
                    };
                } catch (error) {
                    Logger?.error('CacheService', 'Erro na transação IndexedDB', error);
                    resolve(false);
                }
            });
        }

        /**
         * Busca no cache do EmbeddingService (L3)
         */
        async getFromEmbeddingService(key) {
            // Implementação específica depende do EmbeddingService
            // Por enquanto, retorna null
            return null;
        }

        /**
         * Remove entrada mais antiga da memória
         */
        evictOldestFromMemory() {
            let oldestKey = null;
            let oldestTime = Infinity;

            for (const [key, entry] of this.memoryCache) {
                if (entry.timestamp < oldestTime) {
                    oldestTime = entry.timestamp;
                    oldestKey = key;
                }
            }

            if (oldestKey) {
                const entry = this.memoryCache.get(oldestKey);
                this.memoryCache.delete(oldestKey);
                this.memoryCacheSize -= entry.size;
                this.metrics.evictions.L1++;
            }
        }

        /**
         * Remove entrada do IndexedDB
         */
        async deleteFromIndexedDB(key) {
            if (!this.db) return;

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            store.delete(key);
        }

        /**
         * Limpa cache expirado periodicamente
         */
        startCleanupTimer() {
            setInterval(() => {
                this.cleanupExpiredEntries();
            }, 60 * 1000); // A cada minuto
        }

        /**
         * Limpa entradas expiradas
         */
        async cleanupExpiredEntries() {
            // Limpa memória
            const now = Date.now();
            for (const [key, entry] of this.memoryCache) {
                if (now - entry.timestamp > this.config.memoryTTL) {
                    this.memoryCache.delete(key);
                    this.memoryCacheSize -= entry.size;
                    this.metrics.evictions.L1++;
                }
            }

            // Limpa IndexedDB - verificar se DB está aberta
            if (this.db && this.db.readyState !== 'closed') {
                try {
                    const transaction = this.db.transaction([this.storeName], 'readwrite');
                    const store = transaction.objectStore(this.storeName);
                const index = store.index('timestamp');
                const range = IDBKeyRange.upperBound(now - this.config.indexedDBTTL);
                
                const request = index.openCursor(range);
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        store.delete(cursor.primaryKey);
                        this.metrics.evictions.L2++;
                        cursor.continue();
                    }
                };
                } catch (error) {
                    // Silenciar erro se DB está fechando
                    if (error.name !== 'InvalidStateError') {
                        console.error('[CacheService] Erro no cleanup:', error);
                    }
                }
            }
        }

        /**
         * Estima tamanho do objeto
         */
        estimateSize(obj) {
            try {
                return JSON.stringify(obj).length;
            } catch {
                return 1024; // Tamanho padrão se falhar
            }
        }

        /**
         * Comprime dados (simplificado)
         */
        compress(data) {
            // Em produção, usar algoritmo real de compressão
            return JSON.stringify(data);
        }

        /**
         * Descomprime dados
         */
        decompress(data) {
            return typeof data === 'string' ? JSON.parse(data) : data;
        }

        /**
         * Atualiza métricas
         */
        updateMetrics(level, type, latency) {
            if (type === 'hit') {
                this.metrics.hits[level]++;
                
                // Atualiza latência média
                const count = this.metrics.hits[level];
                const currentAvg = this.metrics.avgLatency[level];
                this.metrics.avgLatency[level] = 
                    (currentAvg * (count - 1) + latency) / count;
            }
        }

        /**
         * Obtém estatísticas do cache
         */
        getStats() {
            const totalHits = Object.values(this.metrics.hits).reduce((a, b) => a + b, 0);
            const totalRequests = totalHits + this.metrics.misses;
            const hitRate = totalRequests > 0 ? totalHits / totalRequests : 0;

            return {
                hitRate: (hitRate * 100).toFixed(2) + '%',
                hits: this.metrics.hits,
                misses: this.metrics.misses,
                writes: this.metrics.writes,
                evictions: this.metrics.evictions,
                avgLatency: {
                    L1: this.metrics.avgLatency.L1.toFixed(2) + 'ms',
                    L2: this.metrics.avgLatency.L2.toFixed(2) + 'ms',
                    L3: this.metrics.avgLatency.L3.toFixed(2) + 'ms'
                },
                memoryCacheSize: (this.memoryCacheSize / 1024).toFixed(2) + 'KB',
                memoryCacheItems: this.memoryCache.size
            };
        }

        /**
         * Limpa todo o cache
         */
        async clear() {
            // Limpa memória
            this.memoryCache.clear();
            this.memoryCacheSize = 0;

            // Limpa IndexedDB
            if (this.db) {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                store.clear();
            }

            // Reseta métricas
            this.metrics = {
                hits: { L1: 0, L2: 0, L3: 0 },
                misses: 0,
                writes: { L1: 0, L2: 0 },
                evictions: { L1: 0, L2: 0 },
                avgLatency: { L1: 0, L2: 0, L3: 0 }
            };

            Logger?.info('CacheService', 'Cache limpo');
        }

        /**
         * Gera chave de cache para Schema.org
         */
        generateSchemaOrgKey(file) {
            return `schema_${file.id || file.name}_${file.analysisType}_${file.categories?.join('_')}`;
        }

        /**
         * Cache específico para Schema.org com performance otimizada
         */
        async cacheSchemaOrgMapping(file, schemaEntity) {
            const key = this.generateSchemaOrgKey(file);
            return await this.set(key, schemaEntity, {
                type: 'schemaOrg',
                fileId: file.id || file.name
            });
        }

        /**
         * Busca Schema.org cacheado
         */
        async getCachedSchemaOrgMapping(file) {
            const key = this.generateSchemaOrgKey(file);
            return await this.get(key, { checkEmbeddingCache: false });
        }
    }

    // Registra no namespace
    KC.CacheService = new CacheService();
    
    Logger?.info('CacheService', 'Componente registrado em KC.CacheService');

})(window);