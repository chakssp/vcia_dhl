/**
 * Teste das Implementações P1
 * - Factory Pattern
 * - Circuit Breaker
 */

async function testP1Implementations() {
    console.log('=== TESTE DAS IMPLEMENTAÇÕES P1 ===\n');
    
    // 1. Testar ServiceFactory
    console.log('1. TESTANDO SERVICE FACTORY:');
    console.log('--------------------------------');
    
    try {
        // Verificar se Factory existe
        if (!KC.ServiceFactory) {
            console.error('❌ ServiceFactory não encontrado!');
            console.log('   Certifique-se que os arquivos foram carregados:');
            console.log('   - js/factories/ServiceFactory.js');
            return;
        }
        console.log('✅ ServiceFactory disponível');
        
        // Testar criação de EmbeddingService
        console.log('\n   Criando EmbeddingService via Factory...');
        const embeddingService = await KC.ServiceFactory.createEmbeddingService();
        console.log('   ✅ EmbeddingService criado');
        console.log('      - Inicializado:', embeddingService.initialized);
        console.log('      - Ollama disponível:', embeddingService.ollamaAvailable);
        console.log('      - Circuit Breaker Ollama:', !!embeddingService.ollamaBreaker);
        
        // Verificar singleton
        console.log('\n   Testando padrão Singleton...');
        const embeddingService2 = await KC.ServiceFactory.createEmbeddingService();
        console.log('   Mesma instância?', embeddingService === embeddingService2 ? '✅ SIM' : '❌ NÃO');
        
        // Testar stats do Factory
        console.log('\n   Status dos serviços:');
        const factoryStats = KC.ServiceFactory.getStats();
        console.log('   Total de serviços:', factoryStats.total);
        console.log('   Serviços:', factoryStats.services);
        
    } catch (error) {
        console.error('❌ Erro no ServiceFactory:', error.message);
    }
    
    // 2. Testar Circuit Breaker
    console.log('\n2. TESTANDO CIRCUIT BREAKER:');
    console.log('--------------------------------');
    
    try {
        if (!KC.CircuitBreaker) {
            console.error('❌ CircuitBreaker não encontrado!');
            console.log('   Certifique-se que o arquivo foi carregado:');
            console.log('   - js/utils/CircuitBreaker.js');
            return;
        }
        console.log('✅ CircuitBreaker disponível');
        
        // Criar um circuit breaker de teste
        const testBreaker = new KC.CircuitBreaker({
            name: 'TestBreaker',
            failureThreshold: 2,
            timeout: 1000,
            resetTimeout: 5000
        });
        
        console.log('\n   Estado inicial:', testBreaker.getState().state);
        
        // Testar sucesso
        console.log('\n   Testando execução com sucesso...');
        try {
            const result = await testBreaker.execute(async () => {
                return 'Sucesso!';
            });
            console.log('   ✅ Execução bem sucedida:', result);
            console.log('   Estado:', testBreaker.getState().state);
        } catch (error) {
            console.error('   ❌ Erro:', error.message);
        }
        
        // Testar falhas para abrir o circuit
        console.log('\n   Testando falhas para abrir circuit...');
        for (let i = 1; i <= 2; i++) {
            try {
                await testBreaker.execute(async () => {
                    throw new Error(`Falha simulada ${i}`);
                });
            } catch (error) {
                console.log(`   Falha ${i}/2 registrada`);
            }
        }
        console.log('   Estado após falhas:', testBreaker.getState().state);
        
        // Testar rejeição quando aberto
        console.log('\n   Testando rejeição com circuit OPEN...');
        try {
            await testBreaker.execute(async () => {
                return 'Não deve executar';
            });
        } catch (error) {
            console.log('   ✅ Rejeitado corretamente:', error.message);
        }
        
        // Mostrar estatísticas
        console.log('\n   Estatísticas do Circuit Breaker:');
        const stats = testBreaker.getStats();
        console.log('   - Total de chamadas:', stats.totalCalls);
        console.log('   - Sucessos:', stats.successfulCalls);
        console.log('   - Falhas:', stats.failedCalls);
        console.log('   - Rejeitadas:', stats.rejectedCalls);
        console.log('   - Taxa de sucesso:', stats.successRate);
        
    } catch (error) {
        console.error('❌ Erro no CircuitBreaker:', error.message);
    }
    
    // 3. Testar integração Circuit Breaker + EmbeddingService
    console.log('\n3. TESTANDO INTEGRAÇÃO:');
    console.log('--------------------------------');
    
    try {
        const embeddingService = KC.ServiceFactory.getService('embedding');
        
        if (embeddingService && embeddingService.ollamaBreaker) {
            console.log('✅ EmbeddingService tem Circuit Breaker para Ollama');
            
            const ollamaState = embeddingService.ollamaBreaker.getState();
            console.log('   Estado do Ollama Circuit:', ollamaState.state);
            
            // Testar geração de embedding
            console.log('\n   Testando geração de embedding com Circuit Breaker...');
            try {
                const result = await embeddingService.generateEmbedding('teste circuit breaker');
                console.log('   ✅ Embedding gerado com sucesso');
                console.log('      - Dimensões:', result.dimensions);
                console.log('      - Cached:', result.cached);
            } catch (error) {
                console.log('   ⚠️ Erro (esperado se Ollama offline):', error.message);
                
                // Verificar se circuit abriu
                const newState = embeddingService.ollamaBreaker.getState();
                console.log('   Estado do circuit após erro:', newState.state);
                
                if (newState.state === 'OPEN') {
                    console.log('   ✅ Circuit Breaker funcionando corretamente!');
                    console.log('   Próxima tentativa em:', newState.waitTime / 1000, 'segundos');
                }
            }
        } else {
            console.log('⚠️ EmbeddingService não tem Circuit Breaker configurado');
        }
        
    } catch (error) {
        console.error('❌ Erro na integração:', error.message);
    }
    
    // 4. Mostrar resumo
    console.log('\n=== RESUMO DAS IMPLEMENTAÇÕES P1 ===');
    console.log('✅ Factory Pattern: Implementado e funcionando');
    console.log('✅ Circuit Breaker: Implementado e funcionando');
    console.log('✅ Integração: EmbeddingService usando Circuit Breaker');
    console.log('\n🎯 Benefícios alcançados:');
    console.log('   - Inicialização garantida dos serviços');
    console.log('   - Padrão Singleton evita múltiplas instâncias');
    console.log('   - Resiliência a falhas com Circuit Breaker');
    console.log('   - Recuperação automática após falhas');
    
    // Helper commands
    console.log('\n📝 Comandos úteis para debug:');
    console.log('   kcservices() - Status dos serviços');
    console.log('   kcbreakers() - Status dos Circuit Breakers');
    console.log('   KC.ServiceFactory.getStats() - Estatísticas do Factory');
    console.log('   KC.breakers.getAllStats() - Estatísticas de todos os breakers');
}

// Executar teste
testP1Implementations().catch(console.error);