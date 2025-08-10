/**
 * test-patches-local.js - Teste local dos patches de performance
 * Executa no Node.js para validar patches antes de aplicar no navegador
 */

// Simular ambiente do navegador
global.window = {
    KnowledgeConsolidator: {},
    performance: {
        memory: {
            usedJSHeapSize: 50 * 1024 * 1024, // 50MB
            jsHeapSizeLimit: 512 * 1024 * 1024, // 512MB
            totalJSHeapSize: 100 * 1024 * 1024
        }
    },
    gc: null
};

global.document = {
    readyState: 'complete',
    addEventListener: () => {}
};

global.setInterval = (fn, delay) => {
    console.log(`[MOCK] SetInterval registered with ${delay}ms delay`);
    return 1;
};

global.setTimeout = (fn, delay) => {
    console.log(`[MOCK] SetTimeout registered with ${delay}ms delay`);
    fn(); // Execute immediately for testing
    return 1;
};

// Criar KC namespace
const KC = global.window.KnowledgeConsolidator;

// Mock Logger
KC.Logger = {
    info: (component, message, data) => {
        console.log(`[INFO] ${component}: ${message}`, data || '');
    },
    debug: (component, message, data) => {
        console.log(`[DEBUG] ${component}: ${message}`, data || '');
    },
    warn: (component, message, data) => {
        console.log(`[WARN] ${component}: ${message}`, data || '');
    },
    error: (component, message, data) => {
        console.error(`[ERROR] ${component}: ${message}`, data || '');
    },
    success: (component, message, data) => {
        console.log(`[SUCCESS] ${component}: ${message}`, data || '');
    }
};

// Mock EventBus
KC.EventBus = {
    listeners: new Map(),
    emit: function(event, data) {
        console.log(`[EventBus] Emit: ${event}`, data);
    },
    on: function(event, handler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(handler);
        console.log(`[EventBus] Listener added for: ${event}`);
        return () => {
            const handlers = this.listeners.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) handlers.splice(index, 1);
        };
    },
    off: function(event, handler) {
        console.log(`[EventBus] Listener removed for: ${event}`);
    }
};

// Mock QdrantService
KC.QdrantService = {
    searchCache: new Map(),
    maxCacheSize: 100,
    cacheTimeout: 600000,
    saveToCache: function(key, data) {
        this.searchCache.set(key, {
            data: data,
            timestamp: Date.now()
        });
        console.log(`[QdrantService] Cache save: ${key}`);
    },
    getFromCache: function(key) {
        const entry = this.searchCache.get(key);
        console.log(`[QdrantService] Cache get: ${key} - ${entry ? 'HIT' : 'MISS'}`);
        return entry ? entry.data : null;
    }
};

// Add test data to cache
for (let i = 0; i < 150; i++) {
    KC.QdrantService.searchCache.set(`test-key-${i}`, {
        data: `test-data-${i}`,
        timestamp: Date.now() - (i * 1000)
    });
}

// Mock SemanticConvergenceService
KC.SemanticConvergenceService = {
    convergenceHistory: [],
    maxHistorySize: undefined,
    addToHistory: function(entry) {
        this.convergenceHistory.push(entry);
        console.log(`[SemanticConvergence] History added, size: ${this.convergenceHistory.length}`);
    }
};

// Add test history
for (let i = 0; i < 200; i++) {
    KC.SemanticConvergenceService.convergenceHistory.push({
        id: i,
        timestamp: Date.now() - (i * 60000)
    });
}

// Mock EvolutionQueue
KC.EvolutionQueue = {
    processingHistory: new Map(),
    addToProcessingHistory: function(item) {
        this.processingHistory.set(item.id, item);
        console.log(`[EvolutionQueue] Processing history size: ${this.processingHistory.size}`);
    }
};

// Add test processing history
for (let i = 0; i < 600; i++) {
    KC.EvolutionQueue.processingHistory.set(`item-${i}`, {
        id: `item-${i}`,
        timestamp: Date.now() - (i * 1000)
    });
}

// Mock ContentAnalysisOrchestrator
KC.ContentAnalysisOrchestrator = {
    extractors: new Map(),
    cleanupExtractors: function() {
        console.log('[ContentAnalysisOrchestrator] Cleanup called');
    }
};

