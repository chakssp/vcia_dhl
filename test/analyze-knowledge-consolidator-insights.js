// Análise detalhada dos insights da coleção knowledge_consolidator
// Com foco em qualificação dos dados e extração de insights

async function analyzeKnowledgeConsolidator() {
    console.log('🎯 ANÁLISE DE INSIGHTS - KNOWLEDGE CONSOLIDATOR\n');
    console.log('Data:', new Date().toISOString());
    console.log('Coleção: knowledge_consolidator (1151 pontos)');
    console.log('=' .repeat(70) + '\n');

    try {
        // 1. Buscar uma amostra significativa dos dados
        console.log('📊 1. COLETANDO DADOS PARA ANÁLISE\n');
        
        const scrollResponse = await fetch('http://qdr.vcia.com.br:6333/collections/knowledge_consolidator/points/scroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                limit: 200, // Amostra maior para análise mais precisa
                with_payload: true,
                with_vector: false
            })
        });
        
        const scrollData = await scrollResponse.json();
        const points = scrollData.result.points;
        
        console.log(`✅ ${points.length} pontos coletados para análise\n`);
        
        // 2. Análise de distribuição de tipos
        console.log('🎯 2. DISTRIBUIÇÃO DE TIPOS DE INTELIGÊNCIA\n');
        
        const stats = {
            intelligenceTypes: {},
            analysisTypes: {},
            categories: new Map(),
            convergenceScores: [],
            impactScores: [],
            intelligenceScores: [],
            fileNames: new Set(),
            documentIds: new Set(),
            convergenceChainsCount: 0,
            totalChains: 0,
            enrichmentDates: new Set()
        };
        
        // Processar cada ponto
        points.forEach(point => {
            const p = point.payload;
            
            // Intelligence Types
            stats.intelligenceTypes[p.intelligenceType] = (stats.intelligenceTypes[p.intelligenceType] || 0) + 1;
            
            // Analysis Types
            stats.analysisTypes[p.analysisType] = (stats.analysisTypes[p.analysisType] || 0) + 1;
            
            // Scores
            if (typeof p.convergenceScore === 'number') stats.convergenceScores.push(p.convergenceScore);
            if (typeof p.impactScore === 'number') stats.impactScores.push(p.impactScore);
            if (typeof p.intelligenceScore === 'number') stats.intelligenceScores.push(p.intelligenceScore);
            
            // Categorias
            if (Array.isArray(p.metadata?.categories)) {
                p.metadata.categories.forEach(cat => {
                    const catName = typeof cat === 'object' ? cat.name : cat;
                    stats.categories.set(catName, (stats.categories.get(catName) || 0) + 1);
                });
            }
            
            // Arquivos e documentos
            if (p.fileName) stats.fileNames.add(p.fileName);
            if (p.documentId) stats.documentIds.add(p.documentId);
            
            // Convergence chains
            if (Array.isArray(p.convergenceChains) && p.convergenceChains.length > 0) {
                stats.convergenceChainsCount++;
                stats.totalChains += p.convergenceChains.length;
            }
            
            // Data de enriquecimento
            if (p.enrichmentMetadata?.timestamp) {
                const date = new Date(p.enrichmentMetadata.timestamp).toLocaleDateString();
                stats.enrichmentDates.add(date);
            }
        });
        
        // Exibir distribuições
        console.log('📊 Intelligence Types:');
        Object.entries(stats.intelligenceTypes)
            .sort((a, b) => b[1] - a[1])
            .forEach(([type, count]) => {
                const percentage = ((count / points.length) * 100).toFixed(1);
                const bar = '█'.repeat(Math.floor(percentage / 2));
                console.log(`   ${type.padEnd(25)} ${count.toString().padStart(4)} (${percentage.padStart(5)}%) ${bar}`);
            });
        
        console.log('\n📈 Analysis Types:');
        Object.entries(stats.analysisTypes)
            .sort((a, b) => b[1] - a[1])
            .forEach(([type, count]) => {
                const percentage = ((count / points.length) * 100).toFixed(1);
                const bar = '█'.repeat(Math.floor(percentage / 2));
                console.log(`   ${type.padEnd(25)} ${count.toString().padStart(4)} (${percentage.padStart(5)}%) ${bar}`);
            });
        
        // 3. Análise de scores
        console.log('\n\n🎯 3. ANÁLISE DE SCORES DE QUALIDADE\n');
        
        const calculateStats = (arr, name) => {
            if (arr.length === 0) return null;
            const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
            const max = Math.max(...arr);
            const min = Math.min(...arr);
            const above70 = arr.filter(s => s >= 0.7).length;
            const above85 = arr.filter(s => s >= 0.85).length;
            
            console.log(`📊 ${name}:`);
            console.log(`   Média: ${avg.toFixed(3)}`);
            console.log(`   Máximo: ${max.toFixed(3)} | Mínimo: ${min.toFixed(3)}`);
            console.log(`   Acima de 0.70: ${above70} (${((above70/arr.length)*100).toFixed(1)}%)`);
            console.log(`   Acima de 0.85: ${above85} (${((above85/arr.length)*100).toFixed(1)}%)`);
            console.log('');
            
            return { avg, max, min, above70, above85 };
        };
        
        const convStats = calculateStats(stats.convergenceScores, 'Convergence Score');
        const impStats = calculateStats(stats.impactScores, 'Impact Score');
        const intStats = calculateStats(stats.intelligenceScores, 'Intelligence Score');
        
        // 4. Análise de categorias
        console.log('\n🏷️ 4. ANÁLISE DE CATEGORIAS\n');
        
        console.log(`Total de categorias únicas: ${stats.categories.size}`);
        console.log('\nTop 10 Categorias:');
        Array.from(stats.categories.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .forEach(([cat, count]) => {
                const percentage = ((count / points.length) * 100).toFixed(1);
                console.log(`   ${cat.padEnd(30)} ${count.toString().padStart(4)} (${percentage.padStart(5)}%)`);
            });
        
        // 5. Análise de convergências
        console.log('\n\n🔗 5. ANÁLISE DE CONVERGÊNCIAS\n');
        
        console.log(`Pontos com convergências: ${stats.convergenceChainsCount} (${((stats.convergenceChainsCount/points.length)*100).toFixed(1)}%)`);
        console.log(`Total de chains detectadas: ${stats.totalChains}`);
        if (stats.convergenceChainsCount > 0) {
            console.log(`Média de chains por documento: ${(stats.totalChains/stats.convergenceChainsCount).toFixed(1)}`);
        }
        
        // Buscar exemplos de alta convergência
        console.log('\n🌟 Exemplos de Alta Convergência:');
        const highConvergence = points
            .filter(p => p.payload.convergenceScore >= 0.8)
            .sort((a, b) => b.payload.convergenceScore - a.payload.convergenceScore)
            .slice(0, 3);
        
        highConvergence.forEach((point, idx) => {
            const p = point.payload;
            console.log(`\n   ${idx + 1}. ${p.fileName || 'Unknown'}`);
            console.log(`      Score: ${p.convergenceScore.toFixed(3)}`);
            console.log(`      Tipo: ${p.intelligenceType}`);
            console.log(`      Análise: ${p.analysisType}`);
            if (p.convergenceChains && p.convergenceChains.length > 0) {
                console.log(`      Chains: ${p.convergenceChains.map(c => c.theme || 'N/A').join(', ')}`);
            }
        });
        
        // 6. Insights extraídos
        console.log('\n\n💡 6. INSIGHTS EXTRAÍDOS DOS DADOS\n');
        
        // Identificar padrões
        const patterns = [];
        
        // Padrão 1: Dominância de tipo
        const dominantType = Object.entries(stats.intelligenceTypes)[0];
        if (dominantType && dominantType[1] / points.length > 0.4) {
            patterns.push({
                type: 'Dominância de Tipo',
                insight: `${dominantType[0]} representa ${((dominantType[1]/points.length)*100).toFixed(1)}% dos dados`,
                action: 'Verificar se o classificador está enviesado ou se reflete a natureza dos documentos'
            });
        }
        
        // Padrão 2: Scores baixos
        if (convStats && convStats.avg < 0.5) {
            patterns.push({
                type: 'Convergência Baixa',
                insight: `Score médio de convergência é ${convStats.avg.toFixed(3)}`,
                action: 'Revisar threshold de similaridade ou adicionar mais documentos relacionados'
            });
        }
        
        // Padrão 3: Categorias concentradas
        const topCategory = Array.from(stats.categories.entries())[0];
        if (topCategory && topCategory[1] / points.length > 0.5) {
            patterns.push({
                type: 'Concentração de Categoria',
                insight: `${topCategory[0]} aparece em ${((topCategory[1]/points.length)*100).toFixed(1)}% dos documentos`,
                action: 'Diversificar fontes de dados ou revisar processo de categorização'
            });
        }
        
        // Padrão 4: Alta qualidade
        if (intStats && intStats.above85 / stats.intelligenceScores.length > 0.3) {
            patterns.push({
                type: 'Alta Qualidade',
                insight: `${((intStats.above85/stats.intelligenceScores.length)*100).toFixed(1)}% dos documentos têm intelligence score > 0.85`,
                action: 'Manter padrão atual e usar esses documentos como referência'
            });
        }
        
        patterns.forEach((pattern, idx) => {
            console.log(`${idx + 1}. ${pattern.type.toUpperCase()}`);
            console.log(`   📊 ${pattern.insight}`);
            console.log(`   💡 ${pattern.action}\n`);
        });
        
        // 7. Metadados gerais
        console.log('\n📋 7. METADADOS GERAIS\n');
        
        console.log(`Arquivos únicos: ${stats.fileNames.size}`);
        console.log(`Documentos únicos: ${stats.documentIds.size}`);
        console.log(`Datas de enriquecimento: ${Array.from(stats.enrichmentDates).join(', ')}`);
        
        // 8. Recomendações para qualificação
        console.log('\n\n🎯 8. RECOMENDAÇÕES PARA QUALIFICAÇÃO DOS DADOS\n');
        
        const recommendations = [];
        
        if (stats.fileNames.size < 20) {
            recommendations.push({
                priority: 'ALTA',
                action: 'Aumentar volume de documentos',
                reason: 'Base atual tem poucos arquivos únicos para análise robusta'
            });
        }
        
        if (Object.keys(stats.intelligenceTypes).length < 4) {
            recommendations.push({
                priority: 'MÉDIA',
                action: 'Diversificar tipos de inteligência',
                reason: 'Poucos tipos detectados podem indicar classificação limitada'
            });
        }
        
        if (stats.convergenceChainsCount / points.length < 0.3) {
            recommendations.push({
                priority: 'ALTA',
                action: 'Melhorar detecção de convergências',
                reason: 'Poucas convergências detectadas limitam insights relacionais'
            });
        }
        
        if (convStats && convStats.avg > 0.7 && intStats && intStats.avg > 0.7) {
            recommendations.push({
                priority: 'BAIXA',
                action: 'Manter processo atual',
                reason: 'Scores altos indicam boa qualidade de enriquecimento'
            });
        }
        
        recommendations
            .sort((a, b) => {
                const priority = { 'ALTA': 0, 'MÉDIA': 1, 'BAIXA': 2 };
                return priority[a.priority] - priority[b.priority];
            })
            .forEach(rec => {
                console.log(`[${rec.priority}] ${rec.action}`);
                console.log(`      ${rec.reason}\n`);
            });
        
        // 9. Próximos passos
        console.log('\n📌 9. PRÓXIMOS PASSOS SUGERIDOS\n');
        
        console.log('1. VALIDAÇÃO MANUAL:');
        console.log('   - Revisar os 3 documentos de alta convergência listados');
        console.log('   - Verificar se as categorias atribuídas fazem sentido');
        console.log('   - Validar se os tipos de inteligência estão corretos\n');
        
        console.log('2. EXPANSÃO DA BASE:');
        console.log('   - Adicionar mais documentos de pastas diferentes');
        console.log('   - Incluir documentos de tipos variados');
        console.log('   - Processar documentos de períodos diferentes\n');
        
        console.log('3. REFINAMENTO:');
        console.log('   - Ajustar thresholds baseado nos scores atuais');
        console.log('   - Melhorar extração de keywords relevantes');
        console.log('   - Implementar validação cruzada de categorias');
        
        console.log('\n' + '='.repeat(70));
        console.log('✅ Análise concluída com sucesso!');
        console.log(`📊 Total de ${points.length} pontos analisados de ${stats.documentIds.size} documentos únicos`);
        
    } catch (error) {
        console.error('\n❌ Erro na análise:', error.message);
    }
}

// Executar análise
analyzeKnowledgeConsolidator();