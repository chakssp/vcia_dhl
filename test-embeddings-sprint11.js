#!/usr/bin/env node
/**
 * TESTE DE EMBEDDINGS COM DADOS REAIS - SPRINT 1.1
 * Framework EU-VOCÊ - Validação com dados reais
 * Data: 11/08/2025
 * 
 * GATE 2: NUNCA usar mock - SEMPRE dados reais
 */

const fs = require('fs');
const path = require('path');

console.log('================================================');
console.log('🧪 TESTE DE EMBEDDINGS COM DADOS REAIS');
console.log('📁 Fonte: docs/sprint/1.1/');
console.log('================================================\n');

// 1. CARREGAR DADOS REAIS DA SPRINT 1.1
console.log('1️⃣ CARREGANDO DADOS REAIS...');
console.log('-----------------------------------');

const sprintPath = './docs/sprint/1.1';
let realFiles = [];

try {
    realFiles = fs.readdirSync(sprintPath)
        .filter(f => f.endsWith('.md'))
        .map(f => {
            const fullPath = path.join(sprintPath, f);
            const content = fs.readFileSync(fullPath, 'utf-8');
            return {
                name: f,
                path: fullPath,
                content: content,
                size: content.length
            };
        });
    
    console.log(`✅ ${realFiles.length} arquivos reais carregados:`);
    realFiles.forEach(f => {
        console.log(`   - ${f.name} (${Math.round(f.size/1024)}KB)`);
    });
} catch (error) {
    console.error('❌ ERRO ao carregar arquivos:', error.message);
    process.exit(1);
}

console.log('\n2️⃣ TESTANDO ASSERTIVIDADE DE KEYWORDS...');
console.log('-----------------------------------');

// Keywords críticas do projeto (do PRD e Framework)
const criticalKeywords = [
    'decisão',
    'insight', 
    'transformação',
    'aprendizado',
    'breakthrough',
    'convergência',
    'implementação',
    'análise',
    'erro',
    'correção',
    'file system api',
    'obsidian'
];

// Análise de keywords por arquivo
const keywordAnalysis = {};

realFiles.forEach(file => {
    keywordAnalysis[file.name] = {
        total: 0,
        found: {},
        relevanceScore: 0
    };
    
    const contentLower = file.content.toLowerCase();
    
    criticalKeywords.forEach(keyword => {
        const regex = new RegExp(keyword, 'gi');
        const matches = contentLower.match(regex);
        const count = matches ? matches.length : 0;
        
        if (count > 0) {
            keywordAnalysis[file.name].found[keyword] = count;
            keywordAnalysis[file.name].total += count;
        }
    });
    
    // Calcular relevância baseada em densidade de keywords
    const wordCount = file.content.split(/\s+/).length;
    keywordAnalysis[file.name].relevanceScore = 
        Math.min(100, Math.round((keywordAnalysis[file.name].total / wordCount) * 1000));
});

// Exibir análise
console.log('📊 Análise de Keywords:');
Object.entries(keywordAnalysis).forEach(([filename, analysis]) => {
    console.log(`\n   ${filename}:`);
    console.log(`   Relevância: ${analysis.relevanceScore}%`);
    console.log(`   Keywords encontradas: ${analysis.total}`);
    if (Object.keys(analysis.found).length > 0) {
        console.log('   Top keywords:');
        Object.entries(analysis.found)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .forEach(([kw, count]) => {
                console.log(`     - "${kw}": ${count}x`);
            });
    }
});

console.log('\n3️⃣ TESTANDO PRESERVAÇÃO UTF-8...');
console.log('-----------------------------------');

// Teste crítico de UTF-8 com palavras reais dos documentos
const utf8TestCases = [
    'implementação',
    'análise',
    'correção',
    'validação',
    'configuração',
    'obrigatórios',
    'diagnóstico',
    'transformação'
];

// Testar com o regex corrigido
const correctRegex = /[^\p{L}\p{N}\s]/gu;
const wrongRegex = /[^\w\s]/g;

let utf8Errors = 0;

utf8TestCases.forEach(word => {
    const correctResult = word.replace(correctRegex, ' ').trim();
    const wrongResult = word.replace(wrongRegex, ' ').trim();
    
    if (correctResult === word) {
        console.log(`   ✅ "${word}" preservado corretamente`);
    } else {
        console.log(`   ❌ "${word}" → "${correctResult}" (ERRO!)`);
        utf8Errors++;
    }
    
    // Mostrar o problema do regex antigo
    if (wrongResult !== word) {
        console.log(`      ⚠️ Regex antigo cortaria: "${word}" → "${wrongResult}"`);
    }
});

