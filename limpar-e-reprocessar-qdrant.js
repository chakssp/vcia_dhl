// Script para limpar Qdrant e reprocessar dados curados
async function limparEReprocessar() {
    console.log('=== LIMPEZA E REPROCESSAMENTO DO QDRANT ===\n');
    
    try {
        // 1. Deletar collection existente
        console.log('1. DELETANDO COLLECTION ANTIGA...');
        const deleteResponse = await fetch(`${KC.QdrantService.config.baseUrl}/collections/${KC.QdrantService.config.collectionName}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (deleteResponse.ok) {
            console.log('✅ Collection deletada com sucesso!\n');
        } else {
            console.log('⚠️ Erro ao deletar collection:', await deleteResponse.text());
        }
        
        // 2. Aguardar um pouco
        console.log('2. AGUARDANDO...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 3. Recriar collection
        console.log('\n3. RECRIANDO COLLECTION...');
        const created = await KC.QdrantService.createCollection();
        if (created) {
            console.log('✅ Collection recriada com sucesso!\n');
        }
        
        // 4. Verificar arquivos aprovados
        console.log('4. VERIFICANDO ARQUIVOS APROVADOS...');
        const files = KC.AppState.get('files') || [];
        const aprovados = files.filter(f => f.approved);
        console.log(`- Total de arquivos: ${files.length}`);
        console.log(`- Arquivos aprovados: ${aprovados.length}`);
        console.log(`- Arquivos com categorias: ${aprovados.filter(f => f.categories?.length > 0).length}\n`);
        
        // 5. Reprocessar com o pipeline
        console.log('5. INICIANDO REPROCESSAMENTO...');
        console.log('Executando KC.RAGExportManager.processApprovedFiles()...\n');
        
        const result = await KC.RAGExportManager.processApprovedFiles({
            batchSize: 5,
            includeMetadata: true
        });
        
        if (result.success) {
            console.log('\n✅ REPROCESSAMENTO CONCLUÍDO!');
            console.log(`- Documentos processados: ${result.documentsProcessed}`);
            console.log(`- Total de chunks: ${result.totalChunks}`);
            console.log(`- Pontos inseridos: ${result.pointsInserted || 'N/A'}`);
        } else {
            console.log('\n❌ ERRO NO REPROCESSAMENTO:', result.error);
        }
        
        // 6. Verificar nova estrutura
        console.log('\n6. VERIFICANDO NOVA ESTRUTURA...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const stats = await KC.QdrantService.getCollectionStats();
        console.log(`- Total de pontos no Qdrant: ${stats.pointsCount || stats.points_count || 0}`);
        
        // Buscar amostra
        const response = await fetch(`${KC.QdrantService.config.baseUrl}/collections/${KC.QdrantService.config.collectionName}/points/scroll`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                limit: 5,
                with_payload: true,
                with_vector: false
            })
        });
        
        const data = await response.json();
        const amostra = data.result?.points || [];
        
        if (amostra.length > 0) {
            console.log('\nEXEMPLO DE PONTO NOVO:');
            console.log(JSON.stringify(amostra[0], null, 2));
            
            // Verificar campos importantes
            const exemplo = amostra[0].payload || {};
            console.log('\nCAMPOS PRESENTES:');
            console.log(`- fileName: ${exemplo.fileName ? '✅' : '❌'}`);
            console.log(`- analysisType: ${exemplo.analysisType ? '✅' : '❌'}`);
            console.log(`- categories: ${exemplo.categories ? '✅' : '❌'}`);
            console.log(`- content: ${exemplo.content ? '✅' : '❌'}`);
            console.log(`- fileId: ${exemplo.fileId ? '✅' : '❌'}`);
        }
        
    } catch (error) {
        console.error('ERRO:', error);
    }
}

// Confirmar antes de executar
if (confirm('⚠️ Isso vai DELETAR todos os dados do Qdrant e reprocessar. Continuar?')) {
    limparEReprocessar();
} else {
    console.log('Operação cancelada.');
}