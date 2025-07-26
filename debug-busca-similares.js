// Debug: Por que não está encontrando similares?
async function debugBuscaSimilares() {
    console.log('=== DEBUG BUSCA DE SIMILARES ===\n');
    
    try {
        // 1. Pegar um arquivo novo (sem análise)
        const files = KC.AppState.get('files') || [];
        const arquivoNovo = files.find(f => !f.analyzed) || files[0];
        
        console.log('1. ARQUIVO TESTE:', arquivoNovo.name);
        console.log('   Conteúdo disponível:', !!arquivoNovo.content);
        console.log('   Preview disponível:', !!arquivoNovo.preview);
        
        // 2. Gerar embedding do arquivo
        const texto = arquivoNovo.content || arquivoNovo.preview || arquivoNovo.name;
        console.log('\n2. TEXTO PARA EMBEDDING:', texto.substring(0, 200) + '...');
        
        const embedding = await KC.EmbeddingService.generateEmbedding(texto);
        console.log('   Embedding gerado:', embedding.length, 'dimensões');
        
        // 3. Buscar similares com diferentes thresholds
        console.log('\n3. TESTANDO BUSCA COM DIFERENTES THRESHOLDS:\n');
        
        for (const threshold of [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3]) {
            const results = await KC.QdrantService.search(embedding, {
                limit: 5,
                scoreThreshold: threshold
            });
            
            console.log(`Threshold ${threshold}: ${results.length} resultados`);
            
            if (results.length > 0) {
                console.log('   Melhor match:');
                console.log(`   - Score: ${results[0].score.toFixed(3)}`);
                console.log(`   - Arquivo: ${results[0].payload?.fileName}`);
                console.log(`   - Tipo: ${results[0].payload?.metadata?.analysisType}`);
                console.log(`   - Categorias: ${results[0].payload?.metadata?.categories?.join(', ')}`);
                break;
            }
        }
        
        // 4. Testar busca sem threshold
        console.log('\n4. BUSCA SEM THRESHOLD (top 10):');
        const semThreshold = await KC.QdrantService.search(embedding, {
            limit: 10
        });
        
        console.log(`   Encontrados: ${semThreshold.length} resultados\n`);
        
        semThreshold.slice(0, 5).forEach((result, i) => {
            console.log(`   ${i+1}. Score: ${result.score.toFixed(3)}`);
            console.log(`      Arquivo: ${result.payload?.fileName}`);
            console.log(`      Tipo: ${result.payload?.metadata?.analysisType}`);
            console.log(`      Preview: ${result.payload?.content?.substring(0, 100)}...\n`);
        });
        
        // 5. Verificar se o problema é o threshold alto (0.7)
        console.log('5. ANÁLISE DO PROBLEMA:');
        if (semThreshold.length > 0 && semThreshold[0].score < 0.7) {
            console.log(`   ❌ Threshold muito alto! Melhor score é ${semThreshold[0].score.toFixed(3)}`);
            console.log('   💡 Solução: Reduzir scoreThreshold de 0.7 para 0.5 ou 0.4');
        } else if (semThreshold.length === 0) {
            console.log('   ❌ Nenhum resultado encontrado!');
            console.log('   💡 Possível problema com embeddings ou Qdrant vazio');
        } else {
            console.log('   ✅ Deveria estar funcionando...');
        }
        
    } catch (error) {
        console.error('Erro:', error);
    }
}

// Executar
debugBuscaSimilares();