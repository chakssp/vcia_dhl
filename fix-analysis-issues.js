// Script para diagnosticar e corrigir problemas na análise
console.log('=== DIAGNÓSTICO DE PROBLEMAS NA ANÁLISE ===\n');

// 1. PROBLEMA 1: Relevância saltando para 100%
console.log('🔍 PROBLEMA 1: Relevância saltando para 100%');
console.log('Analisando método calculateEnhancedRelevance...\n');

// Verificar a lógica atual
const testFile = {
    name: 'test.md',
    analysisType: 'Breakthrough Técnico',
    relevanceScore: 50,
    categories: []
};

// Simular cálculo
let baseScore = 50 / 100; // 0.5
console.log(`Score base: ${baseScore}`);

// O problema está aqui - boost fixo de 25% para Breakthrough
baseScore = Math.min(baseScore + 0.25, 1.0); // 0.75
console.log(`Score após boost do tipo: ${baseScore}`);
console.log(`Score final: ${baseScore * 100}%`); // 75%

// Mas quando o arquivo já tem 75% e é reanalisado...
baseScore = 75 / 100; // 0.75
baseScore = Math.min(baseScore + 0.25, 1.0); // 1.0!
console.log(`\nProblema identificado: Score acumula boost a cada análise!`);
console.log(`75% + 25% = 100% (máximo)`);

// 2. PROBLEMA 2: Análise baseada em mapeamento direto categoria → tipo
console.log('\n\n🔍 PROBLEMA 2: Análise superficial por categorias');
console.log('Analisando método detectAnalysisType...\n');

// O método usa apenas keywords básicas no conteúdo
console.log('Método atual usa apenas keywords:');
console.log('- "solução/configuração/arquitetura" → Breakthrough Técnico');
console.log('- "entendimento/perspectiva/visão" → Evolução Conceitual');
console.log('- "decisão/escolha/direção" → Momento Decisivo');
console.log('- "insight/transformação/breakthrough" → Insight Estratégico');
console.log('- Qualquer outra coisa → Aprendizado Geral');

console.log('\n❌ PROBLEMA: Não usa busca semântica no Qdrant!');
console.log('❌ PROBLEMA: Boost de relevância acumula a cada análise!');

// 3. SOLUÇÃO PROPOSTA
console.log('\n\n✅ SOLUÇÕES PROPOSTAS:');

console.log('\n1. Corrigir calculateEnhancedRelevance:');
console.log(`
// Não aplicar boost baseado em analysisType
// Deixar apenas o cálculo base
calculateEnhancedRelevance(file) {
    // Retorna score base SEM boost de tipo
    let baseScore = file.relevanceScore || this.calculateRelevance(file);
    
    // Normaliza para 0-100
    if (baseScore > 100) baseScore = 100;
    if (baseScore < 0) baseScore = 0;
    
    return baseScore;
}
`);

console.log('\n2. Melhorar detecção usando Qdrant:');
console.log(`
// Já está implementado nas linhas 720-768!
// O problema é que o fallback (detectAnalysisType) é muito genérico
`);

console.log('\n3. Corrigir mapeamento categoria → tipo:');
console.log(`
// Em vez de mapear diretamente, usar busca semântica
// Remover lógica simplista de keywords
`);

// 4. APLICAR CORREÇÕES
console.log('\n\n🔧 APLICANDO CORREÇÕES...\n');

// Backup do método original
KC.FileRenderer.prototype.calculateEnhancedRelevance_original = KC.FileRenderer.prototype.calculateEnhancedRelevance;

// Substituir por versão corrigida
KC.FileRenderer.prototype.calculateEnhancedRelevance = function(file) {
    // CORREÇÃO: Retorna score base SEM boost de tipo
    let baseScore = 0;
    
    // Se já tem relevanceScore, usa ele (pode ter boost de categorias)
    if (file.relevanceScore !== undefined && file.relevanceScore !== null) {
        baseScore = file.relevanceScore;
    } else {
        // Calcula do zero se não tem score
        baseScore = this.calculateRelevance(file);
    }
    
    // Normaliza para 0-100
    if (baseScore > 100) baseScore = 100;
    if (baseScore < 0) baseScore = 0;
    
    console.log(`[calculateEnhancedRelevance] ${file.name}: score=${baseScore}% (sem boost de tipo)`);
    
    return baseScore;
};

console.log('✅ calculateEnhancedRelevance corrigido!');

