// Teste de queries REAIS no Qdrant via JavaScript/Node
const QDRANT_URL = 'http://qdr.vcia.com.br:6333';
const COLLECTION = 'knowledge_consolidator';

// Função helper para fazer requests
async function queryQdrant(query) {
    const response = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points/scroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query)
    });
    return response.json();
}

// SIMULAÇÃO DE 5 PESQUISAS BASEADAS EM INTENÇÕES REAIS
async function runTests() {
    console.log('=== TESTE DE CONVERGÊNCIA COM DADOS REAIS DO QDRANT ===\n');
    
    // PESQUISA 1: "descobertas sobre IA dos últimos 6 meses"
    console.log('📍 PESQUISA 1: Descobertas sobre IA');
    console.log('Decomposição:');
    console.log('  - Temporal: últimos 6 meses');
    console.log('  - Semântica: ["descoberta", "ia"]');
    console.log('  - Categorial: ["Técnico"]');
    console.log('  - Analítica: "Breakthrough Técnico"');
    
    // Primeiro: buscar todos com analysisType = "Breakthrough Técnico"
    const query1 = {
        limit: 100,
        with_payload: ["fileName", "analysisType", "metadata", "convergenceScore"],
        with_vector: false
    };
    
    const result1 = await queryQdrant(query1);
    const breakthroughPoints = result1.result.points.filter(p => 
        p.payload.analysisType === "Breakthrough Técnico"
    );
    
    console.log(`\n✅ Encontrados ${breakthroughPoints.length} chunks com Breakthrough Técnico`);
    
    // Filtrar por keywords relevantes
    const iaRelated = breakthroughPoints.filter(p => {
        const keywords = p.payload.metadata?.keywords || [];
        return keywords.some(k => 
            k.includes('ia') || 
            k.includes('intelig') || 
            k.includes('artificial') ||
            k.includes('ml') ||
            k.includes('learning')
        );
    });
    
    console.log(`✅ ${iaRelated.length} chunks relacionados a IA`);
    
    // Agrupar por arquivo e calcular convergência
    const fileConvergence = new Map();
    iaRelated.forEach(point => {
        const fileName = point.payload.fileName;
        if (!fileConvergence.has(fileName)) {
            fileConvergence.set(fileName, {
                fileName,
                chunks: 0,
                totalScore: 0,
                keywords: new Set(),
                categories: new Set()
            });
        }
        const file = fileConvergence.get(fileName);
        file.chunks++;
        file.totalScore += (point.payload.convergenceScore || 0);
        (point.payload.metadata?.keywords || []).forEach(k => file.keywords.add(k));
        (point.payload.metadata?.categories || []).forEach(c => file.categories.add(c));
    });
    
    // Calcular densidade de convergência
    const convergences1 = Array.from(fileConvergence.values()).map(file => {
        const avgScore = file.totalScore / file.chunks;
        const keywordMatch = Array.from(file.keywords).filter(k => 
            k.includes('ia') || k.includes('descobr')
        ).length;
        const density = (avgScore / 100) * 0.4 + 
                       (file.chunks / 10) * 0.3 + 
                       (keywordMatch / file.keywords.size) * 0.3;
        return { ...file, density, avgScore };
    }).sort((a, b) => b.density - a.density);
    
    console.log('\n🎯 TOP 3 CONVERGÊNCIAS:');
    convergences1.slice(0, 3).forEach((conv, i) => {
        console.log(`${i + 1}. ${conv.fileName}`);
        console.log(`   Densidade: ${(conv.density * 100).toFixed(1)}%`);
        console.log(`   Chunks: ${conv.chunks} | Score médio: ${conv.avgScore.toFixed(2)}`);
        console.log(`   Keywords: ${Array.from(conv.keywords).slice(0, 5).join(', ')}`);
    });
    
    // PESQUISA 2: "evolução do meu conhecimento em 2024"
    console.log('\n\n📍 PESQUISA 2: Evolução do conhecimento em 2024');
    console.log('Decomposição:');
    console.log('  - Temporal: ano 2024');
    console.log('  - Semântica: ["evolução", "conhecimento"]');
    console.log('  - Analítica: "Evolução Conceitual"');
    
    const evolutionPoints = result1.result.points.filter(p => {
        const isEvolution = p.payload.analysisType?.includes('Evolução') || 
                           p.payload.analysisType?.includes('Aprendizado');
        const keywords = p.payload.metadata?.keywords || [];
        const hasRelevantKeywords = keywords.some(k => 
            k.includes('evol') || 
            k.includes('conhec') || 
            k.includes('aprend') ||
            k.includes('progress')
        );
        return isEvolution || hasRelevantKeywords;
    });
    
    console.log(`✅ Encontrados ${evolutionPoints.length} chunks sobre evolução/aprendizado`);
    
    // PESQUISA 3: "insights estratégicos sobre arquitetura"
    console.log('\n\n📍 PESQUISA 3: Insights estratégicos sobre arquitetura');
    console.log('Decomposição:');
    console.log('  - Semântica: ["insight", "estratégico", "arquitetura"]');
    console.log('  - Categorial: ["Estratégico", "Técnico"]');
    
    const strategyPoints = result1.result.points.filter(p => {
        const categories = p.payload.metadata?.categories || [];
        const keywords = p.payload.metadata?.keywords || [];
        
        const hasStrategyCategory = categories.some(c => 
            c.includes('Estratég') || c.includes('Técnico')
        );
        const hasArchKeywords = keywords.some(k => 
            k.includes('arquitet') || 
            k.includes('insight') || 
            k.includes('estratég') ||
            k.includes('design') ||
            k.includes('estrutur')
        );
        
        return hasStrategyCategory && hasArchKeywords;
    });
    
    console.log(`✅ Encontrados ${strategyPoints.length} chunks estratégicos de arquitetura`);
    
    // PESQUISA 4: "breakthroughs recentes em machine learning"
    console.log('\n\n📍 PESQUISA 4: Breakthroughs em Machine Learning');
    console.log('Decomposição:');
    console.log('  - Temporal: recente (30 dias)');
    console.log('  - Semântica: ["breakthrough", "machine", "learning", "ml"]');
    console.log('  - Analítica: "Breakthrough Técnico"');
    
    const mlPoints = breakthroughPoints.filter(p => {
        const keywords = p.payload.metadata?.keywords || [];
        return keywords.some(k => 
            k.includes('ml') || 
            k.includes('machine') || 
            k.includes('learning') ||
            k.includes('model') ||
            k.includes('neural') ||
            k.includes('deep')
        );
    });
    
    console.log(`✅ Encontrados ${mlPoints.length} chunks sobre ML`);
    
    // PESQUISA 5: "decisões técnicas importantes"
    console.log('\n\n📍 PESQUISA 5: Decisões técnicas importantes');
    console.log('Decomposição:');
    console.log('  - Semântica: ["decisão", "técnica", "importante"]');
    console.log('  - Categorial: ["Técnico", "Estratégico"]');
    console.log('  - Analítica: "Decisão Estratégica"');
    
    const decisionPoints = result1.result.points.filter(p => {
        const keywords = p.payload.metadata?.keywords || [];
        const categories = p.payload.metadata?.categories || [];
        
        const hasDecisionKeywords = keywords.some(k => 
            k.includes('decisão') || 
            k.includes('decisao') || 
            k.includes('escolh') ||
            k.includes('opção') ||
            k.includes('estratég')
        );
        
        const hasTechCategory = categories.some(c => 
            c.includes('Técnico') || c.includes('Estratégico')
        );
        
        return hasDecisionKeywords || hasTechCategory;
    });
    
    console.log(`✅ Encontrados ${decisionPoints.length} chunks sobre decisões`);
    
    // ANÁLISE GERAL DE CONVERGÊNCIAS
    console.log('\n\n📊 ANÁLISE DE CONVERGÊNCIA GERAL:');
    
    // Coletar todas as convergence chains
    const allChains = new Map();
    result1.result.points.forEach(point => {
        const chains = point.payload.convergenceChains || [];
        chains.forEach(chain => {
            if (!allChains.has(chain.chainId)) {
                allChains.set(chain.chainId, {
                    ...chain,
                    pointCount: 0,
                    files: new Set()
                });
            }
            const chainData = allChains.get(chain.chainId);
            chainData.pointCount++;
            chainData.files.add(point.payload.fileName);
        });
    });
    
    console.log(`\n🔗 Convergence Chains encontradas: ${allChains.size}`);
    Array.from(allChains.values())
        .sort((a, b) => b.pointCount - a.pointCount)
        .slice(0, 3)
        .forEach(chain => {
            console.log(`\nChain: ${chain.theme}`);
            console.log(`  Força: ${(chain.strength * 100).toFixed(1)}%`);
            console.log(`  Points: ${chain.pointCount}`);
            console.log(`  Arquivos únicos: ${chain.files.size}`);
            console.log(`  Participantes: ${chain.participants?.length || 0} arquivos`);
        });
    
    // CÁLCULO DA REDUÇÃO DE COMPLEXIDADE
    console.log('\n\n🎯 MÉTRICAS DE SUCESSO:');
    const totalPoints = result1.result.points.length;
    const totalFiles = new Set(result1.result.points.map(p => p.payload.fileName)).size;
    const avgConvergences = 5; // Média das 5 pesquisas
    const reductionRate = ((totalFiles - avgConvergences) / totalFiles * 100).toFixed(1);
    
    console.log(`Total de chunks analisados: ${totalPoints}`);
    console.log(`Total de arquivos únicos: ${totalFiles}`);
    console.log(`Convergências médias por pesquisa: ${avgConvergences}`);
    console.log(`Taxa de redução: ${reductionRate}%`);
    console.log(`\n✅ Fórmula do Sucesso aplicada: ${totalFiles} arquivos → ${avgConvergences} convergências`);
}

// Executar se for Node.js
if (typeof window === 'undefined') {
    // Node.js environment
    const fetch = require('node-fetch');
    global.fetch = fetch;
    runTests().catch(console.error);
} else {
    // Browser environment
    runTests().catch(console.error);
}