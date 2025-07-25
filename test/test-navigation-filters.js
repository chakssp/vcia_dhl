/**
 * Script de teste para navegação e filtros
 * Execute no console do navegador
 */

console.log('=== TESTE DE NAVEGAÇÃO E FILTROS ===');

// 1. Verificar componentes carregados
console.log('\n1. Verificando componentes:');
console.log('KC existe:', !!window.KC);
console.log('AppController:', !!window.KC?.AppController);
console.log('FilterManager:', !!window.KC?.FilterManager);
console.log('EventBus:', !!window.KC?.EventBus);

// 2. Verificar etapa atual
console.log('\n2. Estado atual:');
const currentStep = KC.AppState.get('currentStep');
console.log('Etapa atual:', currentStep);

// 3. Testar navegação
console.log('\n3. Testando navegação:');
console.log('navigateToStep disponível?', typeof KC.AppController?.navigateToStep === 'function');

// Simular clique no botão anterior
console.log('Tentando navegar para etapa anterior...');
if (KC.AppController?.navigateToStep) {
    const prevStep = currentStep > 1 ? currentStep - 1 : 1;
    console.log(`Navegando de ${currentStep} para ${prevStep}`);
    KC.AppController.navigateToStep(prevStep);
    
    setTimeout(() => {
        const newStep = KC.AppState.get('currentStep');
        console.log('Nova etapa:', newStep);
        console.log('Navegação funcionou?', newStep === prevStep);
    }, 500);
} else {
    console.error('navigateToStep não está disponível!');
}

// 4. Verificar elementos DOM dos filtros
console.log('\n4. Verificando elementos DOM:');
const statusInputs = document.querySelectorAll('input[data-filter-group="status"]');
const relevanceInputs = document.querySelectorAll('input[data-filter-group="relevance"]');
console.log('Inputs de status encontrados:', statusInputs.length);
console.log('Inputs de relevância encontrados:', relevanceInputs.length);

// Listar valores disponíveis
console.log('\nValores de status:');
statusInputs.forEach(input => {
    console.log(`- ${input.value}: ${input.checked ? 'MARCADO' : 'desmarcado'}`);
});

console.log('\nValores de relevância:');
relevanceInputs.forEach(input => {
    console.log(`- ${input.value}: ${input.checked ? 'MARCADO' : 'desmarcado'}`);
});

// 5. Testar aplicação de filtro
console.log('\n5. Testando aplicação de filtro:');
const pendingInput = document.querySelector('input[data-filter-group="status"][value="pending"]');
if (pendingInput) {
    console.log('Aplicando filtro: Status = Pendente');
    pendingInput.checked = true;
    pendingInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    setTimeout(() => {
        // Verificar se filtro rápido foi atualizado
        const quickPending = document.querySelector('[data-filter="status"][data-value="pendente"]');
        if (quickPending) {
            console.log('Filtro rápido tem classe active?', quickPending.classList.contains('active'));
        } else {
            console.error('Filtro rápido não encontrado!');
        }
    }, 500);
} else {
    console.error('Input de status pending não encontrado!');
}

// 6. Verificar eventos
console.log('\n6. Verificando eventos:');
console.log('Eventos disponíveis:', Object.keys(KC.Events || {}));

// 7. Debug da função de sincronização
console.log('\n7. Testando sincronização:');
if (typeof window.syncQuickFiltersState === 'function') {
    console.log('Executando syncQuickFiltersState()...');
    window.syncQuickFiltersState();
} else {
    console.error('syncQuickFiltersState não está definida!');
}

console.log('\n=== FIM DO TESTE ===');
console.log('Verifique os resultados acima para identificar o problema.');