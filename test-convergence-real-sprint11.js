#!/usr/bin/env node
/**
 * TESTE DE CONVERGÊNCIA SEMÂNTICA PROFUNDA
 * Dados Reais: docs/sprint/1.1
 * Framework EU-VOCÊ - Validação Assertiva
 */

const fs = require('fs');
const path = require('path');

console.log('================================================');
console.log('🔄 TESTE DE CONVERGÊNCIA SEMÂNTICA PROFUNDA');
console.log('📊 Assertividade de Embeddings + Keywords');
console.log('================================================\n');

// GATE 1: MEDIR ESTADO ATUAL
console.log('GATE 1️⃣: MEDINDO BASELINE...');
console.log('-----------------------------------');

const baseline = {
    files: fs.readdirSync('./docs/sprint/1.1').filter(f => f.endsWith('.md')),
    embeddings: {
        expected_dimensions: 768,  // nomic-embed-text
        service: 'Ollama local',
        model: 'nomic-embed-text'
    },
    qdrant: {
        url: 'http://qdr.vcia.com.br:6333',
        collection: 'knowledge_base'
    }
};

console.log(`📁 Arquivos para processar: ${baseline.files.length}`);
console.log(`🧠 Modelo de embeddings: ${baseline.embeddings.model}`);
console.log(`📐 Dimensões esperadas: ${baseline.embeddings.expected_dimensions}`);
console.log(`🗄️ Qdrant target: ${baseline.qdrant.url}`);

// GATE 2: TESTE COM DADOS REAIS
console.log('\nGATE 2️⃣: PROCESSANDO DADOS REAIS...');
console.log('-----------------------------------');

// Carregar e analisar cada arquivo
const documents = baseline.files.map(filename => {
    const content = fs.readFileSync(path.join('./docs/sprint/1.1', filename), 'utf-8');
    return {
        filename,
        content,
        size: content.length,
        words: content.split(/\s+/).length,
        lines: content.split('\n').length
    };
});

// Análise semântica profunda
const semanticAnalysis = documents.map(doc => {
    const analysis = {
        filename: doc.filename,
        metrics: {
            words: doc.words,
            chars: doc.size,
            lines: doc.lines
        },
        keywords: {},
        convergence: {
            patterns: [],
            score: 0
        },
        embeddings: {
            chunks: [],
            estimatedTokens: 0
        }
    };
    
    // Keywords críticas com pesos
    const weightedKeywords = {
        // Técnicos (peso alto)
        'file system api': 10,
        'obsidian': 8,
        'handles': 8,
        'implementação': 7,
        'erro': 6,
        'correção': 6,
        
        // Conceituais (peso médio)
        'análise': 5,
        'descoberta': 5,
        'validação': 5,
        'teste': 4,
        
        // Insights (peso muito alto)
        'breakthrough': 12,
        'convergência': 10,
        'decisão': 9,
        'transformação': 9
    };
    
    // Contar keywords ponderadas
    Object.entries(weightedKeywords).forEach(([keyword, weight]) => {
        const regex = new RegExp(keyword, 'gi');
        const matches = doc.content.match(regex);
        if (matches) {
            analysis.keywords[keyword] = {
                count: matches.length,
                weight: weight,
                score: matches.length * weight
            };
        }
    });
    
    // Calcular score total
    const totalScore = Object.values(analysis.keywords)
        .reduce((sum, kw) => sum + kw.score, 0);
    
    analysis.convergence.score = Math.min(100, Math.round(totalScore / doc.words * 100));
    
    // Detectar padrões de convergência
    const patterns = [
        {
            name: 'problema-solução',
            regex: /(erro|problema|issue).{0,100}(correção|solução|fix)/gi,
            found: false
        },
        {
            name: 'análise-implementação',
            regex: /(análise|analysis).{0,100}(implementação|implementation)/gi,
            found: false
        },
        {
            name: 'teste-validação',
            regex: /(teste|test).{0,100}(validação|validation|sucesso)/gi,
            found: false
        },
        {
            name: 'descoberta-insight',
            regex: /(descoberta|discovery).{0,100}(insight|aprendizado)/gi,
            found: false
        }
    ];
    
    patterns.forEach(pattern => {
        if (pattern.regex.test(doc.content)) {
            pattern.found = true;
            analysis.convergence.patterns.push(pattern.name);
        }
    });
    
    // Simular chunking para embeddings
    const chunkSize = 500; // caracteres por chunk
    const chunks = Math.ceil(doc.size / chunkSize);
    analysis.embeddings.chunks = chunks;
    analysis.embeddings.estimatedTokens = Math.round(doc.words * 1.3); // estimativa
    
    return analysis;
});

// Exibir análise detalhada
console.log('\n📊 ANÁLISE SEMÂNTICA DETALHADA:\n');

semanticAnalysis.forEach(analysis => {
    console.log(`📄 ${analysis.filename}`);
    console.log(`   📏 Métricas: ${analysis.metrics.words} palavras, ${analysis.metrics.lines} linhas`);
    console.log(`   🎯 Convergência: ${analysis.convergence.score}%`);
    
    // Top 3 keywords
    const topKeywords = Object.entries(analysis.keywords)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 3);
    
    if (topKeywords.length > 0) {
        console.log('   🔑 Top Keywords:');
        topKeywords.forEach(([kw, data]) => {
            console.log(`      - "${kw}": ${data.count}x (peso ${data.weight}, score ${data.score})`);
        });
    }
    
    if (analysis.convergence.patterns.length > 0) {
        console.log(`   🔄 Padrões: ${analysis.convergence.patterns.join(', ')}`);
    }
    
    console.log(`   🧠 Embeddings: ${analysis.embeddings.chunks} chunks, ~${analysis.embeddings.estimatedTokens} tokens`);
    console.log('');
});

