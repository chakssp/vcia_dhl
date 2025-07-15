// Debug script para verificar o sistema de tipo de análise

console.log('=== DEBUG TIPO DE ANÁLISE ===');

// 1. Verificar se os métodos existem
console.log('1. Métodos disponíveis:');
console.log('   - FileRenderer existe?', !!KC.FileRenderer);
console.log('   - detectAnalysisType existe?', !!(KC.FileRenderer && KC.FileRenderer.detectAnalysisType));
console.log('   - calculateEnhancedRelevance existe?', !!(KC.FileRenderer && KC.FileRenderer.calculateEnhancedRelevance));

// 2. Testar detecção de tipo com arquivo simulado
console.log('\n2. Teste de detecção de tipo:');
const testFiles = [
    { name: 'decisao-importante.md', content: 'Esta foi uma decisão crucial para o projeto' },
    { name: 'solucao-tecnica.md', content: 'Encontrei uma solução para o problema de performance' },
    { name: 'insights.md', content: 'Tive um insight importante sobre a arquitetura' },
    { name: 'notas.md', content: 'Algumas notas gerais sobre o projeto' }
];

if (KC.FileRenderer && KC.FileRenderer.detectAnalysisType) {
    testFiles.forEach(file => {
        // Precisa vincular o contexto correto
        const type = KC.FileRenderer.detectAnalysisType.call(KC.FileRenderer, file);
        console.log(`   - ${file.name}: "${type}"`);
    });
}

// 3. Verificar arquivos no AppState
console.log('\n3. Arquivos no AppState:');
const files = KC.AppState.get('files') || [];
console.log(`   - Total de arquivos: ${files.length}`);
console.log('   - Arquivos com analysisType:');
files.forEach((file, index) => {
    if (file.analysisType) {
        console.log(`     [${index}] ${file.name}: ${file.analysisType} (Relevância: ${file.relevanceScore})`);
    }
});

// 4. Verificar se o handle está sendo preservado
console.log('\n4. Verificação de handles:');
const filesWithHandle = files.filter(f => f.handle);
console.log(`   - Arquivos com handle: ${filesWithHandle.length}/${files.length}`);

// 5. Testar análise manual
console.log('\n5. Para testar manualmente:');
console.log('   - Execute: KC.FileRenderer.files[0]');
console.log('   - Clique em "Analisar com IA" em qualquer arquivo');
console.log('   - Verifique o console para mensagens de erro');

console.log('\n=== FIM DO DEBUG ===');