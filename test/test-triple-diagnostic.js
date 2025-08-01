// Test diagnostic specifically for TripleStoreService
console.log('\n🧪 DIAGNÓSTICO TRIPLE STORE SERVICE\n');

// 1. Check KC namespace
const KC = window.KnowledgeConsolidator;
if (!KC) {
    console.error('❌ KnowledgeConsolidator não encontrado!');
    return;
}

console.log('✅ KnowledgeConsolidator encontrado');

// 2. Check triple-related components
console.log('\n📋 Componentes de Triplas:');
const tripleComponents = {
    'TripleStoreManager': KC.TripleStoreManager,
    'TripleStoreService': KC.TripleStoreService,
    'TripleSchema': KC.TripleSchema,
    'RelationshipExtractor': KC.RelationshipExtractor,
    'tripleStore': KC.tripleStore,
    'tripleStoreService': KC.tripleStoreService
};

Object.entries(tripleComponents).forEach(([name, component]) => {
    if (component) {
        console.log(`  ✅ KC.${name}: ${typeof component}`);
        if (typeof component === 'object') {
            console.log(`     - Propriedades: ${Object.keys(component).slice(0, 5).join(', ')}...`);
        }
    } else {
        console.log(`  ❌ KC.${name}: undefined`);
    }
});

// 3. Check if test function exists
console.log('\n🧪 Função de teste:');
if (typeof testTripleStoreService === 'function') {
    console.log('  ✅ testTripleStoreService está disponível globalmente');
} else {
    console.log('  ❌ testTripleStoreService NÃO está disponível');
}

// 4. Try to run a simple test
console.log('\n🚀 Teste simples:');
try {
    // Check if we can create an instance
    if (KC.TripleStoreService) {
        const service = KC.tripleStoreService || new KC.TripleStoreService();
        console.log('  ✅ Instância criada/obtida:', service);
        console.log('  - initialized:', service.initialized);
        console.log('  - stats:', service.stats);
        
        // Try to initialize if not initialized
        if (!service.initialized) {
            console.log('\n  🔄 Tentando inicializar...');
            service.inicializar().then(() => {
                console.log('  ✅ Serviço inicializado!');
                
                // Now run the test
                if (typeof testTripleStoreService === 'function') {
                    console.log('\n  🧪 Executando testes...\n');
                    testTripleStoreService();
                }
            }).catch(error => {
                console.error('  ❌ Erro ao inicializar:', error);
            });
        } else {
            // Run test directly
            if (typeof testTripleStoreService === 'function') {
                console.log('\n  🧪 Executando testes...\n');
                testTripleStoreService();
            }
        }
    }
} catch (error) {
    console.error('  ❌ Erro:', error);
}

// 5. Manual test command
console.log('\n📌 Para executar o teste manualmente:');
console.log('  testTripleStoreService()');
console.log('\n📌 Para limpar dados de teste:');
console.log('  limparTesteService()');