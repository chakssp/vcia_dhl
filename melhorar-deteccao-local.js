// Script para melhorar a detecção local de tipos
function melhorarDeteccaoLocal() {
    console.log('=== MELHORANDO DETECÇÃO LOCAL ===\n');
    
    // Palavras-chave expandidas baseadas no PRD
    const triggersExpandidos = {
        'Breakthrough Técnico': [
            // Originais
            'solução', 'configuração', 'arquitetura',
            // Novos
            'implementa', 'código', 'api', 'framework', 'algoritmo', 'sistema',
            'técnica', 'desenvolvimento', 'programação', 'software', 'stack',
            'deploy', 'docker', 'kubernetes', 'cloud', 'aws', 'azure',
            'frontend', 'backend', 'fullstack', 'database', 'sql', 'nosql',
            'performance', 'otimização', 'refactor', 'debug', 'test',
            'ci/cd', 'devops', 'git', 'pipeline', 'build', 'automated'
        ],
        'Evolução Conceitual': [
            // Originais
            'entendimento', 'perspectiva', 'visão',
            // Novos
            'conceito', 'teoria', 'paradigma', 'modelo', 'framework conceitual',
            'evolução', 'transformação', 'mudança', 'aprendizado', 'conhecimento',
            'compreensão', 'insight conceitual', 'abstração', 'generalização',
            'pattern', 'princípio', 'fundamento', 'base teórica'
        ],
        'Momento Decisivo': [
            // Originais
            'decisão', 'escolha', 'direção',
            // Novos
            'decisivo', 'crítico', 'turning point', 'marco', 'milestone',
            'definir', 'determinar', 'optar', 'selecionar', 'priorizar',
            'estratégia', 'rumo', 'caminho', 'alternativa', 'trade-off',
            'consequência', 'impacto', 'resultado', 'definição'
        ],
        'Insight Estratégico': [
            // Originais
            'insight', 'transformação', 'breakthrough',
            // Novos
            'estratégico', 'estratégia', 'planejamento', 'roadmap', 'visão estratégica',
            'objetivo', 'meta', 'kpi', 'okr', 'business', 'negócio',
            'mercado', 'competitivo', 'vantagem', 'oportunidade', 'tendência',
            'análise', 'diagnóstico', 'prognóstico', 'cenário', 'futuro'
        ]
    };
    
    // Código melhorado para FileRenderer.detectAnalysisType
    const codigoMelhorado = `
detectAnalysisType(file) {
    const fileName = (file.name || '').toLowerCase();
    const content = (file.content || file.preview || '').toLowerCase();
    const combined = fileName + ' ' + content;
    
    // Contadores de matches por tipo
    const scores = {
        'Breakthrough Técnico': 0,
        'Evolução Conceitual': 0,
        'Momento Decisivo': 0,
        'Insight Estratégico': 0,
        'Aprendizado Geral': 0
    };
    
    // Triggers expandidos do PRD
    const triggers = ${JSON.stringify(triggersExpandidos, null, 4)};
    
    // Calcular scores baseado em matches
    for (const [tipo, palavras] of Object.entries(triggers)) {
        palavras.forEach(palavra => {
            if (combined.includes(palavra.toLowerCase())) {
                scores[tipo]++;
            }
        });
    }
    
    // Adicionar contexto do nome do arquivo
    if (fileName.includes('.md') || fileName.includes('.txt')) {
        if (fileName.includes('plan') || fileName.includes('strategy')) {
            scores['Insight Estratégico'] += 2;
        }
        if (fileName.includes('code') || fileName.includes('api') || fileName.includes('tech')) {
            scores['Breakthrough Técnico'] += 2;
        }
    }
    
    // Encontrar tipo com maior score
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

    console.log('CÓDIGO MELHORADO PARA detectAnalysisType:\n');
    console.log(codigoMelhorado);
    
    console.log('\n\nPARA APLICAR:');
    console.log('1. Edite FileRenderer.js');
    console.log('2. Substitua o método detectAnalysisType (linha ~1597)');
    console.log('3. Teste com arquivos novos');
    
    // Testar com alguns exemplos
    console.log('\n\nTESTES COM A LÓGICA MELHORADA:');
    
    const exemplos = [
        { name: 'api-design.md', content: 'Definindo a arquitetura da nova API REST' },
        { name: 'strategy-2025.txt', content: 'Planejamento estratégico para expansão' },
        { name: 'decision-log.md', content: 'Decisão crítica sobre escolha de framework' },
        { name: 'learning-notes.txt', content: 'Anotações gerais sobre o projeto' }
    ];
    
    exemplos.forEach(ex => {
        console.log(`\n"${ex.name}": "${ex.content}"`);
        
        // Simular detecção
        const combined = (ex.name + ' ' + ex.content).toLowerCase();
        let tipo = 'Aprendizado Geral';
        
        if (combined.includes('api') || combined.includes('arquitetura')) {
            tipo = 'Breakthrough Técnico';
        } else if (combined.includes('estratégico') || combined.includes('planejamento')) {
            tipo = 'Insight Estratégico';
        } else if (combined.includes('decisão') || combined.includes('crítica')) {
            tipo = 'Momento Decisivo';
        }
        
        console.log(`→ Tipo detectado: ${tipo}`);
    });
}

melhorarDeteccaoLocal();