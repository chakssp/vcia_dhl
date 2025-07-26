// Corrigir flag approved nos arquivos
async function fixApprovedFiles() {
    console.log('=== CORRIGINDO FLAG APPROVED ===\n');
    
    try {
        // 1. Obter arquivos
        const arquivos = KC.AppState.get('files') || [];
        console.log(`Total de arquivos: ${arquivos.length}`);
        
        // 2. Marcar todos como aprovados (já têm categorias)
        let corrigidos = 0;
        arquivos.forEach(arquivo => {
            if (arquivo.categories?.length > 0 && !arquivo.approved) {
                arquivo.approved = true;
                corrigidos++;
            }
        });
        
        console.log(`Arquivos corrigidos: ${corrigidos}`);
        
        // 3. Salvar
        KC.AppState.set('files', arquivos);
        
        // 4. Verificar
        const aprovados = arquivos.filter(f => f.approved);
        console.log(`\n✅ Arquivos aprovados: ${aprovados.length}`);
        console.log(`✅ Arquivos com categorias: ${arquivos.filter(f => f.categories?.length > 0).length}`);
        
        // 5. Agora limpar e reprocessar Qdrant
        console.log('\n=== LIMPANDO E REPROCESSANDO QDRANT ===\n');
        
        // Deletar collection
        console.log('1. Deletando collection...');
        const deleteUrl = `${KC.QdrantService.config.baseUrl}/collections/${KC.QdrantService.config.collectionName}`;
        const deleteResponse = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        console.log(`   ${deleteResponse.ok ? '✅' : '❌'} Collection deletada`);
        
        // Aguardar
        await new Promise(r => setTimeout(r, 2000));
        
        // Recriar
        console.log('\n2. Recriando collection...');
        const created = await KC.QdrantService.createCollection();
        console.log(`   ${created ? '✅' : '❌'} Collection criada`);
        
        // Reprocessar
        console.log('\n3. Reprocessando arquivos...');
        const result = await KC.RAGExportManager.processApprovedFiles({
            batchSize: 5,
            includeMetadata: true
        });
        
        console.log('\n✅ PROCESSO CONCLUÍDO!');
        
        // Verificar resultado após aguardar
        setTimeout(async () => {
            const stats = await KC.QdrantService.getCollectionStats();
            console.log(`\nPontos no Qdrant: ${stats.pointsCount || 0}`);
            
            // Verificar categorias
            const response = await fetch(`${KC.QdrantService.config.baseUrl}/collections/${KC.QdrantService.config.collectionName}/points/scroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    limit: 10,
                    with_payload: true,
                    with_vector: false
                })
            });
            
            const data = await response.json();
            const pontos = data.result?.points || [];
            const comCats = pontos.filter(p => p.payload?.metadata?.categories?.length > 0);
            console.log(`Pontos com categorias: ${comCats.length}/${pontos.length}`);
            
            if (comCats.length > 0) {
                console.log('\nExemplo:');
                console.log(JSON.stringify(comCats[0], null, 2));
            }
        }, 3000);
        
    } catch (error) {
        console.error('Erro:', error);
    }
}

// Executar
fixApprovedFiles();