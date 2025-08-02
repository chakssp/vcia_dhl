/**
 * Script para processar arquivos e verificar sistema de confiança
 */

console.log('🚀 PROCESSAMENTO E VERIFICAÇÃO DE CONFIANÇA\n');

async function processAndVerify() {
    try {
        // 1. Obter arquivos atuais
        const files = KC.AppState.get('files');
        console.log(`📋 ${files.length} arquivos para processar\n`);
        
        // 2. Gerar embeddings e salvar no Qdrant
        console.log('🔄 Gerando embeddings e salvando no Qdrant...');
        
        for (const file of files) {
            console.log(`\n📄 Processando: ${file.name}`);
            
            try {
                // Gerar embedding
                const embedding = await KC.EmbeddingService.generateEmbedding(file.content);
                console.log('  ✅ Embedding gerado');
                
                // Criar ponto para o Qdrant
                const point = {
                    id: Date.now() + Math.random(), // ID único
                    vector: embedding,
                    payload: {
                        file_id: file.id,
                        filename: file.name,
                        path: file.path,
                        title: file.name.replace(/\.[^/.]+$/, ''), // Remove extensão
                        content: file.content.substring(0, 1000), // Primeiros 1000 chars
                        categories: file.categories,
                        timestamp: new Date().toISOString(),
                        source: 'test-load',
                        intelligence_score: 20 + Math.random() * 10, // Score simulado 20-30
                        relevance_score: 0.7 + Math.random() * 0.3, // 0.7-1.0
                        confidence_score: 75 + Math.random() * 25 // 75-100
                    }
                };
                
                // Salvar no Qdrant
                const result = await KC.QdrantService.upsertPoints([point]);
                console.log('  ✅ Salvo no Qdrant:', result.status);
                
                // Atualizar arquivo
                file.qdrantPointId = point.id;
                file.processed = true;
                
            } catch (error) {
                console.error(`  ❌ Erro: ${error.message}`);
            }
        }
        
        // 3. Atualizar AppState
        KC.AppState.set('files', files);
        
        // 4. Re-inicializar QdrantScoreBridge
        console.log('\n🔄 Re-inicializando QdrantScoreBridge...');
        await KC.QdrantScoreBridgeInstance.initialize();
        const stats = KC.QdrantScoreBridgeInstance.getStats();
        console.log(`✅ Bridge inicializado: ${stats.cachedScores} scores em cache`);
        
        // 5. Testar confiança para cada arquivo
        console.log('\n🎯 TESTANDO SCORES DE CONFIANÇA:\n');
        
        const results = [];
        for (const file of files) {
            const confidence = await KC.UnifiedConfidenceControllerInstance.getFileConfidence(file.id);
            
            results.push({
                file: file.name,
                confidence: confidence.confidence,
                source: confidence.source,
                details: confidence.details
            });
            
            console.log(`📄 ${file.name}:`);
            console.log(`   🎯 Confiança: ${confidence.confidence}%`);
            console.log(`   📊 Fonte: ${confidence.source}`);
            
            // Atualizar arquivo com nova confiança
            file.confidence = confidence.confidence;
            file.confidenceSource = confidence.source;
            file.confidenceMetadata = confidence.metadata;
        }
        
        // 6. Salvar arquivos atualizados
        KC.AppState.set('files', files);
        
        // 7. Forçar atualização da UI
        KC.EventBus.emit(KC.Events.FILES_UPDATED, {
            action: 'confidence_updated',
            count: files.length
        });
        
        // 8. Relatório final
        console.log('\n' + '='.repeat(60));
        console.log('📊 RELATÓRIO FINAL\n');
        console.log(`Total processado: ${files.length} arquivos`);
        console.log(`Média de confiança: ${(results.reduce((sum, r) => sum + r.confidence, 0) / results.length).toFixed(1)}%`);
        console.log(`Com match Qdrant: ${results.filter(r => r.source === 'qdrant').length}`);
        console.log(`Scores default: ${results.filter(r => r.source === 'default').length}`);
        
        // 9. Verificar coleção Qdrant
        const qdrantStats = await KC.QdrantService.getCollectionStats();
        console.log(`\n📊 Qdrant: ${qdrantStats.pointsCount} pontos totais`);
        
        return results;
        
    } catch (error) {
        console.error('❌ Erro geral:', error);
        return null;
    }
}

// Executar
processAndVerify().then(results => {
    if (results) {
        console.log('\n✅ Processamento concluído com sucesso!');
        console.log('💡 Os arquivos agora devem ter scores de confiança baseados no Qdrant.');
        
        // Salvar resultados
        localStorage.setItem('confidence-test-results', JSON.stringify({
            timestamp: new Date().toISOString(),
            results: results
        }));
    }
});