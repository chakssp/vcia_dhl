// Diagnosticar por que apenas 5 dos 18 arquivos foram processados
async function diagnosticarArquivosFaltantes() {
    console.log('=== DIAGNÓSTICO DE ARQUIVOS FALTANTES ===\n');
    
    try {
        // 1. Verificar arquivos no AppState
        const todosArquivos = KC.AppState.get('files') || [];
        const aprovados = todosArquivos.filter(f => f.approved);
        
        console.log('1. ARQUIVOS NO SISTEMA:');
        console.log(`   - Total de arquivos: ${todosArquivos.length}`);
        console.log(`   - Arquivos aprovados: ${aprovados.length}`);
        console.log(`   - Arquivos com categorias: ${aprovados.filter(f => f.categories?.length > 0).length}\n`);
        
        // 2. Listar todos os arquivos aprovados
        console.log('2. LISTA DE ARQUIVOS APROVADOS:');
        aprovados.forEach((file, i) => {
            console.log(`   ${i+1}. ${file.name}`);
            console.log(`      - ID: ${file.id}`);
            console.log(`      - Categorias: ${file.categories?.join(', ') || 'Nenhuma'}`);
            console.log(`      - Tipo: ${file.analysisType || 'Não analisado'}`);
            console.log(`      - Tamanho: ${file.size || 0} bytes`);
            console.log(`      - Handle: ${file.handle ? 'Presente' : 'AUSENTE'}`);
        });
        
        // 3. Verificar quais foram processados no Qdrant
        console.log('\n3. ARQUIVOS NO QDRANT:');
        const response = await fetch(`${KC.QdrantService.config.baseUrl}/collections/${KC.QdrantService.config.collectionName}/points/scroll`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                limit: 1000,
                with_payload: true,
                with_vector: false
            })
        });
        
        const data = await response.json();
        const pontos = data.result?.points || [];
        
        // Agrupar por documento
        const documentosNoQdrant = new Map();
        pontos.forEach(p => {
            const docId = p.payload?.documentId || p.payload?.fileId;
            const fileName = p.payload?.fileName;
            if (docId && !documentosNoQdrant.has(docId)) {
                documentosNoQdrant.set(docId, {
                    fileName: fileName,
                    chunks: 0,
                    comCategorias: 0
                });
            }
            if (docId && documentosNoQdrant.has(docId)) {
                documentosNoQdrant.get(docId).chunks++;
                if (p.payload?.metadata?.categories?.length > 0) {
                    documentosNoQdrant.get(docId).comCategorias++;
                }
            }
        });
        
        console.log(`   - Documentos únicos: ${documentosNoQdrant.size}`);
        documentosNoQdrant.forEach((info, docId) => {
            console.log(`\n   • ${info.fileName}`);
            console.log(`     ID: ${docId}`);
            console.log(`     Chunks: ${info.chunks}`);
            console.log(`     Chunks com categorias: ${info.comCategorias}`);
        });
        
        // 4. Identificar arquivos faltantes
        console.log('\n4. ARQUIVOS FALTANTES NO QDRANT:');
        const idsNoQdrant = Array.from(documentosNoQdrant.keys());
        const faltantes = aprovados.filter(f => !idsNoQdrant.includes(f.id));
        
        if (faltantes.length > 0) {
            console.log(`   ⚠️ ${faltantes.length} arquivos aprovados não foram processados:`);
            faltantes.forEach((f, i) => {
                console.log(`\n   ${i+1}. ${f.name}`);
                console.log(`      - ID: ${f.id}`);
                console.log(`      - Handle: ${f.handle ? 'Presente' : 'AUSENTE'}`);
                console.log(`      - Content: ${f.content ? 'Presente' : 'AUSENTE'}`);
            });
            
            // Verificar se o problema é falta de handle
            const semHandle = faltantes.filter(f => !f.handle);
            if (semHandle.length > 0) {
                console.log(`\n   ❌ ${semHandle.length} arquivos sem handle (não podem ser lidos)`);
            }
        } else {
            console.log('   ✅ Todos os arquivos aprovados estão no Qdrant!');
        }
        
        // 5. Verificar problema de categorias
        console.log('\n5. ANÁLISE DE CATEGORIAS:');
        const arquivosComCategorias = aprovados.filter(f => f.categories?.length > 0);
        console.log(`   - Arquivos com categorias no AppState: ${arquivosComCategorias.length}`);
        console.log(`   - Documentos com categorias no Qdrant: ${Array.from(documentosNoQdrant.values()).filter(d => d.comCategorias > 0).length}`);
        
        if (arquivosComCategorias.length > 0) {
            console.log('\n   Arquivos que DEVERIAM ter categorias:');
            arquivosComCategorias.forEach(f => {
                const noQdrant = documentosNoQdrant.get(f.id);
                console.log(`   • ${f.name}: ${f.categories.join(', ')}`);
                if (noQdrant) {
                    console.log(`     No Qdrant: ${noQdrant.comCategorias > 0 ? '✅' : '❌'} categorias preservadas`);
                } else {
                    console.log(`     No Qdrant: ❌ NÃO PROCESSADO`);
                }
            });
        }
        
    } catch (error) {
        console.error('Erro:', error);
    }
}

// Executar
diagnosticarArquivosFaltantes();