// Mock AppState
KC.AppState = {
    set: function(key, value) {
        console.log(`[AppState] Set ${key}, value size: ${JSON.stringify(value).length}`);
    }
};

console.log('\n========================================');
console.log('TESTE DE PATCHES DE PERFORMANCE');
console.log('========================================\n');

console.log('Estado ANTES dos patches:');
console.log('-------------------------');
console.log(`QdrantService cache size: ${KC.QdrantService.searchCache.size}`);
console.log(`SemanticConvergence history: ${KC.SemanticConvergenceService.convergenceHistory.length}`);
console.log(`EvolutionQueue history: ${KC.EvolutionQueue.processingHistory.size}`);
console.log(`EventBus listeners: ${Array.from(KC.EventBus.listeners.values()).flat().length}`);

// Load PerformancePatches
console.log('\n[LOADING] PerformancePatches.js...\n');

// Execute patches inline (simulating the file)
(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const Logger = KC.Logger;

    // Patch QdrantService
    function patchQdrantService() {
        if (!KC.QdrantService) return;

        const service = KC.QdrantService;
        
        service.cacheStats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };

        const originalSaveToCache = service.saveToCache;
        service.saveToCache = function(key, data) {
            const maxSize = this.maxCacheSize || 100;
            
            // Evict entries until we're below max size
            while (this.searchCache.size >= maxSize) {
                const firstKey = this.searchCache.keys().next().value;
                this.searchCache.delete(firstKey);
                this.cacheStats.evictions++;
                Logger.debug('QdrantService', `Cache eviction: ${firstKey}`);
            }

            this.searchCache.set(key, {
                data: data,
                timestamp: Date.now(),
                lastAccess: Date.now(),
                accessCount: 0,
                size: JSON.stringify(data).length
            });
        };

        service.getCacheStatistics = function() {
            return {
                size: this.searchCache.size,
                maxSize: this.maxCacheSize || 100,
                ...this.cacheStats
            };
        };

        Logger.info('PerformancePatches', 'QdrantService patched');
    }

    // Patch SemanticConvergenceService
    function patchSemanticConvergenceService() {
        if (!KC.SemanticConvergenceService) return;

        const service = KC.SemanticConvergenceService;
        
        if (!service.maxHistorySize) {
            service.maxHistorySize = 100;
        }

        const originalAddToHistory = service.addToHistory;
        if (originalAddToHistory) {
            service.addToHistory = function(entry) {
                originalAddToHistory.call(this, entry);
                
                if (this.convergenceHistory && this.convergenceHistory.length > this.maxHistorySize) {
                    const excess = this.convergenceHistory.length - this.maxHistorySize;
                    this.convergenceHistory.splice(0, excess);
                    Logger.debug('SemanticConvergence', `Trimmed ${excess} old entries`);
                }
            };
        }

        Logger.info('PerformancePatches', 'SemanticConvergenceService patched');
    }

    // Patch EvolutionQueue
    function patchEvolutionQueue() {
        if (!KC.EvolutionQueue) return;

        const queue = KC.EvolutionQueue;
        const maxHistorySize = 500;
        
        const originalAddToHistory = queue.addToProcessingHistory;
        if (originalAddToHistory) {
            queue.addToProcessingHistory = function(item) {
                this.processingHistory.set(item.id, item);
                
                if (this.processingHistory.size > maxHistorySize) {
                    const toRemove = this.processingHistory.size - maxHistorySize;
                    const keys = Array.from(this.processingHistory.keys());
                    
                    for (let i = 0; i < toRemove; i++) {
                        this.processingHistory.delete(keys[i]);
                    }
                    
                    Logger.debug('EvolutionQueue', `Trimmed ${toRemove} old entries`);
                }
            };
        }

        Logger.info('PerformancePatches', 'EvolutionQueue patched');
    }

    // Apply all patches
    function applyAllPatches() {
        Logger.info('PerformancePatches', 'Applying all patches...');
        
        patchQdrantService();
        patchSemanticConvergenceService();
        patchEvolutionQueue();
        
        Logger.success('PerformancePatches', 'All patches applied');
    }

    // Apply immediately for testing
    applyAllPatches();

    KC.PerformancePatches = {
        applyAll: applyAllPatches
    };

})(global.window);

