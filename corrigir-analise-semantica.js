// Corrigir análise para usar Qdrant corretamente
async function corrigirAnaliseSemantica() {
    console.log('=== CORRIGINDO ANÁLISE SEMÂNTICA ===\n');
    
    try {
        // 1. Verificar métodos disponíveis
        console.log('1. VERIFICANDO MÉTODOS DISPONÍVEIS:');
        console.log('   - QdrantService.search:', typeof KC.QdrantService.search);
        console.log('   - QdrantService.searchByVector:', typeof KC.QdrantService.searchByVector);
        console.log('   - SimilaritySearchService.searchByEmbedding:', typeof KC.SimilaritySearchService?.searchByEmbedding);
        console.log('   - SimilaritySearchService.searchByVector:', typeof KC.SimilaritySearchService?.searchByVector);
        
        // 2. Testar busca semântica
        console.log('\n2. TESTANDO BUSCA SEMÂNTICA:');
        
        // Gerar embedding de teste
        const textoTeste = "estratégia de negócios e decisões importantes";
        console.log(`   Texto: "${textoTeste}"`);
        
        const embedding = await KC.EmbeddingService.generateEmbedding(textoTeste);
        console.log(`   Embedding gerado: ${embedding.length} dimensões`);
        
        // Buscar similares usando QdrantService diretamente
        console.log('\n3. BUSCANDO SIMILARES NO QDRANT:');
        const results = await KC.QdrantService.search(embedding, {
            limit: 5,
            scoreThreshold: 0.5
        });
        
        console.log(`   Encontrados: ${results.length} resultados\n`);
        
        results.forEach((result, i) => {
            console.log(`   ${i+1}. Score: ${result.score?.toFixed(3)}`);
            console.log(`      Arquivo: ${result.payload?.fileName || result.payload?.metadata?.fileName}`);
            console.log(`      Tipo: ${result.payload?.analysisType || result.payload?.metadata?.analysisType}`);
            console.log(`      Categorias: ${(result.payload?.categories || result.payload?.metadata?.categories || []).join(', ')}`);
        });
        
        // 4. Verificar estrutura de payload
        if (results.length > 0) {
            console.log('\n4. ESTRUTURA DO PAYLOAD:');
            const exemplo = results[0];
            console.log('   Campos no payload:');
            console.log('   - payload:', Object.keys(exemplo.payload || {}));
            console.log('   - metadata:', Object.keys(exemplo.payload?.metadata || {}));
            
            // Determinar onde estão os dados
            const analysisType = exemplo.payload?.analysisType || exemplo.payload?.metadata?.analysisType;
            const categories = exemplo.payload?.categories || exemplo.payload?.metadata?.categories;
            
            console.log('\n   Localização dos dados:');
            console.log(`   - analysisType em: ${exemplo.payload?.analysisType ? 'payload' : 'metadata'}`);
            console.log(`   - categories em: ${exemplo.payload?.categories ? 'payload' : 'metadata'}`);
        }
        
        // 5. Propor correção
        console.log('\n5. CORREÇÃO PROPOSTA PARA FileRenderer.analyzeFile():');
        console.log(`
// Linha ~722, substituir:
const similarFiles = await KC.SimilaritySearchService.searchByEmbedding(
    embedding,
    10,
    0.7
);

// POR:
const similarResults = await KC.QdrantService.search(embedding, {
    limit: 10,
    scoreThreshold: 0.7
});

// E adaptar o processamento dos resultados:
const typeCounts = {};
similarResults.forEach(result => {
    const type = result.payload?.metadata?.analysisType || 'Aprendizado Geral';
    typeCounts[type] = (typeCounts[type] || 0) + result.score;
});
`);
        
    } catch (error) {
        console.error('Erro:', error);
    }
}

// Executar
corrigirAnaliseSemantica();