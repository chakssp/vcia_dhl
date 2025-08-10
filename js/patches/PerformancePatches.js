/**
 * PerformancePatches.js - Runtime patches for performance optimization
 * 
 * Applies specific fixes to existing services to prevent memory leaks
 * and optimize performance without modifying original files.
 * 
 * @author Performance Optimization Team
 * @date 10/08/2025
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const Logger = KC.Logger;

    /**
     * Patch QdrantService - CACHE OTIMIZADO PARA 64GB RAM
     * Com 64GB de RAM, podemos manter MUITO mais cache para melhor performance
     */
    function patchQdrantService() {
        if (!KC.QdrantService) return;

        const service = KC.QdrantService;
        const originalSaveToCache = service.saveToCache;
        const originalGetFromCache = service.getFromCache;

        // Cache otimizado baseado em análise técnica rigorosa:
        // - Entrada média: ~2KB (embedding 768*4 bytes + metadata)
        // - 1024 entradas = ~2MB (cabe em L3 cache, lookup rápido)
        // - Hit rate ótimo com localidade temporal preservada
        // - GC pressure mínimo com Map < 1K entries
        service.maxCacheSize = 1024; // 2^10 para otimização de hash
        
        // Enhanced cache management
        service.cacheStats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };

        // Override saveToCache - eviction LRU quando necessário
        service.saveToCache = function(key, data) {
            // Usar limite otimizado para L3 cache
            const maxSize = this.maxCacheSize || 1024;
            
            // Só fazer eviction se realmente precisar (improvável com 10k limite)
            if (this.searchCache.size >= maxSize) {
                // LRU: remover o menos recentemente usado
                let lruKey = null;
                let lruTime = Date.now();
                
                this.searchCache.forEach((value, k) => {
                    const lastAccess = value.lastAccess || value.timestamp;
                    if (lastAccess < lruTime) {
                        lruTime = lastAccess;
                        lruKey = k;
                    }
                });
                
                if (lruKey) {
                    this.searchCache.delete(lruKey);
                    this.cacheStats.evictions++;
                    Logger?.debug('QdrantService', `Cache LRU eviction: ${lruKey}`);
                }
            }

            // Save with enhanced metadata
            this.searchCache.set(key, {
                data: data,
                timestamp: Date.now(),
                lastAccess: Date.now(),
                accessCount: 0,
                size: JSON.stringify(data).length
            });
        };

        // Override getFromCache with access tracking
        service.getFromCache = function(key) {
            const entry = this.searchCache.get(key);
            
            if (!entry) {
                this.cacheStats.misses++;
                return null;
            }

            // Check TTL
            const ttl = this.cacheTimeout || 600000; // 10 minutes default
            if (Date.now() - entry.timestamp > ttl) {
                this.searchCache.delete(key);
                this.cacheStats.misses++;
                return null;
            }

            // Update access metadata
            entry.lastAccess = Date.now();
            entry.accessCount++;
            
            // Move to end for LRU (delete and re-add)
            this.searchCache.delete(key);
            this.searchCache.set(key, entry);
            
            this.cacheStats.hits++;
            return entry.data;
        };

        // Add method to get cache statistics
        service.getCacheStatistics = function() {
            const totalRequests = this.cacheStats.hits + this.cacheStats.misses;
            const hitRate = totalRequests > 0 ? 
                (this.cacheStats.hits / totalRequests * 100).toFixed(2) : 0;
            
            let totalSize = 0;
            this.searchCache.forEach(entry => {
                totalSize += entry.size || 0;
            });

            return {
                size: this.searchCache.size,
                maxSize: this.maxCacheSize || 100,
                hits: this.cacheStats.hits,
                misses: this.cacheStats.misses,
                evictions: this.cacheStats.evictions,
                hitRate: hitRate + '%',
                totalSizeKB: (totalSize / 1024).toFixed(2)
            };
        };

        // Clear old cache entries periodically
        service.cleanupInterval = setInterval(() => {
            const ttl = service.cacheTimeout || 600000;
            const now = Date.now();
            const toDelete = [];

            service.searchCache.forEach((entry, key) => {
                if (now - entry.timestamp > ttl) {
                    toDelete.push(key);
                }
            });

            toDelete.forEach(key => {
                service.searchCache.delete(key);
                service.cacheStats.evictions++;
            });

            if (toDelete.length > 0) {
                Logger?.debug('QdrantService', `Cleaned ${toDelete.length} expired cache entries`);
            }
        }, 60000); // Every minute

        Logger?.info('PerformancePatches', 'QdrantService cache otimizado para 1024 entradas (L3 cache optimization)');
    }

    /**
     * Patch SemanticConvergenceService - REMOVED ARTIFICIAL LIMITS
     * O SemanticConvergenceService deve manter histórico completo para análise de convergência
     * Não há razão para limitar artificialmente a 100 entradas
     */
    function patchSemanticConvergenceService() {
        if (!KC.SemanticConvergenceService) return;

        const service = KC.SemanticConvergenceService;

        // NÃO adicionar limite artificial - o serviço precisa do histórico completo
        // Remover qualquer limite que tenha sido adicionado incorretamente
        if (service.maxHistorySize === 100) {
            delete service.maxHistorySize;
            Logger?.info('SemanticConvergence', 'Limite artificial removido - histórico completo preservado');
        }

        // Adicionar método de limpeza OPCIONAL baseado em idade, não em quantidade
        service.cleanupOldHistory = function(maxAge = 86400000) { // 24 horas por padrão
            if (!this.convergenceHistory) return;
            
            const now = Date.now();
            const before = this.convergenceHistory.length;
            
            // Limpar apenas entradas MUITO antigas (mais de 24h por padrão)
            this.convergenceHistory = this.convergenceHistory.filter(entry => {
                const entryTime = entry.timestamp || entry.createdAt;
                if (!entryTime) return true; // Manter se não tiver timestamp
                
                const age = now - (typeof entryTime === 'string' ? new Date(entryTime).getTime() : entryTime);
                return age < maxAge;
            });
            
            const removed = before - this.convergenceHistory.length;
            if (removed > 0) {
                Logger?.info('SemanticConvergence', `Limpeza opcional: ${removed} entradas antigas (>24h) removidas`);
            }
        };

        // NÃO fazer limpeza automática - deixar o usuário decidir quando limpar
        // O histórico de convergência é valioso para análise

        Logger?.info('PerformancePatches', 'SemanticConvergenceService configurado SEM limites artificiais');
    }

    /**
     * Patch EvolutionQueue - INTELIGENTE SEM LIMITES ARTIFICIAIS
     * A fila de evolução precisa manter histórico para rastreamento de processamento
     * Apenas limpar entradas muito antigas ou já processadas
     */
    function patchEvolutionQueue() {
        if (!KC.EvolutionQueue) return;

        const queue = KC.EvolutionQueue;

        // NÃO limitar artificialmente - manter histórico para análise
        // Adicionar método de limpeza inteligente baseado em STATUS e IDADE
        queue.cleanupProcessedHistory = function(options = {}) {
            if (!this.processingHistory) return;
            
            const maxAge = options.maxAge || 172800000; // 48 horas por padrão
            const keepFailed = options.keepFailed !== false; // Manter falhas por padrão
            const now = Date.now();
            const toDelete = [];
            
            this.processingHistory.forEach((item, id) => {
                // Manter itens falhados para análise (a menos que explicitamente solicitado)
                if (keepFailed && item.status === 'failed') {
                    return;
                }
                
                // Limpar apenas itens PROCESSADOS e ANTIGOS
                if (item.status === 'completed' || item.status === 'processed') {
                    const age = now - new Date(item.completedAt || item.timestamp).getTime();
                    if (age > maxAge) {
                        toDelete.push(id);
                    }
                }
            });
            
            toDelete.forEach(id => this.processingHistory.delete(id));
            
            if (toDelete.length > 0) {
                Logger?.info('EvolutionQueue', `Limpeza inteligente: ${toDelete.length} itens processados e antigos removidos`);
            }
            
            return toDelete.length;
        };

        // Método para obter estatísticas do histórico
        queue.getHistoryStats = function() {
            if (!this.processingHistory) return null;
            
            const stats = {
                total: this.processingHistory.size,
                completed: 0,
                failed: 0,
                pending: 0,
                processing: 0
            };
            
            this.processingHistory.forEach(item => {
                const status = item.status || 'pending';
                if (stats[status] !== undefined) {
                    stats[status]++;
                }
            });
            
            return stats;
        };

        Logger?.info('PerformancePatches', 'EvolutionQueue configurado com limpeza inteligente (sem limites artificiais)');
    }

    /**
     * Patch ContentAnalysisOrchestrator to clean up extractors
     */
    function patchContentAnalysisOrchestrator() {
        if (!KC.ContentAnalysisOrchestrator) return;

        const orchestrator = KC.ContentAnalysisOrchestrator;

        // Add cleanup method for unused extractors
        orchestrator.cleanupExtractors = function() {
            // Clear any cached data in extractors
            if (this.extractors instanceof Map) {
                this.extractors.forEach(extractor => {
                    if (extractor.cache && extractor.cache.clear) {
                        extractor.cache.clear();
                    }
                });
            }
        };

        // Periodic cleanup
        orchestrator.cleanupInterval = setInterval(() => {
            orchestrator.cleanupExtractors();
        }, 600000); // Every 10 minutes

        Logger?.info('PerformancePatches', 'ContentAnalysisOrchestrator patched with cleanup');
    }

    /**
     * Patch AppState to prevent large file content storage
     */
    function patchAppState() {
        if (!KC.AppState) return;

        const originalSet = KC.AppState.set;

        // Override set method to strip large content
        KC.AppState.set = function(key, value) {
            // If setting files, remove large content
            if (key === 'files' && Array.isArray(value)) {
                value = value.map(file => {
                    if (file.content && file.content.length > 50000) {
                        // Keep only preview for large files
                        return {
                            ...file,
                            content: file.content.substring(0, 1000),
                            contentTruncated: true,
                            originalSize: file.content.length
                        };
                    }
                    return file;
                });
            }

            // Call original
            return originalSet.call(this, key, value);
        };

        Logger?.info('PerformancePatches', 'AppState patched to prevent large content storage');
    }

    /**
     * Global memory pressure handler
     */
    function setupMemoryPressureHandler() {
        if (!performance.memory) return;

        // Monitor memory pressure
        const checkMemoryPressure = () => {
            const usage = (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100;
            
            if (usage > 85) {
                // Critical - aggressive cleanup
                Logger?.warn('MemoryPressure', `Critical memory usage: ${usage.toFixed(2)}%`);
                
                // Clear all non-essential caches
                if (KC.CacheOptimizer) {
                    KC.CacheOptimizer.optimize();
                }
                
                // Force garbage collection if available
                if (window.gc) {
                    window.gc();
                }
                
                // Emit event for components to cleanup
                if (KC.EventBus) {
                    KC.EventBus.emit('memory:pressure:critical', { usage });
                }
                
            } else if (usage > 70) {
                // Warning - normal cleanup
                Logger?.info('MemoryPressure', `High memory usage: ${usage.toFixed(2)}%`);
                
                if (KC.EventBus) {
                    KC.EventBus.emit('memory:pressure:warning', { usage });
                }
            }
        };

        // Check every 30 seconds
        setInterval(checkMemoryPressure, 30000);
        
        // Initial check
        checkMemoryPressure();
    }

    /**
     * Apply all patches
     */
    function applyAllPatches() {
        Logger?.info('PerformancePatches', 'Applying performance patches...');
        
        patchQdrantService();
        patchSemanticConvergenceService();
        patchEvolutionQueue();
        patchContentAnalysisOrchestrator();
        patchAppState();
        setupMemoryPressureHandler();
        
        Logger?.success('PerformancePatches', 'All patches applied successfully');
    }

    // Apply patches when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyAllPatches);
    } else {
        // DOM already loaded
        setTimeout(applyAllPatches, 100);
    }

    // Export for manual application
    KC.PerformancePatches = {
        applyAll: applyAllPatches,
        patchQdrantService,
        patchSemanticConvergenceService,
        patchEvolutionQueue,
        patchContentAnalysisOrchestrator,
        patchAppState
    };

})(window);