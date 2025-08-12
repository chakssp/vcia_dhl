/**
 * Execução direta de busca no Qdrant
 * Data: 30/01/2025
 * 
 * Script para mapear TODOS os dados carregados no Qdrant
 */

(async function() {
    'use strict';
    
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║         🔍 MAPEAMENTO COMPLETO DOS DADOS NO QDRANT            ║
╚════════════════════════════════════════════════════════════════╝
`);
    
    if (!KC.QdrantService) {
        console.error('❌ QdrantService não disponível!');
        return;
    }
    
    try {
        // 1. Verificar conexão
        console.log('1️⃣ VERIFICANDO CONEXÃO...\n');
        const connected = await KC.QdrantService.checkConnection();
        
        if (!connected) {
            console.error('❌ Não foi possível conectar ao Qdrant!');
            return;
        }
        console.log('✅ Conectado ao Qdrant: http://qdr.vcia.com.br:6333');
        
        // 2. Obter estatísticas
        console.log('\n2️⃣ ESTATÍSTICAS DA COLEÇÃO...\n');
        const stats = await KC.QdrantService.getCollectionStats();
        console.log(`📊 Coleção: ${KC.QdrantService.config.collectionName}`);
        console.log(`📈 Total de pontos: ${stats.vectors_count || 0}`);
        console.log(`✅ Status: ${stats.status || 'unknown'}`);
        
        if (!stats.vectors_count || stats.vectors_count === 0) {
            console.log('\n⚠️ NENHUM DADO ENCONTRADO NO QDRANT!');
            console.log('💡 Execute o processamento primeiro:');
            console.log('   await KC.RAGExportManager.processApprovedFiles()');
            return;
        }
        
        // 3. Buscar TODOS os dados (até 1000 pontos)
        console.log('\n3️⃣ BUSCANDO TODOS OS DADOS...\n');
        
        // Criar um vetor neutro para buscar qualquer coisa
        const neutralVector = new Array(768).fill(0);
        
        const searchResult = await KC.QdrantService.search({
            vector: neutralVector,
            limit: 1000, // Buscar até 1000 pontos
            with_payload: true,
            with_vector: false
        });
        
        if (!searchResult || searchResult.length === 0) {
            console.log('⚠️ Nenhum resultado retornado na busca!');
            return;
        }
        
        console.log(`✅ ${searchResult.length} pontos recuperados!`);
        
        // 4. Análise detalhada dos dados
        console.log('\n4️⃣ ANÁLISE DETALHADA DOS DADOS...\n');
        
        const analysis = {
            totalPoints: searchResult.length,
            byFile: {},
            byCategory: {},
            byAnalysisType: {},
            byIntelligenceType: {},
            withEnrichment: 0,
            withCategories: 0,
            chunks: {
                total: 0,
                byFile: {}
            }
        };
        
        // Processar cada ponto
        searchResult.forEach(point => {
            const p = point.payload;
            
            // Por arquivo
            const fileName = p.fileName || 'Unknown';
            if (!analysis.byFile[fileName]) {
                analysis.byFile[fileName] = {
                    chunks: 0,
                    categories: new Set(),
                    analysisType: p.analysisType,
                    intelligenceType: p.intelligenceType,
                    convergenceScore: p.convergenceScore,
                    hasEnrichment: false
                };
            }
            analysis.byFile[fileName].chunks++;
            
            // Chunks totais
            analysis.chunks.total++;
            
            // Categorias
            if (p.categories && Array.isArray(p.categories) && p.categories.length > 0) {
                analysis.withCategories++;
                p.categories.forEach(cat => {
                    analysis.byCategory[cat] = (analysis.byCategory[cat] || 0) + 1;
                    analysis.byFile[fileName].categories.add(cat);
                });
            }
            
            // Tipo de análise
            if (p.analysisType) {
                analysis.byAnalysisType[p.analysisType] = 
                    (analysis.byAnalysisType[p.analysisType] || 0) + 1;
            }
            
            // Intelligence type (enriquecimento)
            if (p.intelligenceType) {
                analysis.withEnrichment++;
                analysis.byFile[fileName].hasEnrichment = true;
                analysis.byIntelligenceType[p.intelligenceType] = 
                    (analysis.byIntelligenceType[p.intelligenceType] || 0) + 1;
            }
            
            // Scores
            if (p.convergenceScore !== undefined) {
                analysis.byFile[fileName].convergenceScore = p.convergenceScore;
            }
        });
        
        // 5. Exibir resultados por arquivo
        console.log('📄 ARQUIVOS CARREGADOS NO QDRANT:\n');
        
        const filesList = Object.entries(analysis.byFile);
        filesList.forEach(([fileName, fileData], idx) => {
            console.log(`${idx + 1}. ${fileName}`);
            console.log(`   📦 Chunks: ${fileData.chunks}`);
            console.log(`   🏷️  Categorias: ${Array.from(fileData.categories).join(', ') || 'Nenhuma'}`);
            console.log(`   📊 Análise: ${fileData.analysisType || 'N/A'}`);
            
            if (fileData.hasEnrichment) {
                console.log(`   🧠 Intelligence: ${fileData.intelligenceType || 'N/A'}`);
                console.log(`   📈 Convergência: ${fileData.convergenceScore || 'N/A'}`);
            } else {
                console.log(`   ⚠️  SEM ENRIQUECIMENTO`);
            }
            console.log('');
        });
        
        // 6. Estatísticas por categoria
        console.log('\n📂 DISTRIBUIÇÃO POR CATEGORIAS:\n');
        
        if (Object.keys(analysis.byCategory).length > 0) {
            Object.entries(analysis.byCategory)
                .sort((a, b) => b[1] - a[1])
                .forEach(([cat, count]) => {
                    console.log(`   • ${cat}: ${count} chunks`);
                });
            console.log(`\n   📊 Total: ${analysis.withCategories}/${analysis.totalPoints} chunks com categorias`);
        } else {
            console.log('   ⚠️ Nenhuma categoria encontrada!');
        }
        
        // 7. Tipos de análise
        console.log('\n📊 TIPOS DE ANÁLISE:\n');
        
        if (Object.keys(analysis.byAnalysisType).length > 0) {
            Object.entries(analysis.byAnalysisType)
                .sort((a, b) => b[1] - a[1])
                .forEach(([type, count]) => {
                    console.log(`   • ${type}: ${count} chunks`);
                });
        } else {
            console.log('   ⚠️ Nenhum tipo de análise encontrado!');
        }
        
        // 8. Intelligence Types (se houver enriquecimento)
        console.log('\n🧠 ENRIQUECIMENTO COM INTELIGÊNCIA:\n');
        
        if (analysis.withEnrichment > 0) {
            console.log(`✅ ${analysis.withEnrichment}/${analysis.totalPoints} chunks enriquecidos\n`);
            
            console.log('Tipos de inteligência detectados:');
            Object.entries(analysis.byIntelligenceType)
                .sort((a, b) => b[1] - a[1])
                .forEach(([type, count]) => {
                    console.log(`   • ${type}: ${count} chunks`);
                });
        } else {
            console.log('❌ NENHUM ENRIQUECIMENTO DETECTADO!');
            console.log('💡 Para ativar enriquecimento:');
            console.log('   await KC.RAGExportManager.processApprovedFiles({');
            console.log('       enableEnrichment: true');
            console.log('   });');
        }
        
        // 9. APLICAÇÕES BASEADAS NO INTELLIGENCE ENRICHMENT
        console.log('\n🎯 APLICAÇÕES IDENTIFICADAS:\n');
        
        if (analysis.withEnrichment > 0) {
            // Knowledge Hubs
            const knowledgeHubs = Object.entries(analysis.byFile)
                .filter(([_, data]) => data.intelligenceType === 'knowledge_hub')
                .map(([name, _]) => name);
            
            if (knowledgeHubs.length > 0) {
                console.log('📌 KNOWLEDGE HUBS (Centros de Conhecimento):');
                console.log(`   Encontrados: ${knowledgeHubs.length} arquivos`);
                console.log(`   Aplicação: Usar como pontos de entrada para exploração`);
                console.log(`   Exemplos: ${knowledgeHubs.slice(0, 3).join(', ')}`);
            }
            
            // Breakthroughs
            const breakthroughs = Object.entries(analysis.byFile)
                .filter(([_, data]) => 
                    data.analysisType === 'Breakthrough Técnico' ||
                    data.intelligenceType === 'paradigm_shifter'
                )
                .map(([name, _]) => name);
            
            if (breakthroughs.length > 0) {
                console.log('\n🚀 TECHNICAL BREAKTHROUGHS:');
                console.log(`   Encontrados: ${breakthroughs.length} arquivos`);
                console.log(`   Aplicação: Priorizar para implementação prática`);
                console.log(`   Exemplos: ${breakthroughs.slice(0, 3).join(', ')}`);
            }
            
            // Strategic Insights
            const strategic = Object.entries(analysis.byFile)
                .filter(([_, data]) => 
                    data.analysisType === 'Insight Estratégico' ||
                    data.categories.has('estrategico')
                )
                .map(([name, _]) => name);
            
            if (strategic.length > 0) {
                console.log('\n📊 STRATEGIC INSIGHTS:');
                console.log(`   Encontrados: ${strategic.length} arquivos`);
                console.log(`   Aplicação: Base para tomada de decisão`);
                console.log(`   Exemplos: ${strategic.slice(0, 3).join(', ')}`);
            }
            
        } else {
            console.log('⚠️ SEM ENRIQUECIMENTO = SEM APLICAÇÕES AVANÇADAS');
            console.log('\nCom enriquecimento, você terá:');
            console.log('   • Knowledge Hubs - Centros de conexão de conhecimento');
            console.log('   • Technical Breakthroughs - Inovações para implementar');
            console.log('   • Strategic Insights - Base para decisões');
            console.log('   • Conceptual Evolution - Rastreamento de aprendizado');
            console.log('   • Theme Bridges - Conexões interdisciplinares');
        }
        
        // 10. Resumo final
        console.log('\n' + '═'.repeat(65));
        console.log('📊 RESUMO FINAL:\n');
        
        console.log(`✅ Total de pontos no Qdrant: ${analysis.totalPoints}`);
        console.log(`📄 Arquivos únicos: ${filesList.length}`);
        console.log(`📦 Média de chunks por arquivo: ${(analysis.chunks.total / filesList.length).toFixed(1)}`);
        console.log(`🏷️  Chunks com categorias: ${analysis.withCategories} (${((analysis.withCategories / analysis.totalPoints) * 100).toFixed(1)}%)`);
        console.log(`🧠 Chunks enriquecidos: ${analysis.withEnrichment} (${((analysis.withEnrichment / analysis.totalPoints) * 100).toFixed(1)}%)`);
        
        // Salvar análise
        const fullReport = {
            timestamp: new Date().toISOString(),
            stats: stats,
            analysis: analysis,
            files: filesList,
            searchResult: searchResult.slice(0, 10) // Primeiros 10 para referência
        };
        
        KC.AppState.set('qdrantFullAnalysis', fullReport);
        
        console.log('\n💾 Análise completa salva em: KC.AppState.get("qdrantFullAnalysis")');
        
        // Recomendações finais
        console.log('\n💡 PRÓXIMOS PASSOS RECOMENDADOS:');
        
        if (analysis.withEnrichment === 0) {
            console.log('\n1. ATIVAR ENRIQUECIMENTO INTELIGENTE:');
            console.log('   await KC.RAGExportManager.processApprovedFiles({');
            console.log('       enableEnrichment: true');
            console.log('   });');
        }
        
        if (analysis.withCategories < analysis.totalPoints * 0.5) {
            console.log('\n2. MELHORAR CATEGORIZAÇÃO:');
            console.log('   Apenas ' + ((analysis.withCategories / analysis.totalPoints) * 100).toFixed(0) + '% dos dados têm categorias.');
            console.log('   Categorize mais arquivos na Etapa 3.');
        }
        
        console.log('\n3. EXPLORAR CONHECIMENTO:');
        console.log('   // Buscar por categoria específica');
        console.log('   KC.QdrantService.search({filter: {must: [{key: "categories", match: {value: "tecnico"}}]}})');
        
        console.log('\n🏁 ANÁLISE CONCLUÍDA!');
        
    } catch (error) {
        console.error('❌ ERRO NA ANÁLISE:', error.message);
        console.error('Stack:', error.stack);
    }
})();

// Executar imediatamente
console.log('⏳ Executando análise do Qdrant...');