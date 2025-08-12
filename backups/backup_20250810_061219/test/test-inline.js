// Test inline para TripleStoreService
(async function() {
    console.log('\n🧪 TESTE INLINE - TripleStoreService\n');
    
    const KC = window.KnowledgeConsolidator;
    
    if (!KC) {
        console.error('❌ KnowledgeConsolidator não está disponível');
        return;
    }
    
    console.log('✅ KnowledgeConsolidator encontrado');
    
    // Verificar dependências
    console.log('\n📋 Verificando dependências:');
    console.log(`  - Logger: ${typeof KC.Logger}`);
    console.log(`  - EventBus: ${typeof KC.EventBus}`);
    console.log(`  - AppState: ${typeof KC.AppState}`);
    console.log(`  - TripleStoreManager: ${typeof KC.TripleStoreManager}`);
    console.log(`  - TripleStoreService: ${typeof KC.TripleStoreService}`);
    console.log(`  - RelationshipExtractor: ${typeof KC.RelationshipExtractor}`);
    
    if (!KC.TripleStoreService) {
        console.error('❌ TripleStoreService não está disponível');
        return;
    }
    
    // Tentar executar o teste
    if (typeof testTripleStoreService === 'function') {
        console.log('\n✅ Função testTripleStoreService encontrada');
        console.log('🚀 Executando testes...\n');
        
        try {
            const results = await testTripleStoreService();
            console.log('\n✅ Testes concluídos!');
            return results;
        } catch (error) {
            console.error('❌ Erro ao executar testes:', error);
        }
    } else {
        console.error('❌ Função testTripleStoreService não encontrada');
    }
})();