/**
 * Debug wrapper para identificar exatamente onde o enriquecimento está falhando
 */
(function() {
    'use strict';
    
    console.log('🔍 DEBUG: Iniciando wrapper de debug do enriquecimento');
    
    // Aguardar carregamento
    setTimeout(() => {
        if (!window.KC || !window.KC.IntelligenceEnrichmentPipeline) {
            console.error('❌ DEBUG: IntelligenceEnrichmentPipeline não encontrado!');
            return;
        }
        
        // Salvar método original
        const originalEnrichDocuments = window.KC.IntelligenceEnrichmentPipeline.enrichDocuments;
        
        // Substituir por versão com debug detalhado
        window.KC.IntelligenceEnrichmentPipeline.enrichDocuments = async function(documents) {
            console.log('🔍 DEBUG: enrichDocuments chamado com', documents.length, 'documentos');
            
            try {
                // 1. Pré-processamento
                console.log('🔍 DEBUG: Iniciando pré-processamento...');
                const preprocessedDocs = this._preprocessDocuments(documents);
                console.log('✅ DEBUG: Pré-processamento OK, docs:', preprocessedDocs.length);
                
                // 2. Análise de convergência
                console.log('🔍 DEBUG: Iniciando análise de convergência...');
                console.log('🔍 DEBUG: convergenceService está inicializado?', this.convergenceService?.initialized);
                
                if (!this.convergenceService) {
                    throw new Error('convergenceService é null!');
                }
                
                const convergenceAnalysis = await this.convergenceService.analyzeConvergence(preprocessedDocs);
                console.log('✅ DEBUG: Análise de convergência OK');
                console.log('🔍 DEBUG: Resultado:', {
                    documents: convergenceAnalysis.documents?.length,
                    chains: convergenceAnalysis.convergenceChains?.length,
                    themes: convergenceAnalysis.emergentThemes?.length
                });
                
                // 3. Detectar breakthroughs
                console.log('🔍 DEBUG: Detectando breakthroughs...');
                const breakthroughs = this._detectBreakthroughs(convergenceAnalysis);
                console.log('✅ DEBUG: Breakthroughs detectados:', breakthroughs.length);
                
                // 4. Enriquecer
                console.log('🔍 DEBUG: Enriquecendo documentos...');
                const enrichedDocs = this._enrichWithIntelligence(
                    convergenceAnalysis.documents,
                    convergenceAnalysis,
                    breakthroughs
                );
                console.log('✅ DEBUG: Documentos enriquecidos:', enrichedDocs.length);
                
                // 5. Gerar metadados
                console.log('🔍 DEBUG: Gerando metadados...');
                const knowledgeMetadata = this._generateKnowledgeMetadata(
                    enrichedDocs,
                    convergenceAnalysis,
                    breakthroughs
                );
                console.log('✅ DEBUG: Metadados gerados');
                
                // Retornar resultado
                const result = {
                    documents: enrichedDocs,
                    metadata: knowledgeMetadata,
                    analysis: {
                        convergenceChains: convergenceAnalysis.convergenceChains,
                        emergentThemes: convergenceAnalysis.emergentThemes,
                        insights: convergenceAnalysis.insights,
                        breakthroughs
                    },
                    stats: {
                        processed: documents.length,
                        enrichmentTime: 0,
                        chainsFound: convergenceAnalysis.convergenceChains.length,
                        themesIdentified: convergenceAnalysis.emergentThemes.length,
                        insightsGenerated: convergenceAnalysis.insights.length,
                        breakthroughsDetected: breakthroughs.length
                    }
                };
                
                console.log('✅ DEBUG: enrichDocuments completado com sucesso!');
                return result;
                
            } catch (error) {
                console.error('❌ DEBUG: ERRO em enrichDocuments:', error);
                console.error('❌ DEBUG: Stack trace:', error.stack);
                console.error('❌ DEBUG: Tipo do erro:', error.constructor.name);
                throw error;
            }
        };
        
        // Também adicionar debug ao ConvergenceAnalysisService
        if (window.KC.ConvergenceAnalysisService) {
            const originalAnalyzeConvergence = window.KC.ConvergenceAnalysisService.analyzeConvergence;
            
            window.KC.ConvergenceAnalysisService.analyzeConvergence = async function(documents) {
                console.log('🔍 DEBUG: ConvergenceAnalysisService.analyzeConvergence chamado');
                
                try {
                    // Verificar inicialização
                    if (!this.initialized) {
                        console.log('🔍 DEBUG: Inicializando ConvergenceAnalysisService...');
                        await this.initialize();
                    }
                    
                    console.log('🔍 DEBUG: Gerando embeddings...');
                    const documentsWithEmbeddings = await this._generateDocumentEmbeddings(documents);
                    console.log('✅ DEBUG: Embeddings gerados para', documentsWithEmbeddings.length, 'docs');
                    
                    console.log('🔍 DEBUG: Calculando matriz de similaridade...');
                    const similarityMatrix = this._cosineSimilarityMatrix(documentsWithEmbeddings);
                    console.log('✅ DEBUG: Matriz calculada');
                    
                    console.log('🔍 DEBUG: Detectando cadeias...');
                    const convergenceChains = this._detectConvergenceChains(documentsWithEmbeddings, similarityMatrix);
                    console.log('✅ DEBUG: Cadeias detectadas:', convergenceChains.length);
                    
                    console.log('🔍 DEBUG: Identificando temas...');
                    const emergentThemes = await this._identifyEmergentThemes(documentsWithEmbeddings, convergenceChains);
                    console.log('✅ DEBUG: Temas identificados:', emergentThemes.length);
                    
                    console.log('🔍 DEBUG: Gerando insights...');
                    const insights = this._generateInsights(convergenceChains, emergentThemes, documentsWithEmbeddings);
                    console.log('✅ DEBUG: Insights gerados:', insights.length);
                    
                    console.log('🔍 DEBUG: Enriquecendo documentos com convergência...');
                    const enrichedDocuments = this._enrichDocumentsWithConvergence(
                        documentsWithEmbeddings,
                        convergenceChains,
                        emergentThemes,
                        insights
                    );
                    console.log('✅ DEBUG: Documentos enriquecidos');
                    
                    const result = {
                        documents: enrichedDocuments,
                        convergenceChains,
                        emergentThemes,
                        insights
                    };
                    
                    console.log('✅ DEBUG: analyzeConvergence completado!');
                    return result;
                    
                } catch (error) {
                    console.error('❌ DEBUG: ERRO em analyzeConvergence:', error);
                    console.error('❌ DEBUG: Stack trace:', error.stack);
                    throw error;
                }
            };
        }
        
        console.log('✅ DEBUG: Wrapper de debug instalado com sucesso!');
        
    }, 1000); // Aguardar 1 segundo para garantir que tudo carregou
})();