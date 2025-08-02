/**
 * Script para DESABILITAR o RefinementDetector temporariamente
 * 
 * Use este script se o erro persistir e você quiser continuar usando o sistema
 */

console.log('🔧 Desabilitando RefinementDetector temporariamente\n');

// Opção 1: Desabilitar completamente
if (KC.RefinementDetector) {
    // Sobrescrever método principal para sempre retornar contexto vazio
    KC.RefinementDetector.detectContext = async function(file) {
        return this.createEmptyContext();
    };
    
    console.log('✅ RefinementDetector desabilitado');
    console.log('   O sistema continuará funcionando sem detecção de refinamento');
}

// Opção 2: Desabilitar RefinementService também
if (KC.RefinementService) {
    KC.RefinementService.config.enabled = false;
    console.log('✅ RefinementService desabilitado');
}

// Opção 3: Remover listeners de eventos
if (KC.EventBus) {
    // Remover todos os listeners do RefinementService
    const events = ['FILES_DISCOVERED', 'FILES_UPDATED', 'FILE_ANALYZED', 'CATEGORY_ASSIGNED'];
    events.forEach(event => {
        if (KC.Events[event]) {
            // Não temos método direto para remover, então vamos sobrescrever
            const originalEmit = KC.EventBus.emit;
            KC.EventBus.emit = function(eventName, ...args) {
                // Bloquear eventos para RefinementService
                if (eventName === KC.Events[event] && KC.RefinementService) {
                    console.log(`Bloqueado evento ${event} para RefinementService`);
                    return;
                }
                return originalEmit.call(this, eventName, ...args);
            };
        }
    });
}

console.log('\n📌 Sistema desabilitado com sucesso');
console.log('   Você pode continuar usando o Knowledge Consolidator normalmente');
console.log('   O erro do RefinementDetector não aparecerá mais');

// Para reabilitar no futuro
console.log('\n💡 Para reabilitar no futuro, recarregue a página');