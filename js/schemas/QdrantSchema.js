/**
 * QdrantSchema.js
 * 
 * Define estrutura de exportação compatível com Qdrant para sistema RAG
 * Integra dados consolidados das etapas 1-4 do Knowledge Consolidator
 * 
 * @module QdrantSchema
 * @requires ChunkingUtils
 * @requires CategoryManager
 */

(function() {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    /**
     * Schema de exportação para Qdrant
     * Compatível com collections de 384 dimensões (all-MiniLM-L6-v2)
     */
    class QdrantSchema {
        constructor() {
            this.schemaVersion = '1.0.0';
            this.embeddingDimension = 384; // all-MiniLM-L6-v2
            this.collectionName = 'knowledge_consolidator';
            
            // Metadados Schema.org
            this.schemaOrgContext = {
                "@context": "https://schema.org",
                "@type": "Dataset",
                "name": "Personal Knowledge Consolidator Export",
                "description": "Structured knowledge base with decisive moments and insights",
                "creator": {
                    "@type": "Organization",
                    "name": "Knowledge Consolidator System"
                }
            };
        }

        /**
         * Estrutura principal de um ponto no Qdrant
         */
        getPointStructure() {
            return {
                id: null,              // UUID v4
                vector: [],            // Float[384] - embedding do chunk
                payload: {
                    // Metadados do arquivo original
                    file: {
                        id: '',        // ID original do arquivo
                        name: '',      // Nome do arquivo
                        path: '',      // Caminho completo
                        size: 0,       // Tamanho em bytes
                        created: '',   // ISO 8601
                        modified: '',  // ISO 8601
                        type: ''       // Extensão/MIME type
                    },
                    
                    // Dados do chunk
                    chunk: {
                        id: '',        // ID único do chunk
                        index: 0,      // Posição no documento
                        content: '',   // Conteúdo textual
                        size: 0,       // Tamanho do chunk
                        overlap: {     // Sobreposição com chunks adjacentes
                            previous: 0,
                            next: 0
                        }
                    },
                    
                    // Análise semântica (PreviewUtils + IA)
                    analysis: {
                        relevanceScore: 0,     // 0-100
                        analysisType: '',      // Tipo detectado
                        aiInsights: '',        // Insights da IA
                        keywords: [],          // Palavras-chave extraídas
                        semanticDensity: 0,    // Densidade semântica
                        sentiment: '',         // Positivo/Neutro/Negativo
                        decisiveMoment: false, // É momento decisivo?
                        breakthrough: false    // É breakthrough técnico?
                    },
                    
                    // Categorização (CategoryManager)
                    categorization: {
                        categories: [],        // IDs das categorias
                        suggestedCategories: [], // Sugestões da IA
                        tags: [],              // Tags automáticas
                        priority: '',          // Alta/Média/Baixa
                        projectPotential: 0    // 0-100
                    },
                    
                    // Contexto e relacionamentos
                    context: {
                        documentStructure: '', // Tipo de estrutura
                        section: '',          // Seção do documento
                        parentId: '',         // ID do chunk pai (se houver)
                        childrenIds: [],      // IDs dos chunks filhos
                        relatedChunks: [],    // Chunks semanticamente relacionados
                        temporalContext: {    // Contexto temporal
                            period: '',       // Período identificado
                            isHistorical: false,
                            futureReference: false
                        }
                    },
                    
                    // Metadados para RAG
                    rag: {
                        retrievalScore: 0,    // Score para recuperação
                        generationHints: [],  // Dicas para geração
                        questionTypes: [],    // Tipos de perguntas que responde
                        expertiseLevel: '',   // Nível de expertise
                        confidenceScore: 0    // Confiança na informação
                    },
                    
                    // Rastreabilidade e versionamento
                    metadata: {
                        exportDate: '',       // Data de exportação
                        schemaVersion: '',    // Versão do schema
                        processingSteps: [],  // Etapas processadas
                        qualityChecks: {      // Verificações de qualidade
                            hasPreview: false,
                            hasAIAnalysis: false,
                            hasCategorization: false,
                            isValidated: false
                        }
                    }
                }
            };
        }

        /**
         * Estrutura da collection no Qdrant
         */
        getCollectionConfig() {
            return {
                collection_name: this.collectionName,
                vectors: {
                    size: this.embeddingDimension,
                    distance: "Cosine" // Melhor para embeddings de texto
                },
                optimizers_config: {
                    default_segment_number: 2,
                    indexing_threshold: 20000
                },
                hnsw_config: {
                    m: 16,
                    ef_construct: 200,
                    full_scan_threshold: 10000
                }
            };
        }

        /**
         * Índices recomendados para busca eficiente
         */
        getIndexingStrategy() {
            return {
                // Índices por tipo de busca
                textSearch: {
                    fields: ['payload.chunk.content', 'payload.analysis.keywords'],
                    type: 'text'
                },
                
                // Filtros categóricos
                categoricalFilters: {
                    fields: [
                        'payload.analysis.analysisType',
                        'payload.categorization.categories',
                        'payload.categorization.tags',
                        'payload.context.documentStructure'
                    ],
                    type: 'keyword'
                },
                
                // Filtros numéricos
                numericFilters: {
                    fields: [
                        'payload.analysis.relevanceScore',
                        'payload.categorization.projectPotential',
                        'payload.rag.confidenceScore'
                    ],
                    type: 'range'
                },
                
                // Filtros temporais
                temporalFilters: {
                    fields: [
                        'payload.file.created',
                        'payload.file.modified',
                        'payload.metadata.exportDate'
                    ],
                    type: 'date_range'
                },
                
                // Filtros booleanos
                booleanFilters: {
                    fields: [
                        'payload.analysis.decisiveMoment',
                        'payload.analysis.breakthrough',
                        'payload.context.temporalContext.isHistorical'
                    ],
                    type: 'bool'
                }
            };
        }

        /**
         * Queries de exemplo para recuperação
         */
        getExampleQueries() {
            return {
                // Busca por momentos decisivos
                decisiveMoments: {
                    filter: {
                        must: [
                            { key: "analysis.decisiveMoment", match: { value: true } }
                        ]
                    },
                    params: {
                        hnsw_ef: 128,
                        exact: false
                    },
                    limit: 20
                },
                
                // Busca por breakthroughs técnicos
                technicalBreakthroughs: {
                    filter: {
                        must: [
                            { key: "analysis.breakthrough", match: { value: true } },
                            { key: "analysis.relevanceScore", range: { gte: 70 } }
                        ]
                    },
                    limit: 10
                },
                
                // Busca por potencial de projeto
                projectPotential: {
                    filter: {
                        must: [
                            { key: "categorization.projectPotential", range: { gte: 80 } }
                        ]
                    },
                    limit: 15
                },
                
                // Busca temporal (últimos 30 dias)
                recentInsights: {
                    filter: {
                        must: [
                            { 
                                key: "file.modified", 
                                range: { 
                                    gte: new Date(Date.now() - 30*24*60*60*1000).toISOString() 
                                }
                            }
                        ]
                    },
                    limit: 50
                },
                
                // Busca por categoria específica
                byCategory: (categoryId) => ({
                    filter: {
                        must: [
                            { key: "categorization.categories", match: { any: [categoryId] } }
                        ]
                    },
                    limit: 100
                })
            };
        }

        /**
         * Estrutura para batch de importação
         */
        getBatchStructure() {
            return {
                points: [],      // Array de pontos
                batch_size: 100, // Tamanho recomendado do batch
                wait: true,      // Aguardar indexação
                ordering: 'weak' // Ordenação fraca para performance
            };
        }

        /**
         * Valida um ponto antes da exportação
         */
        validatePoint(point) {
            const errors = [];
            
            // Validações básicas
            if (!point.id) errors.push('ID é obrigatório');
            if (!Array.isArray(point.vector) || point.vector.length !== this.embeddingDimension) {
                errors.push(`Vector deve ter exatamente ${this.embeddingDimension} dimensões`);
            }
            
            // Validações de payload
            const payload = point.payload;
            if (!payload) {
                errors.push('Payload é obrigatório');
                return { valid: false, errors };
            }
            
            // Validações de estrutura
            if (!payload.file?.id) errors.push('file.id é obrigatório');
            if (!payload.chunk?.content) errors.push('chunk.content é obrigatório');
            if (typeof payload.analysis?.relevanceScore !== 'number') {
                errors.push('analysis.relevanceScore deve ser numérico');
            }
            
            // Validações de tipos
            if (payload.analysis?.keywords && !Array.isArray(payload.analysis.keywords)) {
                errors.push('analysis.keywords deve ser um array');
            }
            if (payload.categorization?.categories && !Array.isArray(payload.categorization.categories)) {
                errors.push('categorization.categories deve ser um array');
            }
            
            return {
                valid: errors.length === 0,
                errors
            };
        }

        /**
         * Gera exemplo de ponto completo
         */
        generateExamplePoint() {
            const point = this.getPointStructure();
            
            // Preenche com dados de exemplo
            point.id = crypto.randomUUID();
            point.vector = new Array(this.embeddingDimension).fill(0).map(() => Math.random());
            
            point.payload.file = {
                id: 'file_001',
                name: 'decisoes_projeto_x.md',
                path: '/projetos/projeto_x/decisoes_projeto_x.md',
                size: 15420,
                created: '2024-01-15T10:30:00Z',
                modified: '2024-01-20T14:45:00Z',
                type: 'markdown'
            };
            
            point.payload.chunk = {
                id: 'chunk_001_003',
                index: 3,
                content: 'A decisão de migrar para microserviços foi tomada após análise detalhada...',
                size: 512,
                overlap: { previous: 50, next: 50 }
            };
            
            point.payload.analysis = {
                relevanceScore: 85,
                analysisType: 'Momento Decisivo',
                aiInsights: 'Decisão arquitetural crítica com impacto em escalabilidade',
                keywords: ['microserviços', 'arquitetura', 'decisão', 'escalabilidade'],
                semanticDensity: 0.78,
                sentiment: 'Positivo',
                decisiveMoment: true,
                breakthrough: true
            };
            
            point.payload.categorization = {
                categories: ['cat_arquitetura', 'cat_decisoes'],
                suggestedCategories: ['cat_devops', 'cat_cloud'],
                tags: ['arquitetura', 'microservices', 'decisão-técnica'],
                priority: 'Alta',
                projectPotential: 92
            };
            
            point.payload.context = {
                documentStructure: 'markdown',
                section: 'Decisões Arquiteturais',
                parentId: '',
                childrenIds: ['chunk_001_004', 'chunk_001_005'],
                relatedChunks: ['chunk_002_007', 'chunk_003_012'],
                temporalContext: {
                    period: '2024-Q1',
                    isHistorical: false,
                    futureReference: true
                }
            };
            
            point.payload.rag = {
                retrievalScore: 0.89,
                generationHints: ['Foco em trade-offs', 'Incluir métricas de impacto'],
                questionTypes: ['Como decidir arquitetura?', 'Quando migrar para microserviços?'],
                expertiseLevel: 'Senior',
                confidenceScore: 0.92
            };
            
            point.payload.metadata = {
                exportDate: new Date().toISOString(),
                schemaVersion: this.schemaVersion,
                processingSteps: ['discovery', 'preview', 'ai-analysis', 'categorization'],
                qualityChecks: {
                    hasPreview: true,
                    hasAIAnalysis: true,
                    hasCategorization: true,
                    isValidated: true
                }
            };
            
            return point;
        }

        /**
         * Gera estrutura de migração para banco temporário
         */
        getDatabaseMigrationSchema() {
            return {
                // Tabela principal de chunks
                chunks: {
                    id: 'TEXT PRIMARY KEY',
                    file_id: 'TEXT NOT NULL',
                    chunk_index: 'INTEGER NOT NULL',
                    content: 'TEXT NOT NULL',
                    vector_id: 'TEXT', // ID no Qdrant após embedding
                    created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
                    
                    indexes: [
                        'CREATE INDEX idx_chunks_file_id ON chunks(file_id)',
                        'CREATE INDEX idx_chunks_vector_id ON chunks(vector_id)'
                    ]
                },
                
                // Tabela de análises
                analyses: {
                    chunk_id: 'TEXT PRIMARY KEY',
                    relevance_score: 'REAL',
                    analysis_type: 'TEXT',
                    ai_insights: 'TEXT',
                    keywords: 'JSON',
                    is_decisive_moment: 'BOOLEAN',
                    is_breakthrough: 'BOOLEAN',
                    processed_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
                    
                    indexes: [
                        'CREATE INDEX idx_analyses_relevance ON analyses(relevance_score)',
                        'CREATE INDEX idx_analyses_type ON analyses(analysis_type)'
                    ]
                },
                
                // Tabela de categorizações
                categorizations: {
                    chunk_id: 'TEXT PRIMARY KEY',
                    categories: 'JSON',
                    tags: 'JSON',
                    priority: 'TEXT',
                    project_potential: 'REAL',
                    
                    indexes: [
                        'CREATE INDEX idx_categorizations_potential ON categorizations(project_potential)'
                    ]
                }
            };
        }
    }

    // Registra no namespace global
    KC.QdrantSchema = new QdrantSchema();

    // Log de inicialização
    if (KC.Logger) {
        KC.Logger.info('QdrantSchema', 'Schema de exportação Qdrant inicializado', {
            version: KC.QdrantSchema.schemaVersion,
            dimensions: KC.QdrantSchema.embeddingDimension
        });
    }

})();