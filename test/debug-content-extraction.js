/**
 * Debug específico para extração de conteúdo
 */

async function debugContentExtraction() {
    console.log('🔍 DEBUG: EXTRAÇÃO DE CONTEÚDO\n');
    
    const KC = window.KnowledgeConsolidator;
    const extractor = new KC.RelationshipExtractor();
    
    // Arquivo com conteúdo rico
    const arquivo = {
        id: 'debug_content_001',
        name: 'teste-conteudo.md',
        content: `Este projeto utiliza Machine Learning e Python para análise de dados.
        Implementamos algoritmos de Deep Learning com TensorFlow.
        O sistema integra com React e Node.js para a interface.
        Decisão importante: migrar para microserviços.
        Insight: a modularização permitiu deploy independente.`,
        type: 'text/markdown',
        size: 300
    };
    
    console.log('📄 Arquivo de teste:');
    console.log(`Nome: ${arquivo.name}`);
    console.log(`Conteúdo: ${arquivo.content.substring(0, 100)}...`);
    console.log('');
    
    // 1. Testar extração completa
    console.log('1️⃣ Extração completa...');
    try {
        const todasTriplas = await extractor.extrairDeArquivo(arquivo);
        console.log(`✅ Total de triplas: ${todasTriplas.length}`);
        
        // Agrupar por método
        const porTipo = {};
        todasTriplas.forEach(t => {
            const tipo = t.presente.valor;
            if (!porTipo[tipo]) porTipo[tipo] = 0;
            porTipo[tipo]++;
        });
        
        console.log('\nTriplas por tipo:');
        Object.entries(porTipo).forEach(([tipo, qtd]) => {
            console.log(`  - ${tipo}: ${qtd}`);
        });
    } catch (erro) {
        console.error('❌ Erro:', erro);
    }
    
    // 2. Testar métodos individuais
    console.log('\n2️⃣ Testando métodos individuais...');
    
    // Básicos
    const basicas = extractor.extrairRelacionamentosBasicos(arquivo);
    console.log(`  Relacionamentos básicos: ${basicas.length}`);
    
    // Conteúdo
    try {
        const conteudo = await extractor.extrairRelacionamentosDeConteudo(arquivo);
        console.log(`  Relacionamentos de conteúdo: ${conteudo.length}`);
        
        if (conteudo.length > 0) {
            console.log('\n  Exemplos de conteúdo:');
            conteudo.slice(0, 3).forEach(t => {
                console.log(`    ${t.legado.valor} → ${t.presente.valor} → ${t.objetivo.valor}`);
            });
        }
    } catch (erro) {
        console.error('  ❌ Erro em conteúdo:', erro);
    }
    
    // 3. Verificar padrões
    console.log('\n3️⃣ Verificando padrões de keywords...');
    if (extractor.padroes && extractor.padroes.keywords) {
        console.log('Categorias de keywords:');
        Object.keys(extractor.padroes.keywords).forEach(cat => {
            console.log(`  - ${cat}: ${extractor.padroes.keywords[cat].length} palavras`);
        });
    }
    
    // 4. Testar detecção de keywords
    console.log('\n4️⃣ Testando detecção manual de keywords...');
    const keywords = ['machine learning', 'python', 'decisão', 'insight'];
    keywords.forEach(kw => {
        const regex = new RegExp(kw, 'gi');
        const matches = arquivo.content.match(regex);
        console.log(`  "${kw}": ${matches ? matches.length : 0} ocorrências`);
    });
    
    // 5. Verificar se métodos existem
    console.log('\n5️⃣ Métodos disponíveis no extractor:');
    const metodos = [
        'detectarKeywords',
        'detectarLinguagem',
        'detectarMencoes',
        'extrairInsights'
    ];
    
    metodos.forEach(m => {
        console.log(`  - ${m}: ${typeof extractor[m]}`);
    });
}

window.debugContentExtraction = debugContentExtraction;
console.log('🐛 Debug de extração de conteúdo carregado!');
console.log('Execute: debugContentExtraction()');