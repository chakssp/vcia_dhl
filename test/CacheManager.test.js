/**
 * CacheManager.test.js - Testes para o CacheManager unificado
 * 
 * Valida funcionalidade, performance e compatibilidade
 */

(function() {
    'use strict';

    const TestSuite = {
        name: 'CacheManager Tests',
        tests: [],
        results: {
            passed: 0,
            failed: 0,
            errors: []
        },

        /**
         * Registra um teste
         */
        test(name, fn) {
            this.tests.push({ name, fn });
        },

        /**
         * Executa todos os testes
         */
        async runAll() {
            console.log(`🧪 Iniciando ${this.name}...`);
            
            for (const test of this.tests) {
                try {
                    await test.fn();
                    this.results.passed++;
                    console.log(`✅ ${test.name}`);
                } catch (error) {
                    this.results.failed++;
                    this.results.errors.push({ test: test.name, error });
                    console.error(`❌ ${test.name}:`, error.message);
                }
            }

            console.log(`\n📊 Resultados:`);
            console.log(`✅ Passou: ${this.results.passed}`);
            console.log(`❌ Falhou: ${this.results.failed}`);
            
            return this.results;
        },

        /**
         * Assertion helpers
         */
        assert: {
            equal(actual, expected, message) {
                if (actual !== expected) {
                    throw new Error(message || `Expected ${expected}, got ${actual}`);
                }
            },
            
            notEqual(actual, expected, message) {
                if (actual === expected) {
                    throw new Error(message || `Expected not ${expected}, got ${actual}`);
                }
            },
            
            isTrue(value, message) {
                if (value !== true) {
                    throw new Error(message || `Expected true, got ${value}`);
                }
            },
            
            isFalse(value, message) {
                if (value !== false) {
                    throw new Error(message || `Expected false, got ${value}`);
                }
            },
            
            isNull(value, message) {
                if (value !== null) {
                    throw new Error(message || `Expected null, got ${value}`);
                }
            },
            
            isNotNull(value, message) {
                if (value === null) {
                    throw new Error(message || `Expected not null, got null`);
                }
            }
        }
    };

    const { assert } = TestSuite;
    const KC = window.KnowledgeConsolidator;

    // Teste 1: Singleton Pattern
    TestSuite.test('CacheManager é singleton', () => {
        const instance1 = new KC.CacheManager.constructor();
        const instance2 = new KC.CacheManager.constructor();
        assert.equal(instance1, instance2, 'Deveria retornar a mesma instância');
    });

    // Teste 2: Operações básicas
    TestSuite.test('Get/Set básico funciona', () => {
        KC.cache.clear();
        
        // Set
        const result = KC.cache.set('test-key', 'test-value');
        assert.isTrue(result, 'Set deveria retornar true');
        
        // Get
        const value = KC.cache.get('test-key');
        assert.equal(value, 'test-value', 'Deveria retornar o valor correto');
        
        // Get inexistente
        const notFound = KC.cache.get('non-existent');
        assert.isNull(notFound, 'Deveria retornar null para chave inexistente');
    });

    // Teste 3: TTL e expiração
    TestSuite.test('TTL expira corretamente', async () => {
        KC.cache.clear();
        
        // Set com TTL de 100ms
        KC.cache.set('ttl-test', 'value', { ttl: 100 });
        
        // Verificar imediatamente
        let value = KC.cache.get('ttl-test');
        assert.equal(value, 'value', 'Valor deveria estar disponível');
        
        // Aguardar expiração
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Verificar após expiração
        value = KC.cache.get('ttl-test');
        assert.isNull(value, 'Valor deveria ter expirado');
    });

    // Teste 4: Múltiplos stores
    TestSuite.test('Múltiplos stores funcionam independentemente', () => {
        KC.CacheManager.clear();
        
        // Criar stores
        KC.CacheManager.createStore('store1');
        KC.CacheManager.createStore('store2');
        
        // Adicionar em stores diferentes
        KC.cache.set('key', 'value1', { store: 'store1' });
        KC.cache.set('key', 'value2', { store: 'store2' });
        
        // Verificar isolamento
        const value1 = KC.cache.get('key', 'store1');
        const value2 = KC.cache.get('key', 'store2');
        
        assert.equal(value1, 'value1', 'Store1 deveria ter value1');
        assert.equal(value2, 'value2', 'Store2 deveria ter value2');
    });

    // Teste 5: Estratégia LRU
    TestSuite.test('Estratégia LRU remove menos usado', () => {
        KC.CacheManager.clear();
        
        // Configurar para máximo 3 entradas
        KC.CacheManager.updateConfig({
            maxEntries: 3,
            strategy: 'lru'
        });
        
        // Adicionar 3 entradas
        KC.cache.set('key1', 'value1');
        KC.cache.set('key2', 'value2');
        KC.cache.set('key3', 'value3');
        
        // Acessar key1 e key3 (key2 fica como LRU)
        KC.cache.get('key1');
        KC.cache.get('key3');
        
        // Adicionar 4ª entrada (deve remover key2)
        KC.cache.set('key4', 'value4');
        
        // Verificar
        assert.isNotNull(KC.cache.get('key1'), 'Key1 deveria existir');
        assert.isNull(KC.cache.get('key2'), 'Key2 deveria ter sido removida');
        assert.isNotNull(KC.cache.get('key3'), 'Key3 deveria existir');
        assert.isNotNull(KC.cache.get('key4'), 'Key4 deveria existir');
    });

    // Teste 6: Estatísticas
    TestSuite.test('Estatísticas são registradas corretamente', () => {
        KC.CacheManager.clear();
        KC.CacheManager.resetStats();
        
        // Operações
        KC.cache.set('key1', 'value1');
        KC.cache.get('key1'); // Hit
        KC.cache.get('key2'); // Miss
        
        // Verificar stats
        const stats = KC.cache.stats();
        assert.equal(stats.hits, 1, 'Deveria ter 1 hit');
        assert.equal(stats.misses, 1, 'Deveria ter 1 miss');
        assert.equal(stats.totalEntries, 1, 'Deveria ter 1 entrada');
    });

    // Teste 7: Remoção
    TestSuite.test('Remove funciona corretamente', () => {
        KC.cache.clear();
        
        KC.cache.set('key-to-remove', 'value');
        assert.isNotNull(KC.cache.get('key-to-remove'), 'Chave deveria existir');
        
        const removed = KC.cache.remove('key-to-remove');
        assert.isTrue(removed, 'Remove deveria retornar true');
        assert.isNull(KC.cache.get('key-to-remove'), 'Chave não deveria mais existir');
    });

    // Teste 8: Clear
    TestSuite.test('Clear limpa o cache', () => {
        KC.cache.clear();
        
        // Adicionar várias entradas
        KC.cache.set('key1', 'value1');
        KC.cache.set('key2', 'value2');
        KC.cache.set('key3', 'value3');
        
        // Clear
        KC.cache.clear();
        
        // Verificar
        assert.isNull(KC.cache.get('key1'), 'Key1 não deveria existir');
        assert.isNull(KC.cache.get('key2'), 'Key2 não deveria existir');
        assert.isNull(KC.cache.get('key3'), 'Key3 não deveria existir');
    });

    // Teste 9: Performance
    TestSuite.test('Performance adequada para 1000 operações', () => {
        KC.cache.clear();
        
        const startTime = performance.now();
        
        // 1000 sets
        for (let i = 0; i < 1000; i++) {
            KC.cache.set(`key${i}`, `value${i}`);
        }
        
        // 1000 gets
        for (let i = 0; i < 1000; i++) {
            KC.cache.get(`key${i}`);
        }
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        assert.isTrue(duration < 1000, `Performance inadequada: ${duration}ms para 2000 operações`);
        console.log(`  ⚡ Performance: ${duration.toFixed(2)}ms para 2000 operações`);
    });

    // Teste 10: Compatibilidade com código existente
    TestSuite.test('Compatível com padrões existentes', () => {
        KC.cache.clear();
        
        // Simular uso pelos componentes existentes
        
        // ContentAnalysisOrchestrator pattern
        const cacheKey = 'analysis_file123';
        const analysisData = { scores: { content: 75 }, metadata: {} };
        KC.cache.set(cacheKey, analysisData, { store: 'analysis' });
        
        const cached = KC.cache.get(cacheKey, 'analysis');
        assert.equal(cached.scores.content, 75, 'Deveria recuperar dados de análise');
        
        // SemanticConvergenceService pattern
        const convergenceKey = 'convergence_batch1';
        const convergenceData = { points: [], insights: [] };
        KC.cache.set(convergenceKey, convergenceData, { ttl: 60000 });
        
        const convergenceCached = KC.cache.get(convergenceKey);
        assert.isNotNull(convergenceCached, 'Deveria recuperar dados de convergência');
    });

    // Exportar para uso global
    window.CacheManagerTests = TestSuite;

    // Auto-executar se no console
    if (typeof console !== 'undefined') {
        console.log('🚀 Para executar os testes, digite: CacheManagerTests.runAll()');
    }

})();