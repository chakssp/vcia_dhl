/**
 * Script de Teste de Integração - UnifiedConfidenceSystem
 * 
 * Este script valida a integração completa do sistema de confiança unificado
 * com dados do Qdrant e arquivos simulados.
 */

console.log('🧪 Iniciando Teste de Integração do UnifiedConfidenceSystem...\n');

// Função principal de teste
async function runIntegrationTest() {
    const results = {
        passed: 0,
        failed: 0,
        tests: []
    };

    // Test 1: Verificar componentes carregados
    console.log('📋 Test 1: Verificando componentes...');
    const componentsTest = await testComponents();
    results.tests.push(componentsTest);
    if (componentsTest.passed) results.passed++; else results.failed++;

    // Test 2: Verificar feature flags
    console.log('\n📋 Test 2: Verificando feature flags...');
    const flagsTest = await testFeatureFlags();
    results.tests.push(flagsTest);
    if (flagsTest.passed) results.passed++; else results.failed++;

    // Test 3: Testar conexão Qdrant
    console.log('\n📋 Test 3: Testando conexão Qdrant...');
    const qdrantTest = await testQdrantConnection();
    results.tests.push(qdrantTest);
    if (qdrantTest.passed) results.passed++; else results.failed++;

    // Test 4: Testar normalização de scores
    console.log('\n📋 Test 4: Testando normalização de scores...');
    const normalizationTest = await testScoreNormalization();
    results.tests.push(normalizationTest);
    if (normalizationTest.passed) results.passed++; else results.failed++;

    // Test 5: Testar processamento de arquivos
    console.log('\n📋 Test 5: Testando processamento de arquivos...');
    const filesTest = await testFileProcessing();
    results.tests.push(filesTest);
    if (filesTest.passed) results.passed++; else results.failed++;

    // Test 6: Testar performance
    console.log('\n📋 Test 6: Testando performance...');
    const performanceTest = await testPerformance();
    results.tests.push(performanceTest);
    if (performanceTest.passed) results.passed++; else results.failed++;

    // Relatório final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO FINAL DE TESTES');
    console.log('='.repeat(60));
    console.log(`✅ Testes aprovados: ${results.passed}`);
    console.log(`❌ Testes falhados: ${results.failed}`);
    console.log(`📈 Taxa de sucesso: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
    
    return results;
}

// Test 1: Componentes
async function testComponents() {
    const test = { name: 'Componentes', passed: false, details: {} };
    
    try {
        test.details = {
            UnifiedController: !!KC.UnifiedConfidenceControllerInstance,
            QdrantScoreBridge: !!KC.QdrantScoreBridgeInstance,
            ScoreNormalizer: !!KC.ScoreNormalizerInstance,
            FeatureFlagManager: !!KC.FeatureFlagManagerInstance,
            PerformanceMonitor: !!KC.ConfidencePerformanceMonitorInstance,
            DataValidator: !!KC.DataValidationManagerInstance
        };
        
        test.passed = Object.values(test.details).every(v => v === true);
        
        if (test.passed) {
            console.log('✅ Todos os componentes carregados');
        } else {
            console.log('❌ Componentes faltando:', 
                Object.entries(test.details)
                    .filter(([k, v]) => !v)
                    .map(([k]) => k)
            );
        }
    } catch (error) {
        test.error = error.message;
        console.error('❌ Erro:', error.message);
    }
    
    return test;
}

// Test 2: Feature Flags
async function testFeatureFlags() {
    const test = { name: 'Feature Flags', passed: false, details: {} };
    
    try {
        const flags = KC.FeatureFlagManagerInstance.getAllFlags();
        
        test.details = {
            unified_confidence_system: flags.unified_confidence_system?.enabled,
            qdrant_score_bridge: flags.qdrant_score_bridge?.enabled,
            confidence_performance_monitoring: flags.confidence_performance_monitoring?.enabled
        };
        
        test.passed = test.details.unified_confidence_system && 
                     test.details.qdrant_score_bridge;
        
        console.log(test.passed ? '✅ Feature flags habilitadas corretamente' : 
                                  '❌ Feature flags não configuradas');
    } catch (error) {
        test.error = error.message;
        console.error('❌ Erro:', error.message);
    }
    
    return test;
}

// Test 3: Conexão Qdrant
async function testQdrantConnection() {
    const test = { name: 'Conexão Qdrant', passed: false, details: {} };
    
    try {
        // Verificar se QdrantScoreBridge está inicializado
        const stats = KC.QdrantScoreBridgeInstance.getStats();
        
        test.details = {
            initialized: stats.initialized,
            cachedScores: stats.cachedScores,
            fileMappings: stats.fileMappings
        };
        
        test.passed = stats.initialized && stats.cachedScores > 0;
        
        console.log(test.passed ? 
            `✅ Qdrant conectado: ${stats.cachedScores} scores carregados` : 
            '❌ Qdrant não inicializado'
        );
    } catch (error) {
        test.error = error.message;
        console.error('❌ Erro:', error.message);
    }
    
    return test;
}

// Test 4: Normalização de Scores
async function testScoreNormalization() {
    const test = { name: 'Normalização de Scores', passed: false, details: {} };
    
    try {
        const testCases = [
            { input: 21.5, type: 'qdrant', expected: { min: 0.7, max: 0.75 } },
            { input: 85, type: 'percentage', expected: { min: 0.84, max: 0.86 } },
            { input: 0.5, type: 'relevance', expected: { min: 0.49, max: 0.51 } }
        ];
        
        test.details.results = [];
        
        for (const testCase of testCases) {
            const result = KC.ScoreNormalizerInstance.normalize(
                testCase.input, 
                testCase.type, 
                'linear'
            );
            
            const isValid = result.normalizedScore >= testCase.expected.min && 
                           result.normalizedScore <= testCase.expected.max;
            
            test.details.results.push({
                input: testCase.input,
                type: testCase.type,
                output: result.normalizedScore,
                valid: isValid
            });
        }
        
        test.passed = test.details.results.every(r => r.valid);
        
        console.log(test.passed ? '✅ Normalização funcionando corretamente' : 
                                  '❌ Problemas na normalização');
    } catch (error) {
        test.error = error.message;
        console.error('❌ Erro:', error.message);
    }
    
    return test;
}

// Test 5: Processamento de Arquivos
async function testFileProcessing() {
    const test = { name: 'Processamento de Arquivos', passed: false, details: {} };
    
    try {
        // Criar arquivos de teste
        const testFiles = [
            {
                id: 'projeto-ml-insights.md',
                name: 'projeto-ml-insights.md',
                content: 'Machine learning insights and breakthroughs...',
                categories: ['ML', 'AI', 'insights'],
                lastModified: new Date()
            },
            {
                id: 'decisoes-estrategicas.txt',
                name: 'decisoes-estrategicas.txt',
                content: 'Decisões estratégicas importantes do projeto...',
                categories: ['estratégia', 'decisões'],
                lastModified: new Date()
            },
            {
                id: 'notas-reuniao.md',
                name: 'notas-reuniao.md',
                content: 'Notas da reunião com insights importantes...',
                categories: ['reuniões'],
                lastModified: new Date()
            }
        ];
        
        // Processar arquivos
        const results = [];
        for (const file of testFiles) {
            const confidence = await KC.UnifiedConfidenceControllerInstance.getFileConfidence(file.id);
            results.push({
                file: file.name,
                confidence: confidence.confidence,
                source: confidence.source
            });
        }
        
        test.details.results = results;
        test.passed = results.every(r => r.confidence >= 0 && r.confidence <= 100);
        
        console.log(test.passed ? '✅ Arquivos processados com sucesso' : 
                                  '❌ Erro no processamento');
        
        // Mostrar resultados
        results.forEach(r => {
            console.log(`  📄 ${r.file}: ${r.confidence}% (${r.source})`);
        });
        
    } catch (error) {
        test.error = error.message;
        console.error('❌ Erro:', error.message);
    }
    
    return test;
}

// Test 6: Performance
async function testPerformance() {
    const test = { name: 'Performance', passed: false, details: {} };
    
    try {
        const iterations = 100;
        const startTime = performance.now();
        
        // Executar múltiplas operações
        for (let i = 0; i < iterations; i++) {
            await KC.UnifiedConfidenceControllerInstance.getFileConfidence(`test-file-${i}.md`);
        }
        
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const avgTime = totalTime / iterations;
        
        test.details = {
            iterations: iterations,
            totalTime: Math.round(totalTime),
            averageTime: avgTime.toFixed(2),
            targetTime: 100 // máximo 100ms por operação
        };
        
        test.passed = avgTime < test.details.targetTime;
        
        console.log(test.passed ? 
            `✅ Performance adequada: ${avgTime.toFixed(2)}ms por operação` : 
            `❌ Performance lenta: ${avgTime.toFixed(2)}ms por operação`
        );
        
        // Obter relatório de performance
        const perfReport = KC.ConfidencePerformanceMonitorInstance.getPerformanceReport();
        console.log(`  📊 Cache hits: ${perfReport.metrics.cacheHitRate}%`);
        console.log(`  📊 Taxa de sucesso: ${perfReport.metrics.successRate * 100}%`);
        
    } catch (error) {
        test.error = error.message;
        console.error('❌ Erro:', error.message);
    }
    
    return test;
}

// Executar todos os testes
console.log('🚀 Knowledge Consolidator - UnifiedConfidenceSystem');
console.log('📅 Data:', new Date().toLocaleString('pt-BR'));
console.log('='.repeat(60) + '\n');

runIntegrationTest().then(results => {
    console.log('\n✅ Testes concluídos!');
    
    // Salvar resultados no localStorage para análise posterior
    localStorage.setItem('unified-confidence-test-results', JSON.stringify({
        timestamp: new Date().toISOString(),
        results: results
    }));
    
    console.log('\n💡 Resultados salvos em localStorage');
    console.log('   Use: JSON.parse(localStorage.getItem("unified-confidence-test-results"))');
});