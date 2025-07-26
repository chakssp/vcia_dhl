// Script para verificar dados no Qdrant
// Execute este código no console

async function verificarQdrant() {
    console.log('=== VERIFICAÇÃO DO QDRANT ===\n');
    
    // 1. Estatísticas
    const stats = await KC.QdrantService.getCollectionStats();
    console.log('1. ESTATÍSTICAS:');
    console.log(`   - Total de pontos: ${stats.pointsCount || stats.points_count || 0}`);
    console.log(`   - Status: ${stats.status}`);
    console.log(`   - Segmentos: ${stats.segmentsCount || stats.segments_count || 0}\n`);
    
    // 2. Buscar amostra usando scroll (sem precisar de embedding)
    console.log('2. BUSCANDO AMOSTRA DE DADOS...');
    try {
        // Usar scroll em vez de search para não precisar de embedding
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
        
        console.log(`   - Amostra obtida: ${pontos.length} pontos\n`);
        
        // 3. Análise dos tipos
        console.log('3. DISTRIBUIÇÃO POR TIPO:');
        const tipos = {};
        pontos.forEach(p => {
            const tipo = p.payload?.analysisType || 'Não classificado';
            tipos[tipo] = (tipos[tipo] || 0) + 1;
        });
        
        Object.entries(tipos)
            .sort((a, b) => b[1] - a[1])
            .forEach(([tipo, count]) => {
                const percent = ((count / pontos.length) * 100).toFixed(1);
                console.log(`   - ${tipo}: ${count} (${percent}%)`);
            });
        
        // 4. Análise de categorias
        console.log('\n4. ANÁLISE DE CATEGORIAS:');
        const comCategorias = pontos.filter(p => p.payload?.categories && p.payload.categories.length > 0);
        console.log(`   - Pontos com categorias: ${comCategorias.length} de ${pontos.length} (${((comCategorias.length/pontos.length)*100).toFixed(1)}%)`);
        
        // Contar categorias únicas
        const todasCategorias = {};
        comCategorias.forEach(p => {
            p.payload.categories.forEach(cat => {
                todasCategorias[cat] = (todasCategorias[cat] || 0) + 1;
            });
        });
        
        console.log(`   - Total de categorias únicas: ${Object.keys(todasCategorias).length}`);
        console.log('   - Top 5 categorias:');
        Object.entries(todasCategorias)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .forEach(([cat, count]) => {
                console.log(`     • ${cat}: ${count} pontos`);
            });
        
        // 5. Exemplo de ponto
        console.log('\n5. EXEMPLO DE ESTRUTURA DE PONTO:');
        if (pontos.length > 0) {
            const exemplo = pontos.find(p => p.payload?.categories?.length > 0) || pontos[0];
            console.log(JSON.stringify(exemplo, null, 2));
        }
        
        // 6. Busca específica por categoria
        console.log('\n6. TESTANDO BUSCA POR CATEGORIA:');
        if (Object.keys(todasCategorias).length > 0) {
            const primeiraCat = Object.keys(todasCategorias)[0];
            const pontosComCat = pontos.filter(p => p.payload?.categories?.includes(primeiraCat));
            console.log(`   - Pontos com categoria "${primeiraCat}": ${pontosComCat.length}`);
        }
        
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
    }
}

// Executar verificação
verificarQdrant();