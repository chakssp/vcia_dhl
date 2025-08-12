/**
 * Script de Validação Pós-Deploy
 * Execute no console após o deploy para validar o sistema
 */

console.log('🚀 Iniciando validação pós-deploy...\n');

async function validateDeployment() {
    const results = {
        embedding: false,
        qdrant: false,
        factory: false,
        circuitBreaker: false,
        overall: false
    };
    
    try {
        // 1. Validar Factory Pattern
        console.log('1️⃣ Validando Factory Pattern...');
        if (KC.ServiceFactory) {
            console.log('   ✅ ServiceFactory disponível');
            results.factory = true;
        } else {
            console.log('   ❌ ServiceFactory não encontrado');
        }
        
        // 2. Validar Circuit Breaker
        console.log('\n2️⃣ Validando Circuit Breaker...');
        if (KC.CircuitBreaker && KC.breakers) {
            console.log('   ✅ Circuit Breaker disponível');
            results.circuitBreaker = true;
        } else {
            console.log('   ❌ Circuit Breaker não encontrado');
        }
        
        // 3. Validar EmbeddingService
        console.log('\n3️⃣ Validando EmbeddingService...');
        if (KC.EmbeddingService) {
            const ollamaOk = await KC.EmbeddingService.checkOllamaAvailability();
            if (ollamaOk) {
                console.log('   ✅ EmbeddingService funcionando');
                console.log('   ✅ Ollama conectado');
                
                // Teste de embedding
                const test = await KC.EmbeddingService.generateEmbedding('teste de deploy');
                if (test && test.embedding && Array.isArray(test.embedding)) {
                    console.log(`   ✅ Embedding gerado: ${test.embedding.length} dimensões`);
                    results.embedding = true;
                } else {
                    console.log('   ❌ Falha ao gerar embedding de teste');
                }
            } else {
                console.log('   ❌ Ollama não está disponível');
            }
        } else {
            console.log('   ❌ EmbeddingService não encontrado');
        }
        
        // 4. Validar QdrantService
        console.log('\n4️⃣ Validando QdrantService...');
        if (KC.QdrantService) {
            const qdrantOk = await KC.QdrantService.checkConnection();
            if (qdrantOk) {
                console.log('   ✅ QdrantService funcionando');
                console.log('   ✅ Qdrant conectado');
                
                const stats = await KC.QdrantService.getCollectionStats();
                console.log(`   📊 Collection: ${stats.vectors_count || 0} vetores`);
                results.qdrant = true;
            } else {
                console.log('   ❌ Qdrant não está disponível');
            }
        } else {
            console.log('   ❌ QdrantService não encontrado');
        }
        
        // 5. Teste integrado
        console.log('\n5️⃣ Teste de Integração Completa...');
        if (results.embedding && results.qdrant) {
            const testFile = {
                fileName: 'deploy-test-' + Date.now() + '.txt',
                content: 'Arquivo de teste de validação de deploy',
                preview: 'Teste de deploy...'
            };
            
            try {
                const enriched = await KC.QdrantService.enrichWithEmbeddings(testFile);
                if (enriched && enriched.vector && enriched.vector.length === 768) {
                    console.log('   ✅ Enriquecimento funcionando');
                    
                    const insertResult = await KC.QdrantService.insertBatch([enriched]);
                    if (insertResult.success) {
                        console.log('   ✅ Inserção no Qdrant bem-sucedida');
                        results.overall = true;
                    } else {
                        console.log('   ❌ Falha na inserção no Qdrant');
                    }
                } else {
                    console.log('   ❌ Falha no enriquecimento');
                }
            } catch (error) {
                console.log('   ❌ Erro no teste integrado:', error.message);
            }
        } else {
            console.log('   ⚠️ Pulando teste integrado (serviços não disponíveis)');
        }
        
    } catch (error) {
        console.error('❌ Erro durante validação:', error);
    }
    
    // Resumo Final
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMO DA VALIDAÇÃO:');
    console.log('='.repeat(50));
    console.log(`Factory Pattern:    ${results.factory ? '✅' : '❌'}`);
    console.log(`Circuit Breaker:    ${results.circuitBreaker ? '✅' : '❌'}`);
    console.log(`EmbeddingService:   ${results.embedding ? '✅' : '❌'}`);
    console.log(`QdrantService:      ${results.qdrant ? '✅' : '❌'}`);
    console.log(`Integração:         ${results.overall ? '✅' : '❌'}`);
    console.log('='.repeat(50));
    
    if (results.overall) {
        console.log('🎉 SISTEMA VALIDADO COM SUCESSO!');
        console.log('✅ Pronto para uso em produção.');
    } else {
        console.log('⚠️ SISTEMA COM PROBLEMAS');
        console.log('Verifique os erros acima antes de usar em produção.');
    }
    
    return results;
}

// Executar validação
validateDeployment();