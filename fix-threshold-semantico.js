// Script para corrigir o threshold semântico e melhorar a detecção
async function fixThresholdSemantico() {
    console.log('=== CORRIGINDO THRESHOLD SEMÂNTICO ===\n');
    
    try {
        // 1. Primeiro, vamos testar qual threshold funciona melhor
        console.log('1. TESTANDO THRESHOLDS COM ARQUIVO DE EXEMPLO\n');
        
        // Pegar um arquivo para teste
        const files = KC.AppState.get('files') || [];
        const arquivo = files.find(f => !f.analyzed) || files[0];
        
        if (!arquivo) {
            console.log('❌ Nenhum arquivo encontrado para teste');
            return;
        }
        
        console.log(`Arquivo teste: ${arquivo.name}`);
        const texto = arquivo.content || arquivo.preview || arquivo.name;
        
        // Gerar embedding
        const embedding = await KC.EmbeddingService.generateEmbedding(texto);
        console.log(`Embedding gerado: ${embedding.length} dimensões\n`);
        
        // Testar diferentes thresholds
        const thresholds = [0.7, 0.6, 0.5, 0.4, 0.3];
        let melhorThreshold = 0.7;
        
        for (const threshold of thresholds) {
            const results = await KC.QdrantService.search(embedding, {
                limit: 5,
                scoreThreshold: threshold
            });
            
            console.log(`Threshold ${threshold}: ${results.length} resultados`);
            
            if (results.length > 0 && results.length <= 10) {
                melhorThreshold = threshold;
                console.log(`✅ Threshold ideal encontrado: ${threshold}`);
                
                // Mostrar exemplos
                results.slice(0, 3).forEach((r, i) => {
                    console.log(`  ${i+1}. ${r.payload?.fileName} (score: ${r.score.toFixed(3)})`);
                    console.log(`     Tipo: ${r.payload?.metadata?.analysisType}`);
                });
                break;
            }
        }
        
        // 2. Criar arquivo de correção para FileRenderer
        console.log('\n2. GERANDO CORREÇÃO PARA FileRenderer.js\n');
        
        const correcao = `
// Correção do threshold semântico no FileRenderer.js
// Localizar a linha 724 e alterar:

// DE:
scoreThreshold: 0.7

// PARA:
scoreThreshold: ${melhorThreshold}

// Adicionalmente, melhorar o log para debug:
console.log(\`🔍 Buscando similares no Qdrant com threshold: ${melhorThreshold}...\`);`;

        console.log(correcao);
        
        // 3. Melhorar também a detecção local como fallback
        console.log('\n3. MELHORANDO DETECÇÃO LOCAL (fallback)\n');
        
        const detectAnalysisTypeImproved = `
detectAnalysisType(file) {
    const fileName = (file.name || '').toLowerCase();
    const content = (file.content || file.preview || '').toLowerCase();
    const combined = fileName + ' ' + content;
    
    // Triggers expandidos e melhorados
    const triggers = {
        'Breakthrough Técnico': [
            'solução', 'configuração', 'arquitetura', 'código', 'api', 
            'framework', 'algoritmo', 'sistema', 'técnica', 'desenvolvimento',
            'programação', 'software', 'implementa', 'deploy', 'docker',
            'kubernetes', 'cloud', 'aws', 'azure', 'frontend', 'backend'
        ],
        'Evolução Conceitual': [
            'entendimento', 'perspectiva', 'visão', 'conceito', 'teoria',
            'paradigma', 'modelo', 'evolução', 'transformação', 'mudança',
            'aprendizado', 'conhecimento', 'compreensão', 'insight conceitual'
        ],
        'Momento Decisivo': [
            'decisão', 'escolha', 'direção', 'decisivo', 'crítico',
            'turning point', 'marco', 'milestone', 'definir', 'determinar',
            'optar', 'selecionar', 'priorizar', 'estratégia', 'rumo'
        ],
        'Insight Estratégico': [
            'insight', 'transformação', 'breakthrough', 'estratégico',
            'estratégia', 'planejamento', 'roadmap', 'objetivo', 'meta',
            'business', 'negócio', 'mercado', 'oportunidade', 'análise'
        ]
    };
    
    // Calcular scores
    const scores = {};
    for (const [tipo, palavras] of Object.entries(triggers)) {
        scores[tipo] = 0;
        palavras.forEach(palavra => {
            if (combined.includes(palavra)) {
                scores[tipo]++;
            }
        });
    }
    
    // Encontrar melhor tipo
    let melhorTipo = 'Aprendizado Geral';
    let melhorScore = 0;
    
    for (const [tipo, score] of Object.entries(scores)) {
        if (score > melhorScore) {
            melhorScore = score;
            melhorTipo = tipo;
        }
    }
    
    // Log para debug
    if (melhorScore > 0) {
        console.log(\`📊 Detecção local: \${melhorTipo} (score: \${melhorScore})\`);
    }
    
    return melhorTipo;
}`;

        console.log('Método detectAnalysisType melhorado (copiar para FileRenderer.js):\n');
        console.log(detectAnalysisTypeImproved);
        
        // 4. Testar a correção
        console.log('\n4. PARA APLICAR AS CORREÇÕES:\n');
        console.log('a) Edite js/components/FileRenderer.js');
        console.log(`b) Na linha 724, mude scoreThreshold de 0.7 para ${melhorThreshold}`);
        console.log('c) Substitua o método detectAnalysisType (linha ~1597) pelo código melhorado acima');
        console.log('d) Salve e recarregue a página');
        console.log('e) Teste analisando novos arquivos');
        
        // 5. Verificar estado atual do Qdrant
        console.log('\n5. ESTADO ATUAL DO QDRANT:\n');
        const stats = await KC.QdrantService.getCollectionStats();
        console.log(`Total de pontos: ${stats.vectors_count}`);
        console.log(`Status: ${stats.status}`);
        
        // Buscar alguns exemplos
        const exemplos = await KC.QdrantService.scroll({ limit: 5 });
        console.log('\nExemplos de dados no Qdrant:');
        exemplos.points.forEach((p, i) => {
            console.log(`${i+1}. ${p.payload?.fileName}`);
            console.log(`   Tipo: ${p.payload?.metadata?.analysisType}`);
            console.log(`   Categorias: ${(p.payload?.metadata?.categories || []).join(', ')}`);
        });
        
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

// Executar
fixThresholdSemantico();