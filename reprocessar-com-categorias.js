// Reprocessar Qdrant com categorias preservadas
async function reprocessarComCategorias() {
    console.log('=== REPROCESSAMENTO COM CATEGORIAS ===\n');
    
    try {
        // 1. Verificar estado atual
        console.log('1. VERIFICANDO ESTADO ATUAL...');
        const arquivos = KC.AppState.get('files') || [];
        const aprovados = arquivos.filter(f => f.approved);
        const comCategorias = arquivos.filter(f => f.categories?.length > 0);
        
        console.log(`   - Arquivos aprovados: ${aprovados.length}`);
        console.log(`   - Arquivos com categorias: ${comCategorias.length}\n`);
        
        if (aprovados.length === 0) {
            console.error('❌ Nenhum arquivo aprovado!');
            return;
        }
        
        // 2. Limpar Qdrant
        console.log('2. LIMPANDO QDRANT...');
        try {
            await KC.QdrantService.deleteCollection();
            console.log('   ✅ Collection deletada\n');
        } catch (e) {
            console.log('   ⚠️ Collection já não existia\n');
        }
        
        // 3. Aguardar
        console.log('3. AGUARDANDO...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 4. Recriar collection
        console.log('\n4. RECRIANDO COLLECTION...');
        const created = await KC.QdrantService.createCollection();
        console.log(`   ${created ? '✅' : '❌'} Collection criada\n`);
        
        // 5. Reprocessar
        console.log('5. REPROCESSANDO ARQUIVOS COM CATEGORIAS...\n');
        
        const result = await KC.RAGExportManager.processApprovedFiles({
            batchSize: 5,
            includeMetadata: true,
            preserveCategories: true
        });
        
        // 6. Aguardar processamento
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 7. Verificar resultado
        console.log('\n6. VERIFICANDO RESULTADO...');
        const stats = await KC.QdrantService.getCollectionStats();
        console.log(`   - Pontos no Qdrant: ${stats.pointsCount || stats.points_count || 0}`);
        
        // 8. Verificar categorias preservadas
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
        
        const pontosComCategorias = pontos.filter(p => 
            p.payload?.metadata?.categories?.length > 0 || 
            p.payload?.categories?.length > 0
        );
        
        console.log(`   - Pontos com categorias: ${pontosComCategorias.length} de ${pontos.length} (${((pontosComCategorias.length/pontos.length)*100).toFixed(1)}%)\n`);
        
        if (pontosComCategorias.length > 0) {
            console.log('7. EXEMPLO DE PONTO COM CATEGORIAS:');
            const exemplo = pontosComCategorias[0];
            console.log(JSON.stringify(exemplo, null, 2));
        }
        
        console.log('\n✅ REPROCESSAMENTO CONCLUÍDO!');
        console.log('\nPróximo passo: Implementar busca semântica na análise de arquivos.');
        
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

// Executar
reprocessarComCategorias();