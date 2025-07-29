/**
 * QdrantProcessorWithFilters.js
 * 
 * Adiciona funcionalidade de processar arquivos para o Qdrant respeitando
 * os filtros selecionados na Etapa 4
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    
    class QdrantProcessorWithFilters {
        constructor() {
            this.isProcessing = false;
            this.progressCallback = null;
        }

        /**
         * Processa arquivos para o Qdrant respeitando os filtros ativos
         */
        async processFilesToQdrant(options = {}) {
            if (this.isProcessing) {
                console.warn('Processamento já em andamento');
                return;
            }

            this.isProcessing = true;
            
            try {
                // 1. Obter arquivos do AppState
                const allFiles = KC.AppState.get('files') || [];
                console.log(`Total de arquivos no sistema: ${allFiles.length}`);

                // 2. Aplicar filtros ativos
                let filesToProcess = this.applyActiveFilters(allFiles, options);
                console.log(`Arquivos após filtros: ${filesToProcess.length}`);

                if (filesToProcess.length === 0) {
                    KC.showNotification?.({
                        type: 'warning',
                        message: 'Nenhum arquivo encontrado com os filtros aplicados',
                        duration: 5000
                    });
                    return;
                }

                // 3. Confirmar com o usuário
                const confirmMessage = `Processar ${filesToProcess.length} arquivos para o Qdrant?` +
                    (options.onlyHighRelevance ? ' (Apenas alta relevância)' : '') +
                    (options.onlyLowRelevance ? ' (Apenas baixa relevância)' : '') +
                    (options.onlyApproved ? ' (Apenas aprovados)' : '');

                if (!confirm(confirmMessage)) {
                    return;
                }

                // 4. Processar arquivos
                const result = await this.performProcessing(filesToProcess);
                
                // 5. Mostrar resultado
                KC.showNotification?.({
                    type: 'success',
                    message: `Processamento concluído! ${result.processed} arquivos processados, ${result.chunks} chunks criados.`,
                    duration: 8000
                });

                // 6. Emitir evento de conclusão
                KC.EventBus.emit('QDRANT_PROCESSING_COMPLETED', result);

                return result;

            } catch (error) {
                console.error('Erro ao processar arquivos:', error);
                KC.showNotification?.({
                    type: 'error',
                    message: `Erro ao processar: ${error.message}`,
                    duration: 8000
                });
                throw error;
            } finally {
                this.isProcessing = false;
            }
        }

        /**
         * Aplica os filtros ativos aos arquivos
         */
        applyActiveFilters(files, options = {}) {
            let filtered = [...files];

            // Filtro de status
            if (options.onlyApproved) {
                filtered = filtered.filter(f => f.approved === true);
            }
            if (options.onlyPending) {
                filtered = filtered.filter(f => !f.approved && !f.archived);
            }
            if (options.excludeArchived !== false) {
                filtered = filtered.filter(f => !f.archived);
            }

            // Filtro de relevância
            if (options.onlyHighRelevance) {
                filtered = filtered.filter(f => f.relevanceScore >= 70);
            } else if (options.onlyLowRelevance) {
                filtered = filtered.filter(f => f.relevanceScore < 30);
            } else if (options.minRelevance !== undefined) {
                filtered = filtered.filter(f => f.relevanceScore >= options.minRelevance);
            }

            // Filtro de categorias
            if (options.requiredCategories && options.requiredCategories.length > 0) {
                filtered = filtered.filter(f => 
                    f.categories && f.categories.some(c => 
                        options.requiredCategories.includes(c)
                    )
                );
            }

            // Filtro de análise
            if (options.onlyAnalyzed) {
                filtered = filtered.filter(f => f.analyzed === true);
            }
            if (options.onlyNotAnalyzed) {
                filtered = filtered.filter(f => !f.analyzed);
            }

            return filtered;
        }

        /**
         * Realiza o processamento dos arquivos
         */
        async performProcessing(files) {
            const results = {
                processed: 0,
                chunks: 0,
                errors: [],
                startTime: Date.now()
            };

            // Verificar serviços necessários
            if (!KC.RAGExportManager) {
                throw new Error('RAGExportManager não disponível');
            }
            if (!KC.EmbeddingService) {
                throw new Error('EmbeddingService não disponível');
            }
            if (!KC.QdrantService) {
                throw new Error('QdrantService não disponível');
            }

            // Processar em batches
            const batchSize = 5;
            for (let i = 0; i < files.length; i += batchSize) {
                const batch = files.slice(i, i + batchSize);
                
                // Notificar progresso
                const progress = Math.round((i / files.length) * 100);
                this.notifyProgress(progress, `Processando arquivos ${i + 1} a ${Math.min(i + batchSize, files.length)}...`);

                try {
                    // Usar o RAGExportManager para processar
                    const batchResult = await this.processBatch(batch);
                    results.processed += batchResult.processed;
                    results.chunks += batchResult.chunks;
                } catch (error) {
                    console.error('Erro ao processar batch:', error);
                    results.errors.push({
                        batch: `${i + 1}-${Math.min(i + batchSize, files.length)}`,
                        error: error.message
                    });
                }
            }

            results.duration = Date.now() - results.startTime;
            return results;
        }

        /**
         * Processa um batch de arquivos
         */
        async processBatch(files) {
            const result = {
                processed: 0,
                chunks: 0
            };

            for (const file of files) {
                try {
                    // Garantir que o arquivo tem conteúdo
                    if (!file.content && file.handle) {
                        const fileObj = await file.handle.getFile();
                        file.content = await fileObj.text();
                    }

                    if (!file.content) {
                        console.warn(`Arquivo ${file.name} sem conteúdo, pulando...`);
                        continue;
                    }

                    // Criar chunks do arquivo
                    const chunks = KC.ChunkingUtils?.getSemanticChunks(file.content) || 
                                 this.simpleChunking(file.content);

                    // Processar cada chunk
                    for (const chunk of chunks) {
                        // Gerar embedding
                        const embedding = await KC.EmbeddingService.generateEmbedding(chunk.content);

                        // Preparar payload para Qdrant
                        const payload = {
                            filename: file.name,
                            filepath: file.path,
                            chunk_index: chunk.index,
                            content: chunk.content,
                            relevanceScore: file.relevanceScore,
                            analysisType: file.analysisType || 'Aprendizado Geral',
                            categories: file.categories || [],
                            approved: file.approved || false,
                            analyzed: file.analyzed || false,
                            processedAt: new Date().toISOString(),
                            metadata: {
                                ...chunk.metadata,
                                fileId: file.id,
                                totalChunks: chunks.length
                            }
                        };

                        // Enviar para Qdrant
                        await KC.QdrantService.upsertPoint({
                            id: `${file.id}_chunk_${chunk.index}`,
                            vector: embedding,
                            payload: payload
                        });

                        result.chunks++;
                    }

                    result.processed++;
                } catch (error) {
                    console.error(`Erro ao processar arquivo ${file.name}:`, error);
                }
            }

            return result;
        }

        /**
         * Chunking simples como fallback
         */
        simpleChunking(content, chunkSize = 1000, overlap = 100) {
            const chunks = [];
            let index = 0;

            for (let i = 0; i < content.length; i += (chunkSize - overlap)) {
                const chunk = content.slice(i, i + chunkSize);
                if (chunk.trim()) {
                    chunks.push({
                        index: index++,
                        content: chunk,
                        metadata: {
                            start: i,
                            end: i + chunk.length
                        }
                    });
                }
            }

            return chunks;
        }

        /**
         * Notifica progresso
         */
        notifyProgress(percentage, message) {
            if (this.progressCallback) {
                this.progressCallback(percentage, message);
            }

            KC.EventBus.emit('QDRANT_PROCESSING_PROGRESS', {
                percentage,
                message
            });
        }

        /**
         * Define callback de progresso
         */
        setProgressCallback(callback) {
            this.progressCallback = callback;
        }
    }

    // Registrar no KC
    KC.QdrantProcessorWithFilters = new QdrantProcessorWithFilters();
    
    // Expor função global para facilitar uso
    window.processToQdrantWithFilters = function(options) {
        return KC.QdrantProcessorWithFilters.processFilesToQdrant(options);
    };

    console.log('[QdrantProcessorWithFilters] Módulo carregado e disponível');

})(window);