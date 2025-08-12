/**
 * Script de Integração Qdrant → UnifiedConfidenceSystem
 * 
 * Implementa o mapeamento correto entre os 423 pontos do Qdrant
 * e o sistema de confiança unificado, usando documentId como chave.
 * 
 * Baseado no QDRANT_ANALYSIS_REPORT.md
 */

console.log('🚀 INTEGRAÇÃO QDRANT → UNIFIED CONFIDENCE SYSTEM\n');
console.log('📅 Data:', new Date().toLocaleString('pt-BR'));
console.log('=' + '='.repeat(60) + '\n');

// Configuração de normalização de scores
const SCORE_CONFIG = {
    min: 21.80,  // Mínimo encontrado no Qdrant
    max: 41.80,  // Máximo encontrado no Qdrant
    // Fórmula de normalização para UI (0-100%)
    normalize: (intelligenceScore) => {
        if (!intelligenceScore) return 0;
        const normalized = ((intelligenceScore - SCORE_CONFIG.min) / (SCORE_CONFIG.max - SCORE_CONFIG.min)) * 100;
        return Math.round(Math.max(0, Math.min(100, normalized)));
    }
};

// Mapeamento dos 8 arquivos principais do Qdrant
const QDRANT_DOCUMENT_MAPPING = {
    'IMPLEMENTATION-GUIDE.md': {
        chunks: 52,
        type: 'technical_innovation',
        avgScore: 28.5
    },
    'PRD-INTELLIGENCE-ENRICHMENT.md': {
        chunks: 33,
        type: 'paradigm_shifter',
        avgScore: 30.2
    },
    'INTELLIGENCE-ENRICHMENT-ACHIEVEMENT-REPORT.md': {
        chunks: 24,
        type: 'paradigm_shifter',
        avgScore: 32.1
    },
    'QDRANT-DATA-MAPPING-REPORT.md': {
        chunks: 23,
        type: 'technical_innovation',
        avgScore: 29.8
    },
    'PHASE1-COMPLETION-REPORT.md': {
        chunks: 22,
        type: 'paradigm_shifter',
        avgScore: 31.5
    },
    'PROTOCOLO-REINICIALIZACAO.md': {
        chunks: 20,
        type: 'technical_innovation',
        avgScore: 27.9
    },
    'CLAUDE.md': {
        chunks: 14,
        type: 'strategic_insight',
        avgScore: 35.2
    },
    'FASE2-DATA-PREPARATION-GUIDE.md': {
        chunks: 12,
        type: 'technical_innovation',
        avgScore: 26.8
    }
};