// Melhorar detectAnalysisType para ser menos genérico
KC.FileRenderer.prototype.detectAnalysisType_original = KC.FileRenderer.prototype.detectAnalysisType;

KC.FileRenderer.prototype.detectAnalysisType = function(file) {
    const fileName = (file.name || '').toLowerCase();
    const content = (file.content || file.preview || '').toLowerCase();
    const combined = fileName + ' ' + content;
    
    // Score para cada tipo baseado em múltiplas keywords
    const scores = {
        'Breakthrough Técnico': 0,
        'Evolução Conceitual': 0,
        'Momento Decisivo': 0,
        'Insight Estratégico': 0,
        'Aprendizado Geral': 0
    };
    
    // Keywords mais específicas e com pesos
    const keywords = {
        'Breakthrough Técnico': [
            ['implementação', 3], ['código', 3], ['algoritmo', 3], ['performance', 3],
            ['solução', 2], ['configuração', 2], ['arquitetura', 2], ['técnica', 2],
            ['api', 2], ['framework', 2], ['otimização', 2], ['bug', 2]
        ],
        'Evolução Conceitual': [
            ['conceito', 3], ['teoria', 3], ['modelo', 3], ['paradigma', 3],
            ['entendimento', 2], ['perspectiva', 2], ['visão', 2], ['abordagem', 2],
            ['metodologia', 2], ['princípio', 2], ['filosofia', 2]
        ],
        'Momento Decisivo': [
            ['decisão', 3], ['escolha', 3], ['definição', 3], ['aprovação', 3],
            ['milestone', 2], ['deadline', 2], ['prioridade', 2], ['estratégia', 2],
            ['planejamento', 2], ['roadmap', 2], ['objetivo', 2]
        ],
        'Insight Estratégico': [
            ['insight', 3], ['descoberta', 3], ['realização', 3], ['eureka', 3],
            ['transformação', 2], ['breakthrough', 2], ['inovação', 2], ['revolução', 2],
            ['mudança', 2], ['pivot', 2], ['oportunidade', 2]
        ]
    };
    
    // Calcular scores
    for (const [type, typeKeywords] of Object.entries(keywords)) {
        for (const [keyword, weight] of typeKeywords) {
            if (combined.includes(keyword)) {
                scores[type] += weight;
            }
        }
    }
    
    // Se tem categorias, dar peso a elas também
    if (file.categories && file.categories.length > 0) {
        file.categories.forEach(cat => {
            const catName = cat.toLowerCase();
            if (catName.includes('técnic') || catName.includes('tech')) {
                scores['Breakthrough Técnico'] += 5;
            } else if (catName.includes('conceito') || catName.includes('teor')) {
                scores['Evolução Conceitual'] += 5;
            } else if (catName.includes('decisão') || catName.includes('estratég')) {
                scores['Momento Decisivo'] += 5;
            } else if (catName.includes('insight') || catName.includes('descob')) {
                scores['Insight Estratégico'] += 5;
            }
        });
    }
    
    // Encontrar tipo com maior score
    let bestType = 'Aprendizado Geral';
    let bestScore = scores['Aprendizado Geral'];
    
    for (const [type, score] of Object.entries(scores)) {
        if (score > bestScore) {
            bestScore = score;
            bestType = type;
        }
    }
    
    // Se nenhum score significativo, manter como Aprendizado Geral
    if (bestScore < 3) {
        bestType = 'Aprendizado Geral';
    }
    
    console.log(`[detectAnalysisType] ${file.name}: ${bestType} (score=${bestScore})`);
    
    return bestType;
};

console.log('✅ detectAnalysisType melhorado!');

// Verificar se Qdrant está populado
if (KC.QdrantService) {
    KC.QdrantService.getCollectionStats().then(stats => {
        console.log('\n📊 Status do Qdrant:');
        console.log(`Pontos no Qdrant: ${stats.vectors_count}`);
        console.log(`Pontos indexados: ${stats.indexed_vectors_count}`);
        
        if (stats.vectors_count === 0) {
            console.log('\n⚠️ ATENÇÃO: Qdrant está vazio!');
            console.log('Execute o pipeline de processamento na Etapa 4 primeiro.');
        }
    });
}

console.log('\n\n💡 PRÓXIMOS PASSOS:');
console.log('1. Recarregue a página para aplicar as correções');
console.log('2. Teste analisar um arquivo sem categorias');
console.log('3. Adicione categorias e analise novamente');
console.log('4. A relevância não deve mais saltar para 100%');
console.log('5. O tipo de análise deve ser mais preciso');