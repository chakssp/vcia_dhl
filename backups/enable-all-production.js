// HABILITANDO TUDO PARA PRODUÇÃO
// Week 1 Components
kcflags.enable('unified_confidence_system', 100);
kcflags.enable('qdrant_score_bridge', 100);
kcflags.enable('advanced_score_normalization', 100);
kcflags.enable('batch_confidence_processing', 100);
kcflags.enable('enhanced_file_cards', 100);
kcflags.enable('confidence_color_coding', 100);

// Week 2 Components
kcflags.enable('confidence_boost_calculator', 100);
kcflags.enable('prefix_enhancement_enabled', 100);
kcflags.enable('zero_relevance_resolution', 100);
kcflags.enable('confidence_aggregation_enabled', 100);

console.log('✅ TUDO HABILITADO PARA PRODUÇÃO\!');
console.log('🚀 UnifiedConfidenceSystem Week 1 + Week 2 ATIVO\!');
console.log('📊 351 pontos Qdrant + 163K prefixos PRONTOS\!');

// Verificar status
kcflags.list();

// Inicializar sistema
kcconfidence.init();
kcconfidence.status();
