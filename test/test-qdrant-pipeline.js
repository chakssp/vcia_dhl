/**
 * 🔍 Script de Diagnóstico e Teste do Pipeline Qdrant
 * 
 * Verifica cada etapa do processamento e identifica onde está falhando
 */

(async function testQdrantPipeline() {
    console.log('🚀 TESTE DO PIPELINE QDRANT');
    console.log('='*50);
    
    try {
        // 1. VERIFICAR PRÉ-REQUISITOS
        console.log('\n1️⃣ VERIFICANDO PRÉ-REQUISITOS:');
        
        // Verificar Qdrant
        const qdrantOk = await KC.QdrantService.checkConnection();
        console.log('  - Qdrant:', qdrantOk ? '✅ Conectado' : '❌ Desconectado');
        
        if (!qdrantOk) {
            console.error('❌ Qdrant não está acessível em http://qdr.vcia.com.br:6333');
            console.log('💡 Solução: Verificar se o servidor Qdrant está rodando');
            return;
        }
        
        // Verificar Ollama
        const ollamaOk = await KC.EmbeddingService.checkOllamaAvailability();
        console.log('  - Ollama:', ollamaOk ? '✅ Disponível' : '❌ Indisponível');
        
        if (!ollamaOk) {
            console.error('❌ Ollama não está disponível para gerar embeddings');
            console.log('💡 Solução: Iniciar Ollama com: ollama serve');
            return;
        }
        
        // 2. VERIFICAR ARQUIVOS
        console.log('\n2️⃣ VERIFICANDO ARQUIVOS:');
        const files = KC.AppState.get('files') || [];
        console.log('  - Total de arquivos:', files.length);
        
        if (files.length === 0) {
            console.error('❌ Nenhum arquivo no sistema');
            console.log('💡 Solução: Execute a descoberta de arquivos primeiro');
            return;
        }
        
        // Verificar handles
        const filesWithHandles = files.filter(f => f.handle);
        console.log('  - Arquivos com handles válidos:', filesWithHandles.length);
        
        if (filesWithHandles.length === 0) {
            console.error('❌ Nenhum arquivo tem handle válido');
            console.log('💡 Solução: Arquivos devem ser descobertos via File System Access API');
            return;
        }
        
        // Verificar análises
        const analyzedFiles = files.filter(f => f.analyzed);
        console.log('  - Arquivos analisados:', analyzedFiles.length);
        
        // Verificar aprovações
        const approvedFiles = files.filter(f => f.approved || (f.categories && f.categories.length > 0));
        console.log('  - Arquivos aprovados/categorizados:', approvedFiles.length);
        
        if (approvedFiles.length === 0) {
            console.warn('⚠️ Nenhum arquivo aprovado ou categorizado');
            console.log('💡 Solução: Aprovar arquivos ou atribuir categorias');
        }
        
        // 3. TESTAR CONSOLIDAÇÃO
        console.log('\n3️⃣ TESTANDO CONSOLIDAÇÃO DE DADOS:');
        
        const consolidatedData = await KC.RAGExportManager.consolidateData();
        console.log('  - Documentos consolidados:', consolidatedData.documents.length);
        console.log('  - Total de chunks:', consolidatedData.documents.reduce((sum, d) => sum + (d.chunks?.length || 0), 0));
        
        if (consolidatedData.documents.length === 0) {
            console.error('❌ Nenhum documento foi consolidado');
            console.log('💡 Possíveis causas:');
            console.log('   - Arquivos não têm preview/conteúdo');
            console.log('   - Arquivos estão arquivados');
            console.log('   - Arquivos foram explicitamente rejeitados');
            return;
        }
        
        // 4. TESTAR PROCESSAMENTO PARA QDRANT
        console.log('\n4️⃣ PROCESSANDO PARA QDRANT:');
        
        // Processar apenas o primeiro documento como teste
        const testDoc = consolidatedData.documents[0];
        console.log(`  - Testando com: ${testDoc.name}`);
        console.log(`  - Chunks: ${testDoc.chunks?.length || 0}`);
        
        if (!testDoc.chunks || testDoc.chunks.length === 0) {
            console.error('❌ Documento não tem chunks');
            console.log('💡 Verificando se conteúdo está disponível...');
            
            // Tentar ler conteúdo
            if (testDoc.handle) {
                const content = await KC.ContentAccessUtils.getFileContent(testDoc);
                console.log('  - Conteúdo disponível:', content ? `${content.length} caracteres` : 'Não');
                
                if (content) {
                    // Gerar chunks manualmente
                    const chunks = KC.ChunkingUtils.createChunks(content, testDoc.name, {
                        chunkSize: 500,
                        overlap: 50
                    });
                    console.log(`  - Chunks gerados: ${chunks.length}`);
                    testDoc.chunks = chunks;
                }
            }
        }
        
        // 5. GERAR EMBEDDINGS E ENVIAR
        console.log('\n5️⃣ GERANDO EMBEDDINGS E ENVIANDO:');
        
        if (testDoc.chunks && testDoc.chunks.length > 0) {
            const testChunk = testDoc.chunks[0];
            console.log('  - Testando chunk 0:', testChunk.content.substring(0, 50) + '...');
            
            // Gerar embedding
            const embedding = await KC.EmbeddingService.generateEmbedding(testChunk.content);
            console.log('  - Embedding gerado:', embedding ? `${embedding.length} dimensões` : 'Falhou');
            
            if (embedding) {
                // Criar ponto para Qdrant
                const point = {
                    id: `test_${Date.now()}`,
                    vector: embedding,
                    payload: {
                        fileName: testDoc.name,
                        content: testChunk.content,
                        chunkIndex: 0,
                        totalChunks: testDoc.chunks.length,
                        relevanceScore: testDoc.relevanceScore || 0,
                        categories: testDoc.categories || [],
                        testRun: true,
                        timestamp: new Date().toISOString()
                    }
                };
                
                // Enviar ao Qdrant
                console.log('  - Enviando ao Qdrant...');
                const result = await KC.QdrantService.upsertPoints([point]);
                console.log('  - Resultado:', result.status === 'ok' ? '✅ Sucesso' : '❌ Falhou');
                
                if (result.status === 'ok') {
                    // Verificar se foi salvo
                    const searchResult = await KC.QdrantService.search({
                        vector: embedding,
                        limit: 1,
                        with_payload: true
                    });
                    
                    console.log('  - Verificação:', searchResult?.result?.length > 0 ? '✅ Ponto encontrado' : '❌ Não encontrado');
                }
            }
        }
        
        // 6. DIAGNÓSTICO FINAL
        console.log('\n6️⃣ DIAGNÓSTICO FINAL:');
        
        const stats = await KC.QdrantService.getCollectionStats();
        console.log('  - Total de pontos no Qdrant:', stats?.points_count || 0);
        
        // Verificar botão de processar
        const processBtn = document.querySelector('#process-qdrant-btn, .process-qdrant-btn, button[onclick*="processToQdrant"]');
        console.log('  - Botão de processar:', processBtn ? '✅ Encontrado' : '❌ Não encontrado');
        
        if (!processBtn) {
            console.log('\n💡 SOLUÇÃO MANUAL:');
            console.log('Para processar todos os arquivos para o Qdrant, execute:');
            console.log('await KC.RAGExportManager.processToQdrant()');
        }
        
        console.log('\n✅ TESTE CONCLUÍDO');
        console.log('='*50);
        
        return {
            qdrant: qdrantOk,
            ollama: ollamaOk,
            files: files.length,
            approved: approvedFiles.length,
            consolidated: consolidatedData.documents.length,
            testSuccess: true
        };
        
    } catch (error) {
        console.error('❌ ERRO NO TESTE:', error);
        console.log('\nStack trace:', error.stack);
        return {
            error: error.message,
            testSuccess: false
        };
    }
})();