// Script para analisar insights dos dados no Qdrant
// Executa análise de qualidade e extrai informações relevantes

async function analyzeQdrantInsights() {
    console.log('🔍 ANÁLISE DE INSIGHTS - QDRANT ENRICHED DATA\n');
    console.log('Data:', new Date().toISOString());
    console.log('=' .repeat(60) + '\n');

    try {
        // 1. Verificar estatísticas gerais
        console.log('📊 1. ESTATÍSTICAS GERAIS\n');
        const statsResponse = await fetch('http://qdr.vcia.com.br:6333/collections/kc_enriched/');
        const stats = await statsResponse.json();
        
        console.log(`Total de Pontos: ${stats.result.points_count}`);
        console.log(`Status: ${stats.result.status}`);
        console.log(`Dimensões: ${stats.result.config.params.vectors.size}\n`);

        // 2. Buscar amostra de dados para análise
        console.log('📋 2. ANÁLISE DE DISTRIBUIÇÃO\n');
        const searchResponse = await fetch('http://qdr.vcia.com.br:6333/collections/kc_enriched/points/scroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                limit: 100,
                with_payload: true,
                with_vector: false
            })
        });
        
        const scrollData = await searchResponse.json();
        const points = scrollData.result.points;
        
        // Análise de tipos de inteligência
        const intelligenceTypes = {};
        const analysisTypes = {};
        const categories = new Map();
        const convergenceScores = [];
        const fileNames = new Set();
        
        points.forEach(point => {
            const payload = point.payload;
            
            // Contar tipos
            intelligenceTypes[payload.intelligenceType] = (intelligenceTypes[payload.intelligenceType] || 0) + 1;
            analysisTypes[payload.analysisType] = (analysisTypes[payload.analysisType] || 0) + 1;
            
            // Coletar scores
            if (payload.convergenceScore) convergenceScores.push(payload.convergenceScore);
            
            // Mapear categorias
            if (payload.categories) {
                payload.categories.forEach(cat => {
                    const catName = typeof cat === 'object' ? cat.name : cat;
                    categories.set(catName, (categories.get(catName) || 0) + 1);
                });
            }
            
            // Coletar nomes de arquivos únicos
            if (payload.fileName) fileNames.add(payload.fileName);
        });
        
        // Calcular médias
        const avgConvergence = convergenceScores.length > 0 
            ? convergenceScores.reduce((a, b) => a + b, 0) / convergenceScores.length 
            : 0;
        
        console.log('🎯 Distribuição de Intelligence Types:');
        Object.entries(intelligenceTypes)
            .sort((a, b) => b[1] - a[1])
            .forEach(([type, count]) => {
                const percentage = ((count / points.length) * 100).toFixed(1);
                console.log(`   ${type}: ${count} (${percentage}%)`);
            });
        
        console.log('\n📊 Distribuição de Analysis Types:');
        Object.entries(analysisTypes)
            .sort((a, b) => b[1] - a[1])
            .forEach(([type, count]) => {
                const percentage = ((count / points.length) * 100).toFixed(1);
                console.log(`   ${type}: ${count} (${percentage}%)`);
            });
        
        console.log('\n📁 Categorias Mapeadas:');
        Array.from(categories.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .forEach(([cat, count]) => {
                console.log(`   ${cat}: ${count} ocorrências`);
            });
        
        console.log(`\n📈 Convergence Score Médio: ${avgConvergence.toFixed(3)}`);
        console.log(`📄 Arquivos Únicos: ${fileNames.size}`);
        
        // 3. Buscar insights de alta qualidade
        console.log('\n🌟 3. INSIGHTS DE ALTA QUALIDADE\n');
        
        // Buscar por convergência alta
        const highConvergenceResponse = await fetch('http://qdr.vcia.com.br:6333/collections/kc_enriched/points/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filter: {
                    must: [
                        {
                            key: "convergenceScore",
                            range: {
                                gte: 0.7
                            }
                        }
                    ]
                },
                limit: 5,
                with_payload: true,
                with_vector: false
            })
        });
        
        if (highConvergenceResponse.ok) {
            const highConvData = await highConvergenceResponse.json();
            console.log('🔥 Top Convergências (score >= 0.7):');
            highConvData.result.forEach((item, idx) => {
                console.log(`\n   ${idx + 1}. ${item.payload.fileName || 'Unknown'}`);
                console.log(`      Score: ${item.payload.convergenceScore?.toFixed(3)}`);
                console.log(`      Tipo: ${item.payload.intelligenceType}`);
                if (item.payload.convergenceChains?.length > 0) {
                    console.log(`      Chains: ${item.payload.convergenceChains.length}`);
                }
            });
        }
        
        // 4. Análise de qualidade dos dados
        console.log('\n\n🔍 4. ANÁLISE DE QUALIDADE\n');
        
        // Verificar dados vazios ou incompletos
        let emptyContent = 0;
        let missingType = 0;
        let missingCategories = 0;
        
        points.forEach(point => {
            if (!point.payload.content || point.payload.content.trim() === '') emptyContent++;
            if (!point.payload.analysisType || point.payload.analysisType === 'Aprendizado Geral') missingType++;
            if (!point.payload.categories || point.payload.categories.length === 0) missingCategories++;
        });
        
        console.log('⚠️  Problemas Identificados:');
        console.log(`   - Conteúdo vazio: ${emptyContent} (${((emptyContent/points.length)*100).toFixed(1)}%)`);
        console.log(`   - Tipo não classificado: ${missingType} (${((missingType/points.length)*100).toFixed(1)}%)`);
        console.log(`   - Sem categorias: ${missingCategories} (${((missingCategories/points.length)*100).toFixed(1)}%)`);
        
        // 5. Buscar por keywords específicas do projeto
        console.log('\n\n🔑 5. ANÁLISE DE KEYWORDS DO PROJETO\n');
        
        const projectKeywords = ['triplas', 'qdrant', 'embeddings', 'convergência', 'pipeline'];
        
        for (const keyword of projectKeywords) {
            const keywordResponse = await fetch('http://qdr.vcia.com.br:6333/collections/kc_enriched/points/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filter: {
                        must: [
                            {
                                key: "content",
                                match: {
                                    text: keyword
                                }
                            }
                        ]
                    },
                    limit: 3,
                    with_payload: ['fileName', 'analysisType'],
                    with_vector: false
                })
            });
            
            if (keywordResponse.ok) {
                const keywordData = await keywordResponse.json();
                console.log(`\n📌 Keyword "${keyword}": ${keywordData.result.length} resultados`);
                if (keywordData.result.length > 0) {
                    keywordData.result.slice(0, 2).forEach(item => {
                        console.log(`   - ${item.payload.fileName} (${item.payload.analysisType})`);
                    });
                }
            }
        }
        
        // 6. Recomendações
        console.log('\n\n💡 6. RECOMENDAÇÕES PARA QUALIFICAÇÃO\n');
        
        const recommendations = [];
        
        if (avgConvergence < 0.5) {
            recommendations.push('📉 Convergence Score baixo - revisar algoritmo de detecção');
        }
        
        if (emptyContent > points.length * 0.1) {
            recommendations.push('📄 Muitos conteúdos vazios - validar pipeline de extração');
        }
        
        if (Object.keys(intelligenceTypes).length < 4) {
            recommendations.push('🎯 Poucos tipos de inteligência - verificar classificador');
        }
        
        const topCategory = Array.from(categories.entries())[0];
        if (topCategory && topCategory[1] > points.length * 0.5) {
            recommendations.push(`📁 Categoria "${topCategory[0]}" muito dominante - diversificar dados`);
        }
        
        if (recommendations.length === 0) {
            recommendations.push('✅ Qualidade geral dos dados está boa!');
        }
        
        recommendations.forEach(rec => console.log(`   ${rec}`));
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Análise concluída!');
        
    } catch (error) {
        console.error('❌ Erro na análise:', error.message);
    }
}

// Executar análise
analyzeQdrantInsights();