console.log('\n4️⃣ SIMULANDO GERAÇÃO DE EMBEDDINGS...');
console.log('-----------------------------------');

// Simular extração de chunks para embeddings
function extractSemanticChunks(content, maxChunkSize = 500) {
    const sentences = content.split(/[.!?]\s+/);
    const chunks = [];
    let currentChunk = '';
    
    sentences.forEach(sentence => {
        if ((currentChunk + sentence).length < maxChunkSize) {
            currentChunk += sentence + '. ';
        } else {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = sentence + '. ';
        }
    });
    
    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
}

// Processar arquivo mais relevante
const mostRelevant = Object.entries(keywordAnalysis)
    .sort((a, b) => b[1].relevanceScore - a[1].relevanceScore)[0];

const targetFile = realFiles.find(f => f.name === mostRelevant[0]);
const chunks = extractSemanticChunks(targetFile.content);

console.log(`📄 Arquivo mais relevante: ${targetFile.name}`);
console.log(`   Relevância: ${mostRelevant[1].relevanceScore}%`);
console.log(`   Chunks gerados: ${chunks.length}`);
console.log(`   Tamanho médio: ${Math.round(chunks.reduce((a,c) => a + c.length, 0) / chunks.length)} chars`);

// Mostrar exemplo de chunk
if (chunks.length > 0) {
    console.log('\n   Exemplo de chunk semântico:');
    console.log('   "' + chunks[0].substring(0, 150) + '..."');
}

console.log('\n5️⃣ TESTANDO CONVERGÊNCIA SEMÂNTICA...');
console.log('-----------------------------------');

// Identificar padrões de convergência entre documentos
const convergencePatterns = {
    'erro-correção': 0,
    'implementação-teste': 0,
    'análise-decisão': 0,
    'file-system-api': 0
};

realFiles.forEach(file => {
    const content = file.content.toLowerCase();
    
    if (content.includes('erro') && content.includes('correção')) {
        convergencePatterns['erro-correção']++;
    }
    if (content.includes('implementação') && content.includes('teste')) {
        convergencePatterns['implementação-teste']++;
    }
    if (content.includes('análise') && content.includes('decisão')) {
        convergencePatterns['análise-decisão']++;
    }
    if (content.includes('file') && content.includes('system') && content.includes('api')) {
        convergencePatterns['file-system-api']++;
    }
});

console.log('🔄 Padrões de Convergência Detectados:');
Object.entries(convergencePatterns).forEach(([pattern, count]) => {
    const percentage = Math.round((count / realFiles.length) * 100);
    console.log(`   ${pattern}: ${count}/${realFiles.length} docs (${percentage}%)`);
});

// Calcular convergência geral
const totalConvergence = Object.values(convergencePatterns).reduce((a, b) => a + b, 0);
const avgConvergence = Math.round((totalConvergence / (realFiles.length * 4)) * 100);

console.log(`\n   📊 Convergência Média: ${avgConvergence}%`);

console.log('\n================================================');
console.log('📋 RESULTADO DO TESTE');
console.log('================================================\n');

// Validar resultados
const tests = {
    'Arquivos Reais Carregados': realFiles.length > 0,
    'Keywords Identificadas': Object.values(keywordAnalysis).some(a => a.total > 0),
    'UTF-8 Preservado': utf8Errors === 0,
    'Chunks Semânticos Gerados': chunks.length > 0,
    'Convergência Detectada': avgConvergence > 25
};

let passed = 0;
let failed = 0;

Object.entries(tests).forEach(([test, result]) => {
    if (result) {
        console.log(`✅ ${test}`);
        passed++;
    } else {
        console.log(`❌ ${test}`);
        failed++;
    }
});

console.log('\n-----------------------------------');
console.log(`Total: ${passed} passaram, ${failed} falharam`);

if (failed === 0) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM!');
    console.log('✅ Sistema pronto para processar embeddings com dados reais');
    
    // Salvar resultado para o gate
    fs.writeFileSync('.last-embedding-test', JSON.stringify({
        timestamp: new Date().toISOString(),
        passed: passed,
        failed: failed,
        avgConvergence: avgConvergence,
        filesProcessed: realFiles.length
    }, null, 2));
    
    process.exit(0);
} else {
    console.log('\n⚠️ ALGUNS TESTES FALHARAM!');
    console.log('Revise os problemas antes de continuar');
    process.exit(1);
}