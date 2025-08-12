/**
 * Correção para comportamento de filtros combinados
 * Permite que apenas um filtro de cada tipo esteja ativo por vez
 */

(function() {
    'use strict';
    
    console.log('Quick filters COMBINED FIX: Iniciando...');
    
    // Sobrescrever o comportamento dos filtros rápidos
    function fixCombinedFilters() {
        const quickFilters = document.querySelectorAll('.quick-filter-item');
        
        quickFilters.forEach(item => {
            // Se for o botão Total, pular - deixar o quick-filters-final-fix.js lidar
            if (item.querySelector('#quick-count-all')) {
                console.log('Combined fix: Pulando botão Total');
                return;
            }
            
            // Remover listener anterior se existir
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            
            // Adicionar novo listener
            newItem.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const filterType = this.dataset.filter;
                const filterValue = this.dataset.value;
                
                console.log('Filtro combinado clicado:', filterType, '=', filterValue);
                
                // Se for o botão Total (tem #quick-count-all), ignorar e deixar o quick-filters-final-fix.js lidar
                if (filterValue === 'todos' && this.querySelector('#quick-count-all')) {
                    console.log('Botão Total detectado - ignorando combined-fix');
                    return;
                }
                
                // Se clicar em "todos", limpar filtros do tipo
                if (filterValue === 'todos') {
                    // Marcar "all" no radio correspondente
                    const allRadio = document.querySelector(`input[type="radio"][name="${filterType}"][value="all"]`);
                    if (allRadio) {
                        allRadio.checked = true;
                        allRadio.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                } else {
                    // Primeiro, garantir que o outro tipo de filtro esteja em "all"
                    const otherFilterType = filterType === 'status' ? 'relevance' : 'status';
                    const otherAllRadio = document.querySelector(`input[type="radio"][name="${otherFilterType}"][value="all"]`);
                    if (otherAllRadio && !otherAllRadio.checked) {
                        console.log('Resetando filtro:', otherFilterType);
                        otherAllRadio.checked = true;
                        otherAllRadio.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    
                    // Aguardar um momento para o reset ser processado
                    setTimeout(() => {
                        // Mapear valores
                        const valueMap = {
                            'pendente': 'pending',
                            'aprovados': 'approved',
                            'arquivados': 'archived',
                            'alta': 'high',
                            'media': 'medium',
                            'baixa': 'low'
                        };
                        
                        const mappedValue = valueMap[filterValue] || filterValue;
                        const radio = document.querySelector(`input[type="radio"][name="${filterType}"][value="${mappedValue}"]`);
                        
                        if (radio) {
                            console.log('Aplicando filtro:', filterType, '=', mappedValue);
                            radio.checked = true;
                            radio.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }, 50);
                }
                
                // Atualizar visual
                updateQuickFiltersVisual();
            };
        });
    }
    
    // Função para atualizar visual
    function updateQuickFiltersVisual() {
        setTimeout(() => {
            const quickBar = document.getElementById('quick-filters-bar');
            if (!quickBar) return;
            
            // Limpar todos active
            quickBar.querySelectorAll('.quick-filter-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Mapear valores inverso
            const reverseMap = {
                'all': 'todos',
                'pending': 'pendente',
                'approved': 'aprovados',
                'archived': 'arquivados',
                'high': 'alta',
                'medium': 'media',
                'low': 'baixa'
            };
            
            // Verificar radios marcados
            ['status', 'relevance'].forEach(filterType => {
                const checkedRadio = document.querySelector(`input[type="radio"][name="${filterType}"]:checked`);
                if (checkedRadio && checkedRadio.value !== 'all') {
                    const quickValue = reverseMap[checkedRadio.value] || checkedRadio.value;
                    const quickItem = quickBar.querySelector(`[data-filter="${filterType}"][data-value="${quickValue}"]`);
                    if (quickItem) {
                        quickItem.classList.add('active');
                    }
                }
            });
        }, 100);
    }
    
    // Escutar mudanças nos filtros
    KC.EventBus.on('FILES_FILTERED', updateQuickFiltersVisual);
    
    // Aplicar correção após um pequeno delay
    setTimeout(fixCombinedFilters, 500);
    
    console.log('Quick filters COMBINED FIX: Configurado!');
})();