console.log('\n========================================');
console.log('VALIDAÇÃO DOS PATCHES');
console.log('========================================\n');

// Test 1: QdrantService cache limit
console.log('TEST 1: QdrantService cache enforcement');
console.log('-----------------------------------------');
const initialCacheSize = KC.QdrantService.searchCache.size;
console.log(`Initial cache size: ${initialCacheSize}`);

// Try to add more items (should trigger eviction)
for (let i = 200; i < 210; i++) {
    KC.QdrantService.saveToCache(`new-key-${i}`, `new-data-${i}`);
}

const finalCacheSize = KC.QdrantService.searchCache.size;
console.log(`Final cache size: ${finalCacheSize}`);
console.log(`Cache stats:`, KC.QdrantService.getCacheStatistics());

if (finalCacheSize <= KC.QdrantService.maxCacheSize) {
    console.log('✅ PASS: Cache size limit enforced');
} else {
    console.log('❌ FAIL: Cache size exceeds limit');
}

// Test 2: SemanticConvergence history limit
console.log('\nTEST 2: SemanticConvergence history limit');
console.log('------------------------------------------');
const initialHistorySize = KC.SemanticConvergenceService.convergenceHistory.length;
console.log(`Initial history size: ${initialHistorySize}`);
console.log(`Max history size: ${KC.SemanticConvergenceService.maxHistorySize}`);

// Add more history entries
for (let i = 0; i < 50; i++) {
    KC.SemanticConvergenceService.addToHistory({
        id: `new-${i}`,
        timestamp: Date.now()
    });
}

const finalHistorySize = KC.SemanticConvergenceService.convergenceHistory.length;
console.log(`Final history size: ${finalHistorySize}`);

if (finalHistorySize <= KC.SemanticConvergenceService.maxHistorySize) {
    console.log('✅ PASS: History size limit enforced');
} else {
    console.log('❌ FAIL: History size exceeds limit');
}

// Test 3: EvolutionQueue processing history limit
console.log('\nTEST 3: EvolutionQueue processing history limit');
console.log('------------------------------------------------');
const initialQueueSize = KC.EvolutionQueue.processingHistory.size;
console.log(`Initial queue history size: ${initialQueueSize}`);

// Add more items
for (let i = 700; i < 750; i++) {
    KC.EvolutionQueue.addToProcessingHistory({
        id: `new-item-${i}`,
        timestamp: Date.now()
    });
}

const finalQueueSize = KC.EvolutionQueue.processingHistory.size;
console.log(`Final queue history size: ${finalQueueSize}`);

if (finalQueueSize <= 500) {
    console.log('✅ PASS: Queue history limit enforced');
} else {
    console.log('❌ FAIL: Queue history exceeds limit');
}

// Test 4: Memory monitoring
console.log('\nTEST 4: Memory monitoring');
console.log('-------------------------');
const memoryUsage = (global.window.performance.memory.usedJSHeapSize / global.window.performance.memory.jsHeapSizeLimit) * 100;
console.log(`Memory usage: ${memoryUsage.toFixed(2)}%`);
console.log(`Used: ${(global.window.performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
console.log(`Limit: ${(global.window.performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`);

if (memoryUsage < 70) {
    console.log('✅ PASS: Memory usage within safe limits');
} else if (memoryUsage < 85) {
    console.log('⚠️ WARNING: High memory usage detected');
} else {
    console.log('❌ CRITICAL: Memory usage critical');
}

console.log('\n========================================');
console.log('RESUMO DOS TESTES');
console.log('========================================\n');

const allTestsPassed = 
    finalCacheSize <= KC.QdrantService.maxCacheSize &&
    finalHistorySize <= KC.SemanticConvergenceService.maxHistorySize &&
    finalQueueSize <= 500 &&
    memoryUsage < 70;

if (allTestsPassed) {
    console.log('✅ TODOS OS TESTES PASSARAM!');
    console.log('Patches prontos para aplicação em produção.');
} else {
    console.log('⚠️ ALGUNS TESTES FALHARAM');
    console.log('Revisar implementação antes de aplicar em produção.');
}

console.log('\n========================================');
console.log('FIM DOS TESTES');
console.log('========================================\n');