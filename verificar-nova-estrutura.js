// Verificar a nova estrutura dos dados no Qdrant
async function verificarNovaEstrutura() {
    console.log('=== VERIFICAÇÃO DA NOVA ESTRUTURA ===\n');
    
    try {
        // 1. Estatísticas
        const stats = await KC.QdrantService.getCollectionStats();
        console.log('1. ESTATÍSTICAS:');
        console.log(`   - Total de pontos: ${stats.pointsCount || stats.points_count || 0}`);
        console.log(`   - Status: ${stats.status}\n`);
        
        // 2. Buscar amostra maior
        const response = await fetch(`${KC.QdrantService.config.baseUrl}/collections/${KC.QdrantService.config.collectionName}/points/scroll`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                limit: 50,
                with_payload: true,
                with_vector: false
            })
        });
        
        const data = await response.json();
        const pontos = data.result?.points || [];
        
        console.log(`2. AMOSTRA: ${pontos.length} pontos\n`);
        
        // 3. Análise de tipos (agora em metadata)
        console.log('3. DISTRIBUIÇÃO POR TIPO DE ANÁLISE:');
        const tipos = {};
        pontos.forEach(p => {
            const tipo = p.payload?.metadata?.analysisType || 'Não classificado';
            tipos[tipo] = (tipos[tipo] || 0) + 1;
        });
        
        Object.entries(tipos)
            .sort((a, b) => b[1] - a[1])
            .forEach(([tipo, count]) => {
                const percent = ((count / pontos.length) * 100).toFixed(1);
                console.log(`   - ${tipo}: ${count} (${percent}%)`);
            });
        
        // 4. Análise de categorias (agora em metadata)
        console.log('\n4. ANÁLISE DE CATEGORIAS:');
        const comCategorias = pontos.filter(p => p.payload?.metadata?.categories && p.payload.metadata.categories.length > 0);
        console.log(`   - Pontos com categorias: ${comCategorias.length} de ${pontos.length} (${((comCategorias.length/pontos.length)*100).toFixed(1)}%)`);
        
        // Contar categorias únicas
        const todasCategorias = {};
        comCategorias.forEach(p => {
            p.payload.metadata.categories.forEach(cat => {
                todasCategorias[cat] = (todasCategorias[cat] || 0) + 1;
            });
        });
        
        console.log(`   - Total de categorias únicas: ${Object.keys(todasCategorias).length}`);
        console.log('   - Top 10 categorias:');
        Object.entries(todasCategorias)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .forEach(([cat, count]) => {
                console.log(`     • ${cat}: ${count} pontos`);
            });
        
        // 5. Testar busca semântica
        console.log('\n5. TESTANDO BUSCA SEMÂNTICA:');
        
        // Buscar por "decisão"
        const embedding = await KC.EmbeddingService.generateEmbedding("decisão estratégica");
        const results = await KC.QdrantService.search(embedding, { limit: 3 });
        
        console.log(`   - Encontrados ${results.length} resultados para "decisão estratégica":`);
        results.forEach((r, i) => {
            console.log(`\n   ${i+1}. Score: ${r.score?.toFixed(3)}`);
            console.log(`      Arquivo: ${r.payload?.fileName}`);
            console.log(`      Tipo: ${r.payload?.metadata?.analysisType}`);
            console.log(`      Categorias: ${r.payload?.metadata?.categories?.join(', ')}`);
            console.log(`      Preview: ${r.payload?.content?.substring(0, 100)}...`);
        });
        
        // 6. Verificar documentos únicos
        console.log('\n6. DOCUMENTOS ÚNICOS:');
        const documentosUnicos = new Set();
        pontos.forEach(p => {
            if (p.payload?.fileName) {
                documentosUnicos.add(p.payload.fileName);
            }
        });
        console.log(`   - Total de documentos: ${documentosUnicos.size}`);
        console.log('   - Lista de documentos:');
        Array.from(documentosUnicos).forEach(doc => {
            console.log(`     • ${doc}`);
        });
        
    } catch (error) {
        console.error('Erro:', error);
    }
}

// Executar
verificarNovaEstrutura();