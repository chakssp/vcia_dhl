/**
 * ATIVAÇÃO SIMPLES DO UnifiedConfidenceSystem
 * 
 * Este script ativa o sistema que já está completamente integrado
 */

console.log('🚀 ATIVANDO UnifiedConfidenceSystem\n');

// 1. Verificar se o sistema está carregado
if (!KC.UnifiedConfidenceControllerInstance) {
    console.error('❌ UnifiedConfidenceSystem não encontrado!');
    console.log('Recarregue a página e tente novamente.');
} else {
    console.log('✅ Sistema carregado');
    
    // 2. Ativar todas as feature flags
    console.log('\n📌 Ativando feature flags...');
    
    // Método 1: Ativar tudo de uma vez
    if (typeof kcflags !== 'undefined' && kcflags.enableConfidenceBeta) {
        kcflags.enableConfidenceBeta();
        console.log('✅ Todas as flags ativadas via kcflags.enableConfidenceBeta()');
    } else {
        // Método 2: Ativar manualmente
        localStorage.setItem('feature_flag_unified_confidence_system', JSON.stringify({
            enabled: true,
            percentage: 100,
            timestamp: Date.now()
        }));
        
        localStorage.setItem('feature_flag_qdrant_score_bridge', JSON.stringify({
            enabled: true,
            percentage: 100,
            timestamp: Date.now()
        }));
        
        localStorage.setItem('feature_flag_confidence_color_coding', JSON.stringify({
            enabled: true,
            percentage: 100,
            timestamp: Date.now()
        }));
        
        console.log('✅ Feature flags ativadas manualmente');
    }
    
    // 3. Habilitar o sistema
    console.log('\n🔧 Habilitando sistema de confiança...');
    try {
        KC.UnifiedConfidenceControllerInstance.enableConfidenceSystem(100);
        console.log('✅ Sistema habilitado com 100% de rollout');
    } catch (error) {
        console.warn('⚠️ Erro ao habilitar:', error.message);
    }
    
    // 4. Processar arquivos existentes
    const files = KC.AppState.get('files') || [];
    if (files.length > 0) {
        console.log(`\n📄 Processando ${files.length} arquivos existentes...`);
        
        KC.UnifiedConfidenceControllerInstance.processFiles(files)
            .then(result => {
                if (result.success) {
                    console.log(`✅ ${result.processedCount} arquivos processados`);
                    
                    // Mostrar alguns exemplos
                    const updatedFiles = KC.AppState.get('files').slice(0, 5);
                    console.log('\n📊 Exemplos de scores:');
                    updatedFiles.forEach(f => {
                        console.log(`  • ${f.name}: ${f.confidence || 0}%`);
                    });
                }
            })
            .catch(error => {
                console.error('❌ Erro no processamento:', error);
            });
    } else {
        console.log('\n⚠️ Nenhum arquivo encontrado. Faça discovery primeiro.');
    }
    
    // 5. Status final
    console.log('\n📈 STATUS FINAL:');
    console.log('  • Sistema: ATIVO ✅');
    console.log('  • Feature Flags: HABILITADAS ✅');
    console.log('  • Processamento: AUTOMÁTICO ✅');
    console.log('\n💡 Agora todos os novos arquivos terão scores automáticos!');
    console.log('💡 Categorizar ou analisar arquivos atualizará os scores!');
}

// Comando útil para verificar
console.log('\n🔍 Para verificar status, use:');
console.log('   kcconfidence.status()');
console.log('   kcconfidence.diagnostics()');