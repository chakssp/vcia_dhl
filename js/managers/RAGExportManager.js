/**
 * RAGExportManager.js - Gerenciador de Exportação para RAG
 * 
 * Consolida dados de múltiplas fontes para exportação em formato
 * compatível com Qdrant e outros sistemas RAG (Retrieval-Augmented Generation)
 * 
 * @requires AppState, CategoryManager, AnalysisManager, PreviewUtils, ChunkingUtils
 * @version 1.0.1
 * @lastModified 2025-02-02T15:30:00Z - Adicionado diagnóstico completo e geração de chunks após enriquecimento
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

            // FASE 1.2: Remover threshold mínimo para arquivos categorizados
            // AIDEV-NOTE: category-threshold; arquivos categorizados sempre válidos para Qdrant
            const approvedFiles = files.filter(file => {
                // Arquivo categorizado = automaticamente válido (curadoria humana)
                if (file.categories && file.categories.length > 0) {
                    // FASE 1.2 FIX: Garantir que arquivo categorizado sempre passa
                    // mesmo sem preview (preview será gerado se necessário)
                    KC.Logger?.info('RAGExportManager', `Arquivo ${file.name} aprovado por categorização`, {
                        categories: file.categories,
                        relevance: file.relevanceScore,
                        hasPreview: !!file.preview,
                        archived: file.archived,
                        approved: file.approved
                    });
                    
                    // Validar apenas que não está arquivado (descartado)
                    return !file.archived;
                }
                
                // Para arquivos não categorizados, mantém critérios anteriores
                return file.preview && // Tem preview extraído (necessário para chunking)
                       !file.archived && // Não está arquivado (arquivado = descartado pelo usuário)
                       file.approved !== false; // Não foi explicitamente rejeitado
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
                        type: file.analysisType || 'Aprendizado Geral', // CRÍTICO: Default para convergência
                        analysisType: file.analysisType || 'Aprendizado Geral', // Duplicar para compatibilidade
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
                    // Normalizar preview para string
                    let previewText = '';
                    if (typeof file.preview === 'string') {
                        previewText = file.preview;
                    } else if (typeof file.preview === 'object') {
                        // Se for objeto, extrair texto usando PreviewUtils ou concatenar segments
                        if (KC.PreviewUtils && KC.PreviewUtils.getTextPreview) {
                            previewText = KC.PreviewUtils.getTextPreview(file.preview);
                        } else {
                            // Fallback: concatenar todos os valores do objeto
                            previewText = Object.values(file.preview).filter(v => v).join(' ... ');
                        }
                    }
                    
                    enrichedFile.structuredPreview = {
                        segments: file.preview,
                        text: previewText, // NOVO: texto normalizado
                        relevanceScore: file.relevanceScore,
                        keywords: this._extractKeywords(previewText), // Usar texto normalizado
                        // CRITICAL FIX: Add structure property with all required fields
                        structure: file.preview?.structure || {
                            hasHeaders: false,
                            hasLists: false,
                            hasCode: false,
                            hasLinks: false,
                            hasImages: false
                        }
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
                    let previewText = '';
                    if (typeof file.preview === 'string') {
                        previewText = file.preview;
                    } else if (typeof file.preview === 'object') {
                        // Normalizar preview objeto para string
                        if (KC.PreviewUtils && KC.PreviewUtils.getTextPreview) {
                            previewText = KC.PreviewUtils.getTextPreview(file.preview);
                        } else {
                            previewText = Object.values(file.preview).filter(v => v).join(' ... ');
                        }
                    }
                    
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
                
                // FASE 1.2 FIX: Se arquivo categorizado sem chunks, criar chunk mínimo
                if (chunks.length === 0 && file.categories && file.categories.length > 0) {
                    KC.Logger?.warn('RAGExportManager', `Arquivo categorizado sem conteúdo/preview: ${file.name}`);
                    
                    // Criar chunk com metadados básicos para garantir indexação
                    const fallbackContent = `${file.name}\nArquivo categorizado como: ${file.categories.join(', ')}\nRelevância: ${file.relevanceScore || 0}%`;
                    
                    chunks.push({
                        id: `${file.id}-category-chunk`,
                        content: fallbackContent,
                        position: 0,
                        metadata: {
                            fileId: file.id,
                            fileName: file.name,
                            isCategoryOnly: true,
                            categories: file.categories,
                            keywords: file.categories,
                            relevanceInheritance: file.relevanceScore || 50 // Mínimo 50% para categorizados
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
         * REFATORADO: Adiciona content, name, path no nível raiz para Intelligence Enrichment Pipeline
         * @private
         */
        _structureForExport(data) {
            // Validação inicial - detecta documentos sem content que precisam de enriquecimento
            const documentsWithoutContent = data.files.filter(file => !file.content && !file.preview);
            if (documentsWithoutContent.length > 0) {
                KC.Logger?.warn('RAGExportManager', `${documentsWithoutContent.length} documentos sem content detectados:`, 
                    documentsWithoutContent.map(f => f.name || f.id)
                );
            }

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
                documents: data.files.map(file => {
                    // CRÍTICO: Validação individual por documento
                    const hasContent = !!(file.content || file.preview);
                    const contentToUse = file.content || file.preview || '';
                    
                    // Se não tem content nem preview, gera erro claro
                    if (!hasContent) {
                        KC.Logger?.error('RAGExportManager', `Documento ${file.name || file.id} não possui content nem preview - enriquecimento será impossível`);
                    }

                    return {
                        // NOVO: Campos no nível raiz para Intelligence Enrichment Pipeline
                        content: contentToUse,
                        name: file.name,
                        path: file.path,
                        categories: KC.CategoryNormalizer.normalize(file.categories, 'RAGExportManager._structureForExport.root'),
                        // CORREÇÃO: analysisType no nível raiz para IntelligenceEnrichmentPipeline
                        analysisType: file.analysisType || 'Aprendizado Geral',
                        
                        // EXISTENTE: Estrutura original mantida para compatibilidade completa
                        id: file.id,
                        source: {
                            fileName: file.name,
                            path: file.path,
                            size: file.size,
                            lastModified: file.lastModified,
                            handle: file.handle ? 'available' : 'not_available'
                        },
                        analysis: {
                            type: file.analysisType || 'Aprendizado Geral', // CRÍTICO: Usar default consistente
                            analysisType: file.analysisType || 'Aprendizado Geral', // Duplicar campo para garantir
                            relevanceScore: file.relevanceScore,
                            moments: file.aiAnalysis?.moments || [],
                            insights: file.aiAnalysis?.insights || [],
                            summary: file.aiAnalysis?.summary || '',
                            categories: KC.CategoryNormalizer.normalize(file.categories, 'RAGExportManager._structureForExport')
                        },
                        chunks: file.chunks,
                        metadata: file.metadata,
                        // CRITICAL FIX: Ensure preview has structure property
                        preview: file.structuredPreview || {
                            segments: file.preview || {},
                            text: contentToUse,
                            structure: {
                                hasHeaders: false,
                                hasLists: false,
                                hasCode: false,
                                hasLinks: false,
                                hasImages: false
                            }
                        },
                        insights: {
                            decisiveMoments: this._extractDecisiveMoments(file),
                            breakthroughs: this._extractBreakthroughs(file),
                            evolution: this._extractEvolution(file)
                        },
                        
                        // NOVO: Flags de validação para debugging
                        _validation: {
                            hasContent: hasContent,
                            contentLength: contentToUse.length,
                            contentSource: file.content ? 'content' : (file.preview ? 'preview' : 'none'),
                            structuredAt: new Date().toISOString()
                        }
                    };
                }),
                categories: data.categories,
                knowledgeGraph: this._buildKnowledgeGraph(data.files)
            };

            // Log final da estruturação
            KC.Logger?.info('RAGExportManager', 'Dados estruturados para exportação', {
                totalDocuments: exportStructure.documents.length,
                documentsWithContent: exportStructure.documents.filter(d => d.content && d.content.length > 0).length,
                documentsWithValidation: exportStructure.documents.filter(d => d._validation?.hasContent).length
            });

            return exportStructure;
        }

        /**
         * Exporta dados em formato específico
         * @param {string} format - Formato de exportação (qdrant, json, markdown, csv)
         * @returns {Object|string} Dados exportados no formato solicitado
         */
        async exportData(format = 'qdrant') {
            const consolidatedData = await this.consolidateData();

            // NOVO - Enriquece com Schema.org antes de exportar
            if (KC.SchemaOrgMapper && KC.AnalysisManager) {
                consolidatedData.documents = consolidatedData.documents.map(doc => {
                    // Cria arquivo temporário para enriquecimento
                    const tempFile = {
                        id: doc.id,
                        name: doc.source.fileName,
                        content: doc.chunks.map(c => c.content).join('\n'),
                        preview: doc.preview,
                        analysisType: doc.analysis.type,
                        categories: doc.analysis.categories.map(c => c.name),
                        relevanceScore: doc.analysis.relevanceScore,
                        createdDate: doc.source.createdDate,
                        modifiedDate: doc.source.lastModified,
                        analysisDate: doc.analysis.date
                    };
                    
                    // Enriquece com Schema.org
                    const enriched = KC.AnalysisManager.enrichWithSchemaOrg(tempFile);
                    
                    // Adiciona schema ao documento
                    if (enriched.schemaOrg) {
                        doc.schemaOrg = enriched.schemaOrg;
                        doc.semanticMetadata = enriched.semanticMetadata;
                    }
                    
                    return doc;
                });
            }

            switch (format) {
                case 'qdrant':
                    return this._exportToQdrant(consolidatedData);
                case 'json':
                    return JSON.stringify(consolidatedData, null, 2);
                case 'jsonld':
                    // NOVO - Exporta como JSON-LD puro
                    return this._exportToJsonLD(consolidatedData);
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
                // 0. Validação inicial - verifica se há arquivos aprovados
                const allFiles = KC.AppState?.get('files') || [];
                // FASE 1.2 FIX: Considerar categorizados como aprovados
                const approvedFiles = allFiles.filter(f => {
                    // Arquivo categorizado = automaticamente aprovado
                    if (f.categories && f.categories.length > 0 && !f.archived) {
                        return true;
                    }
                    // Arquivo explicitamente aprovado
                    return f.approved && !f.archived;
                });
                
                if (approvedFiles.length === 0) {
                    KC.Logger?.warning('RAGExportManager - Nenhum arquivo aprovado encontrado');
                    
                    // Notifica o usuário
                    KC.EventBus?.emit(KC.Events.NOTIFICATION_SHOW || 'notification:show', {
                        type: 'warning',
                        message: 'Nenhum arquivo aprovado encontrado',
                        details: 'Aprove alguns arquivos na Etapa 3 antes de processar o pipeline',
                        duration: 5000
                    });
                    
                    // Emite evento de conclusão com erro
                    KC.EventBus?.emit(KC.Events.PIPELINE_COMPLETED || 'pipeline:completed', {
                        success: false,
                        processed: 0,
                        errors: ['Nenhum arquivo aprovado para processar'],
                        timestamp: new Date().toISOString()
                    });
                    
                    return {
                        success: false,
                        processed: 0,
                        errors: ['Nenhum arquivo aprovado para processar']
                    };
                }
                
                // 0.1. Garantir integridade dos dados se DataIntegrityManager estiver disponível
                if (KC.DataIntegrityManager) {
                    await KC.DataIntegrityManager.ensureDataIntegrity();
                    KC.Logger?.info('RAGExportManager', 'Integridade dos dados verificada');
                }
                
                // 1. Consolida dados
                const consolidatedData = await this.consolidateData();
                const totalDocuments = consolidatedData.documents.length;
                
                if (totalDocuments === 0) {
                    KC.Logger?.warning('RAGExportManager - Nenhum arquivo para processar');
                    KC.EventBus?.emit(KC.Events.PIPELINE_COMPLETED || 'pipeline:completed', {
                        success: false,
                        message: 'Nenhum arquivo aprovado encontrado'
                    });
                    return { success: false, message: 'Nenhum arquivo aprovado encontrado' };
                }

                KC.Logger?.info('RAGExportManager', `Processando ${totalDocuments} documentos`);

                // 1.5. NOVO: Enriquecer com inteligência se disponível e habilitado
                let enrichedData = consolidatedData;
                let enrichmentStats = null;
                
                // LOG: Rastrear categorias antes do enriquecimento
                KC.Logger?.info('[CATEGORY-TRACE] Antes do enriquecimento', {
                    totalDocs: consolidatedData.documents.length,
                    docsWithCategories: consolidatedData.documents.filter(d => d.categories && d.categories.length > 0).length,
                    sampleCategories: consolidatedData.documents[0]?.categories?.slice(0, 2)
                });
                
                if (KC.IntelligenceEnrichmentPipeline && options.enableEnrichment !== false) {
                    KC.Logger?.info('RAGExportManager', 'Iniciando enriquecimento com inteligência');
                    
                    // Emite progresso
                    KC.EventBus?.emit(KC.Events.PIPELINE_PROGRESS || 'pipeline:progress', {
                        stage: 'enrichment',
                        message: 'Analisando convergências e gerando insights...',
                        percentage: 10
                    });
                    
                    try {
                        // LOG DIAGNÓSTICO: Estrutura ANTES do enriquecimento
                        console.log('🔍 DIAGNÓSTICO - Documentos ANTES do enriquecimento:', {
                            total: consolidatedData.documents.length,
                            withContent: consolidatedData.documents.filter(d => d.content).length,
                            withChunks: consolidatedData.documents.filter(d => d.chunks && d.chunks.length > 0).length,
                            totalChunks: consolidatedData.documents.reduce((sum, d) => sum + (d.chunks?.length || 0), 0),
                            sample: consolidatedData.documents.slice(0, 3).map(d => ({
                                id: d.id,
                                name: d.name,
                                hasContent: !!d.content,
                                contentLength: d.content?.length || 0,
                                hasChunks: !!d.chunks,
                                chunksCount: d.chunks?.length || 0
                            }))
                        });
                        
                        const enrichmentResult = await KC.IntelligenceEnrichmentPipeline.enrichDocuments(consolidatedData.documents);
                        
                        // LOG DIAGNÓSTICO: Estrutura DEPOIS do enriquecimento (sem chunks ainda)
                        console.log('🔍 DIAGNÓSTICO - Documentos DEPOIS do enriquecimento (sem chunks):', 
                            enrichmentResult.documents.slice(0, 3).map(d => ({
                                id: d.id,
                                name: d.name,
                                hasContent: !!d.content,
                                contentLength: d.content?.length || 0,
                                hasChunks: !!d.chunks,
                                chunksCount: d.chunks?.length || 0,
                                convergenceScore: d.convergenceScore,
                                intelligenceType: d.intelligenceType
                            }))
                        );
                        
                        // IMPORTANTE: Preservar chunks do consolidatedData
                        // O enrichmentResult não inclui chunks, então precisamos mesclar
                        enrichedData = {
                            ...consolidatedData,
                            documents: enrichmentResult.documents.map((enrichedDoc, index) => {
                                const originalDoc = consolidatedData.documents[index];
                                return {
                                    ...enrichedDoc,
                                    // Preservar chunks do documento original
                                    chunks: originalDoc.chunks || []
                                };
                            })
                        };
                        
                        enrichmentStats = enrichmentResult.stats;
                        
                        // LOG DIAGNÓSTICO: Estrutura FINAL após preservar chunks
                        console.log('🔍 DIAGNÓSTICO - Documentos FINAL (com chunks preservados):', {
                            total: enrichedData.documents.length,
                            withContent: enrichedData.documents.filter(d => d.content).length,
                            withChunks: enrichedData.documents.filter(d => d.chunks && d.chunks.length > 0).length,
                            totalChunks: enrichedData.documents.reduce((sum, d) => sum + (d.chunks?.length || 0), 0)
                        });
                        
                        // LOG: Rastrear categorias após enriquecimento
                        KC.Logger?.info('[CATEGORY-TRACE] Após enriquecimento e preservação de chunks', {
                            totalDocs: enrichedData.documents.length,
                            docsWithCategories: enrichedData.documents.filter(d => d.categories && d.categories.length > 0).length,
                            sampleCategories: enrichedData.documents[0]?.categories?.slice(0, 2),
                            categoriesFormat: enrichedData.documents[0]?.categories ? typeof enrichedData.documents[0].categories[0] : 'none'
                        });
                        
                        // Salvar metadados globais
                        if (enrichmentResult.metadata) {
                            KC.AppState?.set('knowledgeMetadata', enrichmentResult.metadata);
                            KC.AppState?.set('lastEnrichmentDate', new Date().toISOString());
                        }
                        
                        KC.Logger?.success('RAGExportManager', 
                            `Enriquecimento concluído: ${enrichmentResult.analysis.convergenceChains.length} cadeias, ` +
                            `${enrichmentResult.analysis.insights.length} insights detectados`
                        );
                        
                        // NOTA: Chunks já foram gerados em _applySemanticChunking() durante consolidateData()
                        // A correção em _structureForExport() garante que content, name e path estejam disponíveis
                        // para o IntelligenceEnrichmentPipeline processar corretamente
                        
                    } catch (error) {
                        KC.Logger?.error('RAGExportManager', 'ERRO CRÍTICO no enriquecimento', error);
                        throw new Error(`Falha no enriquecimento de inteligência: ${error.message}`);
                    }
                }

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
                    errors: [],
                    enrichmentStats: enrichmentStats
                };

                // LOG DIAGNÓSTICO FINAL: Estado antes do processamento
                console.log('📊 ESTADO FINAL antes do processamento em batch:', {
                    totalDocuments: enrichedData.documents.length,
                    documentsWithContent: enrichedData.documents.filter(d => d.content).length,
                    documentsWithChunks: enrichedData.documents.filter(d => d.chunks && d.chunks.length > 0).length,
                    totalChunks: enrichedData.documents.reduce((sum, d) => sum + (d.chunks?.length || 0), 0),
                    note: 'Chunks gerados em _applySemanticChunking(), content/name/path preservados em _structureForExport()'
                });

                for (let i = 0; i < totalDocuments; i += batchSize) {
                    const batch = enrichedData.documents.slice(i, i + batchSize);
                    
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
                    // Emite evento com arquivo atual
                    KC.EventBus?.emit(KC.Events.PIPELINE_PROGRESS || 'pipeline:progress', {
                        current: results.processed,
                        total: results.processed + documents.length,
                        percentage: Math.round((results.processed / (results.processed + documents.length)) * 100),
                        currentFile: doc.name || doc.source?.fileName || 'Documento sem nome',
                        stage: 'chunking',
                        stageStatus: 'processing'
                    });
                    
                    // Prepara pontos para o Qdrant
                    const points = [];
                    let chunksProcessed = 0;
                    
                    // LOG: Rastrear categorias no processamento
                    KC.Logger?.info('[CATEGORY-TRACE] Processando documento', {
                        docId: doc.id,
                        docName: doc.name,
                        hasCategories: !!(doc.categories && doc.categories.length > 0),
                        categoriesCount: doc.categories?.length || 0,
                        categoriesFormat: doc.categories && doc.categories[0] ? typeof doc.categories[0] : 'none',
                        sampleCategories: doc.categories?.slice(0, 2)
                    });
                    
                    // Verifica se o documento tem chunks
                    if (!doc.chunks || doc.chunks.length === 0) {
                        KC.Logger?.warning('RAGExportManager', `Documento ${doc.id} não possui chunks, pulando...`);
                        continue;
                    }
                    
                    for (const chunk of doc.chunks) {
                        let retries = 3;
                        let lastError = null;
                        
                        while (retries > 0) {
                            try {
                                // Emite evento de embeddings
                                KC.EventBus?.emit(KC.Events.PIPELINE_PROGRESS || 'pipeline:progress', {
                                    current: results.processed,
                                    total: results.processed + documents.length,
                                    percentage: Math.round((results.processed / (results.processed + documents.length)) * 100),
                                    currentFile: doc.name || doc.source?.fileName || 'Documento sem nome',
                                    stage: 'embeddings',
                                    stageStatus: 'processing',
                                    chunksGenerated: results.totalChunks + chunksProcessed
                                });
                                
                                // Gera embedding para o chunk com retry
                                const embedding = await this._generateEmbeddingWithRetry(chunk.content, 3);
                                
                                if (!embedding) {
                                    throw new Error(`Falha ao gerar embedding para chunk ${chunk.id}`);
                                }

                                // Prepara ponto para inserção
                                // Gera ID numérico único baseado em timestamp + índice
                                const pointId = Date.now() * 1000 + points.length;
                                
                                // Criar payload base
                                const basePayload = {
                                    originalChunkId: chunk.id, // Salva o ID original no payload
                                    documentId: doc.id,
                                    fileName: doc.name || doc.source?.fileName || 'Documento sem nome',
                                    chunkId: chunk.id,
                                    content: chunk.content,
                                    // CRÍTICO: Adicionar analysisType como campo de primeira classe para convergência semântica
                                    // DEBUG: Log para rastrear onde o analysisType está sendo encontrado
                                    analysisType: (() => {
                                        const type = doc.analysisType || doc.analysis?.type || 'Aprendizado Geral';
                                        KC.Logger?.debug('RAGExportManager', 'Determinando analysisType', {
                                            docName: doc.name,
                                            docAnalysisType: doc.analysisType,
                                            docAnalysisTypeExists: !!doc.analysisType,
                                            analysisType: doc.analysis?.type,
                                            analysisTypeExists: !!doc.analysis?.type,
                                            finalType: type
                                        });
                                        return type;
                                    })(),
                                    metadata: {
                                        ...chunk.metadata,
                                        // REMOVIDO: analysisType duplicado - agora está no nível raiz
                                        categories: KC.CategoryNormalizer.extractNames(
                                            KC.CategoryNormalizer.normalize(
                                                doc.categories || doc.analysis?.categories || [], 
                                                'RAGExportManager._processBatch'
                                            )
                                        ),
                                        relevanceScore: doc.relevanceScore || doc.analysis?.relevanceScore || 0,
                                        lastModified: doc.lastModified || doc.source?.lastModified || new Date().toISOString(),
                                        processedAt: new Date().toISOString()
                                    }
                                };
                                
                                // Adicionar campos de enriquecimento se disponíveis
                                if (doc.convergenceScore !== undefined) {
                                    basePayload.convergenceScore = doc.convergenceScore;
                                }
                                if (doc.impactScore !== undefined) {
                                    basePayload.impactScore = doc.impactScore;
                                }
                                if (doc.intelligenceScore !== undefined) {
                                    basePayload.intelligenceScore = doc.intelligenceScore;
                                }
                                if (doc.intelligenceType) {
                                    basePayload.intelligenceType = doc.intelligenceType;
                                }
                                if (doc.convergenceChains && doc.convergenceChains.length > 0) {
                                    basePayload.convergenceChains = doc.convergenceChains;
                                }
                                if (doc.insights && doc.insights.length > 0) {
                                    basePayload.insights = doc.insights;
                                }
                                if (doc.breakthroughs && doc.breakthroughs.length > 0) {
                                    basePayload.breakthroughs = doc.breakthroughs;
                                }
                                if (doc.enrichmentMetadata) {
                                    basePayload.enrichmentMetadata = doc.enrichmentMetadata;
                                }
                                
                                points.push({
                                    id: pointId,
                                    vector: embedding,
                                    payload: basePayload
                                });

                                results.totalChunks++;
                                chunksProcessed++;
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
                        // Emite evento de inserção no Qdrant
                        KC.EventBus?.emit(KC.Events.PIPELINE_PROGRESS || 'pipeline:progress', {
                            current: results.processed,
                            total: results.processed + documents.length,
                            percentage: Math.round((results.processed / (results.processed + documents.length)) * 100),
                            currentFile: doc.name || doc.source?.fileName || 'Documento sem nome',
                            stage: 'qdrant',
                            stageStatus: 'processing',
                            chunksGenerated: results.totalChunks
                        });
                        
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
         * Insere no Qdrant com retry e verificação de duplicatas
         * @private
         */
        async _insertWithRetry(points, maxRetries = 3) {
            // VERIFICAÇÃO CRÍTICA: QdrantManager DEVE estar disponível
            if (!KC.QdrantManager) {
                const errorMsg = '❌ ERRO CRÍTICO: QdrantManager não está carregado! Verificação de duplicatas NÃO está funcionando!';
                
                // Log no console com destaque
                console.error('═══════════════════════════════════════════');
                console.error(errorMsg);
                console.error('ISSO VAI CAUSAR DUPLICAÇÃO DE DADOS!');
                console.error('Verifique se QdrantManager.js está no index.html');
                console.error('═══════════════════════════════════════════');
                
                // Notificação visual para o usuário
                if (KC.NotificationSystem?.show) {
                    KC.NotificationSystem.show({
                        type: 'error',
                        message: '⚠️ FALLBACK ATIVADO - QdrantManager não disponível!',
                        details: 'ATENÇÃO: Dados podem ser DUPLICADOS! Avise o desenvolvedor!',
                        duration: 10000
                    });
                }
                
                // Emitir evento de erro
                KC.EventBus?.emit('CRITICAL_ERROR', {
                    component: 'RAGExportManager',
                    error: 'QdrantManager não disponível',
                    impact: 'Duplicação de dados possível'
                });
                
                // NÃO CONTINUAR SEM PROTEÇÃO CONTRA DUPLICATAS
                throw new Error('QdrantManager não está disponível - operação cancelada para evitar duplicação');
            }
            
            // Processar com QdrantManager (única opção válida)
            try {
                KC.Logger?.info('RAGExportManager', `Processando ${points.length} pontos com QdrantManager`);
                
                // Notificação de início
                console.log(`✅ QdrantManager ativo - verificando duplicatas para ${points.length} pontos`);
                
                const processedPoints = [];
                let skippedCount = 0;
                let updatedCount = 0;
                let insertedCount = 0;
                
                for (const point of points) {
                    const result = await KC.QdrantManager.insertOrUpdate(point);
                    
                    if (result.action === 'skipped') {
                        skippedCount++;
                        console.log(`⏭️ Ignorado (já existe): ${point.payload?.fileName || point.id}`);
                    } else if (result.action === 'updated') {
                        updatedCount++;
                        processedPoints.push(result.point);
                        console.log(`🔄 Atualizado: ${point.payload?.fileName || point.id}`);
                    } else if (result.action === 'inserted') {
                        insertedCount++;
                        processedPoints.push(result.point);
                        console.log(`✅ Inserido: ${point.payload?.fileName || point.id}`);
                    }
                }
                
                // Log detalhado do resultado
                const resultMsg = `
════════════════════════════════════════════
📊 RESULTADO DO PROCESSAMENTO COM QdrantManager:
✅ Novos inseridos: ${insertedCount}
🔄 Atualizados: ${updatedCount}
⏭️ Ignorados (duplicatas): ${skippedCount}
📦 Total processado: ${points.length}
════════════════════════════════════════════`;
                
                console.log(resultMsg);
                KC.Logger?.info('RAGExportManager', resultMsg);
                
                // Notificação visual do resultado
                if (skippedCount > 0 && KC.NotificationSystem?.show) {
                    KC.NotificationSystem.show({
                        type: 'info',
                        message: `✅ Proteção contra duplicatas funcionou!`,
                        details: `${skippedCount} documentos já existentes foram ignorados`,
                        duration: 5000
                    });
                }
                
                return {
                    success: true,
                    inserted: insertedCount,
                    updated: updatedCount,
                    skipped: skippedCount,
                    total: processedPoints.length
                };
                
            } catch (error) {
                KC.Logger?.error('RAGExportManager', 'Erro ao processar com QdrantManager:', error);
                
                // Notificação de erro
                if (KC.NotificationSystem?.show) {
                    KC.NotificationSystem.show({
                        type: 'error',
                        message: '❌ Erro no QdrantManager',
                        details: error.message,
                        duration: 7000
                    });
                }
                
                throw error; // Propagar erro em vez de esconder
            }
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
         * MODIFICADO - Inclui Schema.org quando disponível
         * @private
         */
        _exportToQdrant(data) {
            const points = [];
            let pointId = 1;

            data.documents.forEach(doc => {
                doc.chunks.forEach(chunk => {
                    const payload = {
                        documentId: doc.id,
                        fileName: doc.source.fileName,
                        chunkId: chunk.id,
                        content: chunk.content,
                        metadata: {
                            ...chunk.metadata,
                            analysisType: doc.analysis.type,
                            categories: KC.CategoryNormalizer.extractNames(
                                KC.CategoryNormalizer.normalize(
                                    doc.analysis?.categories || doc.categories || [], 
                                    'RAGExportManager._exportToQdrant'
                                )
                            ),
                            relevanceScore: doc.analysis.relevanceScore,
                            lastModified: doc.source.lastModified
                        }
                    };

                    // NOVO - Adiciona Schema.org se disponível
                    if (doc.schemaOrg) {
                        payload.schemaOrg = {
                            '@context': doc.schemaOrg['@context'],
                            '@type': doc.schemaOrg['@type'],
                            '@id': doc.schemaOrg['@id'],
                            additionalType: doc.schemaOrg.additionalType,
                            // Adiciona campos semânticos relevantes
                            ...(doc.schemaOrg.technicalAudience && { technicalAudience: doc.schemaOrg.technicalAudience }),
                            ...(doc.schemaOrg.proficiencyLevel && { proficiencyLevel: doc.schemaOrg.proficiencyLevel }),
                            ...(doc.schemaOrg.academicDiscipline && { academicDiscipline: doc.schemaOrg.academicDiscipline }),
                            ...(doc.schemaOrg.category && { category: doc.schemaOrg.category })
                        };
                        payload.hasSemanticEnrichment = true;
                    }

                    points.push({
                        id: pointId++,
                        vector: null, // Será preenchido pelo pipeline de embeddings
                        payload: payload
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
            let text = file.content || '';
            
            // Se não tiver conteúdo, tentar extrair do preview
            if (!text && file.preview) {
                if (typeof file.preview === 'string') {
                    text = file.preview;
                } else if (typeof file.preview === 'object') {
                    if (KC.PreviewUtils && KC.PreviewUtils.getTextPreview) {
                        text = KC.PreviewUtils.getTextPreview(file.preview);
                    } else {
                        text = Object.values(file.preview).filter(v => v).join(' ... ');
                    }
                }
            }
            
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

        /**
         * NOVO - Exporta dados como JSON-LD Schema.org
         * @private
         */
        _exportToJsonLD(data) {
            if (!KC.SchemaOrgMapper) {
                KC.Logger?.warn('RAGExportManager', 'SchemaOrgMapper não disponível para export JSON-LD');
                return JSON.stringify(data, null, 2);
            }

            // Extrai apenas arquivos com Schema.org
            const enrichedFiles = data.documents
                .filter(doc => doc.schemaOrg)
                .map(doc => doc.schemaOrg);

            // Usa SchemaOrgMapper para gerar JSON-LD válido
            const jsonld = {
                '@context': 'https://schema.org',
                '@graph': enrichedFiles,
                metadata: {
                    exportDate: data.metadata.exportDate,
                    totalEnriched: enrichedFiles.length,
                    totalDocuments: data.documents.length,
                    enrichmentRate: `${Math.round((enrichedFiles.length / data.documents.length) * 100)}%`
                }
            };

            KC.Logger?.info('RAGExportManager', 'JSON-LD exportado', {
                total: enrichedFiles.length,
                types: [...new Set(enrichedFiles.map(f => f['@type']))]
            });

            return JSON.stringify(jsonld, null, 2);
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

        /**
         * NOVO - Padroniza estrutura de dados de arquivo para garantir consistência entre exports
         * @param {Object} file - Arquivo a ser padronizado
         * @returns {Object} Arquivo com estrutura padronizada
         */
        standardizeFileData(file) {
            return {
                // Identificação
                id: file.id || KC.FileUtils?.generateFileId(file) || Date.now().toString(),
                name: file.name || 'Sem nome',
                path: file.path || '',
                
                // Análise IA - CAMPO CRÍTICO para convergência semântica
                analysisType: file.analysisType || 'Aprendizado Geral',
                relevanceScore: file.relevanceScore || 0,
                
                // Status
                analyzed: file.analyzed || false,
                approved: file.approved || false,
                archived: file.archived || false,
                
                // Categorização - Ground Truth para convergência
                categories: file.categories || [],
                
                // Conteúdo
                content: file.content || '',
                preview: file.preview || '',
                
                // Metadados
                size: file.size || 0,
                modified: file.modified || file.modifiedDate || file.lastModified,
                created: file.created || file.createdDate || file.lastModified,
                
                // Análise adicional
                aiAnalysis: file.aiAnalysis || null,
                moments: file.moments || [],
                insights: file.insights || [],
                
                // Embedding e Qdrant
                hasEmbedding: file.hasEmbedding || false,
                qdrantId: file.qdrantId || null,
                
                // Timestamp de padronização
                standardizedAt: new Date().toISOString()
            };
        }

        /**
         * Padroniza array de arquivos
         * @param {Array} files - Array de arquivos
         * @returns {Array} Array de arquivos padronizados
         */
        standardizeFilesData(files) {
            if (!Array.isArray(files)) {
                KC.Logger?.warn('RAGExportManager', 'standardizeFilesData recebeu dados não-array');
                return [];
            }
            
            return files.map(file => this.standardizeFileData(file));
        }

        /**
         * Valida e processa arquivos categorizados que ainda não foram enviados ao Qdrant
         * CRÍTICO: Garante que analysisType seja enviado como campo primário
         */
        async validateAndProcessCategorizedFiles() {
            console.log('[RAGExportManager] Iniciando validação de arquivos categorizados...');
            
            try {
                // 1. Buscar arquivos do AppState
                const files = KC.AppState.get('files') || [];
                
                // 2. Filtrar arquivos categorizados mas não processados
                const categorizedFiles = files.filter(file => {
                    const hasCategorias = file.categories && file.categories.length > 0;
                    const hasAnalysisType = file.analysisType && file.analysisType !== 'Aprendizado Geral';
                    const notProcessed = !file.qdrantProcessed; // Flag para controlar se já foi enviado
                    
                    return (hasCategorias || hasAnalysisType) && notProcessed;
                });
                
                console.log(`[RAGExportManager] ${categorizedFiles.length} arquivos categorizados encontrados para processar`);
                
                if (categorizedFiles.length === 0) {
                    return {
                        success: true,
                        message: 'Nenhum arquivo categorizado pendente de processamento',
                        processed: 0
                    };
                }
                
                // 3. Verificar conexões
                const embeddingAvailable = await KC.EmbeddingService?.checkOllamaAvailability();
                if (!embeddingAvailable) {
                    throw new Error('Serviço de embeddings (Ollama) não disponível');
                }
                
                const qdrantConnected = await KC.QdrantService?.checkConnection();
                if (!qdrantConnected) {
                    throw new Error('Qdrant não está acessível');
                }
                
                // 4. Processar cada arquivo
                const results = [];
                let processedCount = 0;
                
                for (const file of categorizedFiles) {
                    try {
                        console.log(`[RAGExportManager] Processando: ${file.name}`);
                        
                        // Padronizar dados do arquivo
                        const standardFile = this.standardizeFileData(file);
                        
                        // Gerar chunks semânticos
                        const chunks = KC.ChunkingUtils.getSemanticChunks(
                            standardFile.content || standardFile.preview || ''
                        );
                        
                        // Processar cada chunk
                        for (let i = 0; i < chunks.length; i++) {
                            const chunk = chunks[i];
                            
                            // Gerar embedding
                            const embedding = await KC.EmbeddingService.generateEmbedding(chunk.text);
                            
                            // Criar ponto para Qdrant com analysisType como campo primário
                            const point = {
                                id: `${file.id}-chunk-${i}`,
                                vector: embedding.embedding,
                                payload: {
                                    // CRÍTICO: analysisType como campo de primeira classe
                                    analysisType: standardFile.analysisType,
                                    fileId: file.id,
                                    fileName: file.name,
                                    filePath: file.path,
                                    chunkIndex: i,
                                    chunkText: chunk.text,
                                    chunkType: chunk.type,
                                    categories: standardFile.categories.map(c => c.name || c),
                                    relevanceScore: standardFile.relevanceScore,
                                    analyzed: standardFile.analyzed,
                                    approved: standardFile.approved,
                                    preview: standardFile.preview,
                                    timestamp: new Date().toISOString(),
                                    metadata: {
                                        analysisType: standardFile.analysisType, // Backup em metadata
                                        originalRelevance: file.relevanceScore || 0,
                                        categorizedAt: new Date().toISOString()
                                    }
                                }
                            };
                            
                            // Inserir no Qdrant
                            await KC.QdrantService.insertPoint(point);
                        }
                        
                        // Marcar arquivo como processado
                        file.qdrantProcessed = true;
                        file.qdrantProcessedAt = new Date().toISOString();
                        
                        processedCount++;
                        results.push({
                            fileId: file.id,
                            fileName: file.name,
                            chunks: chunks.length,
                            analysisType: standardFile.analysisType,
                            success: true
                        });
                        
                    } catch (error) {
                        console.error(`[RAGExportManager] Erro ao processar ${file.name}:`, error);
                        results.push({
                            fileId: file.id,
                            fileName: file.name,
                            error: error.message,
                            success: false
                        });
                    }
                }
                
                // 5. Salvar estado atualizado
                KC.AppState.set('files', files);
                
                // 6. Emitir evento de processamento concluído
                KC.EventBus.emit('CATEGORIZED_FILES_PROCESSED', {
                    total: categorizedFiles.length,
                    processed: processedCount,
                    results: results
                });
                
                return {
                    success: true,
                    message: `${processedCount} de ${categorizedFiles.length} arquivos processados com sucesso`,
                    processed: processedCount,
                    total: categorizedFiles.length,
                    results: results
                };
                
            } catch (error) {
                console.error('[RAGExportManager] Erro na validação e processamento:', error);
                return {
                    success: false,
                    error: error.message,
                    processed: 0
                };
            }
        }

        /**
         * Busca arquivos similares no Qdrant e recalcula relevância
         * Implementa convergência semântica baseada em categorias e analysisType
         */
        async recalculateRelevanceWithSemanticConvergence(fileId) {
            try {
                const file = KC.AppState.get('files')?.find(f => f.id === fileId);
                if (!file) {
                    throw new Error('Arquivo não encontrado');
                }
                
                // Buscar arquivos similares no Qdrant
                const results = await KC.QdrantService.searchByText(
                    file.preview || file.content || file.name,
                    {
                        limit: 20,
                        filter: {
                            must: [
                                {
                                    key: 'analysisType',
                                    match: { value: file.analysisType }
                                }
                            ]
                        }
                    }
                );
                
                // Calcular nova relevância baseada em convergência semântica
                let newRelevance = file.relevanceScore || 0;
                
                // Boost por categorias compartilhadas
                const fileCategorias = new Set(file.categories?.map(c => c.name || c) || []);
                
                results.forEach(result => {
                    const resultCategorias = new Set(result.payload.categories || []);
                    const sharedCategories = [...fileCategorias].filter(c => resultCategorias.has(c));
                    
                    if (sharedCategories.length > 0) {
                        // Boost de 5% por categoria compartilhada
                        newRelevance += sharedCategories.length * 5;
                        
                        // Boost adicional se tem o mesmo analysisType
                        if (result.payload.analysisType === file.analysisType) {
                            newRelevance += 10;
                        }
                    }
                });
                
                // Limitar a 100%
                newRelevance = Math.min(100, newRelevance);
                
                // Atualizar arquivo
                file.relevanceScore = newRelevance;
                file.semanticConvergenceApplied = true;
                file.similarDocuments = results.length;
                
                // Salvar mudanças
                const files = KC.AppState.get('files');
                KC.AppState.set('files', files);
                
                console.log(`[RAGExportManager] Relevância recalculada para ${file.name}: ${newRelevance}%`);
                
                return {
                    success: true,
                    fileId: fileId,
                    fileName: file.name,
                    oldRelevance: file.relevanceScore,
                    newRelevance: newRelevance,
                    similarDocuments: results.length
                };
                
            } catch (error) {
                console.error('[RAGExportManager] Erro ao recalcular relevância:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }
    }

    // Registra no namespace global
    KC.RAGExportManager = new RAGExportManager();
    KC.Logger?.info('RAGExportManager', 'Componente registrado com sucesso');

})(window);