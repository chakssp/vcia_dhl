/**
 * Debug para sistema de exportação
 */

// Função de debug para verificar arquivos aprovados
window.debugExport = function() {
    const files = KC.AppState.get('files') || [];
    
    console.log('=== DEBUG EXPORT ===');
    console.log(`Total de arquivos: ${files.length}`);
    
    // Verificar arquivos por relevância
    const byRelevance = files.reduce((acc, file) => {
        const score = file.relevanceScore || 0;
        if (score >= 90) acc.high++;
        else if (score >= 70) acc.medium++;
        else if (score >= 50) acc.low++;
        else acc.veryLow++;
        return acc;
    }, { high: 0, medium: 0, low: 0, veryLow: 0 });
    
    console.log('Distribuição por relevância:');
    console.log(`  >= 90%: ${byRelevance.high} arquivos`);
    console.log(`  70-89%: ${byRelevance.medium} arquivos`);
    console.log(`  50-69%: ${byRelevance.low} arquivos`);
    console.log(`  < 50%: ${byRelevance.veryLow} arquivos`);
    
    // Mostrar arquivos aprovados
    const approved = files.filter(file => 
        file.relevanceScore >= 50 && 
        file.preview && 
        !file.archived
    );
    
    console.log(`\nArquivos aprovados para exportação: ${approved.length}`);
    
    if (approved.length > 0) {
        console.log('\nPrimeiros 5 arquivos aprovados:');
        approved.slice(0, 5).forEach(file => {
            console.log(`  - ${file.name} (${file.relevanceScore}%)`);
        });
    } else {
        console.log('\nNENHUM arquivo atende aos critérios:');
        console.log('  - relevanceScore >= 50%');
        console.log('  - tem preview extraído');
        console.log('  - não está arquivado');
        
        // Verificar por que não passam
        const noScore = files.filter(f => !f.relevanceScore || f.relevanceScore < 50).length;
        const noPreview = files.filter(f => !f.preview).length;
        const archived = files.filter(f => f.archived).length;
        
        console.log('\nMotivos de rejeição:');
        console.log(`  - Sem score ou score < 50%: ${noScore} arquivos`);
        console.log(`  - Sem preview: ${noPreview} arquivos`);
        console.log(`  - Arquivados: ${archived} arquivos`);
    }
    
    // Verificar se FilterManager está aplicando keywords
    if (KC.FilterManager) {
        const config = KC.FilterManager.getSemanticKeywords?.() || {};
        console.log('\nConfiguração de keywords:');
        console.log('  Base:', config.base || 'não definidas');
        console.log('  Extensíveis:', config.extensible || 'não definidas');
    }
    
    return approved;
};

// Função para forçar aprovação de arquivos (apenas para teste)
window.forceApproveFiles = function(minScore = 50) {
    const files = KC.AppState.get('files') || [];
    let updated = 0;
    
    files.forEach(file => {
        if (!file.relevanceScore || file.relevanceScore < minScore) {
            file.relevanceScore = minScore;
            updated++;
        }
        if (!file.preview && file.content) {
            file.preview = KC.PreviewUtils?.extractPreview(file.content) || 'Preview não disponível';
        }
    });
    
    KC.AppState.set('files', files);
    console.log(`${updated} arquivos atualizados com score mínimo de ${minScore}%`);
    
    // Emitir evento de atualização
    KC.EventBus.emit(KC.Events.FILES_UPDATED, {
        action: 'force_approve',
        count: updated
    });
};

console.log('Debug de exportação carregado. Execute debugExport() para verificar status.');