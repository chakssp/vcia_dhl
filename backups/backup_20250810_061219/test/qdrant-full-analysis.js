/**
 * Análise Completa dos Dados no Qdrant
 * Data: 30/01/2025
 * 
 * Script para mapear todos os dados carregados no Qdrant
 * e analisar suas aplicações baseadas no plano Intelligence Enrichment
 */

(async function() {
    'use strict';
    
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║          🔍 ANÁLISE COMPLETA DOS DADOS NO QDRANT              ║
╚════════════════════════════════════════════════════════════════╝
`);
    
    // Verificar se QdrantService está disponível
    if (!KC.QdrantService) {
        console.error('❌ QdrantService não está disponível!');
        return;
    }
    
    const analysis = {
        connection: false,
        collection: null,
        stats: null,
        samples: [],
        categories: {},
        analysisTypes: {},
        intelligenceTypes: {},
        convergenceScores: [],
        applications: []
    };
    
    try {
        // 1. Verificar conexão
        console.log('1️⃣ VERIFICANDO CONEXÃO COM QDRANT...\n');
        const isConnected = await KC.QdrantService.checkConnection();
        analysis.connection = isConnected;
        
        if (!isConnected) {
            console.error('❌ Não foi possível conectar ao Qdrant!');
            return;
        }
        console.log('✅ Conexão estabelecida com sucesso!');
        
        // 2. Obter estatísticas da coleção
        console.log('\n2️⃣ OBTENDO ESTATÍSTICAS DA COLEÇÃO...\n');
        const stats = await KC.QdrantService.getCollectionStats();
        analysis.stats = stats;
        
        console.log(`📊 Estatísticas da coleção "${KC.QdrantService.config.collectionName}":`);
        console.log(`   • Pontos totais: ${stats.vectors_count || 0}`);
        console.log(`   • Status: ${stats.status || 'unknown'}`);
        
        if (!stats.vectors_count || stats.vectors_count === 0) {
            console.log('\n⚠️ Nenhum dado encontrado no Qdrant!');
            return;
        }
        
        // 3. Buscar uma amostra de dados
        console.log('\n3️⃣ BUSCANDO AMOSTRA DE DADOS...\n');
        
        // Buscar até 100 pontos para análise
        const searchResult = await KC.QdrantService.search({
            vector: new Array(768).fill(0), // Vector neutro para buscar qualquer coisa
            limit: 100,
            with_payload: true,
            with_vector: false
        });
        
        if (searchResult && searchResult.length > 0) {
            analysis.samples = searchResult;
            console.log(`✅ ${searchResult.length} pontos recuperados para análise`);
            
            // 4. Analisar metadados
            console.log('\n4️⃣ ANALISANDO METADADOS...\n');
            
            searchResult.forEach(point => {
                const payload = point.payload;
                
                // Categorias
                if (payload.categories && Array.isArray(payload.categories)) {
                    payload.categories.forEach(cat => {
                        analysis.categories[cat] = (analysis.categories[cat] || 0) + 1;
                    });
                }
                
                // Tipos de análise
                if (payload.analysisType) {
                    analysis.analysisTypes[payload.analysisType] = 
                        (analysis.analysisTypes[payload.analysisType] || 0) + 1;
                }
                
                // Intelligence types (se enriquecido)
                if (payload.intelligenceType) {
                    analysis.intelligenceTypes[payload.intelligenceType] = 
                        (analysis.intelligenceTypes[payload.intelligenceType] || 0) + 1;
                }
                
                // Scores de convergência
                if (payload.convergenceScore !== undefined) {
                    analysis.convergenceScores.push(payload.convergenceScore);
                }
            });
            
            // 5. Exibir análise de categorias
            console.log('📂 CATEGORIAS ENCONTRADAS:');
            const sortedCategories = Object.entries(analysis.categories)
                .sort((a, b) => b[1] - a[1]);
            
            if (sortedCategories.length > 0) {
                sortedCategories.forEach(([cat, count]) => {
                    console.log(`   • ${cat}: ${count} documentos`);
                });
            } else {
                console.log('   ⚠️ Nenhuma categoria encontrada');
            }
            
            // 6. Exibir tipos de análise
            console.log('\n📊 TIPOS DE ANÁLISE:');
            Object.entries(analysis.analysisTypes).forEach(([type, count]) => {
                console.log(`   • ${type}: ${count} documentos`);
            });
            
            // 7. Exibir intelligence types (se houver)
            if (Object.keys(analysis.intelligenceTypes).length > 0) {
                console.log('\n🧠 TIPOS DE INTELIGÊNCIA (Enriquecimento):');
                Object.entries(analysis.intelligenceTypes).forEach(([type, count]) => {
                    console.log(`   • ${type}: ${count} documentos`);
                });
            }
            
            // 8. Análise de convergência
            if (analysis.convergenceScores.length > 0) {
                const avgScore = analysis.convergenceScores.reduce((a, b) => a + b, 0) / 
                                analysis.convergenceScores.length;
                const maxScore = Math.max(...analysis.convergenceScores);
                const minScore = Math.min(...analysis.convergenceScores);
                
                console.log('\n📈 ANÁLISE DE CONVERGÊNCIA:');
                console.log(`   • Score médio: ${avgScore.toFixed(2)}`);
                console.log(`   • Score máximo: ${maxScore}`);
                console.log(`   • Score mínimo: ${minScore}`);
                console.log(`   • Documentos com convergência: ${analysis.convergenceScores.length}`);
            }
            
            // 9. Exemplos de documentos
            console.log('\n📄 EXEMPLOS DE DOCUMENTOS:');
            searchResult.slice(0, 5).forEach((point, idx) => {
                const p = point.payload;
                console.log(`\n   ${idx + 1}. ${p.fileName || 'Sem nome'}`);
                console.log(`      • Chunk: ${p.chunkId || 'N/A'}`);
                console.log(`      • Categorias: ${p.categories?.join(', ') || 'Nenhuma'}`);
                console.log(`      • Análise: ${p.analysisType || 'N/A'}`);
                if (p.intelligenceType) {
                    console.log(`      • Inteligência: ${p.intelligenceType}`);
                }
                if (p.convergenceScore !== undefined) {
                    console.log(`      • Convergência: ${p.convergenceScore}`);
                }
                console.log(`      • Preview: "${(p.content || '').substring(0, 80)}..."`);
            });
            
            // 10. Aplicações baseadas no Intelligence Enrichment
            console.log('\n🎯 APLICAÇÕES IDENTIFICADAS (Intelligence Enrichment):');
            
            // Análise de hubs de conhecimento
            const knowledgeHubs = searchResult.filter(p => 
                p.payload.intelligenceType === 'knowledge_hub' ||
                p.payload.convergenceScore > 80
            );
            
            if (knowledgeHubs.length > 0) {
                analysis.applications.push({
                    type: 'Knowledge Hubs',
                    count: knowledgeHubs.length,
                    description: 'Documentos centrais que conectam múltiplos conceitos',
                    usage: 'Usar como pontos de entrada para exploração de conhecimento'
                });
            }
            
            // Detectar breakthroughs
            const breakthroughs = searchResult.filter(p => 
                p.payload.analysisType === 'Breakthrough Técnico' ||
                p.payload.intelligenceType === 'paradigm_shifter'
            );
            
            if (breakthroughs.length > 0) {
                analysis.applications.push({
                    type: 'Technical Breakthroughs',
                    count: breakthroughs.length,
                    description: 'Momentos de inovação e mudanças de paradigma',
                    usage: 'Priorizar para estudo detalhado e aplicação prática'
                });
            }
            
            // Detectar insights estratégicos
            const strategicInsights = searchResult.filter(p => 
                p.payload.analysisType === 'Insight Estratégico' ||
                p.payload.categories?.includes('estrategico')
            );
            
            if (strategicInsights.length > 0) {
                analysis.applications.push({
                    type: 'Strategic Insights',
                    count: strategicInsights.length,
                    description: 'Insights para tomada de decisão estratégica',
                    usage: 'Usar em planejamento e definição de direção'
                });
            }
            
            // Detectar conhecimento evolutivo
            const evolutiveKnowledge = searchResult.filter(p => 
                p.payload.analysisType === 'Evolução Conceitual'
            );
            
            if (evolutiveKnowledge.length > 0) {
                analysis.applications.push({
                    type: 'Conceptual Evolution',
                    count: evolutiveKnowledge.length,
                    description: 'Documentos que mostram evolução de conceitos',
                    usage: 'Rastrear aprendizado e desenvolvimento ao longo do tempo'
                });
            }
            
            // Exibir aplicações
            if (analysis.applications.length > 0) {
                analysis.applications.forEach(app => {
                    console.log(`\n   📌 ${app.type} (${app.count} documentos)`);
                    console.log(`      ${app.description}`);
                    console.log(`      💡 ${app.usage}`);
                });
            } else {
                console.log('\n   ⚠️ Nenhuma aplicação específica identificada ainda');
                console.log('   💡 Execute o enriquecimento com IntelligenceEnrichmentPipeline');
            }
            
            // 11. Recomendações
            console.log('\n💡 RECOMENDAÇÕES BASEADAS NOS DADOS:');
            
            // Verificar se há enriquecimento
            const hasEnrichment = Object.keys(analysis.intelligenceTypes).length > 0;
            
            if (!hasEnrichment) {
                console.log('\n   1. 🚀 EXECUTAR ENRIQUECIMENTO:');
                console.log('      Os dados ainda não foram enriquecidos com inteligência.');
                console.log('      Execute: KC.IntelligenceEnrichmentPipeline.enrichDocuments()');
            }
            
            // Verificar categorização
            const categorizedRatio = searchResult.filter(p => 
                p.payload.categories && p.payload.categories.length > 0
            ).length / searchResult.length;
            
            if (categorizedRatio < 0.5) {
                console.log('\n   2. 🏷️ MELHORAR CATEGORIZAÇÃO:');
                console.log(`      Apenas ${(categorizedRatio * 100).toFixed(0)}% dos documentos têm categorias.`);
                console.log('      Categorize mais documentos para melhor organização.');
            }
            
            // Sugerir exploração
            if (analysis.categories['tecnico'] > 5) {
                console.log('\n   3. 🔧 EXPLORAR CONHECIMENTO TÉCNICO:');
                console.log('      Muitos documentos técnicos detectados.');
                console.log('      Use busca semântica para encontrar soluções similares.');
            }
            
            // Sugerir análise temporal
            console.log('\n   4. 📅 ANÁLISE TEMPORAL:');
            console.log('      Considere analisar a evolução do conhecimento ao longo do tempo.');
            console.log('      Use os timestamps para identificar padrões de aprendizado.');
            
        } else {
            console.log('⚠️ Nenhum dado encontrado na busca!');
        }
        
        // 12. Salvar relatório
        console.log('\n📊 SALVANDO RELATÓRIO COMPLETO...');
        
        const report = {
            timestamp: new Date().toISOString(),
            analysis: analysis,
            summary: {
                totalPoints: analysis.stats?.vectors_count || 0,
                categoriesFound: Object.keys(analysis.categories).length,
                analysisTypes: Object.keys(analysis.analysisTypes).length,
                hasEnrichment: Object.keys(analysis.intelligenceTypes).length > 0,
                applications: analysis.applications.length
            }
        };
        
        // Salvar no AppState para referência
        KC.AppState.set('lastQdrantAnalysis', report);
        
        console.log('\n✅ Análise completa! Relatório salvo em KC.AppState.get("lastQdrantAnalysis")');
        
    } catch (error) {
        console.error('\n❌ ERRO NA ANÁLISE:', error.message);
        console.error('Stack:', error.stack);
    }
    
    console.log('\n' + '═'.repeat(65));
    console.log('🏁 ANÁLISE FINALIZADA - 30/01/2025');
})();