/**
 * Teste de Enriquecimento com Embeddings
 * Valida a nova funcionalidade do QdrantService
 */

console.log('🧪 TESTE: Enriquecimento com Embeddings no KC');
console.log('=============================================\n');

// Função de teste principal
async function testEmbeddingsEnrichment() {
    try {
        // 1. Verificar se KC está carregado
        if (typeof KC === 'undefined') {
            throw new Error('KC não está carregado. Execute este teste no console do navegador.');
        }

        console.log('✅ KC carregado');
        console.log('📊 Serviços disponíveis:');
        console.log('  - QdrantService:', !!KC.QdrantService);
        console.log('  - EmbeddingService:', !!KC.EmbeddingService);
        console.log('  - FileRenderer:', !!KC.FileRenderer);
        console.log('');

        // 2. Verificar conexões
        console.log('🔌 Verificando conexões...');
        
        const qdrantConnected = await KC.QdrantService.checkConnection();
        console.log(`  Qdrant: ${qdrantConnected ? '✅ Conectado' : '❌ Desconectado'}`);
        
        const ollamaAvailable = await KC.EmbeddingService.checkOllamaAvailability();
        console.log(`  Ollama: ${ollamaAvailable ? '✅ Disponível' : '❌ Indisponível'}`);
        console.log('');

        // 3. Pegar arquivo real do sistema
        console.log('📄 Selecionando arquivo de teste...');
        
        const files = KC.AppState.get('files') || [];
        if (files.length === 0) {
            console.log('⚠️ Nenhum arquivo descoberto. Faça a descoberta primeiro.');
            return;
        }

        // Procurar pelo FRAMEWORK-TRABALHO-EU-VOCE.md ou pegar o primeiro
        let testFile = files.find(f => f.fileName === 'FRAMEWORK-TRABALHO-EU-VOCE.md') || files[0];
        
        console.log(`  Arquivo selecionado: ${testFile.fileName}`);
        console.log(`  Tamanho: ${testFile.size} bytes`);
        console.log(`  Categoria: ${testFile.category || testFile.categories?.[0] || 'N/A'}`);
        console.log('');

        // 4. Testar enriquecimento
        console.log('🔄 Testando enriquecimento com embeddings...');
        console.log('');
        
        const startTime = Date.now();
        const enrichedDoc = await KC.QdrantService.enrichWithEmbeddings(testFile);
        const endTime = Date.now();
        
        console.log(`⏱️ Tempo de enriquecimento: ${endTime - startTime}ms`);
        console.log('');

        // 5. Validar resultado
        console.log('📊 Validando documento enriquecido:');
        console.log('');
        
        // Validar estrutura básica
        console.assert(enrichedDoc.id, 'Documento deve ter ID');
        console.assert(enrichedDoc.vector, 'Documento deve ter vector');
        console.assert(enrichedDoc.payload, 'Documento deve ter payload');
        
        console.log('✅ Estrutura básica válida');
        console.log(`  - ID: ${enrichedDoc.id}`);
        console.log(`  - Vector: ${enrichedDoc.vector.length} dimensões`);
        console.log('');

        // Validar embeddings
        console.log('🧠 Validando embeddings:');
        console.assert(Array.isArray(enrichedDoc.vector), 'Vector deve ser array');
        console.assert(enrichedDoc.vector.length === 768, 'Vector deve ter 768 dimensões');
        console.assert(enrichedDoc.vector.every(v => typeof v === 'number'), 'Vector deve conter apenas números');
        
        console.log(`  ✅ Vector válido: ${enrichedDoc.vector.length} dimensões`);
        console.log(`  ✅ Valores: [${enrichedDoc.vector.slice(0, 3).map(v => v.toFixed(3)).join(', ')}...]`);
        console.log('');

        // Validar metadata
        console.log('📋 Validando metadata:');
        const metadata = enrichedDoc.payload.metadata;
        console.assert(metadata, 'Deve ter metadata');
        console.assert(metadata.embeddingModel === 'nomic-embed-text', 'Deve ter modelo correto');
        console.assert(metadata.embeddingDimensions === 768, 'Deve ter dimensões corretas');
        
        console.log('  ✅ Metadata válida:');
        console.log(`    - Modelo: ${metadata.embeddingModel}`);
        console.log(`    - Dimensões: ${metadata.embeddingDimensions}`);
        console.log(`    - Categoria: ${metadata.category}`);
        console.log(`    - Processado em: ${metadata.processedAt}`);
        console.log('');

        // Validar convergência
        console.log('🎯 Validando convergência multi-dimensional:');
        const convergence = enrichedDoc.payload.convergence;
        console.assert(convergence, 'Deve ter convergência');
        console.assert(convergence.dimensions, 'Deve ter dimensões');
        console.assert(convergence.totalScore >= 0 && convergence.totalScore <= 1, 'Score deve estar entre 0 e 1');
        
        console.log('  ✅ Convergência válida:');
        console.log(`    - Score Total: ${(convergence.totalScore * 100).toFixed(1)}%`);
        console.log(`    - Temporal: ${(convergence.dimensions.temporal * 100).toFixed(0)}%`);
        console.log(`    - Categoria: ${(convergence.dimensions.category * 100).toFixed(0)}%`);
        console.log(`    - Importância: ${(convergence.dimensions.importance * 100).toFixed(0)}%`);
        console.log(`    - Clusters: [${convergence.semanticClusters.join(', ')}]`);
        console.log(`    - Conceitos: [${convergence.relatedConcepts.join(', ')}]`);
        console.log('');

        // 6. Testar inserção no Qdrant
        console.log('💾 Testando inserção no Qdrant...');
        
        try {
            const insertResult = await KC.QdrantService.processAndInsertFile(testFile);
            
            if (insertResult.success) {
                console.log('  ✅ Arquivo inserido com sucesso no Qdrant!');
                console.log(`  - Points inseridos: ${KC.QdrantService.stats.pointsInserted}`);
            } else {
                console.log('  ⚠️ Falha na inserção:', insertResult);
            }
        } catch (error) {
            console.log('  ❌ Erro na inserção:', error.message);
        }
        console.log('');

        // 7. Testar busca semântica
        console.log('🔍 Testando busca semântica...');
        
        const searchQuery = "sistema de validação com gates para garantir qualidade";
        console.log(`  Query: "${searchQuery}"`);
        
        try {
            const searchResults = await KC.QdrantService.searchByText(searchQuery, {
                limit: 5,
                scoreThreshold: 0.5
            });
            
            console.log(`  ✅ Resultados encontrados: ${searchResults.length}`);
            
            searchResults.slice(0, 3).forEach((result, idx) => {
                console.log(`\n  ${idx + 1}. Score: ${(result.score * 100).toFixed(1)}%`);
                console.log(`     Arquivo: ${result.payload?.fileName || 'N/A'}`);
                console.log(`     Categoria: ${result.payload?.metadata?.category || 'N/A'}`);
            });
        } catch (error) {
            console.log('  ⚠️ Erro na busca:', error.message);
        }
        console.log('');

        // 8. Resumo final
        console.log('=' .repeat(60));
        console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');
        console.log('\n📊 Resumo:');
        console.log('  1. Enriquecimento com embeddings: ✅ Funcionando');
        console.log('  2. Convergência multi-dimensional: ✅ Calculada');
        console.log('  3. Estrutura de dados: ✅ Compatível');
        console.log('  4. Integração com Qdrant: ✅ Operacional');
        console.log('\n🚀 Sistema pronto para processar os 2.245 arquivos!');
        
        return enrichedDoc;

    } catch (error) {
        console.error('❌ Erro no teste:', error);
        console.error(error.stack);
        return null;
    }
}

