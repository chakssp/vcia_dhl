// Teste de convergência com dados reais
const fs = require('fs');
const path = require('path');

// Simular o paradigma de convergência
function testarConvergencia() {
    console.log('=== TESTE DE CONVERGÊNCIA COM DADOS REAIS ===\n');
    
    // 1. Carregar arquivos da pasta docs
    const docsPath = './docs';
    const files = [];
    
    function scanDir(dir) {
        const items = fs.readdirSync(dir);
        items.forEach(item => {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            if (stat.isFile() && item.endsWith('.md')) {
                files.push({
                    path: fullPath,
                    name: item,
                    content: fs.readFileSync(fullPath, 'utf8').substring(0, 500)
                });
            } else if (stat.isDirectory()) {
                scanDir(fullPath);
            }
        });
    }
    
    scanDir(docsPath);
    console.log('📁 Arquivos encontrados: ' + files.length + '\n');
    
    // 2. Aplicar paradigma de convergência
    const intencao = "melhorias de performance do sistema";
    
    console.log('🎯 Intenção: "' + intencao + '"\n');
    
    // Decomposição em dimensões
    const dimensoes = {
        keywords: ['performance', 'otimização', 'melhoria', 'velocidade', 'cache', 'memory'],
        categorias: ['arquitetura', 'bugs', 'melhorias', 'correcao'],
        temporal: 'últimos 30 dias',
        tipoAnalise: 'técnico'
    };
    
    console.log('📊 Dimensões extraídas:');
    console.log(JSON.stringify(dimensoes, null, 2));
    
    // 3. Calcular convergência
    const convergencias = [];
    
    files.forEach(file => {
        let score = 0;
        
        // Check keywords
        dimensoes.keywords.forEach(keyword => {
            if (file.content.toLowerCase().includes(keyword)) {
                score += 25;
            }
        });
        
        // Check categorias no path
        dimensoes.categorias.forEach(cat => {
            if (file.path.toLowerCase().includes(cat)) {
                score += 25;
            }
        });
        
        if (score > 50) {
            convergencias.push({
                arquivo: file.name,
                score: score,
                evidencia: file.path
            });
        }
    });
    
    // Ordenar por score
    convergencias.sort((a, b) => b.score - a.score);
    
    console.log('\n🎯 CONVERGÊNCIAS ENCONTRADAS:');
    console.log('De ' + files.length + ' arquivos → ' + convergencias.length + ' convergências\n');
    
    convergencias.slice(0, 5).forEach((conv, idx) => {
        console.log((idx + 1) + '. ' + conv.arquivo + ' (Score: ' + conv.score + '%)');
        console.log('   Evidência: ' + conv.evidencia);
    });
    
    // Resultado final
    console.log('\n✅ REDUÇÃO DE COMPLEXIDADE: ' + 
        Math.round((1 - convergencias.length/files.length) * 100) + '%');
}

testarConvergencia();