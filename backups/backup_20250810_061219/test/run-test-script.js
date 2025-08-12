// Script para executar o teste via console
(async function() {
    console.log('=== EXECUTANDO TESTE DO TRIPLESTORE SERVICE ===\n');
    
    // Verificar se a função está disponível
    if (typeof testTripleStoreService === 'function') {
        try {
            console.log('Função testTripleStoreService encontrada. Executando...\n');
            const resultados = await testTripleStoreService();
            console.log('\n=== TESTE CONCLUÍDO ===');
            console.log('Resultados:', resultados);
        } catch (error) {
            console.error('ERRO ao executar teste:', error);
            console.error('Stack:', error.stack);
        }
    } else {
        console.error('❌ Função testTripleStoreService não encontrada!');
        console.log('Funções disponíveis no escopo global:', Object.keys(window).filter(k => k.includes('test')));
    }
})();