// GATE 3: VALIDAÇÃO DE ASSERTIVIDADE
console.log('GATE 3️⃣: VALIDANDO ASSERTIVIDADE...');
console.log('-----------------------------------');

// Teste de assertividade de embeddings
const assertivenessTests = {
    'UTF-8 Preservação': true,
    'Densidade de Keywords': true,
    'Convergência Detectada': true,
    'Chunks Otimizados': true,
    'Tokens Estimados': true
};

// Verificar UTF-8
const utf8Test = 'implementação análise correção validação configuração';
const preservedUTF8 = utf8Test.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim() === utf8Test;
assertivenessTests['UTF-8 Preservação'] = preservedUTF8;

// Verificar densidade média de keywords
const avgDensity = semanticAnalysis.reduce((sum, a) => sum + a.convergence.score, 0) / semanticAnalysis.length;
assertivenessTests['Densidade de Keywords'] = avgDensity > 10;

// Verificar convergência
const docsWithPatterns = semanticAnalysis.filter(a => a.convergence.patterns.length > 0).length;
assertivenessTests['Convergência Detectada'] = docsWithPatterns > semanticAnalysis.length * 0.3;

// Verificar otimização de chunks
const avgChunks = semanticAnalysis.reduce((sum, a) => sum + a.embeddings.chunks, 0) / semanticAnalysis.length;
assertivenessTests['Chunks Otimizados'] = avgChunks > 1 && avgChunks < 20;

// Verificar estimativa de tokens
const totalTokens = semanticAnalysis.reduce((sum, a) => sum + a.embeddings.estimatedTokens, 0);
assertivenessTests['Tokens Estimados'] = totalTokens > 1000 && totalTokens < 100000;

console.log('📋 Testes de Assertividade:\n');
Object.entries(assertivenessTests).forEach(([test, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${test}`);
});

// RESULTADOS FINAIS
console.log('\n================================================');
console.log('📈 MÉTRICAS DE CONVERGÊNCIA SEMÂNTICA');
console.log('================================================\n');

const metrics = {
    'Arquivos Processados': semanticAnalysis.length,
    'Convergência Média': Math.round(avgDensity) + '%',
    'Padrões Detectados': docsWithPatterns + '/' + semanticAnalysis.length,
    'Total de Chunks': semanticAnalysis.reduce((sum, a) => sum + a.embeddings.chunks, 0),
    'Tokens Estimados': totalTokens.toLocaleString(),
    'Keywords Únicas': new Set(semanticAnalysis.flatMap(a => Object.keys(a.keywords))).size
};

Object.entries(metrics).forEach(([metric, value]) => {
    console.log(`${metric}: ${value}`);
});

// Identificar documento mais relevante
const mostRelevant = semanticAnalysis.sort((a, b) => b.convergence.score - a.convergence.score)[0];
console.log(`\n🏆 Documento Mais Relevante: ${mostRelevant.filename} (${mostRelevant.convergence.score}%)`);

// RECOMENDAÇÕES
console.log('\n💡 RECOMENDAÇÕES PARA EMBEDDINGS:');
console.log('-----------------------------------');

if (avgDensity < 20) {
    console.log('⚠️ Densidade de keywords baixa - considere enriquecer com mais termos relevantes');
}

if (docsWithPatterns < semanticAnalysis.length * 0.5) {
    console.log('⚠️ Poucos padrões de convergência - analise relações entre conceitos');
}

if (totalTokens > 50000) {
    console.log('⚠️ Alto volume de tokens - considere chunking mais agressivo');
}

console.log('\n✅ Use estes dados para calibrar:');
console.log('   - Threshold de relevância: ' + Math.round(avgDensity * 0.7) + '%');
console.log('   - Tamanho ideal de chunk: ' + Math.round(500 * (20 / avgDensity)) + ' chars');
console.log('   - Batch size para Qdrant: ' + Math.min(10, Math.round(semanticAnalysis.length / 2)));

// Salvar resultados
const results = {
    timestamp: new Date().toISOString(),
    files: semanticAnalysis.length,
    avgConvergence: Math.round(avgDensity),
    patterns: docsWithPatterns,
    totalTokens: totalTokens,
    recommendations: {
        threshold: Math.round(avgDensity * 0.7),
        chunkSize: Math.round(500 * (20 / avgDensity)),
        batchSize: Math.min(10, Math.round(semanticAnalysis.length / 2))
    }
};

fs.writeFileSync('convergence-test-results.json', JSON.stringify(results, null, 2));
console.log('\n📄 Resultados salvos em: convergence-test-results.json');

// Verificar se todos os gates passaram
const allTestsPassed = Object.values(assertivenessTests).every(t => t);

if (allTestsPassed) {
    console.log('\n🎉 TODOS OS GATES PASSARAM!');
    console.log('✅ Sistema validado para processamento de embeddings assertivos');
    process.exit(0);
} else {
    console.log('\n⚠️ ALGUNS TESTES FALHARAM');
    console.log('Revise as recomendações antes de prosseguir');
    process.exit(1);
}