// Debug dos filtros em produção
console.log('=== DEBUG FILTROS PRODUÇÃO ===');

// 1. Verificar estado dos filtros
console.log('1. Estado dos filtros:');
console.log('Relevância:', KC.FilterManager.filters.relevance);
console.log('Status:', KC.FilterManager.filters.status);

// 2. Simular clique em "Média Relevância"
console.log('\n2. Simulando clique em Média Relevância...');
KC.FilterManager.activateFilter('medium');

// 3. Verificar estado após ativação
console.log('\n3. Estado após ativação:');
console.log('Relevância ativa:', Object.entries(KC.FilterManager.filters.relevance).find(([k,v]) => v.active));
console.log('Status ativo:', Object.entries(KC.FilterManager.filters.status).find(([k,v]) => v.active));

// 4. Verificar arquivos filtrados
setTimeout(() => {
    console.log('\n4. Arquivos filtrados:');
    console.log('Total original:', KC.FileRenderer.files.length);
    console.log('Total filtrado:', KC.FileRenderer.filteredFiles.length);
    
    // Mostra relevância dos primeiros 5 arquivos filtrados
    console.log('\nPrimeiros 5 arquivos filtrados:');
    KC.FileRenderer.filteredFiles.slice(0, 5).forEach(file => {
        const relevance = KC.FileRenderer.calculateRelevance(file);
        console.log(`- ${file.name}: ${relevance}%`);
    });
}, 100);

// 5. Testar método de cálculo de relevância
console.log('\n5. Testando cálculo de relevância com arquivo de exemplo:');
if (KC.FileRenderer.files.length > 0) {
    const testFile = KC.FileRenderer.files[0];
    console.log('Arquivo:', testFile.name);
    console.log('Relevância calculada:', KC.FileRenderer.calculateRelevance(testFile) + '%');
    console.log('relevanceScore original:', testFile.relevanceScore);
}

// 6. Verificar se o problema está no applyRelevanceFilter
console.log('\n6. Debug do applyRelevanceFilter:');
const testFiles = KC.AppState.get('files') || [];
if (testFiles.length > 0) {
    // Conta arquivos por faixa de relevância
    let counts = { alta: 0, media: 0, baixa: 0 };
    
    testFiles.forEach(file => {
        const rel = KC.FilterManager.calculateRelevance(file);
        if (rel >= 70) counts.alta++;
        else if (rel >= 50) counts.media++;
        else counts.baixa++;
    });
    
    console.log('Distribuição de relevância:');
    console.log('- Alta (>=70%):', counts.alta);
    console.log('- Média (50-69%):', counts.media);
    console.log('- Baixa (<50%):', counts.baixa);
}

console.log('\n=== FIM DO DEBUG ===');
console.log('Cole este script no console após carregar os arquivos para debugar');