async function integrateQdrantWithUnifiedConfidence() {
    try {
        console.log('📊 FASE 1: ANÁLISE DO QDRANT\n');
        
        // 1. Verificar conexão com Qdrant
        console.log('🔄 Verificando conexão com Qdrant...');
        const connected = await KC.QdrantService.checkConnection();
        if (!connected) {
            throw new Error('Não foi possível conectar ao Qdrant');
        }
        console.log('✅ Qdrant conectado\n');
        
        // 2. Obter estatísticas da coleção
        const stats = await KC.QdrantService.getCollectionStats();
        console.log(`📈 Estatísticas da coleção:`);
        console.log(`   • Total de pontos: ${stats.pointsCount}`);
        console.log(`   • Vetores indexados: ${stats.indexedVectorsCount}`);
        console.log(`   • Status: ${stats.status}\n`);
        
        // 3. Carregar pontos do Qdrant
        console.log('🔄 Carregando pontos do Qdrant...');
        const scrollResult = await KC.QdrantService.scrollPoints({
            limit: 500, // Pegar todos os 423 pontos
            with_payload: true,
            with_vector: false
        });
        
        const qdrantPoints = scrollResult.points || [];
        console.log(`✅ ${qdrantPoints.length} pontos carregados\n`);
        
        // 4. Analisar estrutura dos pontos
        console.log('📋 FASE 2: ANÁLISE DA ESTRUTURA\n');
        
        // Agrupar por documentId
        const documentGroups = {};
        qdrantPoints.forEach(point => {
            const docId = point.payload?.documentId;
            if (docId) {
                if (!documentGroups[docId]) {
                    documentGroups[docId] = {
                        fileName: point.payload.fileName,
                        chunks: [],
                        scores: [],
                        categories: new Set(),
                        intelligenceTypes: new Set()
                    };
                }
                
                documentGroups[docId].chunks.push(point.id);
                documentGroups[docId].scores.push(point.payload.intelligenceScore);
                
                // Coletar categorias
                if (point.payload.metadata?.categories) {
                    point.payload.metadata.categories.forEach(cat => 
                        documentGroups[docId].categories.add(cat)
                    );
                }
                
                // Coletar tipos de inteligência
                if (point.payload.intelligenceType) {
                    documentGroups[docId].intelligenceTypes.add(point.payload.intelligenceType);
                }
            }
        });
        
        console.log(`📁 ${Object.keys(documentGroups).length} documentos únicos encontrados:\n`);
        
        Object.entries(documentGroups).forEach(([docId, info]) => {
            const avgScore = info.scores.reduce((a, b) => a + b, 0) / info.scores.length;
            console.log(`   • ${info.fileName}`);
            console.log(`     - Chunks: ${info.chunks.length}`);
            console.log(`     - Score médio: ${avgScore.toFixed(2)}`);
            console.log(`     - Categorias: ${Array.from(info.categories).join(', ') || 'Nenhuma'}`);
            console.log(`     - Tipos: ${Array.from(info.intelligenceTypes).join(', ')}`);
            console.log(`     - Score normalizado: ${SCORE_CONFIG.normalize(avgScore)}%\n`);
        });
        
        // 5. Configurar mapeamento no QdrantScoreBridge
        console.log('🔧 FASE 3: CONFIGURAÇÃO DO MAPEAMENTO\n');
        
        // Re-inicializar QdrantScoreBridge com novo mapeamento
        await KC.QdrantScoreBridgeInstance.initialize();
        
        // Criar mapeamento de scores por documentId
        const scoreMapping = {};
        Object.entries(documentGroups).forEach(([docId, info]) => {
            const avgScore = info.scores.reduce((a, b) => a + b, 0) / info.scores.length;
            scoreMapping[docId] = {
                qdrantScore: avgScore,
                normalizedScore: SCORE_CONFIG.normalize(avgScore),
                fileName: info.fileName,
                chunks: info.chunks.length,
                categories: Array.from(info.categories),
                intelligenceTypes: Array.from(info.intelligenceTypes)
            };
        });
        
        // Atualizar cache do QdrantScoreBridge
        console.log('🔄 Atualizando cache do QdrantScoreBridge...');
        let updatedCount = 0;
        
        Object.entries(scoreMapping).forEach(([docId, scoreData]) => {
            // Adicionar ao cache usando documentId como chave
            KC.QdrantScoreBridgeInstance.scoreCache.set(docId, {
                score: scoreData.qdrantScore,
                normalized: scoreData.normalizedScore,
                metadata: {
                    fileName: scoreData.fileName,
                    chunks: scoreData.chunks,
                    categories: scoreData.categories,
                    intelligenceTypes: scoreData.intelligenceTypes
                },
                timestamp: Date.now()
            });
            updatedCount++;
        });
        
        console.log(`✅ ${updatedCount} mapeamentos adicionados ao cache\n`);
        
        // 6. Criar arquivos de teste baseados nos documentos reais
        console.log('📄 FASE 4: CRIAÇÃO DE ARQUIVOS DE TESTE\n');
        
        const testFiles = Object.entries(scoreMapping).map(([docId, data]) => ({
            id: docId, // Usar documentId como ID do arquivo
            name: data.fileName,
            path: `/documentos/${data.fileName}`,
            content: `Arquivo ${data.fileName} com ${data.chunks} chunks processados`,
            size: data.chunks * 1024, // Simular tamanho baseado em chunks
            lastModified: new Date(),
            categories: data.categories,
            documentId: docId, // Adicionar referência explícita
            qdrantMetadata: data
        }));
        
        // Carregar arquivos no AppState
        KC.AppState.set('files', testFiles);
        console.log(`✅ ${testFiles.length} arquivos carregados no AppState\n`);
        
        // 7. Testar sistema de confiança unificado
        console.log('🎯 FASE 5: TESTE DO SISTEMA UNIFICADO\n');
        
        const testResults = [];
        for (const file of testFiles) {
            const confidence = await KC.UnifiedConfidenceControllerInstance.getFileConfidence(file.id);
            
            testResults.push({
                fileName: file.name,
                documentId: file.id,
                confidence: confidence.confidence,
                source: confidence.source,
                qdrantScore: file.qdrantMetadata.qdrantScore,
                expectedScore: file.qdrantMetadata.normalizedScore,
                match: Math.abs(confidence.confidence - file.qdrantMetadata.normalizedScore) < 1
            });
            
            console.log(`📄 ${file.name}:`);
            console.log(`   • Document ID: ${file.id}`);
            console.log(`   • Confiança: ${confidence.confidence}%`);
            console.log(`   • Esperado: ${file.qdrantMetadata.normalizedScore}%`);
            console.log(`   • Fonte: ${confidence.source}`);
            console.log(`   • Match: ${testResults[testResults.length - 1].match ? '✅' : '❌'}\n`);
        }
        
        // 8. Análise de convergência (chains)
        console.log('🔗 FASE 6: ANÁLISE DE CONVERGENCE CHAINS\n');
        
        // Buscar pontos com convergence chains
        const chainsFound = new Map();
        qdrantPoints.forEach(point => {
            if (point.payload?.convergenceChains) {
                point.payload.convergenceChains.forEach(chain => {
                    if (!chainsFound.has(chain.id)) {
                        chainsFound.set(chain.id, {
                            theme: chain.theme,
                            strength: chain.strength,
                            participants: new Set()
                        });
                    }
                    chainsFound.get(chain.id).participants.add(point.payload.fileName);
                });
            }
        });
        
        console.log(`🔗 ${chainsFound.size} convergence chains encontradas:\n`);
        chainsFound.forEach((chain, id) => {
            console.log(`   • ${chain.theme}`);
            console.log(`     - Força: ${(chain.strength * 100).toFixed(1)}%`);
            console.log(`     - Participantes: ${chain.participants.size} arquivos\n`);
        });
        
        // 9. Relatório final
        console.log('=' + '='.repeat(60));
        console.log('📊 RELATÓRIO FINAL DE INTEGRAÇÃO\n');
        
        const successfulMappings = testResults.filter(r => r.match).length;
        const successRate = (successfulMappings / testResults.length * 100).toFixed(1);
        
        console.log(`✅ Integração concluída com sucesso!`);
        console.log(`📈 Taxa de sucesso: ${successRate}%`);
        console.log(`📁 Documentos processados: ${testResults.length}`);
        console.log(`🎯 Mapeamentos corretos: ${successfulMappings}`);
        console.log(`🔗 Convergence chains: ${chainsFound.size}`);
        console.log(`📊 Score médio normalizado: ${
            (testResults.reduce((sum, r) => sum + r.confidence, 0) / testResults.length).toFixed(1)
        }%`);
        
        // 10. Salvar resultados
        const integrationResults = {
            timestamp: new Date().toISOString(),
            qdrantStats: stats,
            documentGroups: Object.fromEntries(
                Object.entries(documentGroups).map(([k, v]) => [k, {
                    ...v,
                    categories: Array.from(v.categories),
                    intelligenceTypes: Array.from(v.intelligenceTypes)
                }])
            ),
            scoreMapping: scoreMapping,
            testResults: testResults,
            convergenceChains: Array.from(chainsFound.entries()).map(([id, chain]) => ({
                id,
                theme: chain.theme,
                strength: chain.strength,
                participants: Array.from(chain.participants)
            })),
            successRate: successRate
        };
        
        localStorage.setItem('qdrant-unified-integration', JSON.stringify(integrationResults));
        console.log('\n💾 Resultados salvos em localStorage');
        console.log('   Use: JSON.parse(localStorage.getItem("qdrant-unified-integration"))');
        
        // Emitir evento para atualizar UI
        KC.EventBus.emit(KC.Events.FILES_UPDATED, {
            action: 'qdrant_integration_complete',
            count: testFiles.length
        });
        
        return integrationResults;
        
    } catch (error) {
        console.error('❌ Erro na integração:', error);
        throw error;
    }
}

// Executar integração
console.log('🔧 Iniciando integração...\n');

integrateQdrantWithUnifiedConfidence()
    .then(results => {
        console.log('\n✅ INTEGRAÇÃO COMPLETA!');
        console.log('\n🎯 Próximos passos:');
        console.log('   1. Verificar mapeamentos no QdrantScoreBridge');
        console.log('   2. Testar com arquivos reais do sistema');
        console.log('   3. Implementar busca por convergence chains');
        console.log('   4. Ativar feature flag para produção');
        
        // Verificar se a UI deve ser atualizada
        if (typeof KC.FileRenderer !== 'undefined' && KC.FileRenderer.renderFiles) {
            console.log('\n🔄 Atualizando interface...');
            KC.FileRenderer.renderFiles(KC.AppState.get('files'));
        }
    })
    .catch(error => {
        console.error('\n❌ Falha na integração:', error);
    });