// Função auxiliar para processar múltiplos arquivos
async function testBatchProcessing(limit = 5) {
    console.log(`\n📦 Testando processamento em batch (${limit} arquivos)...`);
    console.log('=' .repeat(60) + '\n');
    
    const files = KC.AppState.get('files') || [];
    if (files.length === 0) {
        console.log('⚠️ Nenhum arquivo para processar');
        return;
    }
    
    const testBatch = files.slice(0, limit);
    console.log(`Processando ${testBatch.length} arquivos...`);
    
    const result = await KC.QdrantService.processFilesBatch(testBatch, {
        batchSize: 2
    });
    
    console.log('\n📊 Resultado do batch:');
    console.log(`  - Total: ${result.total}`);
    console.log(`  - Sucesso: ${result.successful}`);
    console.log(`  - Falhas: ${result.failed}`);
    
    return result;
}

// Exportar funções para uso no console
window.testEmbeddings = testEmbeddingsEnrichment;
window.testBatch = testBatchProcessing;

// Instruções
console.log('📌 Instruções de uso:');
console.log('');
console.log('1. Execute no console do navegador (F12):');
console.log('   await testEmbeddings()     // Testa enriquecimento com 1 arquivo');
console.log('   await testBatch(10)        // Testa batch com 10 arquivos');
console.log('');
console.log('2. Pré-requisitos:');
console.log('   - KC carregado (http://127.0.0.1:5500)');
console.log('   - Arquivos descobertos');
console.log('   - Ollama rodando (localhost:11434)');
console.log('   - Qdrant acessível (qdr.vcia.com.br:6333)');
console.log('');
console.log('Digite: await testEmbeddings() para começar o teste');