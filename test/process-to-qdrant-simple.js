/**
 * 🚀 Script Simplificado para Processar Arquivos para o Qdrant
 * 
 * Comando rápido para processar todos os arquivos aprovados/categorizados
 */

// Função global para facilitar o processamento
window.processarParaQdrant = async function(options = {}) {
    console.log('🚀 INICIANDO PROCESSAMENTO PARA QDRANT');
    console.log('='*50);
    
    try {
        // Verificações básicas
        const qdrantOk = await KC.QdrantService.checkConnection();
        const ollamaOk = await KC.EmbeddingService.checkOllamaAvailability();
        
        if (!qdrantOk) {
            throw new Error('Qdrant não está conectado. Verifique http://qdr.vcia.com.br:6333');
        }
        
        if (!ollamaOk) {
            console.warn('⚠️ Ollama não disponível - usando embeddings simulados');
        }
        
        // Obter arquivos
        const files = KC.AppState.get('files') || [];
        console.log(`📁 Total de arquivos no sistema: ${files.length}`);
        
        // Filtrar arquivos válidos para processamento
        const validFiles = files.filter(file => {
            // Arquivo deve ter handle válido
            if (!file.handle) return false;
            
            // Arquivo deve estar aprovado OU categorizado
            const isApproved = file.approved === true;
            const isCategorized = file.categories && file.categories.length > 0;
            const isNotArchived = !file.archived;
            
            return (isApproved || isCategorized) && isNotArchived;
        });
        
        console.log(`✅ Arquivos válidos para processar: ${validFiles.length}`);
        
        if (validFiles.length === 0) {
            console.warn('⚠️ Nenhum arquivo válido encontrado');
            console.log('Certifique-se de:');
            console.log('  1. Descobrir arquivos via File System Access API');
            console.log('  2. Aprovar arquivos ou atribuir categorias');
            return;
        }
        
        // Processar cada arquivo
        let processados = 0;
        let falhas = 0;
        const erros = [];
        
        for (const file of validFiles) {
            try {
                console.log(`\n📄 Processando: ${file.name}`);
                
                // 1. Obter conteúdo
                const content = await KC.ContentAccessUtils.getFileContent(file);
                if (!content) {
                    console.warn(`  ⚠️ Sem conteúdo disponível`);
                    falhas++;
                    continue;
                }
                
                // 2. Criar chunks
                const chunks = KC.ChunkingUtils.createChunks(content, file.name, {
                    chunkSize: options.chunkSize || 500,
                    overlap: options.overlap || 50
                });
                console.log(`  📦 ${chunks.length} chunks criados`);
                
                // 3. Processar cada chunk
                const points = [];
                for (let i = 0; i < chunks.length; i++) {
                    const chunk = chunks[i];
                    
                    // Gerar embedding
                    let embedding;
                    if (ollamaOk) {
                        try {
                            embedding = await KC.EmbeddingService.generateEmbedding(chunk.content);
                        } catch (e) {
                            console.warn(`  ⚠️ Erro ao gerar embedding, usando simulado`);
                            embedding = new Array(768).fill(0).map(() => Math.random() * 2 - 1);
                        }
                    } else {
                        // Embedding simulado
                        embedding = new Array(768).fill(0).map(() => Math.random() * 2 - 1);
                    }
                    
                    // Criar ponto
                    const point = {
                        id: `${file.id || file.name}_chunk_${i}_${Date.now()}`,
                        vector: embedding,
                        payload: {
                            fileName: file.name,
                            filePath: file.path || file.name,
                            content: chunk.content,
                            chunkIndex: i,
                            totalChunks: chunks.length,
                            
                            // Metadados
                            relevanceScore: file.relevanceScore || file.relevance || 0,
                            categories: file.categories?.map(c => c.name || c) || [],
                            analyzed: file.analyzed || false,
                            approved: file.approved || false,
                            
                            // Análise (se disponível)
                            analysisType: file.analysis?.type || file.analysisType,
                            insights: file.analysis?.keyInsights || [],
                            
                            // Timestamps
                            fileModified: file.lastModified,
                            processedAt: new Date().toISOString()
                        }
                    };
                    
                    points.push(point);
                }
                
                // 4. Enviar ao Qdrant
                console.log(`  📤 Enviando ${points.length} pontos ao Qdrant...`);
                const result = await KC.QdrantService.upsertPoints(points);
                
                if (result.status === 'ok') {
                    console.log(`  ✅ Sucesso!`);
                    processados++;
                    
                    // Marcar arquivo como processado
                    file.qdrantProcessed = true;
                    file.qdrantProcessedAt = new Date().toISOString();
                    file.qdrantPointsCount = points.length;
                } else {
                    console.error(`  ❌ Falha ao enviar`);
                    falhas++;
                    erros.push({file: file.name, error: 'Falha no upsert'});
                }
                
            } catch (error) {
                console.error(`  ❌ Erro ao processar ${file.name}:`, error.message);
                falhas++;
                erros.push({file: file.name, error: error.message});
            }
        }
        
        // Salvar estado atualizado
        KC.AppState.set('files', files);
        
        // Estatísticas finais
        console.log('\n' + '='*50);
        console.log('📊 RESULTADO DO PROCESSAMENTO:');
        console.log(`  ✅ Processados: ${processados}`);
        console.log(`  ❌ Falhas: ${falhas}`);
        
        if (erros.length > 0) {
            console.log('\n❌ Erros encontrados:');
            erros.forEach(e => console.log(`  - ${e.file}: ${e.error}`));
        }
        
        // Verificar collection
        const stats = await KC.QdrantService.getCollectionStats();
        console.log(`\n📈 Total de pontos no Qdrant: ${stats?.points_count || 0}`);
        
        // Atualizar ConvergenceIntegrationService
        if (KC.ConvergenceIntegrationService) {
            await KC.ConvergenceIntegrationService.updateCache();
            console.log('🔄 Cache do Convergence Navigator atualizado');
        }
        
        console.log('\n✅ PROCESSAMENTO CONCLUÍDO!');
        
        return {
            processados,
            falhas,
            totalPontos: stats?.points_count || 0
        };
        
    } catch (error) {
        console.error('❌ ERRO FATAL:', error);
        return {
            error: error.message
        };
    }
};

// Comando ainda mais simples
window.qdrant = window.processarParaQdrant;

// Mensagem de ajuda
console.log('✨ Comando disponível: processarParaQdrant() ou qdrant()');
console.log('Opções: {chunkSize: 500, overlap: 50}');
console.log('Exemplo: await qdrant({chunkSize: 1000})');