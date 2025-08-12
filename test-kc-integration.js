/**
 * Teste de Integração P1 com KC
 * Verifica se Factory Pattern e Circuit Breaker estão integrados ao sistema
 */

async function testKCIntegration() {
    console.log('=== TESTE DE INTEGRAÇÃO P1 COM KC ===\n');
    
    // 1. Verificar se componentes P1 estão registrados
    console.log('1. VERIFICANDO COMPONENTES P1:');
    console.log('--------------------------------');
    
    const p1Components = {
        'ServiceFactory': KC.ServiceFactory,
        'CircuitBreaker': KC.CircuitBreaker,
        'CircuitBreakerManager': KC.breakers
    };
    
    for (const [name, component] of Object.entries(p1Components)) {
        if (component) {
            console.log(`✅ ${name} registrado no KC`);
        } else {
            console.error(`❌ ${name} NÃO encontrado no KC`);
        }
    }
    
    // 2. Verificar serviços inicializados via Factory
    console.log('\n2. VERIFICANDO SERVIÇOS VIA FACTORY:');
    console.log('--------------------------------');
    
    if (KC.ServiceFactory) {
        // Verificar se serviços foram criados
        const stats = KC.ServiceFactory.getStats();
        console.log('Serviços registrados no Factory:', stats.total);
        
        for (const [name, info] of Object.entries(stats.services)) {
            console.log(`   ${name}:`, info.initialized ? '✅ Inicializado' : '⚠️ Não inicializado');
        }
        
        // Verificar se estão disponíveis no KC
        console.log('\nServiços disponíveis no namespace KC:');
        console.log('   KC.EmbeddingService:', KC.EmbeddingService ? '✅' : '❌');
        console.log('   KC.QdrantService:', KC.QdrantService ? '✅' : '❌');
        console.log('   KC.SimilaritySearchService:', KC.SimilaritySearchService ? '✅' : '❌');
        
    } else {
        console.error('❌ ServiceFactory não disponível');
    }
    
    // 3. Verificar Circuit Breakers ativos
    console.log('\n3. VERIFICANDO CIRCUIT BREAKERS:');
    console.log('--------------------------------');
    
    if (KC.breakers) {
        const breakerStats = KC.breakers.getAllStats();
        const breakerCount = Object.keys(breakerStats).length;
        
        if (breakerCount > 0) {
            console.log(`✅ ${breakerCount} Circuit Breakers ativos`);
            for (const [name, stats] of Object.entries(breakerStats)) {
                console.log(`   ${name}: ${stats.currentState}`);
            }
        } else {
            console.log('⚠️ Nenhum Circuit Breaker ativo');
            console.log('   (Normal se serviços não foram usados ainda)');
        }
    } else {
        console.error('❌ CircuitBreakerManager não disponível');
    }
    
    // 4. Testar uso real
    console.log('\n4. TESTANDO USO REAL:');
    console.log('--------------------------------');
    
    try {
        // Tentar gerar um embedding
        if (KC.EmbeddingService) {
            console.log('Testando EmbeddingService...');
            
            // Verificar se tem Circuit Breaker
            if (KC.EmbeddingService.ollamaBreaker) {
                console.log('   ✅ Circuit Breaker configurado');
                const state = KC.EmbeddingService.ollamaBreaker.getState();
                console.log('   Estado:', state.state);
            } else {
                console.log('   ⚠️ Sem Circuit Breaker');
            }
            
            // Tentar gerar embedding
            try {
                const result = await KC.EmbeddingService.generateEmbedding('teste integração KC');
                console.log('   ✅ Embedding gerado com sucesso');
            } catch (error) {
                console.log('   ⚠️ Erro ao gerar embedding (esperado se Ollama offline)');
                
                // Verificar se Circuit Breaker reagiu
                if (KC.EmbeddingService.ollamaBreaker) {
                    const newState = KC.EmbeddingService.ollamaBreaker.getState();
                    console.log('   Circuit Breaker após erro:', newState.state);
                }
            }
        } else {
            console.log('⚠️ EmbeddingService não disponível');
        }
        
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }
    
    // 5. Verificar compatibilidade
    console.log('\n5. VERIFICANDO COMPATIBILIDADE:');
    console.log('--------------------------------');
    
    // Verificar se modo legado funciona
    const hasLegacySupport = KC.EmbeddingServiceClass && KC.QdrantServiceClass;
    console.log('Suporte a modo legado:', hasLegacySupport ? '✅' : '❌');
    
    // Verificar se AppController tem os módulos
    if (KC.AppController) {
        const modules = KC.AppController.modules || {};
        console.log('Módulos no AppController:');
        console.log('   EmbeddingService:', modules.EmbeddingService ? '✅' : '❌');
        console.log('   QdrantService:', modules.QdrantService ? '✅' : '❌');
        console.log('   ServiceFactory:', modules.ServiceFactory ? '✅' : '❌');
    }
    
    // Resumo
    console.log('\n=== RESUMO DA INTEGRAÇÃO ===');
    
    const checks = {
        'Factory Pattern': !!KC.ServiceFactory,
        'Circuit Breaker': !!KC.CircuitBreaker,
        'Serviços via Factory': KC.ServiceFactory?.getStats().total > 0,
        'Circuit Breaker nos serviços': !!KC.EmbeddingService?.ollamaBreaker,
        'Compatibilidade mantida': !!KC.EmbeddingService
    };
    
    let passed = 0;
    let failed = 0;
    
    for (const [feature, status] of Object.entries(checks)) {
        console.log(`${status ? '✅' : '❌'} ${feature}`);
        if (status) passed++; else failed++;
    }
    
    console.log(`\n📊 Resultado: ${passed}/${passed + failed} testes passaram`);
    
    if (passed === Object.keys(checks).length) {
        console.log('🎉 INTEGRAÇÃO P1 COMPLETA COM SUCESSO!');
    } else if (passed > 0) {
        console.log('⚠️ Integração parcial - alguns componentes precisam ser verificados');
    } else {
        console.log('❌ Integração falhou - verificar configuração');
    }
}

// Executar teste
console.log('Aguardando sistema carregar...\n');
setTimeout(() => {
    testKCIntegration().catch(console.error);
}, 1000);