/**
 * Correção v2 para a funcionalidade da barra de filtros rápidos
 * Corrige problemas de timing e seletores DOM
 */

(function() {
    'use strict';
    
    let initialized = false;
    
    // Função principal de correção
    function fixQuickFilters() {
        if (initialized) return;
        
        // Verificar se KC e componentes necessários existem
        if (!window.KC || !window.KC.AppController || !window.KC.EventBus) {
            console.log('Quick filters: Aguardando KC carregar...');
            // Tentar novamente em 100ms
            setTimeout(fixQuickFilters, 100);
            return;
        }
        
        console.log('Quick filters v2: Iniciando correções...');
        
        // Marcar como inicializado
        initialized = true;
        
        // Sobrescrever a função setupQuickFiltersBar
        window.setupQuickFiltersBar = function() {
            console.log('Inicializando barra de filtros rápidos (versão corrigida v2)...');
            
            const quickFiltersToggle = document.getElementById('quick-filters-toggle');
            const quickFiltersBar = document.getElementById('quick-filters-bar');
            
            if (!quickFiltersToggle || !quickFiltersBar) {
                console.warn('Elementos de filtros rápidos não encontrados');
                return;
            }
            
            // Estado inicial - fechado
            let isExpanded = false;
            
            // Toggle ao clicar no botão
            quickFiltersToggle.addEventListener('click', () => {
                isExpanded = !isExpanded;
                if (isExpanded) {
                    quickFiltersBar.classList.add('show');
                    quickFiltersToggle.title = 'Ocultar Filtros Rápidos';
                } else {
                    quickFiltersBar.classList.remove('show');
                    quickFiltersToggle.title = 'Mostrar Filtros Rápidos';
                }
            });
            
            // ESC fecha a barra
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && isExpanded) {
                    isExpanded = false;
                    quickFiltersBar.classList.remove('show');
                    quickFiltersToggle.title = 'Mostrar Filtros Rápidos';
                }
            });
            
            // Adicionar listeners aos filtros com delegação de eventos
            quickFiltersBar.addEventListener('click', (e) => {
                const item = e.target.closest('.quick-filter-item');
                if (!item) return;
                
                e.preventDefault();
                e.stopPropagation();
                
                const filterType = item.dataset.filter;
                const filterValue = item.dataset.value;
                
                console.log('Filtro clicado:', filterType, filterValue);
                
                // Aplicar filtro
                applyQuickFilter(filterType, filterValue);
                
                // Atualizar visual
                quickFiltersBar.querySelectorAll('.quick-filter-item').forEach(f => {
                    f.classList.remove('active');
                });
                item.classList.add('active');
                
                // Scroll para lista de arquivos
                const filesSection = document.getElementById('files-section');
                if (filesSection && filesSection.style.display !== 'none') {
                    filesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
            
            // Configurar navegação após garantir que AppController está disponível
            setupNavigation();
            
            // Botão exportar
            const exportFilter = document.getElementById('export-filter');
            if (exportFilter) {
                exportFilter.addEventListener('click', (e) => {
                    e.preventDefault();
                    exportCurrentFilter();
                });
            }
            
            // Atualizar contadores quando arquivos mudarem
            KC.EventBus.on('FILES_UPDATED', updateQuickFilterCounters);
            KC.EventBus.on('STATE_CHANGED', (data) => {
                if (data.key === 'files') {
                    updateQuickFilterCounters();
                }
            });
            
            // Escutar mudanças nos filtros principais
            KC.EventBus.on('FILES_FILTERED', () => {
                console.log('Quick filters: FILES_FILTERED recebido, sincronizando...');
                syncQuickFiltersState();
            });
            
            // Atualizar contadores iniciais
            updateQuickFilterCounters();
            
            // Sincronizar estado inicial dos filtros
            setTimeout(syncQuickFiltersState, 100);
            
            console.log('Barra de filtros rápidos v2 inicializada com sucesso');
        };
        
        // Função separada para configurar navegação
        function setupNavigation() {
            const navPrev = document.getElementById('nav-prev');
            const navNext = document.getElementById('nav-next');
            
            if (navPrev) {
                navPrev.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const currentStep = KC.AppState.get('currentStep') || 2;
                    console.log('Navegação: Etapa atual =', currentStep, ', indo para', currentStep - 1);
                    
                    if (currentStep > 1 && KC.AppController && KC.AppController.navigateToStep) {
                        KC.AppController.navigateToStep(currentStep - 1);
                    } else {
                        console.warn('Não foi possível navegar para etapa anterior');
                    }
                });
            }
            
            if (navNext) {
                navNext.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const currentStep = KC.AppState.get('currentStep') || 2;
                    console.log('Navegação: Etapa atual =', currentStep, ', indo para', currentStep + 1);
                    
                    if (currentStep < 4 && KC.AppController && KC.AppController.navigateToStep) {
                        KC.AppController.navigateToStep(currentStep + 1);
                    } else {
                        console.warn('Não foi possível navegar para próxima etapa');
                    }
                });
            }
            
            // Atualizar estado dos botões
            KC.EventBus.on('STEP_CHANGED', updateNavigationButtons);
            updateNavigationButtons();
        }
        
        // Função para atualizar estado dos botões de navegação
        function updateNavigationButtons() {
            const currentStep = KC.AppState.get('currentStep') || 2;
            const navPrev = document.getElementById('nav-prev');
            const navNext = document.getElementById('nav-next');
            
            if (navPrev) {
                navPrev.disabled = currentStep <= 1;
                const prevText = navPrev.querySelector('span');
                if (prevText) {
                    const romanNumerals = ['I', 'II', 'III', 'IV'];
                    const prevStep = currentStep > 1 ? currentStep - 1 : 1;
                    prevText.textContent = `◀ Etapa ${romanNumerals[prevStep - 1]}`;
                }
            }
            
            if (navNext) {
                navNext.disabled = currentStep >= 4;
                const nextText = navNext.querySelector('span');
                if (nextText) {
                    const romanNumerals = ['I', 'II', 'III', 'IV'];
                    const nextStep = currentStep < 4 ? currentStep + 1 : 4;
                    nextText.textContent = `Etapa ${romanNumerals[nextStep - 1]} ▶`;
                }
            }
        }
        
        // Função para aplicar filtros (corrigida com seletores corretos)
        function applyQuickFilter(filterType, filterValue) {
            console.log('Aplicando filtro:', filterType, '=', filterValue);
            
            // Limpar filtros anteriores do mesmo tipo
            if (filterType === 'status') {
                // Encontrar o input correto usando data-filter-group
                const inputs = document.querySelectorAll(`input[data-filter-group="status"]`);
                inputs.forEach(input => {
                    if (filterValue === 'todos' && input.value === 'all') {
                        input.checked = true;
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    } else if (filterValue === 'pendente' && input.value === 'pending') {
                        input.checked = true;
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    } else if (filterValue === 'aprovados' && input.value === 'approved') {
                        input.checked = true;
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
            } else if (filterType === 'relevance') {
                const inputs = document.querySelectorAll(`input[data-filter-group="relevance"]`);
                inputs.forEach(input => {
                    if (filterValue === 'todos' && input.value === 'all') {
                        input.checked = true;
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    } else if (filterValue === 'alta' && input.value === 'high') {
                        input.checked = true;
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    } else if (filterValue === 'media' && input.value === 'medium') {
                        input.checked = true;
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    } else if (filterValue === 'baixa' && input.value === 'low') {
                        input.checked = true;
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
            }
            
            // Notificar
            if (KC.showNotification) {
                KC.showNotification({
                    type: 'info',
                    message: `Filtro aplicado: ${filterValue}`,
                    duration: 2000
                });
            }
        }
        
        // Função para exportar filtro atual
        function exportCurrentFilter() {
            const files = KC.AppState.get('files') || [];
            const filteredFiles = KC.FilterManager ? KC.FilterManager.getFilteredFiles() : files;
            
            const exportData = {
                timestamp: new Date().toISOString(),
                totalFiles: files.length,
                filteredFiles: filteredFiles.length,
                files: filteredFiles.map(f => ({
                    id: f.id,
                    name: f.name,
                    path: f.path,
                    relevanceScore: f.relevanceScore,
                    categories: f.categories || [],
                    approved: f.approved || false,
                    archived: f.archived || false
                }))
            };
            
            // Download como JSON
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `filtro-export-${new Date().toISOString().slice(0,10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            if (KC.showNotification) {
                KC.showNotification({
                    type: 'success',
                    message: 'Filtro exportado com sucesso!',
                    duration: 3000
                });
            }
        }
        
        // Função para atualizar contadores
        window.updateQuickFilterCounters = function() {
            const files = KC.AppState.get('files') || [];
            
            // Contadores de status
            const allCount = files.length;
            const pendingCount = files.filter(f => !f.approved && !f.archived).length;
            const approvedCount = files.filter(f => f.approved && !f.archived).length;
            
            // Contadores de relevância
            const highCount = files.filter(f => f.relevanceScore >= 70 && !f.archived).length;
            const mediumCount = files.filter(f => f.relevanceScore >= 30 && f.relevanceScore < 70 && !f.archived).length;
            const lowCount = files.filter(f => f.relevanceScore < 30 && !f.archived).length;
            
            // Atualizar elementos
            const updateElement = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            };
            
            updateElement('quick-count-all', allCount);
            updateElement('quick-count-pending', pendingCount);
            updateElement('quick-count-approved', approvedCount);
            updateElement('quick-count-high', highCount);
            updateElement('quick-count-medium', mediumCount);
            updateElement('quick-count-low', lowCount);
            
            // Atualizar botões de navegação também
            updateNavigationButtons();
        };
        
        // Função para sincronizar estado dos filtros rápidos com os principais
        function syncQuickFiltersState() {
            const quickFiltersBar = document.getElementById('quick-filters-bar');
            if (!quickFiltersBar) return;
            
            console.log('Sincronizando filtros rápidos com principais...');
            
            // Remover todos os active
            quickFiltersBar.querySelectorAll('.quick-filter-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Verificar filtros de status ativos
            const statusInputs = document.querySelectorAll('input[data-filter-group="status"]:checked');
            statusInputs.forEach(input => {
                const value = input.value;
                let quickValue = value;
                if (value === 'all') quickValue = 'todos';
                else if (value === 'pending') quickValue = 'pendente';
                else if (value === 'approved') quickValue = 'aprovados';
                
                const quickItem = quickFiltersBar.querySelector(`[data-filter="status"][data-value="${quickValue}"]`);
                if (quickItem) {
                    quickItem.classList.add('active');
                    console.log('Ativando filtro rápido status:', quickValue);
                }
            });
            
            // Verificar filtros de relevância ativos
            const relevanceInputs = document.querySelectorAll('input[data-filter-group="relevance"]:checked');
            relevanceInputs.forEach(input => {
                const value = input.value;
                let quickValue = value;
                if (value === 'all') quickValue = 'todos';
                else if (value === 'high') quickValue = 'alta';
                else if (value === 'medium') quickValue = 'media';
                else if (value === 'low') quickValue = 'baixa';
                
                const quickItem = quickFiltersBar.querySelector(`[data-filter="relevance"][data-value="${quickValue}"]`);
                if (quickItem) {
                    quickItem.classList.add('active');
                    console.log('Ativando filtro rápido relevância:', quickValue);
                }
            });
        }
        
        // Exportar função de sincronização
        window.syncQuickFiltersState = syncQuickFiltersState;
        
        // Se APP_INITIALIZED já foi emitido, configurar imediatamente
        if (KC.AppController && KC.AppController.initialized) {
            console.log('App já inicializado, configurando quick filters...');
            if (typeof window.setupQuickFiltersBar === 'function') {
                window.setupQuickFiltersBar();
            }
        } else {
            // Aguardar APP_INITIALIZED
            console.log('Aguardando APP_INITIALIZED...');
            KC.EventBus.on(KC.Events.APP_INITIALIZED, () => {
                console.log('APP_INITIALIZED recebido, configurando quick filters...');
                if (typeof window.setupQuickFiltersBar === 'function') {
                    setTimeout(() => {
                        window.setupQuickFiltersBar();
                    }, 100);
                }
            });
        }
    }
    
    // Iniciar quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixQuickFilters);
    } else {
        fixQuickFilters();
    }
})();