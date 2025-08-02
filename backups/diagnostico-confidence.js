// DIAGNÓSTICO DO UNIFIED CONFIDENCE SYSTEM

// 1. Verificar se componentes estão carregados
console.log('=== COMPONENTES CARREGADOS ===');
console.log('QdrantScoreBridge:', \!\!KC.QdrantScoreBridgeInstance);
console.log('BoostCalculator:', \!\!KC.BoostCalculatorInstance);
console.log('PrefixEnhancer:', \!\!KC.PrefixEnhancerInstance);
console.log('ZeroRelevanceResolver:', \!\!KC.ZeroRelevanceResolverInstance);
console.log('ConfidenceAggregator:', \!\!KC.ConfidenceAggregatorInstance);
console.log('UnifiedController:', \!\!KC.UnifiedConfidenceControllerInstance);

// 2. Verificar status do sistema
console.log('\n=== STATUS DO SISTEMA ===');
if (KC.UnifiedConfidenceControllerInstance) {
    console.log(KC.UnifiedConfidenceControllerInstance.getStatus());
}

// 3. Testar cálculo de confiança em um arquivo
console.log('\n=== TESTE DE CÁLCULO ===');
const files = KC.AppState.get('files') || [];
if (files.length > 0) {
    const testFile = files[0];
    console.log('Arquivo teste:', testFile.name);
    console.log('Relevância original:', testFile.relevanceScore || 0);
    
    // Tentar calcular confiança
    if (KC.UnifiedConfidenceControllerInstance && KC.UnifiedConfidenceControllerInstance.getFileConfidence) {
        KC.UnifiedConfidenceControllerInstance.getFileConfidence(testFile.id).then(result => {
            console.log('Resultado UnifiedConfidence:', result);
        });
    }
}

// 4. Verificar se UI está sendo atualizada
console.log('\n=== VERIFICAR UI ===');
const fileCards = document.querySelectorAll('.file-item');
console.log('File cards encontrados:', fileCards.length);

// 5. Verificar feature flags
console.log('\n=== FEATURE FLAGS ===');
console.log('unified_confidence_system:', kcflags.check('unified_confidence_system'));
console.log('enhanced_file_cards:', kcflags.check('enhanced_file_cards'));
console.log('confidence_aggregation_enabled:', kcflags.check('confidence_aggregation_enabled'));
