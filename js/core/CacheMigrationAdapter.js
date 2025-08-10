/**
 * CacheMigrationAdapter.js - Adaptador para migração gradual
 * 
 * Permite que componentes existentes migrem gradualmente para o CacheManager unificado
 * sem quebrar funcionalidade existente
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const Logger = KC.Logger;

    /**
     * Adaptador de migração para cada componente
     */
    class CacheMigrationAdapter {
        constructor(componentName, options = {}) {
            this.componentName = componentName;
            this.storeName = options.storeName || componentName.toLowerCase();
            this.useLegacy = options.useLegacy || false;
            this.legacyCache = options.legacyCache || new Map();
            
            // Criar store dedicado no CacheManager
            if (!this.useLegacy && KC.CacheManager) {
                KC.CacheManager.createStore(this.storeName, {
                    maxEntries: options.maxEntries || 1000,
                    defaultTTL: options.defaultTTL || 5 * 60 * 1000,
                    strategy: options.strategy || 'lru'
                });
            }

            this.migrationStats = {
                legacyHits: 0,
                unifiedHits: 0,
                migrations: 0
            };

            Logger?.info('CacheMigrationAdapter', `Adaptador criado para ${componentName}`, {
                storeName: this.storeName,
                useLegacy: this.useLegacy
            });
        }

        /**
         * Get com fallback para cache legacy
         */
        get(key) {
            if (this.useLegacy) {
                // Usar apenas cache legacy
                this.migrationStats.legacyHits++;
                return this.legacyCache.get(key);
            }

            // Tentar cache unificado primeiro
            let value = KC.CacheManager?.get(key, this.storeName);
            
            if (value !== null) {
                this.migrationStats.unifiedHits++;
                return value;
            }

            // Fallback para legacy
            if (this.legacyCache.has(key)) {
                value = this.legacyCache.get(key);
                this.migrationStats.legacyHits++;
                
                // Migrar para cache unificado
                this.migrateEntry(key, value);
                
                return value;
            }

            return null;
        }

        /**
         * Set em ambos os caches durante migração
         */
        set(key, value, options = {}) {
            if (this.useLegacy) {
                // Usar apenas cache legacy
                this.legacyCache.set(key, value);
                return true;
            }

            // Adicionar ao cache unificado
            const success = KC.CacheManager?.set(key, value, {
                store: this.storeName,
                ttl: options.ttl
            });

            // Manter sincronizado com legacy durante transição
            if (this.legacyCache) {
                this.legacyCache.set(key, value);
            }

            return success;
        }

        /**
         * Remove de ambos os caches
         */
        remove(key) {
            let removed = false;

            if (!this.useLegacy && KC.CacheManager) {
                removed = KC.CacheManager.remove(key, this.storeName);
            }

            if (this.legacyCache.has(key)) {
                this.legacyCache.delete(key);
                removed = true;
            }

            return removed;
        }

        /**
         * Clear ambos os caches
         */
        clear() {
            if (!this.useLegacy && KC.CacheManager) {
                KC.CacheManager.clear(this.storeName);
            }

            if (this.legacyCache) {
                this.legacyCache.clear();
            }
        }

        /**
         * Migra entrada do cache legacy para unificado
         */
        migrateEntry(key, value) {
            if (KC.CacheManager) {
                KC.CacheManager.set(key, value, {
                    store: this.storeName
                });
                this.migrationStats.migrations++;
            }
        }

        /**
         * Migra todo cache legacy de uma vez
         */
        migrateAll() {
            if (!KC.CacheManager || !this.legacyCache) {
                return 0;
            }

            let migrated = 0;
            this.legacyCache.forEach((value, key) => {
                this.migrateEntry(key, value);
                migrated++;
            });

            Logger?.info('CacheMigrationAdapter', 
                `Migração completa para ${this.componentName}`, 
                { migrated }
            );

            return migrated;
        }

        /**
         * Ativa modo unificado (desativa legacy)
         */
        enableUnifiedMode() {
            if (this.useLegacy) {
                // Migrar tudo antes de desativar legacy
                this.migrateAll();
                this.useLegacy = false;
                
                Logger?.info('CacheMigrationAdapter', 
                    `Modo unificado ativado para ${this.componentName}`
                );
            }
        }

        /**
         * Obtém estatísticas de migração
         */
        getStats() {
            const stats = {
                ...this.migrationStats,
                legacySize: this.legacyCache?.size || 0,
                unifiedSize: KC.CacheManager?.getStats(this.storeName)?.entries || 0,
                mode: this.useLegacy ? 'legacy' : 'unified'
            };

            // Calcular taxa de migração
            const totalHits = stats.legacyHits + stats.unifiedHits;
            if (totalHits > 0) {
                stats.migrationRate = (stats.unifiedHits / totalHits) * 100;
            }

            return stats;
        }

        /**
         * Cria adaptador compatível com Map
         */
        createMapCompatibleInterface() {
            return {
                get: (key) => this.get(key),
                set: (key, value) => this.set(key, value),
                has: (key) => this.get(key) !== null,
                delete: (key) => this.remove(key),
                clear: () => this.clear(),
                size: this.legacyCache?.size || 0,
                
                // Métodos adicionais para compatibilidade
                forEach: (callback) => {
                    if (this.legacyCache) {
                        this.legacyCache.forEach(callback);
                    }
                }
            };
        }
    }

    /**
     * Factory para criar adaptadores específicos
     */
    class MigrationAdapterFactory {
        static adapters = new Map();

        /**
         * Cria ou retorna adaptador existente
         */
        static getAdapter(componentName, options = {}) {
            if (!this.adapters.has(componentName)) {
                const adapter = new CacheMigrationAdapter(componentName, options);
                this.adapters.set(componentName, adapter);
            }
            return this.adapters.get(componentName);
        }

        /**
         * Configurações pré-definidas para componentes conhecidos
         */
        static createForComponent(componentType) {
            const configs = {
                'ContentAnalysisOrchestrator': {
                    storeName: 'analysis',
                    maxEntries: 500,
                    defaultTTL: 10 * 60 * 1000, // 10 minutos
                    strategy: 'lru'
                },
                'SemanticConvergenceService': {
                    storeName: 'convergence',
                    maxEntries: 200,
                    defaultTTL: 60 * 60 * 1000, // 1 hora
                    strategy: 'lru'
                },
                'QdrantScoreBridge': {
                    storeName: 'qdrant_scores',
                    maxEntries: 100,
                    defaultTTL: 5 * 60 * 1000, // 5 minutos
                    strategy: 'ttl'
                },
                'ScoreNormalizer': {
                    storeName: 'normalized_scores',
                    maxEntries: 1000,
                    defaultTTL: 30 * 60 * 1000, // 30 minutos
                    strategy: 'lfu'
                },
                'EvolutionQueue': {
                    storeName: 'evolution_history',
                    maxEntries: 500,
                    defaultTTL: null, // Sem expiração
                    strategy: 'fifo'
                }
            };

            const config = configs[componentType];
            if (!config) {
                Logger?.warn('MigrationAdapterFactory', 
                    `Configuração não encontrada para ${componentType}`
                );
                return null;
            }

            return this.getAdapter(componentType, config);
        }

        /**
         * Status global de migração
         */
        static getMigrationStatus() {
            const status = {
                components: [],
                totalLegacyEntries: 0,
                totalUnifiedEntries: 0,
                overallMigrationRate: 0
            };

            this.adapters.forEach((adapter, name) => {
                const stats = adapter.getStats();
                status.components.push({
                    name,
                    ...stats
                });
                status.totalLegacyEntries += stats.legacySize;
                status.totalUnifiedEntries += stats.unifiedSize;
            });

            // Calcular taxa geral
            const total = status.totalLegacyEntries + status.totalUnifiedEntries;
            if (total > 0) {
                status.overallMigrationRate = 
                    (status.totalUnifiedEntries / total) * 100;
            }

            return status;
        }

        /**
         * Migra todos os componentes
         */
        static migrateAll() {
            let totalMigrated = 0;

            this.adapters.forEach((adapter, name) => {
                const migrated = adapter.migrateAll();
                totalMigrated += migrated;
                Logger?.info('MigrationAdapterFactory', 
                    `${name}: ${migrated} entradas migradas`
                );
            });

            return totalMigrated;
        }

        /**
         * Ativa modo unificado para todos
         */
        static enableUnifiedModeForAll() {
            this.adapters.forEach(adapter => {
                adapter.enableUnifiedMode();
            });
            
            Logger?.info('MigrationAdapterFactory', 
                'Modo unificado ativado para todos os componentes'
            );
        }
    }

    // Exportar para namespace KC
    KC.CacheMigrationAdapter = CacheMigrationAdapter;
    KC.MigrationAdapterFactory = MigrationAdapterFactory;

    // Criar adaptadores para componentes existentes se eles existirem
    if (KC.ContentAnalysisOrchestrator) {
        KC.ContentAnalysisOrchestrator.cacheAdapter = 
            MigrationAdapterFactory.createForComponent('ContentAnalysisOrchestrator');
    }

    if (KC.SemanticConvergenceService) {
        KC.SemanticConvergenceService.cacheAdapter = 
            MigrationAdapterFactory.createForComponent('SemanticConvergenceService');
    }

    if (KC.QdrantScoreBridge) {
        KC.QdrantScoreBridge.cacheAdapter = 
            MigrationAdapterFactory.createForComponent('QdrantScoreBridge');
    }

    if (KC.ScoreNormalizer) {
        KC.ScoreNormalizer.cacheAdapter = 
            MigrationAdapterFactory.createForComponent('ScoreNormalizer');
    }

    if (KC.EvolutionQueue) {
        KC.EvolutionQueue.cacheAdapter = 
            MigrationAdapterFactory.createForComponent('EvolutionQueue');
    }

    console.log('✅ CacheMigrationAdapter configurado para todos os componentes');

})(window);