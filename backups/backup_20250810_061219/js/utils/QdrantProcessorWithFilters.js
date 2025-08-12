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
            this.enableConsoleLog = false; // Flag para debug opcional
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
            
            // Mostrar o painel de logs se estiver disponível
            if (KC.ProcessingLogs) {
                KC.ProcessingLogs.show();
                KC.ProcessingLogs.log('🚀 Iniciando processamento para Qdrant...');
            }
            
            try {
                // 1. Obter arquivos do AppState
                const allFiles = KC.AppState.get('files') || [];
                const totalFilesMsg = `Total de arquivos no sistema: ${allFiles.length}`;
                if (KC.ProcessingLogs) {
                    KC.ProcessingLogs.log(totalFilesMsg);
                }
                if (this.enableConsoleLog) console.log(totalFilesMsg);

                // 2. Aplicar filtros ativos
                let filesToProcess = this.applyActiveFilters(allFiles, options);
                const filteredMsg = `Arquivos após filtros: ${filesToProcess.length}`;
                if (KC.ProcessingLogs) {
                    KC.ProcessingLogs.log(filteredMsg);
                }
                if (this.enableConsoleLog) console.log(filteredMsg);

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
                const successMsg = `✅ Processamento concluído! ${result.processed} arquivos processados, ${result.chunks} chunks criados.`;
                
                if (KC.ProcessingLogs) {
                    KC.ProcessingLogs.log(successMsg);
                    KC.ProcessingLogs.log(`⏱️ Tempo total: ${(result.duration / 1000).toFixed(2)} segundos`);
                    if (result.errors.length > 0) {
                        KC.ProcessingLogs.log(`⚠️ ${result.errors.length} erros encontrados durante o processamento`);
                    }
                }
                
                KC.showNotification?.({
                    type: 'success',
                    message: successMsg,
                    duration: 8000
                });

                // 6. Emitir evento de conclusão
                KC.EventBus.emit('QDRANT_PROCESSING_COMPLETED', result);

                return result;

            } catch (error) {
                const errorMsg = `❌ Erro ao processar arquivos: ${error.message}`;
                if (KC.ProcessingLogs) {
                    KC.ProcessingLogs.log(errorMsg);
                }
                if (this.enableConsoleLog) console.error('Erro ao processar arquivos:', error);
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
                    const batchErrorMsg = `❌ Erro ao processar batch: ${error.message}`;
                    if (KC.ProcessingLogs) {
                        KC.ProcessingLogs.log(batchErrorMsg);
                    }
                    if (this.enableConsoleLog) console.error('Erro ao processar batch:', error);
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
                        const warnMsg = `⚠️ Arquivo ${file.name} sem conteúdo, pulando...`;
                        if (KC.ProcessingLogs) {
                            KC.ProcessingLogs.log(warnMsg);
                        }
                        if (this.enableConsoleLog) console.warn(warnMsg);
                        continue;
                    }

                    // Criar chunks do arquivo
                    const chunks = KC.ChunkingUtils?.getSemanticChunks(file.content) || 
                                 this.simpleChunking(file.content);

                    // Processar cada chunk
                    for (let i = 0; i < chunks.length; i++) {
                        const chunk = chunks[i];
                        // Garantir que o chunk tem um índice
                        const chunkIndex = chunk.index !== undefined ? chunk.index : i;
                        
                        // Gerar embedding
                        const embedding = await KC.EmbeddingService.generateEmbedding(chunk.content);

                        // VOLTANDO AO QUE FUNCIONAVA - sem QdrantUnifiedSchema
                        // Criar payload simples como antes
                        const payload = {
                            fileName: file.name,
                            filePath: file.path,
                            chunkIndex: chunkIndex,
                            content: chunk.content.substring(0, 5000), // Limitar tamanho
                            analysisType: file.analysisType || 'Não analisado',
                            categories: file.categories || [],
                            relevanceScore: file.relevanceScore || 0,
                            approved: file.approved || false,
                            analyzed: file.analyzed || false,
                            createdAt: file.createdAt || new Date().toISOString(),
                            fileId: file.id,
                            chunkMetadata: chunk.metadata || {}
                        };

                        // Gerar ID numérico único para o Qdrant
                        // Usa os últimos 9 dígitos do timestamp + 4 dígitos do índice
                        const timestamp = Date.now();
                        const shortTimestamp = parseInt(timestamp.toString().slice(-9));
                        const pointId = parseInt(`${shortTimestamp}${chunkIndex.toString().padStart(4, '0')}`);
                        
                        // Log de processamento
                        const logMessage = `Processando chunk ${chunkIndex} do arquivo ${file.name}: {pointId: ${pointId}, embeddingLength: ${embedding.length}, contentLength: ${chunk.content.length}, payloadSize: ${JSON.stringify(payload).length}}`;
                        
                        // Usa ProcessingLogs se disponível
                        if (KC.ProcessingLogs) {
                            KC.ProcessingLogs.log(logMessage);
                        }
                        
                        // Console log opcional para debug
                        if (this.enableConsoleLog) {
                            console.log('[QdrantProcessor]', logMessage);
                        }
                        
                        // Enviar para Qdrant com retry em caso de erro de transporte
                        let retries = 3;
                        let lastError = null;
                        
                        while (retries > 0) {
                            try {
                                await KC.QdrantService.insertPoint({
                                    id: pointId,
                                    vector: embedding,
                                    payload: payload
                                });
                                break; // Sucesso, sair do loop
                            } catch (error) {
                                lastError = error;
                                if (error.message.includes('transport error') && retries > 1) {
                                    const retryMsg = `⚠️ Erro de transporte, tentando novamente... (${retries - 1} tentativas restantes)`;
                                    if (KC.ProcessingLogs) {
                                        KC.ProcessingLogs.log(retryMsg);
                                    }
                                    if (this.enableConsoleLog) console.warn(retryMsg);
                                    await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1 segundo
                                    retries--;
                                } else {
                                    throw error; // Repassar o erro se não for transport error ou sem retries
                                }
                            }
                        }
                        
                        if (retries === 0 && lastError) {
                            throw lastError;
                        }

                        result.chunks++;
                        
                        // Pequeno delay para garantir IDs únicos (1ms)
                        await new Promise(resolve => setTimeout(resolve, 1));
                    }

                    result.processed++;
                } catch (error) {
                    const errorMsg = `❌ Erro ao processar arquivo ${file.name}: ${error.message}`;
                    if (KC.ProcessingLogs) {
                        KC.ProcessingLogs.log(errorMsg);
                    }
                    if (this.enableConsoleLog) console.error(`Erro ao processar arquivo ${file.name}:`, error);
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
    console.log('[QdrantProcessorWithFilters] Logs de processamento serão direcionados para ProcessingLogsPanel quando disponível');

})(window);