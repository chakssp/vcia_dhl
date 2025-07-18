/**
 * RAGExportManager.js - Gerenciador de Exportação para RAG
 * 
 * Consolida dados de múltiplas fontes para exportação em formato
 * compatível com Qdrant e outros sistemas RAG (Retrieval-Augmented Generation)
 * 
 * @requires AppState, CategoryManager, AnalysisManager, PreviewUtils, ChunkingUtils
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    
    class RAGExportManager {
        constructor() {
            this.version = "1.0";
            this.exportFormats = ['qdrant', 'json', 'markdown', 'csv'];
            this.chunkSize = 512; // Tamanho padrão dos chunks para embeddings
        }

        /**
         * Inicializa o gerenciador
         */
        initialize() {
            KC.Logger?.info('RAGExportManager', 'Inicializado - Consolidação de dados para RAG');
        }

        /**
         * Pipeline principal de consolidação de dados
         * @returns {Object} Dados consolidados prontos para exportação
         */
        async consolidateData() {
            KC.Logger?.flow('RAGExportManager', 'Iniciando pipeline de consolidação');

            try {
                // 1. Coletar dados aprovados das etapas 1-3
                const approvedData = this._collectApprovedData();
                
                // 2. Enriquecer com análise IA (se disponível)
                const enrichedData = await this._enrichWithAIAnalysis(approvedData);
                
                // 3. Aplicar chunking semântico
                const chunkedData = this._applySemanticChunking(enrichedData);
                
                // 4. Gerar metadados enriquecidos
                const finalData = this._generateEnrichedMetadata(chunkedData);
                
                // 5. Estruturar para exportação
                const exportData = this._structureForExport(finalData);
                
                KC.Logger?.success('RAGExportManager', 'Pipeline de consolidação concluído', {
                    totalDocuments: exportData.documents.length,
                    totalChunks: exportData.documents.reduce((acc, doc) => acc + doc.chunks.length, 0)
                });

                return exportData;

            } catch (error) {
                KC.Logger?.error('RAGExportManager', 'Erro na consolidação', error);
                throw error;
            }
        }

        /**
         * Coleta dados aprovados das etapas 1-3
         * @private
         */
        _collectApprovedData() {
            const files = KC.AppState.get('files') || [];
            const categories = KC.CategoryManager.getCategories();
            const stats = KC.AppState.get('stats') || {};

            // Filtrar apenas arquivos que passaram pela pré-análise
            const approvedFiles = files.filter(file => {
                // Normaliza relevanceScore para percentual se necessário
                let relevance = file.relevanceScore;
                if (relevance && relevance < 1) {
                    relevance = relevance * 100;
                }
                
                return relevance >= 50 && // Threshold de relevância (50%)
                       file.preview && // Tem preview extraído
                       !file.archived; // Não está arquivado
            });

            KC.Logger?.info('RAGExportManager', 'Dados coletados', {
                totalFiles: files.length,
                approvedFiles: approvedFiles.length,
                categories: categories.length
            });

            return {
                files: approvedFiles,
                categories: categories,
                stats: stats,
                configuration: KC.AppState.get('configuration')
            };
        }

        /**
         * Enriquece dados com análise de IA
         * @private
         */
        async _enrichWithAIAnalysis(data) {
            const enrichedFiles = [];

            for (const file of data.files) {
                const enrichedFile = { ...file };

                // Adicionar análise IA se disponível
                if (file.analyzed && file.analysisType) {
                    enrichedFile.aiAnalysis = {
                        type: file.analysisType,
                        moments: file.moments || [],
                        insights: file.insights || [],
                        summary: file.summary || '',
                        confidence: file.confidence || 0.5
                    };
                }

                // Adicionar categorias estruturais
                if (file.categories && file.categories.length > 0) {
                    enrichedFile.structuralCategories = file.categories.map(catId => {
                        const category = KC.CategoryManager.getCategoryById(catId);
                        return {
                            id: catId,
                            name: category?.name || catId,
                            color: category?.color,
                            icon: category?.icon
                        };
                    });
                }

                // Adicionar preview estruturado
                if (file.preview) {
                    enrichedFile.structuredPreview = {
                        segments: file.preview,
                        relevanceScore: file.relevanceScore,
                        keywords: this._extractKeywords(file.preview)
                    };
                }

                enrichedFiles.push(enrichedFile);
            }

            return {
                ...data,
                files: enrichedFiles
            };
        }

        /**
         * Aplica chunking semântico aos dados
         * @private
         */
        _applySemanticChunking(data) {
            const chunkedFiles = data.files.map(file => {
                const chunks = [];

                // Se tiver conteúdo completo, fazer chunking
                if (file.content) {
                    const rawChunks = KC.ChunkingUtils.getSemanticChunks(file.content);
                    
                    rawChunks.forEach((chunk, index) => {
                        chunks.push({
                            id: `${file.id}-chunk-${index}`,
                            content: chunk.content,
                            position: chunk.position,
                            metadata: {
                                fileId: file.id,
                                fileName: file.name,
                                chunkIndex: index,
                                totalChunks: rawChunks.length,
                                keywords: this._extractKeywords(chunk.content),
                                semanticDensity: this._calculateSemanticDensity(chunk.content),
                                relevanceInheritance: file.relevanceScore * 0.8 // 80% da relevância do arquivo
                            }
                        });
                    });
                }

                // Se não tiver conteúdo, criar chunk único com preview
                if (chunks.length === 0 && file.preview) {
                    const previewText = KC.PreviewUtils.getTextPreview(file.preview);
                    chunks.push({
                        id: `${file.id}-preview-chunk`,
                        content: previewText,
                        position: 0,
                        metadata: {
                            fileId: file.id,
                            fileName: file.name,
                            isPreviewOnly: true,
                            keywords: this._extractKeywords(previewText),
                            relevanceInheritance: file.relevanceScore
                        }
                    });
                }

                return {
                    ...file,
                    chunks: chunks
                };
            });

            return {
                ...data,
                files: chunkedFiles
            };
        }

        /**
         * Gera metadados enriquecidos
         * @private
         */
        _generateEnrichedMetadata(data) {
            const enrichedFiles = data.files.map(file => {
                const metadata = {
                    // Metadados básicos
                    id: file.id,
                    name: file.name,
                    path: file.path,
                    size: file.size,
                    lastModified: file.lastModified,
                    
                    // Metadados de análise
                    relevanceScore: file.relevanceScore,
                    analysisType: file.analysisType || 'not_analyzed',
                    analyzed: file.analyzed || false,
                    
                    // Metadados estruturais
                    categories: file.structuralCategories || [],
                    tags: this._generateTags(file),
                    
                    // Metadados semânticos
                    mainTopics: this._extractMainTopics(file),
                    keyPhrases: this._extractKeyPhrases(file),
                    
                    // Metadados temporais
                    temporalContext: this._extractTemporalContext(file),
                    
                    // Metadados de relacionamento
                    relatedFiles: this._findRelatedFiles(file, data.files),
                    
                    // Schema.org compatível
                    schemaOrg: this._generateSchemaOrg(file)
                };

                return {
                    ...file,
                    metadata: metadata
                };
            });

            return {
                ...data,
                files: enrichedFiles
            };
        }

        /**
         * Estrutura dados para exportação
         * @private
         */
        _structureForExport(data) {
            const exportStructure = {
                version: this.version,
                metadata: {
                    project: "Knowledge Consolidator",
                    exportDate: new Date().toISOString(),
                    totalFiles: data.files.length,
                    totalChunks: data.files.reduce((acc, file) => acc + file.chunks.length, 0),
                    configuration: data.configuration,
                    stats: data.stats
                },
                documents: data.files.map(file => ({
                    id: file.id,
                    source: {
                        fileName: file.name,
                        path: file.path,
                        size: file.size,
                        lastModified: file.lastModified,
                        handle: file.handle ? 'available' : 'not_available'
                    },
                    analysis: {
                        type: file.analysisType || 'pending',
                        relevanceScore: file.relevanceScore,
                        moments: file.aiAnalysis?.moments || [],
                        insights: file.aiAnalysis?.insights || [],
                        summary: file.aiAnalysis?.summary || '',
                        categories: file.metadata.categories
                    },
                    chunks: file.chunks,
                    metadata: file.metadata,
                    preview: file.structuredPreview,
                    insights: {
                        decisiveMoments: this._extractDecisiveMoments(file),
                        breakthroughs: this._extractBreakthroughs(file),
                        evolution: this._extractEvolution(file)
                    }
                })),
                categories: data.categories,
                knowledgeGraph: this._buildKnowledgeGraph(data.files)
            };

            return exportStructure;
        }

        /**
         * Exporta dados em formato específico
         * @param {string} format - Formato de exportação (qdrant, json, markdown, csv)
         * @returns {Object|string} Dados exportados no formato solicitado
         */
        async exportData(format = 'qdrant') {
            const consolidatedData = await this.consolidateData();

            switch (format) {
                case 'qdrant':
                    return this._exportToQdrant(consolidatedData);
                case 'json':
                    return JSON.stringify(consolidatedData, null, 2);
                case 'markdown':
                    return this._exportToMarkdown(consolidatedData);
                case 'csv':
                    return this._exportToCSV(consolidatedData);
                default:
                    throw new Error(`Formato de exportação não suportado: ${format}`);
            }
        }

        /**
         * Processa arquivos aprovados - Pipeline completo com embeddings e Qdrant
         * @param {Object} options - Opções de processamento
         * @returns {Object} Resultado do processamento
         */
        async processApprovedFiles(options = {}) {
            KC.Logger?.info('RAGExportManager', 'Iniciando pipeline de processamento');
            
            // Emite evento de início
            KC.EventBus?.emit(KC.Events.PIPELINE_STARTED || 'pipeline:started', {
                timestamp: new Date().toISOString()
            });

            try {
                // 0. Garantir integridade dos dados se DataIntegrityManager estiver disponível
                if (KC.DataIntegrityManager) {
                    await KC.DataIntegrityManager.ensureDataIntegrity();
                    KC.Logger?.info('RAGExportManager', 'Integridade dos dados verificada');
                }
                
                // 1. Consolida dados
                const consolidatedData = await this.consolidateData();
                const totalDocuments = consolidatedData.documents.length;
                
                if (totalDocuments === 0) {
                    KC.Logger?.warn('RAGExportManager', 'Nenhum arquivo para processar');
                    KC.EventBus?.emit(KC.Events.PIPELINE_COMPLETED || 'pipeline:completed', {
                        success: false,
                        message: 'Nenhum arquivo aprovado encontrado'
                    });
                    return { success: false, message: 'Nenhum arquivo aprovado encontrado' };
                }

                KC.Logger?.info('RAGExportManager', `Processando ${totalDocuments} documentos`);

                // 2. Verifica serviços necessários
                const embeddingAvailable = await KC.EmbeddingService?.checkOllamaAvailability();
                const qdrantAvailable = await KC.QdrantService?.checkConnection();

                if (!embeddingAvailable) {
                    throw new Error('Serviço de embeddings (Ollama) não está disponível');
                }

                if (!qdrantAvailable) {
                    throw new Error('Serviço Qdrant não está acessível');
                }

                // 3. Processa documentos em batches
                const batchSize = options.batchSize || 10;
                const results = {
                    processed: 0,
                    failed: 0,
                    totalChunks: 0,
                    errors: []
                };

                for (let i = 0; i < totalDocuments; i += batchSize) {
                    const batch = consolidatedData.documents.slice(i, i + batchSize);
                    
                    // Emite progresso
                    KC.EventBus?.emit(KC.Events.PIPELINE_PROGRESS || 'pipeline:progress', {
                        current: i,
                        total: totalDocuments,
                        percentage: Math.round((i / totalDocuments) * 100)
                    });

                    // Processa batch
                    await this._processBatch(batch, results);
                }

                // 4. Emite evento de conclusão
                KC.EventBus?.emit(KC.Events.PIPELINE_COMPLETED || 'pipeline:completed', {
                    success: true,
                    results: results
                });

                KC.Logger?.success('RAGExportManager', 'Pipeline concluído', results);

                return {
                    success: true,
                    results: results,
                    message: `Processados ${results.processed} documentos com ${results.totalChunks} chunks`
                };

            } catch (error) {
                KC.Logger?.error('RAGExportManager', 'Erro no pipeline', error);
                
                KC.EventBus?.emit(KC.Events.PIPELINE_COMPLETED || 'pipeline:completed', {
                    success: false,
                    error: error.message
                });

                return {
                    success: false,
                    error: error.message
                };
            }
        }

        /**
         * Processa um batch de documentos
         * @private
         */
        async _processBatch(documents, results) {
            for (const doc of documents) {
                try {
                    // Prepara pontos para o Qdrant
                    const points = [];
                    
                    for (const chunk of doc.chunks) {
                        let retries = 3;
                        let lastError = null;
                        
                        while (retries > 0) {
                            try {
                                // Gera embedding para o chunk com retry
                                const embedding = await this._generateEmbeddingWithRetry(chunk.content, 3);
                                
                                if (!embedding) {
                                    throw new Error(`Falha ao gerar embedding para chunk ${chunk.id}`);
                                }

                                // Prepara ponto para inserção
                                // Gera ID numérico único baseado em timestamp + índice
                                const pointId = Date.now() * 1000 + points.length;
                                
                                points.push({
                                    id: pointId,
                                    vector: embedding,
                                    payload: {
                                        originalChunkId: chunk.id, // Salva o ID original no payload
                                        documentId: doc.id,
                                        fileName: doc.source.fileName,
                                        chunkId: chunk.id,
                                        content: chunk.content,
                                        metadata: {
                                            ...chunk.metadata,
                                            analysisType: doc.analysis.type,
                                            categories: doc.analysis.categories.map(cat => cat.name),
                                            relevanceScore: doc.analysis.relevanceScore,
                                            lastModified: doc.source.lastModified,
                                            processedAt: new Date().toISOString()
                                        }
                                    }
                                });

                                results.totalChunks++;
                                break; // Sucesso, sai do loop de retry
                                
                            } catch (chunkError) {
                                lastError = chunkError;
                                retries--;
                                
                                if (retries > 0) {
                                    KC.Logger?.info('RAGExportManager', `Tentando novamente chunk ${chunk.id} (${retries} tentativas restantes)`);
                                    await this._delay(1000 * (3 - retries)); // Delay progressivo
                                }
                            }
                        }
                        
                        // Se esgotou as tentativas, registra erro
                        if (retries === 0 && lastError) {
                            KC.Logger?.error('RAGExportManager', `Erro ao processar chunk ${chunk.id} após 3 tentativas`, lastError);
                            results.errors.push({
                                documentId: doc.id,
                                chunkId: chunk.id,
                                error: lastError.message
                            });
                        }
                    }

                    // Insere pontos no Qdrant se houver
                    if (points.length > 0) {
                        const insertResult = await this._insertWithRetry(points, 3);
                        
                        if (insertResult?.success) {
                            results.processed++;
                            KC.Logger?.info('RAGExportManager', `Documento ${doc.id} processado com ${points.length} chunks`);
                        } else {
                            throw new Error(`Falha ao inserir no Qdrant: ${insertResult?.error}`);
                        }
                    }

                } catch (docError) {
                    KC.Logger?.error('RAGExportManager', `Erro ao processar documento ${doc.id}`, docError);
                    results.failed++;
                    results.errors.push({
                        documentId: doc.id,
                        error: docError.message
                    });
                }
            }
        }

        /**
         * Gera embedding com retry
         * @private
         */
        async _generateEmbeddingWithRetry(content, maxRetries = 3) {
            let retries = maxRetries;
            let lastError = null;
            
            while (retries > 0) {
                try {
                    // Verifica se conteúdo é válido
                    if (!content || content.trim().length < 3) {
                        throw new Error('Conteúdo muito curto ou vazio para gerar embedding');
                    }
                    
                    // Se conteúdo for muito curto, adiciona contexto
                    let textForEmbedding = content;
                    if (content.trim().length < 20) {
                        textForEmbedding = `Documento: ${content}`;
                    }
                    
                    const embedding = await KC.EmbeddingService?.generateEmbedding(textForEmbedding);
                    
                    if (embedding && embedding.length > 0) {
                        return embedding;
                    }
                    
                    throw new Error('Embedding retornado está vazio');
                    
                } catch (error) {
                    lastError = error;
                    retries--;
                    
                    if (retries > 0) {
                        // Verifica se é erro de conexão com Ollama
                        if (error.message?.includes('Ollama') || error.message?.includes('ECONNREFUSED')) {
                            KC.Logger?.info('RAGExportManager', 'Ollama parece estar offline, aguardando...');
                            await this._delay(5000); // Espera mais para Ollama
                        } else {
                            await this._delay(1000 * (maxRetries - retries));
                        }
                    }
                }
            }
            
            throw lastError || new Error('Falha ao gerar embedding após múltiplas tentativas');
        }

        /**
         * Insere no Qdrant com retry
         * @private
         */
        async _insertWithRetry(points, maxRetries = 3) {
            let retries = maxRetries;
            let lastError = null;
            
            while (retries > 0) {
                try {
                    const result = await KC.QdrantService?.insertBatch(points);
                    
                    if (result?.success) {
                        return result;
                    }
                    
                    throw new Error(result?.error || 'Erro desconhecido ao inserir no Qdrant');
                    
                } catch (error) {
                    lastError = error;
                    retries--;
                    
                    if (retries > 0) {
                        KC.Logger?.info('RAGExportManager', `Tentando inserir novamente no Qdrant (${retries} tentativas restantes)`);
                        await this._delay(2000 * (maxRetries - retries));
                    }
                }
            }
            
            return {
                success: false,
                error: lastError?.message || 'Falha ao inserir no Qdrant após múltiplas tentativas'
            };
        }

        /**
         * Delay helper
         * @private
         */
        async _delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        /**
         * Exporta para formato Qdrant
         * @private
         */
        _exportToQdrant(data) {
            const points = [];
            let pointId = 1;

            data.documents.forEach(doc => {
                doc.chunks.forEach(chunk => {
                    points.push({
                        id: pointId++,
                        vector: null, // Será preenchido pelo pipeline de embeddings
                        payload: {
                            documentId: doc.id,
                            fileName: doc.source.fileName,
                            chunkId: chunk.id,
                            content: chunk.content,
                            metadata: {
                                ...chunk.metadata,
                                analysisType: doc.analysis.type,
                                categories: doc.analysis.categories.map(cat => cat.name),
                                relevanceScore: doc.analysis.relevanceScore,
                                lastModified: doc.source.lastModified
                            }
                        }
                    });
                });
            });

            return {
                collection: "knowledge_consolidator",
                points: points,
                metadata: data.metadata
            };
        }

        // Métodos auxiliares

        _extractKeywords(text) {
            if (!text) return [];
            
            // Garantir que text é uma string
            let textStr = text;
            if (typeof text === 'object') {
                // Se for um objeto preview, extrair o texto
                if (text.segment1 || text.segment2 || text.segment3) {
                    textStr = KC.PreviewUtils?.getTextPreview(text) || '';
                } else {
                    textStr = JSON.stringify(text);
                }
            } else if (typeof text !== 'string') {
                textStr = String(text);
            }
            
            const words = textStr.toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 3);
            
            const wordFreq = {};
            words.forEach(word => {
                wordFreq[word] = (wordFreq[word] || 0) + 1;
            });
            
            return Object.entries(wordFreq)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([word]) => word);
        }

        _calculateSemanticDensity(text) {
            if (!text) return 0;
            
            const keywords = this._extractKeywords(text);
            const totalWords = text.split(/\s+/).length;
            
            return keywords.length / Math.max(totalWords, 1);
        }

        _generateTags(file) {
            const tags = new Set();
            
            // Tags baseadas no tipo de análise
            if (file.analysisType) {
                tags.add(file.analysisType.toLowerCase().replace(/\s+/g, '-'));
            }
            
            // Tags baseadas em categorias
            if (file.structuralCategories) {
                file.structuralCategories.forEach(cat => {
                    tags.add(cat.name.toLowerCase().replace(/\s+/g, '-'));
                });
            }
            
            // Tags baseadas em relevância
            if (file.relevanceScore >= 90) {
                tags.add('high-priority');
            } else if (file.relevanceScore >= 70) {
                tags.add('medium-priority');
            }
            
            return Array.from(tags);
        }

        _extractMainTopics(file) {
            const topics = [];
            
            // Extrair dos moments da análise IA
            if (file.aiAnalysis?.moments) {
                topics.push(...file.aiAnalysis.moments.slice(0, 3));
            }
            
            // Extrair das keywords do preview
            if (file.structuredPreview?.keywords) {
                topics.push(...file.structuredPreview.keywords.slice(0, 3));
            }
            
            return [...new Set(topics)].slice(0, 5);
        }

        _extractKeyPhrases(file) {
            // Simplificado - em produção, usar NLP mais avançado
            const text = file.content || KC.PreviewUtils.getTextPreview(file.preview || {});
            const phrases = text.match(/[A-Z][^.!?]*[.!?]/g) || [];
            
            return phrases
                .filter(phrase => phrase.split(' ').length >= 3 && phrase.split(' ').length <= 10)
                .slice(0, 5);
        }

        _extractTemporalContext(file) {
            const date = new Date(file.lastModified);
            
            return {
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                quarter: Math.ceil((date.getMonth() + 1) / 3),
                dayOfWeek: date.getDay(),
                isWeekend: date.getDay() === 0 || date.getDay() === 6
            };
        }

        _findRelatedFiles(file, allFiles) {
            // Encontrar arquivos relacionados por categorias compartilhadas
            const relatedFiles = allFiles
                .filter(f => f.id !== file.id)
                .map(f => {
                    const sharedCategories = file.categories?.filter(cat => 
                        f.categories?.includes(cat)
                    ) || [];
                    
                    return {
                        id: f.id,
                        name: f.name,
                        similarity: sharedCategories.length / Math.max(file.categories?.length || 1, 1)
                    };
                })
                .filter(f => f.similarity > 0)
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, 5);
            
            return relatedFiles;
        }

        _generateSchemaOrg(file) {
            return {
                "@context": "https://schema.org",
                "@type": "DigitalDocument",
                "name": file.name,
                "dateModified": file.lastModified,
                "contentSize": file.size,
                "encodingFormat": file.name.split('.').pop(),
                "keywords": file.metadata?.tags?.join(', ') || '',
                "about": file.aiAnalysis?.summary || file.structuredPreview?.segments?.segment1 || ''
            };
        }

        _extractDecisiveMoments(file) {
            if (file.analysisType === 'Momento Decisivo' && file.aiAnalysis?.moments) {
                return file.aiAnalysis.moments;
            }
            return [];
        }

        _extractBreakthroughs(file) {
            if (file.analysisType === 'Breakthrough Técnico' && file.aiAnalysis?.insights) {
                return file.aiAnalysis.insights;
            }
            return [];
        }

        _extractEvolution(file) {
            if (file.analysisType === 'Evolução Conceitual' && file.aiAnalysis?.moments) {
                return file.aiAnalysis.moments.map(moment => ({
                    concept: moment,
                    timestamp: file.lastModified,
                    relevance: file.relevanceScore
                }));
            }
            return [];
        }

        _buildKnowledgeGraph(files) {
            const nodes = [];
            const edges = [];
            
            // Criar nós para cada arquivo
            files.forEach(file => {
                nodes.push({
                    id: file.id,
                    label: file.name,
                    type: 'document',
                    relevance: file.relevanceScore,
                    categories: file.categories || []
                });
            });
            
            // Criar arestas baseadas em relacionamentos
            files.forEach(file => {
                if (file.metadata?.relatedFiles) {
                    file.metadata.relatedFiles.forEach(related => {
                        edges.push({
                            source: file.id,
                            target: related.id,
                            weight: related.similarity,
                            type: 'similarity'
                        });
                    });
                }
            });
            
            return {
                nodes: nodes,
                edges: edges
            };
        }

        _exportToMarkdown(data) {
            let markdown = `# Knowledge Consolidator Export\n\n`;
            markdown += `**Export Date**: ${data.metadata.exportDate}\n`;
            markdown += `**Total Documents**: ${data.metadata.totalFiles}\n`;
            markdown += `**Total Chunks**: ${data.metadata.totalChunks}\n\n`;
            
            markdown += `## Documents\n\n`;
            
            data.documents.forEach(doc => {
                markdown += `### ${doc.source.fileName}\n`;
                markdown += `- **Relevance**: ${doc.analysis.relevanceScore}%\n`;
                markdown += `- **Type**: ${doc.analysis.type}\n`;
                markdown += `- **Categories**: ${doc.analysis.categories.map(c => c.name).join(', ')}\n`;
                
                if (doc.analysis.summary) {
                    markdown += `- **Summary**: ${doc.analysis.summary}\n`;
                }
                
                if (doc.insights.decisiveMoments.length > 0) {
                    markdown += `\n**Decisive Moments**:\n`;
                    doc.insights.decisiveMoments.forEach(moment => {
                        markdown += `- ${moment}\n`;
                    });
                }
                
                markdown += `\n---\n\n`;
            });
            
            return markdown;
        }

        _exportToCSV(data) {
            const headers = [
                'File Name',
                'Path',
                'Relevance Score',
                'Analysis Type',
                'Categories',
                'Last Modified',
                'Summary'
            ];
            
            const rows = data.documents.map(doc => [
                doc.source.fileName,
                doc.source.path,
                doc.analysis.relevanceScore,
                doc.analysis.type,
                doc.analysis.categories.map(c => c.name).join(';'),
                doc.source.lastModified,
                (doc.analysis.summary || '').replace(/"/g, '""')
            ]);
            
            const csv = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');
            
            return csv;
        }
    }

    // Registra no namespace global
    KC.RAGExportManager = new RAGExportManager();
    KC.Logger?.info('RAGExportManager', 'Componente registrado com sucesso');

})(window);