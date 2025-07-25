// Debug script para verificar navegação e filtros
console.log('=== DIAGNÓSTICO DE NAVEGAÇÃO E FILTROS ===');

// 1. Verificar se quick-filters-fix.js foi carregado
const quickFiltersScript = document.querySelector('script[src*="quick-filters-fix.js"]');
console.log('1. quick-filters-fix.js carregado?', \!\!quickFiltersScript);

// 2. Verificar se setupQuickFiltersBar existe
console.log('2. setupQuickFiltersBar existe?', typeof window.setupQuickFiltersBar);

// 3. Verificar elementos de navegação
const navPrev = document.getElementById('nav-prev');
const navNext = document.getElementById('nav-next');
console.log('3. Elementos de navegação:', {
    navPrev: \!\!navPrev,
    navNext: \!\!navNext,
    navPrevDisabled: navPrev?.disabled,
    navNextDisabled: navNext?.disabled
});

// 4. Verificar AppController
console.log('4. AppController disponível?', {
    KC: \!\!window.KC,
    AppController: \!\!window.KC?.AppController,
    navigateToStep: typeof window.KC?.AppController?.navigateToStep,
    currentStep: window.KC?.AppState?.get('currentStep')
});

// 5. Verificar event listeners nos botões
if (navPrev) {
    const listeners = getEventListeners ? getEventListeners(navPrev) : 'Não disponível';
    console.log('5. Event listeners em nav-prev:', listeners);
}

// 6. Verificar inputs de filtro
const statusInputs = document.querySelectorAll('input[name="status"]');
const relevanceInputs = document.querySelectorAll('input[name="relevance"]');
console.log('6. Inputs de filtro:', {
    statusInputs: statusInputs.length,
    relevanceInputs: relevanceInputs.length
});

// 7. Verificar FilterManager
console.log('7. FilterManager:', {
    exists: \!\!window.KC?.FilterManager,
    clearAllFilters: typeof window.KC?.FilterManager?.clearAllFilters,
    applyFilters: typeof window.KC?.FilterManager?.applyFilters
});

// 8. Tentar chamar setupQuickFiltersBar manualmente
if (typeof window.setupQuickFiltersBar === 'function') {
    console.log('8. Chamando setupQuickFiltersBar()...');
    window.setupQuickFiltersBar();
}

// 9. Verificar eventos
console.log('9. Eventos disponíveis:', {
    FILTERS_CHANGED: window.KC?.Events?.FILTERS_CHANGED,
    FILES_UPDATED: window.KC?.Events?.FILES_UPDATED
});

console.log('=== FIM DO DIAGNÓSTICO ===');
